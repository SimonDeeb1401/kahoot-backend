import {
	Body,
	Controller,
	Get,
	HttpCode,
	HttpStatus,
	Post,
	Req,
	UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import {
	ApiBearerAuth,
	ApiCreatedResponse,
	ApiOperation,
	ApiResponse,
	ApiTags,
} from '@nestjs/swagger';
import { AuthService, JwtPayload } from './auth.service.js';
import { AuthResponseDto, PublicUserResponseDto } from './dto/auth-response.dto.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('auth')
@ApiTags('Auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('signup')
	@ApiOperation({ summary: 'Create an account' })
	@ApiCreatedResponse({ type: AuthResponseDto })
	@ApiResponse({ status: 400, description: 'Request validation failed' })
	@ApiResponse({ status: 409, description: 'Username or email already exists' })
	signup(@Body() signupDto: SignupDto) {
		return this.authService.signup(signupDto);
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	@ApiOperation({ summary: 'Log in and receive a JWT access token' })
	@ApiResponse({ status: 200, type: AuthResponseDto })
	@ApiResponse({ status: 400, description: 'Request validation failed' })
	@ApiResponse({ status: 401, description: 'Invalid email or password' })
	login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
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
