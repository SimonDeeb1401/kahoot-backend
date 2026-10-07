import { ConflictException, HttpException, Logger, OnModuleDestroy } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
	ConnectedSocket,
	MessageBody,
	OnGatewayDisconnect,
	OnGatewayInit,
	SubscribeMessage,
	WebSocketGateway,
	WebSocketServer,
} from '@nestjs/websockets';
import type { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/auth.service.js';
import { GameEngineService, type QuestionDelivery } from './game-engine.service.js';

interface GameSocketData {
	userId?: number;
	sessionId?: number;
	playerId?: number;
	role?: 'host' | 'player';
}

type GameSocket = Socket & { data: GameSocketData };

interface JoinRoomMessage {
	sessionId: number;
	playerId?: number;
}

interface StartCompetitionMessage {
	sessionId: number;
}

interface NextQuestionMessage {
	sessionId: number;
}

interface SubmitAnswerMessage {
	questionId: number;
	answerId: number;
}

interface AutomaticAdvanceTimer {
	questionId: number;
	phase: 'deadline' | 'countdown' | 'advancing';
	timer: ReturnType<typeof setTimeout>;
	countdown?: {
		sessionId: number;
		questionId: number;
		seconds: number;
		reason: 'timer-ended' | 'all-players-answered';
		advancesAt: string;
	};
}

@WebSocketGateway({ cors: { origin: true } })
export class GamesGateway
	implements OnGatewayInit, OnGatewayDisconnect, OnModuleDestroy
{
	@WebSocketServer()
	private server!: Server;

	private readonly logger = new Logger(GamesGateway.name);
	private readonly automaticAdvanceTimers = new Map<number, AutomaticAdvanceTimer>();

	constructor(
		private readonly jwtService: JwtService,
		private readonly gameEngine: GameEngineService,
	) {}

	onModuleDestroy(): void {
		for (const { timer } of this.automaticAdvanceTimers.values()) {
			clearTimeout(timer);
		}
		this.automaticAdvanceTimers.clear();
	}

	afterInit(server: Server): void {
		server.use(async (client: GameSocket, next) => {
			const token: unknown = client.handshake.auth?.token;
			if (typeof token !== 'string') {
				next(new Error('Unauthorized'));
				return;
			}

			try {
				const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
				if (
					payload.tokenUse !== 'access' ||
					!Number.isSafeInteger(payload.sub) ||
					payload.sub < 1
				) {
					next(new Error('Unauthorized'));
					return;
				}
				client.data.userId = payload.sub;
				next();
			} catch {
				next(new Error('Unauthorized'));
			}
		});
	}

	handleDisconnect(client: GameSocket): void {
		client.data.sessionId = undefined;
		client.data.role = undefined;
	}

	@SubscribeMessage('join-room')
	async joinRoom(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() message: JoinRoomMessage,
	): Promise<void> {
		const userId = client.data.userId;
		if (
			!userId ||
			!Number.isSafeInteger(message?.sessionId) ||
			message.sessionId < 1 ||
			(message.playerId !== undefined &&
				(!Number.isSafeInteger(message.playerId) || message.playerId < 1))
		) {
			this.emitError(client, 'Invalid room request.');
			return;
		}

		try {
			const snapshot = await this.gameEngine.getRoomSnapshot(
				userId,
				message.sessionId,
				message.playerId,
			);
			const room = this.roomName(message.sessionId);
			await client.join(room);
			client.data.sessionId = message.sessionId;
			client.data.role = snapshot.role;
			client.data.playerId = snapshot.role === 'player' ? message.playerId : undefined;
			if (snapshot.role === 'host') await client.join(this.hostRoomName(message.sessionId));

			client.emit('room-state', snapshot);
			this.server.to(room).emit('players-updated', snapshot.players);
			if (snapshot.competition) {
				client.emit('competition-started', snapshot.competition);
				const currentQuestion = await this.gameEngine.getCurrentQuestion(
					message.sessionId,
				);
				if (currentQuestion) {
					client.emit('question-delivered', currentQuestion);
					this.scheduleQuestionDeadline(currentQuestion);
					const progress = await this.gameEngine.getAnswerProgress(
						message.sessionId,
						currentQuestion.question.id,
					);
					if (
						progress.totalPlayers > 0 &&
						progress.answeredCount >= progress.totalPlayers
					) {
						await this.beginAutomaticAdvance(
							message.sessionId,
							currentQuestion.question.id,
							'all-players-answered',
						);
					}
					this.emitActiveCountdown(
						client,
						message.sessionId,
						currentQuestion.question.id,
					);
					if (snapshot.role === 'host') {
						client.emit('answer-progress', progress);
					} else if (message.playerId) {
						const feedback = await this.gameEngine.getPlayerAnswerFeedback(
							message.sessionId,
							message.playerId,
							currentQuestion.question.id,
						);
						if (feedback) client.emit('answer-feedback', feedback);
					}
				}
			}
		} catch (error) {
			this.emitError(client, error);
		}
	}

	@SubscribeMessage('start-competition')
	async startCompetition(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() message: StartCompetitionMessage,
	): Promise<void> {
		const userId = client.data.userId;
		if (
			!userId ||
			client.data.role !== 'host' ||
			client.data.sessionId !== message?.sessionId ||
			!Number.isSafeInteger(message?.sessionId) ||
			message.sessionId < 1
		) {
			this.emitError(client, 'Only the room host can start this competition.');
			return;
		}

		try {
			const competition = await this.gameEngine.startCompetition(
				userId,
				message.sessionId,
			);
			this.server
				.to(this.roomName(message.sessionId))
				.emit('competition-started', competition);
			const currentQuestion = await this.gameEngine.getCurrentQuestion(
				message.sessionId,
			);
			if (currentQuestion) {
				const room = this.server.to(this.roomName(message.sessionId));
				room.emit('question-delivered', currentQuestion);
				this.scheduleQuestionDeadline(currentQuestion);
				this.server
					.to(this.hostRoomName(message.sessionId))
					.emit(
						'answer-progress',
						await this.gameEngine.getAnswerProgress(
							message.sessionId,
							currentQuestion.question.id,
						),
					);
			}
		} catch (error) {
			this.emitError(client, error);
		}
	}

	@SubscribeMessage('next-question')
	async nextQuestion(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() message: NextQuestionMessage,
	): Promise<void> {
		const userId = client.data.userId;
		if (
			!userId ||
			client.data.role !== 'host' ||
			client.data.sessionId !== message?.sessionId ||
			!Number.isSafeInteger(message?.sessionId) ||
			message.sessionId < 1
		) {
			this.emitError(client, 'Only the room host can advance this competition.');
			return;
		}

		try {
			const question = await this.gameEngine.advanceQuestion(
				userId,
				message.sessionId,
			);
			const room = this.server.to(this.roomName(message.sessionId));
			if (question) {
				this.clearAutomaticAdvance(message.sessionId);
				await this.broadcastQuestion(message.sessionId, question);
			} else {
				this.clearAutomaticAdvance(message.sessionId);
				const [leaderboard, statistics] = await Promise.all([
					this.gameEngine.getLeaderboard(message.sessionId),
					this.gameEngine.getQuestionStatistics(message.sessionId),
				]);
				room.emit('competition-finished', {
					sessionId: message.sessionId,
					leaderboard,
					statistics,
				});
			}
		} catch (error) {
			this.emitError(client, error);
		}
	}

	@SubscribeMessage('submit-answer')
	async submitAnswer(
		@ConnectedSocket() client: GameSocket,
		@MessageBody() message: SubmitAnswerMessage,
	): Promise<void> {
		const userId = client.data.userId;
		const playerId = client.data.playerId;
		if (
			!userId ||
			!playerId ||
			client.data.role !== 'player' ||
			!client.data.sessionId ||
			!Number.isSafeInteger(message?.questionId) ||
			message.questionId < 1 ||
			!Number.isSafeInteger(message?.answerId) ||
			message.answerId < 1
		) {
			this.emitError(client, 'Only a joined player can submit an answer.');
			return;
		}

		try {
			const result = await this.gameEngine.submitPlayerAnswer(
				userId,
				client.data.sessionId,
				playerId,
				message.questionId,
				message.answerId,
			);
			client.emit('answer-feedback', result.feedback);
			this.server
				.to(this.hostRoomName(client.data.sessionId))
				.emit('answer-progress', result.progress);
			if (
				result.progress.totalPlayers > 0 &&
				result.progress.answeredCount >= result.progress.totalPlayers
			) {
				await this.beginAutomaticAdvance(
					client.data.sessionId,
					result.progress.questionId,
					'all-players-answered',
				);
			}
		} catch (error) {
			this.emitError(client, error);
		}
	}

	private async broadcastQuestion(
		sessionId: number,
		question: QuestionDelivery,
	): Promise<void> {
		this.server.to(this.roomName(sessionId)).emit('question-delivered', question);
		this.scheduleQuestionDeadline(question);
		const progress = await this.gameEngine.getAnswerProgress(
			sessionId,
			question.question.id,
		);
		this.server
			.to(this.hostRoomName(sessionId))
			.emit('answer-progress', progress);
	}

	private scheduleQuestionDeadline(question: QuestionDelivery): void {
		const existing = this.automaticAdvanceTimers.get(question.sessionId);
		if (existing?.questionId === question.question.id) return;
		this.clearAutomaticAdvance(question.sessionId);

		const endsAt = Date.parse(question.endsAt);
		if (!Number.isFinite(endsAt)) return;

		const timer = setTimeout(() => {
			void this.beginAutomaticAdvance(
				question.sessionId,
				question.question.id,
				'timer-ended',
			);
		}, Math.max(0, endsAt - Date.now()));
		timer.unref?.();
		this.automaticAdvanceTimers.set(question.sessionId, {
			questionId: question.question.id,
			phase: 'deadline',
			timer,
		});
	}

	private async beginAutomaticAdvance(
		sessionId: number,
		questionId: number,
		reason: 'timer-ended' | 'all-players-answered',
	): Promise<void> {
		try {
			const current = await this.gameEngine.getCurrentQuestion(sessionId);
			if (!current || current.question.id !== questionId) {
				if (this.automaticAdvanceTimers.get(sessionId)?.questionId === questionId) {
					this.clearAutomaticAdvance(sessionId);
				}
				return;
			}

			const existing = this.automaticAdvanceTimers.get(sessionId);
			if (
				existing?.questionId === questionId &&
				existing.phase !== 'deadline'
			) {
				return;
			}
			if (existing) clearTimeout(existing.timer);

			const countdown = {
				sessionId,
				questionId,
				seconds: 5,
				reason,
				advancesAt: new Date(Date.now() + 5000).toISOString(),
			};
			const timer = setTimeout(() => {
				void this.performAutomaticAdvance(sessionId, questionId);
			}, 5000);
			timer.unref?.();
			this.automaticAdvanceTimers.set(sessionId, {
				questionId,
				phase: 'countdown',
				timer,
				countdown,
			});
			this.server.to(this.roomName(sessionId)).emit('question-countdown', countdown);
		} catch (error) {
			this.logger.error('Unable to start the automatic question countdown.', error);
		}
	}

	private async performAutomaticAdvance(
		sessionId: number,
		questionId: number,
	): Promise<void> {
		const pending = this.automaticAdvanceTimers.get(sessionId);
		if (
			!pending ||
			pending.questionId !== questionId ||
			pending.phase !== 'countdown'
		) {
			return;
		}
		pending.phase = 'advancing';

		try {
			const result = await this.gameEngine.advanceQuestionAutomatically(
				sessionId,
				questionId,
			);
			if (!result.advanced) {
				this.clearAutomaticAdvance(sessionId);
				return;
			}

			this.clearAutomaticAdvance(sessionId);
			if (result.question) {
				await this.broadcastQuestion(sessionId, result.question);
			} else {
				const [leaderboard, statistics] = await Promise.all([
					this.gameEngine.getLeaderboard(sessionId),
					this.gameEngine.getQuestionStatistics(sessionId),
				]);
				this.server.to(this.roomName(sessionId)).emit('competition-finished', {
					sessionId,
					leaderboard,
					statistics,
				});
			}
		} catch (error) {
			if (!(error instanceof ConflictException)) {
				this.logger.error('Unable to automatically advance the question.', error);
			}
			this.clearAutomaticAdvance(sessionId);
		}
	}

	private emitActiveCountdown(
		client: GameSocket,
		sessionId: number,
		questionId: number,
	): void {
		const pending = this.automaticAdvanceTimers.get(sessionId);
		if (
			pending?.questionId === questionId &&
			pending.phase === 'countdown' &&
			pending.countdown
		) {
			client.emit('question-countdown', pending.countdown);
		}
	}

	private clearAutomaticAdvance(sessionId: number): void {
		const pending = this.automaticAdvanceTimers.get(sessionId);
		if (!pending) return;
		clearTimeout(pending.timer);
		this.automaticAdvanceTimers.delete(sessionId);
	}

	private roomName(sessionId: number): string {
		return `game-session:${sessionId}`;
	}

	private hostRoomName(sessionId: number): string {
		return `game-session:${sessionId}:hosts`;
	}

	private emitError(client: GameSocket, error: unknown): void {
		const message =
			typeof error === 'string'
				? error
				: error instanceof HttpException
				? error.message
				: 'Unable to join or start this room.';
		client.emit('room-error', { message });
	}
}
