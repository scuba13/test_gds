import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import { hashPassword, verifyPassword } from './password';

const SESSION_COOKIE = 'session';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  getSessionCookieName() {
    return SESSION_COOKIE;
  }

  async register(input: {
    email: string;
    password: string;
    companyName: string;
  }) {
    const existing = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true },
    });

    if (existing) {
      throw new BadRequestException('Email already in use');
    }

    const passwordHash = await hashPassword(input.password);

    const company = await this.prisma.company.create({
      data: {
        name: input.companyName,
        users: {
          create: {
            email: input.email,
            passwordHash,
          },
        },
      },
      include: {
        users: { select: { id: true, email: true, companyId: true } },
      },
    });

    const user = company.users[0];
    const token = await this.signToken(user);

    return { user, token };
  }

  async login(input: { email: string; password: string }) {
    const user = await this.prisma.user.findUnique({
      where: { email: input.email },
      select: { id: true, email: true, passwordHash: true, companyId: true },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const ok = await verifyPassword(input.password, user.passwordHash);
    if (!ok) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const { passwordHash, ...safeUser } = user;
    const token = await this.signToken(safeUser);

    return { user: safeUser, token };
  }

  async me(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, companyId: true, createdAt: true },
    });

    if (!user) {
      throw new UnauthorizedException('Not authenticated');
    }

    return user;
  }

  private async signToken(user: {
    id: string;
    email: string;
    companyId: string;
  }) {
    return this.jwt.signAsync({
      sub: user.id,
      email: user.email,
      companyId: user.companyId,
    });
  }
}
