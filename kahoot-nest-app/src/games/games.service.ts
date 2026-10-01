import { randomInt } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { Answer } from '../quizzes/entities/answer.entity.js';
import { Question } from '../quizzes/entities/question.entity.js';
import { Quiz } from '../quizzes/entities/quiz.entity.js';
import { CreateGamePlayerDto } from './dto/create-game-player.dto.js';
import { UpdateGamePlayerDto } from './dto/update-game-player.dto.js';
import { CreateGameSessionDto } from './dto/create-game-session.dto.js';
import { UpdateGameSessionDto } from './dto/update-game-session.dto.js';
import { CreatePlayerAnswerDto } from './dto/create-player-answer.dto.js';
import { UpdatePlayerAnswerDto } from './dto/update-player-answer.dto.js';
import { GamePlayer } from './entities/game-player.entity.js';
import { GameSession } from './entities/game-session.entity.js';
import { PlayerAnswer } from './entities/player-answer.entity.js';

const ROOM_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export interface JoinableRoom {
  id: number;
  roomCode: string;
  hostUsername: string;
  quiz: {
    id: number;
    title: string;
    description: string | null;
  };
}

export interface JoinableRoomDetails extends JoinableRoom {
  quiz: JoinableRoom['quiz'] & {
    questions: Array<{
      id: number;
      text: string;
      timeLimit: number;
      points: number;
      answers: Array<{ id: number; text: string }>;
    }>;
  };
}

@Injectable()
export class GamesService {
  constructor(
    @InjectRepository(GameSession)
    private readonly sessionsRepository: Repository<GameSession>,
    @InjectRepository(GamePlayer)
    private readonly playersRepository: Repository<GamePlayer>,
    @InjectRepository(PlayerAnswer)
    private readonly playerAnswersRepository: Repository<PlayerAnswer>,
    @InjectRepository(Quiz)
    private readonly quizzesRepository: Repository<Quiz>,
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
    @InjectRepository(Answer)
    private readonly answersRepository: Repository<Answer>,
  ) {}

  async createSession(
    hostId: number,
    dto: CreateGameSessionDto,
  ): Promise<GameSession> {
    const quiz = await this.quizzesRepository.findOneBy({
      id: dto.quizId,
      creatorId: hostId,
    });
    if (!quiz) {
      throw new NotFoundException('Quiz not found');
    }

    const session = this.sessionsRepository.create({
      quizId: dto.quizId,
      quiz: { id: dto.quizId },
      hostId,
      host: { id: hostId },
      roomCode: dto.roomCode ?? this.generateRoomCode(),
      status: 'waiting',
      startedAt: null,
      endedAt: null,
    });
    return this.sessionsRepository.save(session);
  }

  findSessions(hostId: number): Promise<GameSession[]> {
    return this.sessionsRepository.find({
      where: { hostId },
      order: { id: 'DESC' },
    });
  }

  async findJoinableRooms(): Promise<JoinableRoom[]> {
    const sessions = await this.sessionsRepository.find({
      where: { status: 'waiting' },
      relations: { quiz: true, host: true },
      order: { id: 'DESC' },
    });
    return sessions.map((session) => this.toJoinableRoom(session));
  }

