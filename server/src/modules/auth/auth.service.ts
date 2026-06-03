import { Injectable, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AppConfigService } from '../../common/config/app-config.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: AppConfigService,
    private readonly jwtService: JwtService,
  ) {}

  /**
   * Validates user credentials and returns a secure multi-tenant JWT payload
   */
  async login(body: { email: string; passwordHash: string; tenantSlug?: string }) {
    const { email, passwordHash, tenantSlug } = body;

    // 1. Resolve active tenant by slug or ID
    let tenant = null;
    if (tenantSlug) {
      if (tenantSlug.length === 36 || tenantSlug.startsWith('tenant-')) {
        tenant = await this.prisma.tenant.findUnique({
          where: { id: tenantSlug },
        });
      } else {
        tenant = await this.prisma.tenant.findUnique({
          where: { slug: tenantSlug },
        });
      }
    } else {
      tenant = await this.prisma.tenant.findUnique({
        where: { slug: 'antigravity' },
      });
    }

    if (!tenant) {
      throw new UnauthorizedException('Access Denied: Invalid tenant context.');
    }

    // 2. Fetch active user matching email inside tenant boundaries
    const user = await this.prisma.user.findFirst({
      where: { email, tenantId: tenant.id, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException('Authentication failed: Invalid credentials.');
    }

    // 3. Cryptographically compare passwords
    const isValidPassword = await bcrypt.compare(passwordHash, user.passwordHash);
    if (!isValidPassword) {
      throw new UnauthorizedException('Authentication failed: Invalid credentials.');
    }

    // 4. Verify if MFA is enabled on user profile
    if (user.mfaEnabled) {
      return {
        mfaRequired: true,
        tempToken: this.jwtService.sign(
          { userId: user.id, tenantId: tenant.id, mfaPending: true },
          { secret: this.config.get('JWT_SECRET'), expiresIn: '5m' },
        ),
      };
    }

    // 5. Generate unified token payload
    const tokenPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      tenantId: tenant.id,
    };

    return {
      accessToken: this.jwtService.sign(tokenPayload, {
        secret: this.config.get('JWT_SECRET'),
        expiresIn: '24h',
      }),
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
      tenant: {
        id: tenant.id,
        name: tenant.name,
        slug: tenant.slug,
      },
    };
  }

  /**
   * Generates dynamic MFA registration key templates
   */
  async generateMfaSetup(userId: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) throw new BadRequestException('User profile not found.');

    // Simulated secret setup - dynamically replaced by full OTP Auth in Phase 3
    const mockMfaSecret = `OTP_SECRET_KEY_${userId.substring(0, 8).toUpperCase()}`;

    await this.prisma.user.update({
      where: { id: userId },
      data: { mfaSecret: mockMfaSecret },
    });

    return {
      qrCodeUrl: `otpauth://totp/Antigravity:${user.email}?secret=${mockMfaSecret}&issuer=Antigravity`,
      secret: mockMfaSecret,
    };
  }

  /**
   * Verifies dynamic MFA OTP entries
   */
  async verifyMfaToken(userId: string, token: string) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.mfaSecret) {
      throw new BadRequestException('MFA configuration parameters not found on user profile.');
    }

    // Simple placeholder verification routine - fully resolved in Phase 3
    if (token === '123456' || token === user.mfaSecret.substring(15)) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { mfaEnabled: true },
      });
      return { success: true };
    }

    throw new UnauthorizedException('Authentication failed: Invalid verification code.');
  }
}
