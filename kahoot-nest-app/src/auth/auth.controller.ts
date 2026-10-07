import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	Res,
	UnauthorizedException,
	UseGuards,
} from '@nestjs/common';
import type { CookieOptions, Request, Response } from 'express';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import {
	AuthResponse,
	AuthService,
	AuthSessionResponse,
	JwtPayload,
} from './auth.service.js';
import { AuthResponseDto, PublicUserResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

type AuthenticatedRequest = Request & { user: JwtPayload };
type CookieRequest = Request & { cookies?: Record<string, string> };

const REFRESH_COOKIE = 'kahoot_refresh';
const REFRESH_COOKIE_MAX_AGE = 30 * 24 * 60 * 60 * 1000;

function refreshCookieOptions(): CookieOptions {
	const sameSite = process.env.COOKIE_SAME_SITE === 'none' ? 'none' : 'lax';
	return {
		httpOnly: true,
		secure: process.env.NODE_ENV === 'production' || sameSite === 'none',
		sameSite,
		path: '/auth',
	};
}

function withoutRefreshToken(response: AuthSessionResponse): AuthResponse {
	return {
		accessToken: response.accessToken,
		tokenType: response.tokenType,
		user: response.user,
	};
}

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('signup')
	@ApiOperation({ summary: 'Create an account' })
	@ApiCreatedResponse({ type: AuthResponseDto })
	@ApiResponse({ status: 400, description: 'Request validation failed' })
	@ApiResponse({ status: 409, description: 'Username or email already exists' })
	async signup(
		@Body() signupDto: SignupDto,
		@Res({ passthrough: true }) response: Response,
	) {
		const authResponse = await this.authService.signup(signupDto);
		response.cookie(REFRESH_COOKIE, authResponse.refreshToken, {
			...refreshCookieOptions(),
			maxAge: REFRESH_COOKIE_MAX_AGE,
		});
		return withoutRefreshToken(authResponse);
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Log in and receive a JWT access token' })
	@ApiResponse({ status: 200, type: AuthResponseDto })
	@ApiResponse({ status: 400, description: 'Request validation failed' })
	@ApiResponse({ status: 401, description: 'Invalid email or password' })
	async login(
		@Body() loginDto: LoginDto,
		@Res({ passthrough: true }) response: Response,
	) {
		const authResponse = await this.authService.login(loginDto);
		response.cookie(REFRESH_COOKIE, authResponse.refreshToken, {
			...refreshCookieOptions(),
			maxAge: REFRESH_COOKIE_MAX_AGE,
		});
		return withoutRefreshToken(authResponse);
	}

	@Post('refresh')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Refresh the access token using the HttpOnly cookie' })
	@ApiResponse({ status: 200, type: AuthResponseDto })
	@ApiResponse({ status: 401, description: 'Missing or invalid refresh cookie' })
	async refresh(
		@Req() request: CookieRequest,
		@Res({ passthrough: true }) response: Response,
	) {
		const refreshToken = request.cookies?.[REFRESH_COOKIE];
		if (!refreshToken) {
			throw new UnauthorizedException('Refresh session not found');
		}

		try {
			return await this.authService.refresh(refreshToken);
		} catch (error) {
			response.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
			throw error;
		}
	}

	@Post('logout')
	@HttpCode(HttpStatus.NO_CONTENT)
	@ApiOperation({ summary: 'Clear the HttpOnly refresh cookie' })
	@ApiResponse({ status: 204, description: 'Refresh cookie cleared' })
	logout(@Res({ passthrough: true }) response: Response): void {
		response.clearCookie(REFRESH_COOKIE, refreshCookieOptions());
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	@ApiBearerAuth('bearer')
	@ApiOperation({ summary: 'Get the authenticated user profile' })
	@ApiResponse({ status: 200, type: PublicUserResponseDto })
	@ApiResponse({ status: 401, description: 'Missing or invalid bearer token' })
	@ApiResponse({ status: 404, description: 'User not found' })
	getMe(@Req() request: AuthenticatedRequest) {
		return this.authService.getProfile(request.user.sub);
	}
}
