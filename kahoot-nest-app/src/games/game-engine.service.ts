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
import { PlayerAnswer } from './entities/player-answer.entity.js';

export interface RoomPlayerSummary {
	id: number;
	nickname: string;
}

export interface LeaderboardEntry extends RoomPlayerSummary {
	score: number;
}

export interface QuestionStatistic {
	questionId: number;
	questionText: string;
	correctAnswers: number;
	totalPlayers: number;
	averageResponseTimeMs: number | null;
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

export interface QuestionDelivery {
	sessionId: number;
	questionNumber: number;
	totalQuestions: number;
	endsAt: string;
	question: CompetitionQuiz['quiz']['questions'][number];
}

export interface AnswerProgress {
	sessionId: number;
	questionId: number;
	answeredCount: number;
	totalPlayers: number;
	answerCounts: Array<{ answerId: number; count: number }>;
}

export interface AnswerFeedback {
	sessionId: number;
	questionId: number;
	selectedAnswerId: number;
	correctAnswerId: number;
	isCorrect: boolean;
	pointsAwarded: number;
	totalScore: number;
}

export interface RoomSnapshot {
	sessionId: number;
	roomCode: string;
	status: string;
	role: 'host' | 'player';
	players: RoomPlayerSummary[];
	competition: CompetitionQuiz | null;
	leaderboard: LeaderboardEntry[] | null;
	statistics: QuestionStatistic[] | null;
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
		@InjectRepository(PlayerAnswer)
		private readonly playerAnswersRepository: Repository<PlayerAnswer>,
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
					? await this.createCurrentQuestionCompetition(session)
					: null,
			leaderboard:
				session.status === 'completed' ? await this.getLeaderboard(sessionId) : null,
			statistics:
				session.status === 'completed'
					? await this.getQuestionStatistics(sessionId)
					: null,
		};
	}

	async getLeaderboard(sessionId: number): Promise<LeaderboardEntry[]> {
		const players = await this.playersRepository.find({
			where: { sessionId },
			order: { score: 'DESC', id: 'ASC' },
		});
		return players.map(({ id, nickname, score }) => ({ id, nickname, score }));
	}

	async getQuestionStatistics(sessionId: number): Promise<QuestionStatistic[]> {
		const session = await this.sessionsRepository.findOneBy({ id: sessionId });
		if (!session) {
			throw new NotFoundException('Game session not found');
		}

		const competition = await this.createCompetitionQuiz(session);
		const [totalPlayers, playerAnswers] = await Promise.all([
			this.playersRepository.countBy({ sessionId }),
			this.playerAnswersRepository.find({ where: { sessionId } }),
		]);
		const answersByQuestion = new Map<
			number,
			{ correctAnswers: number; responseTimeTotal: number; responseCount: number }
		>();

		for (const answer of playerAnswers) {
			const statistic = answersByQuestion.get(answer.questionId) ?? {
				correctAnswers: 0,
				responseTimeTotal: 0,
				responseCount: 0,
			};
			if (answer.isCorrect) statistic.correctAnswers += 1;
			statistic.responseTimeTotal += answer.responseTimeMs;
			statistic.responseCount += 1;
			answersByQuestion.set(answer.questionId, statistic);
		}

		return competition.quiz.questions.map((question) => {
			const statistic = answersByQuestion.get(question.id);
			return {
				questionId: question.id,
				questionText: question.text,
				correctAnswers: statistic?.correctAnswers ?? 0,
				totalPlayers,
				averageResponseTimeMs: statistic?.responseCount
					? Math.round(statistic.responseTimeTotal / statistic.responseCount)
					: null,
			};
		});
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
			{
				status: 'active',
				startedAt: new Date(),
				currentQuestionIndex: 0,
				currentQuestionStartedAt: new Date(),
			},
		);
		if (result.affected !== 1) {
			throw new ConflictException('This competition has already started.');
		}

		session.status = 'active';
		session.currentQuestionIndex = 0;
		session.currentQuestionStartedAt = new Date();
		return this.createCurrentQuestionCompetition(session);
	}

	async getCurrentQuestion(sessionId: number): Promise<QuestionDelivery | null> {
		const session = await this.sessionsRepository.findOneBy({ id: sessionId });
		if (!session || session.status !== 'active') return null;

		const competition = await this.createCompetitionQuiz(session);
		const questionIndex = session.currentQuestionIndex ?? 0;
		const question = competition.quiz.questions[questionIndex];
		if (!question) return null;

		const startedAt = await this.getQuestionStartedAt(session);
		return {
			sessionId,
			questionNumber: questionIndex + 1,
			totalQuestions: competition.quiz.questions.length,
			endsAt: new Date(startedAt.getTime() + question.timeLimit * 1000).toISOString(),
			question,
		};
	}

	async getAnswerProgress(
		sessionId: number,
		questionId: number,
	): Promise<AnswerProgress> {
		const [totalPlayers, playerAnswers] = await Promise.all([
			this.playersRepository.countBy({ sessionId }),
			this.playerAnswersRepository.find({ where: { sessionId, questionId } }),
		]);
		const counts = new Map<number, number>();
		for (const playerAnswer of playerAnswers) {
			counts.set(playerAnswer.answerId, (counts.get(playerAnswer.answerId) ?? 0) + 1);
		}

		return {
			sessionId,
			questionId,
			answeredCount: playerAnswers.length,
			totalPlayers,
			answerCounts: [...counts].map(([answerId, count]) => ({ answerId, count })),
		};
	}

	async getPlayerAnswerFeedback(
		sessionId: number,
		playerId: number,
		questionId: number,
	): Promise<AnswerFeedback | null> {
		const playerAnswer = await this.playerAnswersRepository.findOneBy({
			sessionId,
			playerId,
			questionId,
		});
		if (!playerAnswer) return null;
		const player = await this.playersRepository.findOneBy({ id: playerId, sessionId });
		if (!player) return null;

		return {
			sessionId,
			questionId,
			selectedAnswerId: playerAnswer.answerId,
			correctAnswerId: playerAnswer.isCorrect ? playerAnswer.answerId :
				(await this.answersRepository.findOneBy({ questionId, isCorrect: true }))?.id ?? 0,
			isCorrect: playerAnswer.isCorrect,
			pointsAwarded: playerAnswer.pointsAwarded,
			totalScore: player.score,
		};
	}

	async submitPlayerAnswer(
		userId: number,
		sessionId: number,
		playerId: number,
		questionId: number,
		answerId: number,
	): Promise<{ feedback: AnswerFeedback; progress: AnswerProgress }> {
		const session = await this.sessionsRepository.findOneBy({ id: sessionId });
		if (!session || session.status !== 'active') {
			throw new ConflictException('This competition is not accepting answers.');
		}
		const player = await this.playersRepository.findOneBy({ id: playerId, sessionId, userId });
		if (!player) {
			throw new ForbiddenException('You have not joined this room.');
		}

		const competition = await this.createCompetitionQuiz(session);
		const question = competition.quiz.questions[session.currentQuestionIndex ?? 0];
		if (!question || question.id !== questionId) {
			throw new ConflictException('This question is no longer active.');
		}

		const startedAt = await this.getQuestionStartedAt(session);
		if (Date.now() >= startedAt.getTime() + question.timeLimit * 1000) {
			throw new ConflictException('Time is up for this question.');
		}

		const existingAnswer = await this.playerAnswersRepository.findOneBy({
			sessionId,
			playerId,
			questionId,
		});
		if (existingAnswer) {
			throw new ConflictException('You have already answered this question.');
		}

		const answer = await this.answersRepository.findOneBy({ id: answerId, questionId });
		if (!answer) {
			throw new NotFoundException('Answer not found for this question.');
		}

		const responseTimeMs = Date.now() - startedAt.getTime();
		const pointsAwarded = answer.isCorrect
			? Math.round(
					question.points *
						(1 - 0.5 * Math.min(responseTimeMs / (question.timeLimit * 1000), 1)),
				)
			: 0;
		const playerAnswer = this.playerAnswersRepository.create({
			sessionId,
			session: { id: sessionId } as GameSession,
			playerId,
			player: { id: playerId } as GamePlayer,
			questionId,
			question: { id: questionId } as Question,
			answerId,
			answer,
			responseTimeMs,
			isCorrect: answer.isCorrect,
			pointsAwarded,
		});
		await this.playerAnswersRepository.save(playerAnswer);
		if (pointsAwarded > 0) {
			await this.playersRepository.increment({ id: playerId, sessionId }, 'score', pointsAwarded);
		}
		const updatedPlayer = await this.playersRepository.findOneBy({ id: playerId, sessionId });

		const correctAnswer = answer.isCorrect
			? answer
			: await this.answersRepository.findOneBy({ questionId, isCorrect: true });
		const feedback: AnswerFeedback = {
			sessionId,
			questionId,
			selectedAnswerId: answerId,
			correctAnswerId: correctAnswer?.id ?? 0,
			isCorrect: answer.isCorrect,
			pointsAwarded,
			totalScore: updatedPlayer?.score ?? (player.score ?? 0) + pointsAwarded,
		};
		return {
			feedback,
			progress: await this.getAnswerProgress(sessionId, questionId),
		};
	}

	async advanceQuestion(
		hostId: number,
		sessionId: number,
	): Promise<QuestionDelivery | null> {
		const session = await this.sessionsRepository.findOneBy({
			id: sessionId,
			hostId,
		});
		if (!session) {
			throw new NotFoundException('Game session not found');
		}
		if (session.status !== 'active') {
			throw new ConflictException('This competition is not active.');
		}

		const competition = await this.createCompetitionQuiz(session);
		const currentIndex = session.currentQuestionIndex ?? 0;
		const currentQuestion = competition.quiz.questions[currentIndex];
		if (!currentQuestion) return null;

		const startedAt = await this.getQuestionStartedAt(session);
		const progress = await this.getAnswerProgress(sessionId, currentQuestion.id);
		const deadline = startedAt.getTime() + currentQuestion.timeLimit * 1000;
		if (progress.answeredCount < progress.totalPlayers && Date.now() < deadline) {
			throw new ConflictException('Wait for all players to answer or for the timer to end.');
		}

		const nextIndex = currentIndex + 1;
		if (nextIndex >= competition.quiz.questions.length) {
			const result = await this.sessionsRepository.update(
				{ id: sessionId, hostId, status: 'active', currentQuestionIndex: currentIndex },
				{ status: 'completed', endedAt: new Date() },
			);
			if (result.affected !== 1) {
				throw new ConflictException('The competition has already finished.');
			}
			return null;
		}

		const nextQuestionStartedAt = new Date();
		const result = await this.sessionsRepository.update(
			{ id: sessionId, hostId, status: 'active', currentQuestionIndex: currentIndex },
			{ currentQuestionIndex: nextIndex, currentQuestionStartedAt: nextQuestionStartedAt },
		);
		if (result.affected !== 1) {
			throw new ConflictException('The question has already advanced.');
		}
		session.currentQuestionIndex = nextIndex;
		session.currentQuestionStartedAt = nextQuestionStartedAt;
		return this.getCurrentQuestion(sessionId);
	}

	async advanceQuestionAutomatically(
		sessionId: number,
		questionId: number,
	): Promise<{ advanced: boolean; question: QuestionDelivery | null }> {
		const session = await this.sessionsRepository.findOneBy({ id: sessionId });
		if (!session || session.status !== 'active') {
			return { advanced: false, question: null };
		}

		const competition = await this.createCompetitionQuiz(session);
		const currentQuestion =
			competition.quiz.questions[session.currentQuestionIndex ?? 0];
		if (!currentQuestion || currentQuestion.id !== questionId) {
			return { advanced: false, question: null };
		}

		return {
			advanced: true,
			question: await this.advanceQuestion(session.hostId, sessionId),
		};
	}

	private async createCurrentQuestionCompetition(
		session: GameSession,
	): Promise<CompetitionQuiz> {
		const competition = await this.createCompetitionQuiz(session);
		const questionIndex = session.currentQuestionIndex ?? 0;
		return {
			...competition,
			quiz: {
				...competition.quiz,
				questions: competition.quiz.questions.slice(questionIndex, questionIndex + 1),
			},
		};
	}

	private async getQuestionStartedAt(session: GameSession): Promise<Date> {
		if (session.currentQuestionStartedAt) return session.currentQuestionStartedAt;
		const startedAt = session.startedAt ?? new Date();
		await this.sessionsRepository.update(
			{ id: session.id, status: 'active' },
			{ currentQuestionStartedAt: startedAt },
		);
		session.currentQuestionStartedAt = startedAt;
		return startedAt;
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
