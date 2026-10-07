import { HttpException } from '@nestjs/common';
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
import { GameEngineService } from './game-engine.service.js';

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

@WebSocketGateway({ cors: { origin: true } })
export class GamesGateway implements OnGatewayInit, OnGatewayDisconnect {
	@WebSocketServer()
	private server!: Server;

	constructor(
		private readonly jwtService: JwtService,
		private readonly gameEngine: GameEngineService,
	) {}

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
					if (snapshot.role === 'host') {
						client.emit(
							'answer-progress',
							await this.gameEngine.getAnswerProgress(
								message.sessionId,
								currentQuestion.question.id,
							),
						);
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
				room.emit('question-delivered', question);
				this.server
					.to(this.hostRoomName(message.sessionId))
					.emit(
						'answer-progress',
						await this.gameEngine.getAnswerProgress(
							message.sessionId,
							question.question.id,
						),
					);
			} else {
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
		} catch (error) {
			this.emitError(client, error);
		}
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
