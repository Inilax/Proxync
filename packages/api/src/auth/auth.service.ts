import {
  Injectable,
  ConflictException,
  UnauthorizedException,
  NotFoundException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';
import { SignupDto, LoginDto } from './dto/auth.dto';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async signup(dto: SignupDto) {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Email already in use');
    }

    const passwordHash = await bcrypt.hash(dto.password, 12);
    const user = await this.prisma.user.create({
      data: { name: dto.name, email: dto.email, passwordHash },
    });

    return this.issueTokens(user.id, user.email);
  }

  async login(dto: LoginDto) {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return this.issueTokens(user.id, user.email);
  }

  async refresh(refreshToken: string) {
    // Verify token signature
    let payload: { sub: string; email: string; jti: string };
    try {
      payload = await this.jwt.verifyAsync(refreshToken, {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') as string,
      });
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }

    // Check DB record
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const stored = await this.prisma.refreshToken.findFirst({
      where: { userId: payload.sub, revokedAt: null },
    });
    if (!stored) {
      throw new UnauthorizedException('Refresh token revoked or not found');
    }

    // Rotate: revoke old, issue new
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    return this.issueTokens(payload.sub, payload.email);
  }

  getAuthConfig() {
    const requireAuth = this.config.get<string>('REQUIRE_AUTHENTICATION') !== 'false';
    return { requireAuthentication: requireAuth };
  }

  async createGuestSession() {
    const guestId = uuidv4();
    const email = `guest_${guestId.substring(0, 8)}@proxync.local`;
    const name = `Guest User`;

    const user = await this.prisma.user.create({
      data: {
        id: guestId,
        email,
        name,
        passwordHash: 'guest-disabled-hash',
        memberships: {
          create: {
            role: 'OWNER',
            workspace: {
              create: {
                name: 'Guest Workspace',
                ownerId: guestId,
                channels: {
                  create: {
                    name: 'general',
                    type: 'TEXT',
                  },
                },
              },
            },
          },
        },
      },
    });

    return this.issueTokens(user.id, user.email);
  }

  async getMe(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, name: true, createdAt: true },
    });
    if (!user) throw new NotFoundException('User not found');
    return user;
  }

  private async issueTokens(userId: string, email: string) {
    const jti = uuidv4();

    const accessToken = await this.jwt.signAsync(
      { sub: userId, email },
      {
        secret: this.config.get<string>('JWT_SECRET') as string,
        expiresIn: (this.config.get<string>('JWT_ACCESS_EXPIRES_IN') ?? '15m') as any,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, email, jti },
      {
        secret: this.config.get<string>('JWT_REFRESH_SECRET') as string,
        expiresIn: (this.config.get<string>('JWT_REFRESH_EXPIRES_IN') ?? '7d') as any,
      },
    );

    // Store refresh token hash
    const tokenHash = await bcrypt.hash(refreshToken, 8);
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.refreshToken.create({
      data: { userId, tokenHash, expiresAt },
    });

    return { accessToken, refreshToken };
  }
}
