import {
	BadRequestException,
	ConflictException,
	Injectable,
	NotFoundException,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import bcrypt from 'bcrypt';
import { User } from '../users/user.entity.js';
import { UsersService } from '../users/users.service.js';
import { LoginDto } from './dto/login.dto.js';
import { SignupDto } from './dto/signup.dto.js';

export interface JwtPayload {
	sub: number;
}

export type PublicUser = Pick<User, 'id' | 'username' | 'email' | 'createdAt'>;

export interface AuthResponse {
	accessToken: string;
	tokenType: 'Bearer';
	user: PublicUser;
}

@Injectable()
export class AuthService {
	constructor(
		private readonly usersService: UsersService,
		private readonly jwtService: JwtService,
	) {}

	async signup(signupDto: SignupDto): Promise<AuthResponse> {
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

	async login(loginDto: LoginDto): Promise<AuthResponse> {
		const user = await this.usersService.findByEmailWithPassword(loginDto.email);
		if (!user || !(await bcrypt.compare(loginDto.password, user.passwordHash))) {
			throw new UnauthorizedException('Invalid email or password');
		}

		return this.createAuthResponse(user);
	}

	async getProfile(id: number): Promise<PublicUser> {
		const user = await this.usersService.findById(id);
		if (!user) {
			throw new NotFoundException('User not found');
		}
		return this.toPublicUser(user);
	}

	private async createAuthResponse(user: User): Promise<AuthResponse> {
		return {
			accessToken: await this.jwtService.signAsync({ sub: user.id }),
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
