import {
	CanActivate,
	ExecutionContext,
	Injectable,
	UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { JwtPayload } from './auth.service.js';

type AuthenticatedRequest = Request & { user: JwtPayload };

@Injectable()
export class JwtAuthGuard implements CanActivate {
	constructor(private readonly jwtService: JwtService) {}

	async canActivate(context: ExecutionContext): Promise<boolean> {
		const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
		const authorization = request.headers.authorization;
		const [scheme, token, extra] = authorization?.split(' ') ?? [];

		if (scheme !== 'Bearer' || !token || extra) {
			throw new UnauthorizedException('Bearer token required');
		}

		try {
			const payload = await this.jwtService.verifyAsync<JwtPayload>(token);
			if (!Number.isInteger(payload.sub)) {
				throw new UnauthorizedException('Invalid bearer token');
			}
			request.user = payload;
			return true;
		} catch {
			throw new UnauthorizedException('Invalid or expired bearer token');
		}
	}
}
