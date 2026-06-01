import { Controller, Post, Body, Headers, HttpCode, HttpStatus, BadRequestException } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('api/v1/auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(
    @Headers('x-tenant-id') tenantHeader: string,
    @Body() body: { email: string; passwordHash: string; tenantSlug?: string },
  ) {
    if (!body.email || !body.passwordHash) {
      throw new BadRequestException('Email and password fields are required.');
    }
    
    // Inject tenantHeader context if body parameters are absent
    const payload = {
      ...body,
      tenantSlug: body.tenantSlug || tenantHeader,
    };
    
    return this.authService.login(payload);
  }

  @Post('mfa/setup')
  @HttpCode(HttpStatus.OK)
  async setupMfa(@Body() body: { userId: string }) {
    if (!body.userId) {
      throw new BadRequestException('userId parameter is required.');
    }
    return this.authService.generateMfaSetup(body.userId);
  }

  @Post('mfa/verify')
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Body() body: { userId: string; token: string }) {
    if (!body.userId || !body.token) {
      throw new BadRequestException('userId and token parameters are required.');
    }
    return this.authService.verifyMfaToken(body.userId, body.token);
  }
}