  async findJoinableRoom(sessionId: number): Promise<JoinableRoomDetails> {
    const session = await this.sessionsRepository.findOne({
      where: { id: sessionId, status: 'waiting' },
      relations: { quiz: true, host: true },
    });
    if (!session) {
      throw new NotFoundException('Joinable room not found');
    }

    const questions = await this.questionsRepository.find({
      where: { quizId: session.quizId },
      order: { position: 'ASC' },
    });
    const answers = questions.length
      ? await this.answersRepository.find({
          where: { questionId: In(questions.map((question) => question.id)) },
          order: { position: 'ASC' },
        })
      : [];

    return {
      ...this.toJoinableRoom(session),
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        description: session.quiz.description,
        questions: questions.map((question) => ({
          id: question.id,
          text: question.text,
          timeLimit: question.timeLimit,
          points: question.points,
          answers: answers
            .filter((answer) => answer.questionId === question.id)
            .map((answer) => ({ id: answer.id, text: answer.text })),
        })),
      },
    };
  }

  findSession(hostId: number, sessionId: number): Promise<GameSession> {
    return this.findOwnedSession(hostId, sessionId);
  }

  async updateSession(
    hostId: number,
    sessionId: number,
    dto: UpdateGameSessionDto,
  ): Promise<GameSession> {
    const session = await this.findOwnedSession(hostId, sessionId);
    if (dto.status !== undefined) {
      session.status = dto.status;
    }
    if (dto.startedAt !== undefined) {
      session.startedAt = dto.startedAt ? new Date(dto.startedAt) : null;
    }
    if (dto.endedAt !== undefined) {
      session.endedAt = dto.endedAt ? new Date(dto.endedAt) : null;
    }
    return this.sessionsRepository.save(session);
  }

  async removeSession(hostId: number, sessionId: number): Promise<void> {
    const session = await this.findOwnedSession(hostId, sessionId);
    await this.sessionsRepository.remove(session);
  }

  async createPlayer(
    hostId: number,
    sessionId: number,
    dto: CreateGamePlayerDto,
  ): Promise<GamePlayer> {
    await this.findOwnedSession(hostId, sessionId);
    const player = this.playersRepository.create({
      sessionId,
      session: { id: sessionId },
      userId: dto.userId ?? null,
      user: dto.userId ? { id: dto.userId } : null,
      nickname: dto.nickname,
      score: 0,
    });
    return this.playersRepository.save(player);
  }

  async findPlayers(hostId: number, sessionId: number): Promise<GamePlayer[]> {
    await this.findOwnedSession(hostId, sessionId);
    return this.playersRepository.find({
      where: { sessionId },
      order: { id: 'ASC' },
    });
  }

  async findPlayer(
    hostId: number,
    sessionId: number,
    playerId: number,
  ): Promise<GamePlayer> {
    await this.findOwnedSession(hostId, sessionId);
    const player = await this.playersRepository.findOneBy({
      id: playerId,
      sessionId,
    });
    if (!player) {
      throw new NotFoundException('Game player not found');
    }
    return player;
  }

  async updatePlayer(
    hostId: number,
    sessionId: number,
    playerId: number,
    dto: UpdateGamePlayerDto,
  ): Promise<GamePlayer> {
    const player = await this.findPlayer(hostId, sessionId, playerId);
    Object.assign(player, dto);
    return this.playersRepository.save(player);
  }

  async removePlayer(
    hostId: number,
    sessionId: number,
    playerId: number,
  ): Promise<void> {
    const player = await this.findPlayer(hostId, sessionId, playerId);
    await this.playersRepository.remove(player);
  }

  async createPlayerAnswer(
    hostId: number,
    sessionId: number,
    dto: CreatePlayerAnswerDto,
  ): Promise<PlayerAnswer> {
    await this.findOwnedSession(hostId, sessionId);
    const player = await this.playersRepository.findOneBy({
      id: dto.playerId,
      sessionId,
    });
    if (!player) {
      throw new NotFoundException('Game player not found');
    }

    const question = await this.questionsRepository.findOne({
      where: { id: dto.questionId },
      relations: { quiz: true },
    });
    if (!question) {
      throw new NotFoundException('Question not found');
    }

    const session = await this.sessionsRepository.findOneBy({ id: sessionId });
    if (!session || question.quizId !== session.quizId) {
      throw new NotFoundException('Question does not belong to this session');
    }

    const answer = await this.answersRepository.findOneBy({
      id: dto.answerId,
      questionId: dto.questionId,
    });
    if (!answer) {
      throw new NotFoundException('Answer not found');
    }

    const playerAnswer = this.playerAnswersRepository.create({
      sessionId,
      session: { id: sessionId },
      playerId: dto.playerId,
      player: { id: dto.playerId },
      questionId: dto.questionId,
      question: { id: dto.questionId },
      answerId: dto.answerId,
      answer: { id: dto.answerId },
      responseTimeMs: dto.responseTimeMs,
      isCorrect: answer.isCorrect,
    });
    return this.playerAnswersRepository.save(playerAnswer);
  }

  async findPlayerAnswers(
    hostId: number,
    sessionId: number,
  ): Promise<PlayerAnswer[]> {
    await this.findOwnedSession(hostId, sessionId);
    return this.playerAnswersRepository.find({
      where: { sessionId },
      order: { id: 'ASC' },
    });
  }

  async findPlayerAnswer(
    hostId: number,
    sessionId: number,
    playerAnswerId: number,
  ): Promise<PlayerAnswer> {
    await this.findOwnedSession(hostId, sessionId);
    const playerAnswer = await this.playerAnswersRepository.findOneBy({
      id: playerAnswerId,
      sessionId,
    });
    if (!playerAnswer) {
      throw new NotFoundException('Player answer not found');
    }
    return playerAnswer;
  }

  async updatePlayerAnswer(
    hostId: number,
    sessionId: number,
    playerAnswerId: number,
    dto: UpdatePlayerAnswerDto,
  ): Promise<PlayerAnswer> {
    const playerAnswer = await this.findPlayerAnswer(
      hostId,
      sessionId,
      playerAnswerId,
    );
    Object.assign(playerAnswer, dto);
    return this.playerAnswersRepository.save(playerAnswer);
  }

  async removePlayerAnswer(
    hostId: number,
    sessionId: number,
    playerAnswerId: number,
  ): Promise<void> {
    const playerAnswer = await this.findPlayerAnswer(
      hostId,
      sessionId,
      playerAnswerId,
    );
    await this.playerAnswersRepository.remove(playerAnswer);
  }

  private async findOwnedSession(
    hostId: number,
    sessionId: number,
  ): Promise<GameSession> {
    const session = await this.sessionsRepository.findOneBy({
      id: sessionId,
      hostId,
    });
    if (!session) {
      throw new NotFoundException('Game session not found');
    }
    return session;
  }

  private toJoinableRoom(session: GameSession): JoinableRoom {
    return {
      id: session.id,
      roomCode: session.roomCode,
      hostUsername: session.host.username,
      quiz: {
        id: session.quiz.id,
        title: session.quiz.title,
        description: session.quiz.description,
      },
    };
  }

  private generateRoomCode(): string {
    return Array.from({ length: 6 }, () =>
      ROOM_CODE_ALPHABET[randomInt(ROOM_CODE_ALPHABET.length)],
    ).join('');
  }
}