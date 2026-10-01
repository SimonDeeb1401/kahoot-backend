import {
  BadRequestException,
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
  };
  const quizzesRepository = { findOneBy: vi.fn() };
  const questionsRepository = { find: vi.fn() };
  const answersRepository = { find: vi.fn() };
  let gameEngineService: GameEngineService;

  beforeEach(() => {
    vi.clearAllMocks();
    gameEngineService = new GameEngineService(
      sessionsRepository as unknown as Repository<GameSession>,
      playersRepository as unknown as Repository<GamePlayer>,
      quizzesRepository as unknown as Repository<Quiz>,
      questionsRepository as unknown as Repository<Question>,
      answersRepository as unknown as Repository<Answer>,
    );
  });

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