import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { Repository } from 'typeorm';
import { Answer } from '../quizzes/entities/answer.entity.js';
import { Question } from '../quizzes/entities/question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { GamePlayer } from './entities/game-player.entity.js';
import { GameSession } from './entities/game-session.entity.js';
import { GameEngineService } from './game-engine.service.js';

describe('GameEngineService', () => {
  const sessionsRepository = {
    findOneBy: vi.fn(),
    update: vi.fn(),
  };
  const playersRepository = {
    findOneBy: vi.fn(),
    find: vi.fn(),
    countBy: vi.fn(),
    increment: vi.fn(),
  };
  const quizzesRepository = { findOneBy: vi.fn() };
  const questionsRepository = { find: vi.fn() };
  const answersRepository = { find: vi.fn(), findOneBy: vi.fn() };
  const playerAnswersRepository = {
    find: vi.fn(),
    findOneBy: vi.fn(),
    create: vi.fn((playerAnswer) => playerAnswer),
    save: vi.fn(async (playerAnswer) => playerAnswer),
  };
  let gameEngineService: GameEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    gameEngineService = new GameEngineService(
      sessionsRepository as unknown as Repository<GameSession>,
      playersRepository as unknown as Repository<GamePlayer>,
      quizzesRepository as unknown as Repository<Quiz>,
      questionsRepository as unknown as Repository<Question>,
      answersRepository as unknown as Repository<Answer>,
      playerAnswersRepository as unknown as Repository<PlayerAnswer>,
    );
    playerAnswersRepository.find.mockResolvedValue([]);
  });

  afterEach(() => vi.restoreAllMocks());

  it('returns a roster only to the host or a joined player', async () => {
    sessionsRepository.findOneBy.mockResolvedValue({
      id: 12,
      hostId: 7,
      roomCode: 'AB1234',
      status: 'waiting',
    });
    playersRepository.findOneBy.mockResolvedValue({ id: 29 });
    playersRepository.find.mockResolvedValue([
      { id: 29, nickname: 'Player One', userId: 17 },
    ]);

    await expect(gameEngineService.getRoomSnapshot(17, 12, 29)).resolves.toEqual({
      sessionId: 12,
      roomCode: 'AB1234',
      status: 'waiting',
      role: 'player',
      players: [{ id: 29, nickname: 'Player One' }],
      competition: null,
      leaderboard: null,
    });
    expect(playersRepository.findOneBy).toHaveBeenCalledWith({
      id: 29,
      sessionId: 12,
      userId: 17,
    });
  });

  it('rejects a user who is not a member of the room', async () => {
    sessionsRepository.findOneBy.mockResolvedValue({
      id: 12,
      hostId: 7,
      roomCode: 'AB1234',
      status: 'waiting',
    });
    playersRepository.findOneBy.mockResolvedValue(null);

    await expect(gameEngineService.getRoomSnapshot(17, 12, 29)).rejects.toBeInstanceOf(
      ForbiddenException,
    );
    expect(playersRepository.find).not.toHaveBeenCalled();
  });

  it('returns persisted player scores in leaderboard order for completed rooms', async () => {
    sessionsRepository.findOneBy.mockResolvedValue({
      id: 12,
      hostId: 7,
      roomCode: 'AB1234',
      status: 'completed',
    });
    playersRepository.find.mockResolvedValue([
      { id: 31, nickname: 'Player Two', score: 950 },
      { id: 29, nickname: 'Player One', score: 600 },
    ]);

    await expect(gameEngineService.getRoomSnapshot(7, 12)).resolves.toMatchObject({
      leaderboard: [
        { id: 31, nickname: 'Player Two', score: 950 },
        { id: 29, nickname: 'Player One', score: 600 },
      ],
    });
    expect(playersRepository.find).toHaveBeenCalledWith({
      where: { sessionId: 12 },
      order: { score: 'DESC', id: 'ASC' },
    });
  });

  it('starts a waiting session and exposes answer text but not correctness', async () => {
    sessionsRepository.findOneBy.mockResolvedValue({
      id: 12,
      hostId: 7,
      quizId: 8,
      roomCode: 'AB1234',
      status: 'waiting',
    });
    playersRepository.countBy.mockResolvedValue(1);
    sessionsRepository.update.mockResolvedValue({ affected: 1 });
    quizzesRepository.findOneBy.mockResolvedValue({
      id: 8,
      title: 'Quiz title',
      description: null,
    });
    questionsRepository.find.mockResolvedValue([
      { id: 3, text: 'Question?', timeLimit: 20, points: 1000 },
    ]);
    answersRepository.find.mockResolvedValue([
      { id: 5, questionId: 3, text: 'Choice', isCorrect: true },
    ]);

    await expect(gameEngineService.startCompetition(7, 12)).resolves.toEqual({
      sessionId: 12,
      roomCode: 'AB1234',
      quiz: {
        id: 8,
        title: 'Quiz title',
        description: null,
        questions: [
          {
            id: 3,
            text: 'Question?',
            timeLimit: 20,
            points: 1000,
            answers: [{ id: 5, text: 'Choice' }],
          },
        ],
      },
    });
    expect(sessionsRepository.update).toHaveBeenCalledWith(
      { id: 12, hostId: 7, status: 'waiting' },
      expect.objectContaining({ status: 'active', startedAt: expect.any(Date) }),
    );
  });

  it('delivers questions one at a time and reports when the quiz is complete', async () => {
    const session = {
      id: 12,
      hostId: 7,
      quizId: 8,
      roomCode: 'AB1234',
      status: 'waiting',
    };
    sessionsRepository.findOneBy.mockResolvedValue(session);
    playersRepository.countBy.mockResolvedValue(1);
    sessionsRepository.update.mockResolvedValue({ affected: 1 });
    quizzesRepository.findOneBy.mockResolvedValue({
      id: 8,
      title: 'Quiz title',
      description: null,
    });
    questionsRepository.find.mockResolvedValue([
      { id: 3, text: 'First?', timeLimit: 20, points: 1000 },
      { id: 4, text: 'Second?', timeLimit: 15, points: 500 },
    ]);
    answersRepository.find.mockResolvedValue([
      { id: 5, questionId: 3, text: 'First choice', isCorrect: true },
      { id: 6, questionId: 4, text: 'Second choice', isCorrect: false },
    ]);

    await gameEngineService.startCompetition(7, 12);

    await expect(gameEngineService.getCurrentQuestion(12)).resolves.toEqual({
      sessionId: 12,
      questionNumber: 1,
      totalQuestions: 2,
      endsAt: expect.any(String),
      question: {
        id: 3,
        text: 'First?',
        timeLimit: 20,
        points: 1000,
        answers: [{ id: 5, text: 'First choice' }],
      },
    });
    session.currentQuestionStartedAt = new Date(Date.now() - 30_000);
    await expect(gameEngineService.advanceQuestion(7, 12)).resolves.toEqual({
      sessionId: 12,
      questionNumber: 2,
      totalQuestions: 2,
      question: {
        id: 4,
        text: 'Second?',
        timeLimit: 15,
        points: 500,
        answers: [{ id: 6, text: 'Second choice' }],
      },
      endsAt: expect.any(String),
    });
    session.currentQuestionStartedAt = new Date(Date.now() - 30_000);
    await expect(gameEngineService.advanceQuestion(7, 12)).resolves.toBeNull();
    await expect(gameEngineService.advanceQuestion(7, 12)).resolves.toBeNull();
  });

  it('accepts one joined player answer and returns private correctness feedback', async () => {
  const session = {
    id: 12,
    hostId: 7,
    quizId: 8,
    roomCode: 'AB1234',
    status: 'active',
    currentQuestionIndex: 0,
    currentQuestionStartedAt: new Date(Date.now() - 1200),
    startedAt: new Date(Date.now() - 1200),
  };
  sessionsRepository.findOneBy.mockResolvedValue(session);
  playersRepository.findOneBy.mockResolvedValue({ id: 29, sessionId: 12, userId: 17, score: 350 });
  playersRepository.countBy.mockResolvedValue(2);
  quizzesRepository.findOneBy.mockResolvedValue({ id: 8, title: 'Quiz title', description: null });
  questionsRepository.find.mockResolvedValue([
    { id: 3, text: 'First?', timeLimit: 20, points: 1000 },
  ]);
  answersRepository.find.mockResolvedValue([
    { id: 5, questionId: 3, text: 'Correct', isCorrect: true },
    { id: 6, questionId: 3, text: 'Wrong', isCorrect: false },
  ]);
  answersRepository.findOneBy
    .mockResolvedValueOnce({
    id: 6,
    questionId: 3,
    text: 'Wrong',
    isCorrect: false,
    })
    .mockResolvedValueOnce({
      id: 5,
      questionId: 3,
      text: 'Correct',
      isCorrect: true,
    });
  playerAnswersRepository.findOneBy.mockResolvedValue(null);
  playerAnswersRepository.find.mockResolvedValue([{ answerId: 6 }]);

  await expect(gameEngineService.submitPlayerAnswer(17, 12, 29, 3, 6)).resolves.toEqual({
    feedback: {
      sessionId: 12,
      questionId: 3,
      selectedAnswerId: 6,
      correctAnswerId: 5,
      isCorrect: false,
      pointsAwarded: 0,
      totalScore: 350,
    },
    progress: {
      sessionId: 12,
      questionId: 3,
      answeredCount: 1,
      totalPlayers: 2,
      answerCounts: [{ answerId: 6, count: 1 }],
    },
  });
  expect(playerAnswersRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({
      sessionId: 12,
      playerId: 29,
      questionId: 3,
      answerId: 6,
      isCorrect: false,
      pointsAwarded: 0,
      responseTimeMs: expect.any(Number),
    }),
  );
  });

  it('rejects a second answer for the same player and question', async () => {
  const session = {
    id: 12,
    quizId: 8,
    status: 'active',
    currentQuestionIndex: 0,
    currentQuestionStartedAt: new Date(),
  };
  sessionsRepository.findOneBy.mockResolvedValue(session);
  playersRepository.findOneBy.mockResolvedValue({ id: 29, sessionId: 12, userId: 17 });
  quizzesRepository.findOneBy.mockResolvedValue({ id: 8, title: 'Quiz title', description: null });
  questionsRepository.find.mockResolvedValue([
    { id: 3, text: 'First?', timeLimit: 20, points: 1000 },
  ]);
  answersRepository.find.mockResolvedValue([]);
  playerAnswersRepository.findOneBy.mockResolvedValue({ id: 71 });

  await expect(gameEngineService.submitPlayerAnswer(17, 12, 29, 3, 5)).rejects.toBeInstanceOf(
    ConflictException,
  );
  expect(playerAnswersRepository.save).not.toHaveBeenCalled();
  });

  it('blocks host advancement until all players answer or the deadline expires', async () => {
  const session = {
    id: 12,
    hostId: 7,
    quizId: 8,
    status: 'active',
    currentQuestionIndex: 0,
    currentQuestionStartedAt: new Date(),
  };
  sessionsRepository.findOneBy.mockResolvedValue(session);
  playersRepository.countBy.mockResolvedValue(2);
  quizzesRepository.findOneBy.mockResolvedValue({ id: 8, title: 'Quiz title', description: null });
  questionsRepository.find.mockResolvedValue([
    { id: 3, text: 'First?', timeLimit: 20, points: 1000 },
    { id: 4, text: 'Second?', timeLimit: 15, points: 500 },
  ]);
  answersRepository.find.mockResolvedValue([]);
  playerAnswersRepository.find.mockResolvedValue([{ answerId: 5 }]);

  await expect(gameEngineService.advanceQuestion(7, 12)).rejects.toBeInstanceOf(
    ConflictException,
  );
  playerAnswersRepository.find.mockResolvedValue([{ answerId: 5 }, { answerId: 6 }]);
  await expect(gameEngineService.advanceQuestion(7, 12)).resolves.toMatchObject({
    questionNumber: 2,
    question: { id: 4 },
  });
  });

  it('awards a speed-weighted score and increments the player total', async () => {
  const startedAt = new Date(10_000);
  const player = { id: 29, sessionId: 12, userId: 17, score: 250 };
  sessionsRepository.findOneBy.mockResolvedValue({
    id: 12,
    quizId: 8,
    status: 'active',
    currentQuestionIndex: 0,
    currentQuestionStartedAt: startedAt,
  });
  playersRepository.findOneBy
    .mockResolvedValueOnce(player)
    .mockResolvedValueOnce({ ...player, score: 1200 });
  playersRepository.countBy.mockResolvedValue(1);
  quizzesRepository.findOneBy.mockResolvedValue({ id: 8, title: 'Quiz title', description: null });
  questionsRepository.find.mockResolvedValue([
    { id: 3, text: 'First?', timeLimit: 20, points: 1000 },
  ]);
  answersRepository.find.mockResolvedValue([
    { id: 5, questionId: 3, text: 'Correct', isCorrect: true },
  ]);
  answersRepository.findOneBy.mockResolvedValue({
    id: 5,
    questionId: 3,
    text: 'Correct',
    isCorrect: true,
  });
  playerAnswersRepository.findOneBy.mockResolvedValue(null);
  playerAnswersRepository.find.mockResolvedValue([{ answerId: 5 }]);
  vi.spyOn(Date, 'now').mockReturnValue(12_000);

  await expect(gameEngineService.submitPlayerAnswer(17, 12, 29, 3, 5)).resolves.toMatchObject({
    feedback: {
      isCorrect: true,
      pointsAwarded: 950,
      totalScore: 1200,
    },
  });
  expect(playerAnswersRepository.save).toHaveBeenCalledWith(
    expect.objectContaining({ responseTimeMs: 2000, pointsAwarded: 950 }),
  );
  expect(playersRepository.increment).toHaveBeenCalledWith(
    { id: 29, sessionId: 12 },
    'score',
    950,
  );
  });

  it('requires at least one player before the host can start', async () => {
    sessionsRepository.findOneBy.mockResolvedValue({
      id: 12,
      hostId: 7,
      status: 'waiting',
    });
    playersRepository.countBy.mockResolvedValue(0);

    await expect(gameEngineService.startCompetition(7, 12)).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(sessionsRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a session the user does not host', async () => {
    sessionsRepository.findOneBy.mockResolvedValue(null);

    await expect(gameEngineService.startCompetition(17, 12)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(playersRepository.countBy).not.toHaveBeenCalled();
  });
});