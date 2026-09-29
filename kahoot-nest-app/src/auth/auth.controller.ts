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
import { AuthService, JwtPayload } from './auth.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';
import { JwtAuthGuard } from './jwt-auth.guard.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Controller('auth')
export class AuthController {
	constructor(private readonly authService: AuthService) {}

	@Post('signup')
	signup(@Body() signupDto: SignupDto) {
		return this.authService.signup(signupDto);
	}

	@Post('login')
	@HttpCode(HttpStatus.OK)
	login(@Body() loginDto: LoginDto) {
		return this.authService.login(loginDto);
	}

	@Get('me')
	@UseGuards(JwtAuthGuard)
	getMe(@Req() request: AuthenticatedRequest) {
		return this.authService.getProfile(request.user.sub);
	}
}
