import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Answer } from '../quizzes/entities/answer.entity.js';
import { Question } from '../quizzes/entities/question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { GamePlayer } from './entities/game-player.entity.js';
import { GameSession } from './entities/game-session.entity.js';
import { PlayerAnswer } from './entities/player-answer.entity.js';
import { GamesService } from './games.service.js';

describe('GamesService room joining', () => {
  const sessionsRepository = { findOneBy: vi.fn() };
  const playersRepository = {
    create: vi.fn((player) => player),
    save: vi.fn(async (player) => ({ id: 29, ...player })),
  };
  const playerAnswersRepository = {};
  const quizzesRepository = {};
  const questionsRepository = {};
  const answersRepository = { find: vi.fn() };
  let gamesService: GamesService;

  beforeEach(() => {
    vi.clearAllMocks();
    gamesService = new GamesService(
      sessionsRepository as unknown as Repository<GameSession>,
      playersRepository as unknown as Repository<GamePlayer>,
      playerAnswersRepository as unknown as Repository<PlayerAnswer>,
      quizzesRepository as unknown as Repository<Quiz>,
      questionsRepository as unknown as Repository<Question>,
      answersRepository as unknown as Repository<Answer>,
    );
  });

  it('creates a player in a waiting room for the authenticated user', async () => {
    sessionsRepository.findOneBy.mockResolvedValue({
      id: 12,
      roomCode: 'AB1234',
    });

    await expect(
      gamesService.joinRoom(17, {
        roomCode: 'AB1234',
        nickname: 'Player One',
      }),
    ).resolves.toEqual({
      playerId: 29,
      sessionId: 12,
      roomCode: 'AB1234',
      nickname: 'Player One',
    });
    expect(sessionsRepository.findOneBy).toHaveBeenCalledWith({
      roomCode: 'AB1234',
      status: 'waiting',
    });
    expect(playersRepository.create).toHaveBeenCalledWith({
      sessionId: 12,
      session: { id: 12 },
      userId: 17,
      user: { id: 17 },
      nickname: 'Player One',
      score: 0,
    });
    expect(playersRepository.save).toHaveBeenCalled();
  });

  it('rejects codes for missing or non-waiting rooms', async () => {
    sessionsRepository.findOneBy.mockResolvedValue(null);

    await expect(
      gamesService.joinRoom(17, { roomCode: 'AB1234', nickname: 'Player One' }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(playersRepository.save).not.toHaveBeenCalled();
  });
});