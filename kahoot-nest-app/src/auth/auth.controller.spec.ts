import { UnauthorizedException } from '@nestjs/common';
import type { Response } from 'express';
import {
  AuthResponse,
  AuthService,
  AuthSessionResponse,
} from './auth.service.js';
import { AuthController } from './auth.controller.js';

describe('AuthController cookie session', () => {
  const sessionResponse: AuthSessionResponse = {
    accessToken: 'short-lived-access-token',
    refreshToken: 'long-lived-refresh-token',
    tokenType: 'Bearer',
    user: {
      id: 9,
      username: 'player_one',
      email: 'player@example.com',
      createdAt: new Date('2026-01-02T03:04:05.000Z'),
    },
  };
  const publicResponse: AuthResponse = {
    accessToken: sessionResponse.accessToken,
    tokenType: sessionResponse.tokenType,
    user: sessionResponse.user,
  };
  const authService = {
    signup: vi.fn(),
    login: vi.fn(),
    refresh: vi.fn(),
  };
  const response = {
    cookie: vi.fn(),
    clearCookie: vi.fn(),
  };
  let controller: AuthController;

  beforeEach(() => {
    vi.clearAllMocks();
    controller = new AuthController(authService as unknown as AuthService);
  });

  it('sets an HttpOnly refresh cookie and excludes it from signup JSON', async () => {
    authService.signup.mockResolvedValue(sessionResponse);

    await expect(
      controller.signup(
        {
          username: 'player_one',
          email: 'player@example.com',
          password: 'password123',
        },
        response as unknown as Response,
      ),
    ).resolves.toEqual(publicResponse);

    expect(response.cookie).toHaveBeenCalledWith(
      'kahoot_refresh',
      'long-lived-refresh-token',
      expect.objectContaining({ httpOnly: true, path: '/auth' }),
    );
  });

  it('refreshes from the HttpOnly cookie without returning a refresh token', async () => {
    authService.refresh.mockResolvedValue(publicResponse);

    await expect(
      controller.refresh(
        { cookies: { kahoot_refresh: 'long-lived-refresh-token' } },
        response as unknown as Response,
      ),
    ).resolves.toEqual(publicResponse);
    expect(authService.refresh).toHaveBeenCalledWith('long-lived-refresh-token');
  });

  it('clears an invalid refresh cookie', async () => {
    authService.refresh.mockRejectedValue(
      new UnauthorizedException('Invalid refresh token'),
    );

    await expect(
      controller.refresh(
        { cookies: { kahoot_refresh: 'expired-token' } },
        response as unknown as Response,
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);
    expect(response.clearCookie).toHaveBeenCalledWith(
      'kahoot_refresh',
      expect.objectContaining({ path: '/auth' }),
    );
  });

  it('clears the refresh cookie on logout', () => {
    controller.logout(response as unknown as Response);

    expect(response.clearCookie).toHaveBeenCalledWith(
      'kahoot_refresh',
      expect.objectContaining({ path: '/auth' }),
    );
  });
});