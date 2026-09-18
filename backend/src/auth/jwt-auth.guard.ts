import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';
import { UsersService } from '../users/users.service.js';
import type { PublicUser } from './auth.types.js';
import type { JwtPayload } from './jwt-payload.js';

export type RequestWithUser = Request & { user: PublicUser };

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly users: UsersService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const token = this.extractToken(request);
    if (!token) {
      throw new UnauthorizedException('Missing access token');
    }

    try {
      const payload = await this.jwt.verifyAsync<JwtPayload>(token);
      const user = await this.users.findById(payload.sub);
      if (!user) {
        throw new UnauthorizedException('Account no longer exists');
      }
      request.user = this.users.toPublic(user);
      return true;
    } catch {
      throw new UnauthorizedException('Invalid or expired session');
    }
  }

  private extractToken(request: Request): string | null {
    const header = request.headers.authorization;
    if (!header?.startsWith('Bearer ')) {
      return null;
    }
    return header.slice(7).trim() || null;
  }
}
