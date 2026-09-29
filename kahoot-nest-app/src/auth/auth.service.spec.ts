import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { AuthService } from './auth.service.js';

describe('AuthService', () => {
  const usersService = {
    findByEmail: vi.fn(),
    findByUsername: vi.fn(),
    findByEmailWithPassword: vi.fn(),
    findById: vi.fn(),
    create: vi.fn(),
  };
  const jwtService = { signAsync: vi.fn() };
  let authService: AuthService;

  const user = (passwordHash = 'stored-hash'): User =>
    Object.assign(new User(), {
      id: 9,
      username: 'player_one',
      email: 'player@example.com',
      passwordHash,
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    });

  beforeEach(() => {
    vi.clearAllMocks();
    jwtService.signAsync.mockResolvedValue('signed-token');
    authService = new AuthService(
      usersService as unknown as UsersService,
      jwtService as unknown as JwtService,
    );
  });

  it('hashes the signup password and returns only public user fields', async () => {
    const savedUser = user();
    usersService.findByEmail.mockResolvedValue(null);
    usersService.findByUsername.mockResolvedValue(null);
    usersService.create.mockImplementation(
      async (username: string, email: string, passwordHash: string) =>
        Object.assign(new User(), savedUser, {
          username,
          email,
          passwordHash,
        }),
    );

    const response = await authService.signup({
      username: 'player_one',
      email: 'player@example.com',
      password: 'correct-horse-battery',
    });

    const storedHash = usersService.create.mock.calls[0][2] as string;
    expect(await bcrypt.compare('correct-horse-battery', storedHash)).toBe(true);
    expect(storedHash).not.toBe('correct-horse-battery');
    expect(response).toEqual({
      accessToken: 'signed-token',
      tokenType: 'Bearer',
      user: {
        id: 9,
        username: 'player_one',
        email: 'player@example.com',
        createdAt: savedUser.createdAt,
      },
    });
    expect(response.user).not.toHaveProperty('passwordHash');
  });

  it('rejects signup when an email or username already exists', async () => {
    usersService.findByEmail.mockResolvedValue(user());
    usersService.findByUsername.mockResolvedValue(null);

    await expect(
      authService.signup({
        username: 'player_one',
        email: 'player@example.com',
        password: 'correct-horse-battery',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(usersService.create).not.toHaveBeenCalled();
  });

  it('returns a token after verifying the stored bcrypt hash', async () => {
    const passwordHash = await bcrypt.hash('correct-horse-battery', 4);
    usersService.findByEmailWithPassword.mockResolvedValue(user(passwordHash));

    const response = await authService.login({
      email: 'player@example.com',
      password: 'correct-horse-battery',
    });

    expect(response.accessToken).toBe('signed-token');
    expect(jwtService.signAsync).toHaveBeenCalledWith({ sub: 9 });
  });

  it('rejects invalid login credentials without revealing which value failed', async () => {
    usersService.findByEmailWithPassword.mockResolvedValue(null);

    await expect(
      authService.login({
        email: 'missing@example.com',
        password: 'wrong-password',
      }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});