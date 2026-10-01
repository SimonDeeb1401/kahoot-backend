import { NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { Answer } from '../quizzes/entities/answer.entity.js';
import { Question } from '../quizzes/entities/question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { GamePlayer } from './entities/game-player.entity.js';
import { GameSession } from './entities/game-session.entity.js';
import { PlayerAnswer } from './entities/player-answer.entity.js';
import { GamesService } from './games.service.js';

describe('GamesService joinable rooms', () => {
  const sessionsRepository = { find: vi.fn(), findOne: vi.fn() };
  const playersRepository = {};
  const playerAnswersRepository = {};
  const quizzesRepository = {};
  const questionsRepository = { find: vi.fn() };
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

  it('lists only waiting rooms with public quiz and host details', async () => {
    sessionsRepository.find.mockResolvedValue([
      {
        id: 12,
        roomCode: 'AB1234',
        status: 'waiting',
        host: { username: 'host-name', email: 'private@example.com' },
        quiz: { id: 8, title: 'Quiz title', description: 'Quiz description' },
      },
    ]);

    await expect(gamesService.findJoinableRooms()).resolves.toEqual([
      {
        id: 12,
        roomCode: 'AB1234',
        hostUsername: 'host-name',
        quiz: { id: 8, title: 'Quiz title', description: 'Quiz description' },
      },
    ]);
    expect(sessionsRepository.find).toHaveBeenCalledWith({
      where: { status: 'waiting' },
      relations: { quiz: true, host: true },
      order: { id: 'DESC' },
    });
  });

  it('returns quiz questions without exposing correct-answer flags', async () => {
    sessionsRepository.findOne.mockResolvedValue({
      id: 12,
      quizId: 8,
      roomCode: 'AB1234',
      host: { username: 'host-name' },
      quiz: { id: 8, title: 'Quiz title', description: null },
    });
    questionsRepository.find.mockResolvedValue([
      { id: 3, text: 'Question text', timeLimit: 20, points: 1000 },
    ]);
    answersRepository.find.mockResolvedValue([
      { id: 5, questionId: 3, text: 'Choice', isCorrect: true },
    ]);

    await expect(gamesService.findJoinableRoom(12)).resolves.toEqual({
      id: 12,
      roomCode: 'AB1234',
      hostUsername: 'host-name',
      quiz: {
        id: 8,
        title: 'Quiz title',
        description: null,
        questions: [
          {
            id: 3,
            text: 'Question text',
            timeLimit: 20,
            points: 1000,
            answers: [{ id: 5, text: 'Choice' }],
          },
        ],
      },
    });
  });

  it('does not expose details for a room that is no longer joinable', async () => {
    sessionsRepository.findOne.mockResolvedValue(null);

    await expect(gamesService.findJoinableRoom(12)).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(questionsRepository.find).not.toHaveBeenCalled();
  });
});