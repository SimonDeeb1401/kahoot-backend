import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';

export interface JwtPayload {
	sub: number;
	tokenUse: 'access' | 'refresh';
}

export type PublicUser = Pick<User, 'id' | 'username' | 'email' | 'createdAt'>;

export interface AuthResponse {
	accessToken: string;
	tokenType: 'Bearer';
	user: PublicUser;
}

export interface AuthSessionResponse extends AuthResponse {
	refreshToken: string;
}

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
		private readonly configService: ConfigService,
	) {}

	async signup(signupDto: SignupDto): Promise<AuthSessionResponse> {
		if (Buffer.byteLength(signupDto.password, 'utf8') > 72) {
			throw new BadRequestException('Password must be at most 72 bytes');
		}

		const existingEmail = await this.usersService.findByEmail(signupDto.email);
		const existingUsername = await this.usersService.findByUsername(
			signupDto.username,
		);

		if (existingEmail || existingUsername) {
			throw new ConflictException('Username or email already exists');
		}

		const passwordHash = await bcrypt.hash(signupDto.password, 12);
		let user: User;

		try {
			user = await this.usersService.create(
				signupDto.username,
				signupDto.email,
				passwordHash,
			);
		} catch (error) {
			if (this.isUniqueConstraintViolation(error)) {
				throw new ConflictException('Username or email already exists');
			}
			throw error;
		}

		return this.createAuthResponse(user);
	}

	async login(loginDto: LoginDto): Promise<AuthSessionResponse> {
		const user = await this.usersService.findByEmailWithPassword(loginDto.email);
		if (!user || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
			throw new UnauthorizedException('Invalid email or password');
		}

		return this.createAuthResponse(user);
	}

	async refresh(refreshToken: string): Promise<AuthResponse> {
		const refreshSecret =
			this.configService.get<string>('JWT_REFRESH_SECRET') ??
			this.configService.getOrThrow<string>('JWT_SECRET');
		let payload: JwtPayload;

		try {
			payload = await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
				secret: refreshSecret,
			});
		} catch {
			throw new UnauthorizedException('Invalid or expired refresh token');
		}

		if (
			payload.tokenUse !== 'refresh' ||
			!Number.isSafeInteger(payload.sub) ||
			payload.sub < 1
		) {
			throw new UnauthorizedException('Invalid refresh token');
		}

		const user = await this.usersService.findById(payload.sub);
		if (!user) {
			throw new UnauthorizedException('Invalid refresh token');
		}

		return this.createAccessResponse(user);
	}

	async getProfile(id: number): Promise<PublicUser> {
		const user = await this.usersService.findById(id);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return this.toPublicUser(user);
	}

	private async createAuthResponse(user: User): Promise<AuthSessionResponse> {
		const refreshSecret =
			this.configService.get<string>('JWT_REFRESH_SECRET') ??
			this.configService.getOrThrow<string>('JWT_SECRET');
		const [accessToken, refreshToken] = await Promise.all([
			this.jwtService.signAsync({ sub: user.id, tokenUse: 'access' }),
			this.jwtService.signAsync(
				{ sub: user.id, tokenUse: 'refresh' },
				{ secret: refreshSecret, expiresIn: '30d' },
			),
		]);

		return {
			accessToken,
			tokenType: 'Bearer',
			refreshToken,
			user: this.toPublicUser(user),
		};
	}

	private async createAccessResponse(user: User): Promise<AuthResponse> {
		return {
			accessToken: await this.jwtService.signAsync({
				sub: user.id,
				tokenUse: 'access',
			}),
			tokenType: 'Bearer',
			user: this.toPublicUser(user),
		};
	}

	private toPublicUser(user: User): PublicUser {
		return {
			id: user.id,
			username: user.username,
			email: user.email,
			createdAt: user.createdAt,
		};
	}

	private isUniqueConstraintViolation(error: unknown): boolean {
		if (typeof error !== 'object' || error === null || !('driverError' in error)) {
			return false;
		}

		const driverError = error.driverError;
		return (
			typeof driverError === 'object' &&
			driverError !== null &&
			'code' in driverError &&
			driverError.code === '23505'
		);
	}
}
