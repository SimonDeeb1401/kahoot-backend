import { JwtService } from '@nestjs/jwt';
import type { Server, Socket } from 'socket.io';
import { GameEngineService } from './game-engine.service.js';
import { GamesGateway } from './games.gateway.js';

describe('GamesGateway', () => {
  const jwtService = { verifyAsync: vi.fn() };
  const gameEngine = {
    getRoomSnapshot: vi.fn(),
    startCompetition: vi.fn(),
    getCurrentQuestion: vi.fn(),
    advanceQuestion: vi.fn(),
    submitPlayerAnswer: vi.fn(),
    getAnswerProgress: vi.fn(),
    getPlayerAnswerFeedback: vi.fn(),
  };
  let gamesGateway: GamesGateway;
  let roomEmit: ReturnType<typeof vi.fn>;
  let serverTo: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    gamesGateway = new GamesGateway(
      jwtService as unknown as JwtService,
      gameEngine as unknown as GameEngineService,
    );
    roomEmit = vi.fn();
    serverTo = vi.fn(() => ({ emit: roomEmit }));
    Object.defineProperty(gamesGateway, 'server', {
      value: { to: serverTo },
      configurable: true,
    });
  });

  it('verifies a token in socket middleware before allowing connection', async () => {
    jwtService.verifyAsync.mockResolvedValue({ sub: 17 });
    const use = vi.fn();
    gamesGateway.afterInit({ use } as unknown as Server);
    const middleware = use.mock.calls[0][0] as unknown as (
      client: Socket,
      next: (error?: Error) => void,
    ) => Promise<void>;
    const client = {
      handshake: { auth: { token: 'signed-token' } },
      data: {},
    } as unknown as Socket;
    const next = vi.fn();

    await middleware(client, next);

    expect(client.data.userId).toBe(17);
    expect(next).toHaveBeenCalledWith();
  });

  it('joins a verified player to their room and broadcasts its roster', async () => {
    gameEngine.getRoomSnapshot.mockResolvedValue({
      sessionId: 12,
      roomCode: 'AB1234',
      status: 'waiting',
      role: 'player',
      players: [{ id: 29, nickname: 'Player One' }],
      competition: null,
    });
    const client = {
      data: { userId: 17 },
      join: vi.fn(),
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.joinRoom(client, { sessionId: 12, playerId: 29 });

    expect(gameEngine.getRoomSnapshot).toHaveBeenCalledWith(17, 12, 29);
    expect(client.join).toHaveBeenCalledWith('game-session:12');
    expect(serverTo).toHaveBeenCalledWith('game-session:12');
    expect(roomEmit).toHaveBeenCalledWith('players-updated', [
      { id: 29, nickname: 'Player One' },
    ]);
  });

  it('allows only a joined host socket to start the competition', async () => {
    const client = {
      data: { userId: 7, sessionId: 12, role: 'player' },
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.startCompetition(client, { sessionId: 12 });

    expect(gameEngine.startCompetition).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('room-error', {
      message: 'Only the room host can start this competition.',
    });
  });

  it('broadcasts started quiz content to the authorized session room', async () => {
    const competition = {
      sessionId: 12,
      roomCode: 'AB1234',
      quiz: { id: 8, title: 'Quiz', description: null, questions: [] },
    };
    gameEngine.startCompetition.mockResolvedValue(competition);
    gameEngine.getCurrentQuestion.mockResolvedValue(null);
    const client = {
      data: { userId: 7, sessionId: 12, role: 'host' },
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.startCompetition(client, { sessionId: 12 });

    expect(gameEngine.startCompetition).toHaveBeenCalledWith(7, 12);
    expect(serverTo).toHaveBeenCalledWith('game-session:12');
    expect(roomEmit).toHaveBeenCalledWith('competition-started', competition);
  });

  it('broadcasts the next question to the room for the joined host', async () => {
    const question = {
      sessionId: 12,
      questionNumber: 2,
      totalQuestions: 3,
      question: { id: 4, text: 'Question?', answers: [] },
    };
    gameEngine.advanceQuestion.mockResolvedValue(question);
    const client = {
      data: { userId: 7, sessionId: 12, role: 'host' },
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.nextQuestion(client, { sessionId: 12 });

    expect(gameEngine.advanceQuestion).toHaveBeenCalledWith(7, 12);
    expect(serverTo).toHaveBeenCalledWith('game-session:12');
    expect(roomEmit).toHaveBeenCalledWith('question-delivered', question);
  });

  it('rejects question advancement from a player socket', async () => {
    const client = {
      data: { userId: 17, sessionId: 12, role: 'player' },
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.nextQuestion(client, { sessionId: 12 });

    expect(gameEngine.advanceQuestion).not.toHaveBeenCalled();
    expect(client.emit).toHaveBeenCalledWith('room-error', {
      message: 'Only the room host can advance this competition.',
    });
  });

  it('broadcasts completion after the last question', async () => {
    gameEngine.advanceQuestion.mockResolvedValue(null);
    const client = {
      data: { userId: 7, sessionId: 12, role: 'host' },
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.nextQuestion(client, { sessionId: 12 });

    expect(roomEmit).toHaveBeenCalledWith('competition-finished', {
      sessionId: 12,
    });
  });

  it('sends answer feedback only to the player and counts only to hosts', async () => {
    const feedback = {
      sessionId: 12,
      questionId: 3,
      selectedAnswerId: 6,
      correctAnswerId: 5,
      isCorrect: false,
    };
    const progress = {
      sessionId: 12,
      questionId: 3,
      answeredCount: 1,
      totalPlayers: 2,
      answerCounts: [{ answerId: 6, count: 1 }],
    };
    gameEngine.submitPlayerAnswer.mockResolvedValue({ feedback, progress });
    const client = {
      data: { userId: 17, sessionId: 12, playerId: 29, role: 'player' },
      emit: vi.fn(),
    } as unknown as Socket;

    await gamesGateway.submitAnswer(client, { questionId: 3, answerId: 6 });

    expect(gameEngine.submitPlayerAnswer).toHaveBeenCalledWith(17, 12, 29, 3, 6);
    expect(client.emit).toHaveBeenCalledWith('answer-feedback', feedback);
    expect(serverTo).toHaveBeenCalledWith('game-session:12:hosts');
    expect(roomEmit).toHaveBeenCalledWith('answer-progress', progress);
  });
});