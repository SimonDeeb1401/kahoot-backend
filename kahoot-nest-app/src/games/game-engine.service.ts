import {
	BadRequestException,
	ConflictException,
	ForbiddenException,
	Injectable,
	NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Answer } from '../quizzes/entities/answer.entity.js';
import { Question } from '../quizzes/entities/question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { GamePlayer } from './entities/game-player.entity.js';
import { GameSession } from './entities/game-session.entity.js';

export interface RoomPlayerSummary {
	id: number;
	nickname: string;
}

export interface CompetitionQuiz {
	sessionId: number;
	roomCode: string;
	quiz: {
		id: number;
		title: string;
		description: string | null;
		questions: Array<{
			id: number;
			text: string;
			timeLimit: number;
			points: number;
			answers: Array<{ id: number; text: string }>;
		}>;
	};
}

export interface RoomSnapshot {
	sessionId: number;
	roomCode: string;
	status: string;
	role: 'host' | 'player';
	players: RoomPlayerSummary[];
	competition: CompetitionQuiz | null;
}

@Injectable()
export class GameEngineService {
	constructor(
		@InjectRepository(GameSession)
		private readonly sessionsRepository: Repository<GameSession>,
		@InjectRepository(GamePlayer)
		private readonly playersRepository: Repository<GamePlayer>,
		@InjectRepository(Quiz)
		private readonly quizzesRepository: Repository<Quiz>,
		@InjectRepository(Question)
		private readonly questionsRepository: Repository<Question>,
		@InjectRepository(Answer)
		private readonly answersRepository: Repository<Answer>,
	) {}

	async getRoomSnapshot(
		userId: number,
		sessionId: number,
		playerId?: number,
	): Promise<RoomSnapshot> {
		const session = await this.sessionsRepository.findOneBy({ id: sessionId });
		if (!session) {
			throw new NotFoundException('Game session not found');
		}

		const isHost = session.hostId === userId;
		if (!isHost) {
			const player = playerId
				? await this.playersRepository.findOneBy({
						id: playerId,
						sessionId,
						userId,
					})
				: null;
			if (!player) {
				throw new ForbiddenException('You have not joined this room.');
			}
		}

		const players = await this.playersRepository.find({
			where: { sessionId },
			order: { id: 'ASC' },
		});

		return {
			sessionId,
			roomCode: session.roomCode,
			status: session.status,
			role: isHost ? 'host' : 'player',
			players: players.map(({ id, nickname }) => ({ id, nickname })),
			competition:
				session.status === 'active'
					? await this.createCompetitionQuiz(session)
					: null,
		};
	}

	async startCompetition(
		hostId: number,
		sessionId: number,
	): Promise<CompetitionQuiz> {
		const session = await this.sessionsRepository.findOneBy({
			id: sessionId,
			hostId,
		});
		if (!session) {
			throw new NotFoundException('Game session not found');
		}
		if (session.status !== 'waiting') {
			throw new ConflictException('This competition has already started.');
		}

		const playerCount = await this.playersRepository.countBy({ sessionId });
		if (playerCount === 0) {
			throw new BadRequestException('At least one player must join first.');
		}

		const result = await this.sessionsRepository.update(
			{ id: sessionId, hostId, status: 'waiting' },
			{ status: 'active', startedAt: new Date() },
		);
		if (result.affected !== 1) {
			throw new ConflictException('This competition has already started.');
		}

		session.status = 'active';
		return this.createCompetitionQuiz(session);
	}

	private async createCompetitionQuiz(
		session: GameSession,
	): Promise<CompetitionQuiz> {
		const quiz = await this.quizzesRepository.findOneBy({ id: session.quizId });
		if (!quiz) {
			throw new NotFoundException('Quiz not found');
		}

		const questions = await this.questionsRepository.find({
			where: { quizId: session.quizId },
			order: { position: 'ASC' },
		});
		const answers = questions.length
			? await this.answersRepository.find({
					where: { questionId: In(questions.map(({ id }) => id)) },
					order: { position: 'ASC' },
				})
			: [];
		const answersByQuestion = new Map<number, Array<{ id: number; text: string }>>();
		for (const answer of answers) {
			const questionAnswers = answersByQuestion.get(answer.questionId) ?? [];
			questionAnswers.push({ id: answer.id, text: answer.text });
			answersByQuestion.set(answer.questionId, questionAnswers);
		}

		return {
			sessionId: session.id,
			roomCode: session.roomCode,
			quiz: {
				id: quiz.id,
				title: quiz.title,
				description: quiz.description,
				questions: questions.map((question) => ({
					id: question.id,
					text: question.text,
					timeLimit: question.timeLimit,
					points: question.points,
					answers: answersByQuestion.get(question.id) ?? [],
				})),
			},
		};
	}
}
