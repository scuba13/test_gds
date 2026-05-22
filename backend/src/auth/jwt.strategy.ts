import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import type { Request } from 'express';

function extractJwtFromCookie(req: Request): string | null {
  const cookies = req.cookies as unknown;
  if (!cookies || typeof cookies !== 'object') return null;
  const c = cookies as Record<string, unknown>;
  return typeof c.session === 'string' ? c.session : null;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor() {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
      throw new Error('JWT_SECRET is not set');
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([extractJwtFromCookie]),
      ignoreExpiration: false,
      secretOrKey: secret,
    });
  }

  validate(payload: unknown) {
    if (!payload || typeof payload !== 'object') {
      throw new UnauthorizedException('Invalid token');
    }

    const p = payload as Record<string, unknown>;
    const sub = typeof p.sub === 'string' ? p.sub : undefined;
    const companyId = typeof p.companyId === 'string' ? p.companyId : undefined;
    const email = typeof p.email === 'string' ? p.email : undefined;

    if (!sub || !companyId) {
      throw new UnauthorizedException('Invalid token');
    }

    return {
      userId: sub,
      companyId,
      email,
    };
  }
}
