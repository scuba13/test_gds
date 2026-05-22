import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import * as jwt from 'jsonwebtoken';
import type { Request } from 'express';
import type { RequestUser } from '../types/request-user';

@Injectable()
export class AuthGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<Request>();
    const token = req.cookies?.session as string | undefined;

    if (!token) {
      throw new UnauthorizedException('Unauthorized');
    }

    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }

    try {
      const payload = jwt.verify(token, secret) as jwt.JwtPayload;

      const userId = payload.sub;
      const companyId = payload.companyId as string | undefined;
      const email = payload.email as string | undefined;

      if (!userId || !companyId) {
        throw new UnauthorizedException('Unauthorized');
      }

      req.user = { userId, companyId, email } satisfies RequestUser;
      return true;
    } catch {
      throw new UnauthorizedException('Unauthorized');
    }
  }
}
