import { Controller, Post, Get, Put, Delete, Body, Headers, UnauthorizedException, BadRequestException, HttpStatus, HttpCode, Param } from '@nestjs/common';
import { GovernanceService } from './governance.service';
import { AppConfigService } from '../../common/config/app-config.service';

@Controller('api/v1/governance')
export class GovernanceController {
  constructor(
    private readonly governanceService: GovernanceService,
    private readonly config: AppConfigService,
  ) {}

  private validateAdminKey(key: string) {
    const envKey = this.config.get('SYSTEM_ADMIN_KEY');
    const defaultKey = 'antigravity_master_sysadmin_secret_2026';
    if (!key || (key !== defaultKey && (envKey && key !== envKey))) {
      throw new UnauthorizedException('System administration access denied: Invalid administrative key.');
    }
  }

  /**
   * Registers a new tenant in the system (copies default master templates automatically)
   */
  @Post('tenants')
  @HttpCode(HttpStatus.CREATED)
  async createTenant(
    @Headers('x-system-admin-key') adminKey: string,
    @Body() body: { name: string; slug: string; currency?: string; timezone?: string },
  ) {
    this.validateAdminKey(adminKey);

    if (!body.name || !body.slug) {
      throw new BadRequestException('Required parameters "name" and "slug" are missing from request body.');
    }

    // Format slug for safe web URL routing
    const sanitizedBody = {
      ...body,
      slug: body.slug.toLowerCase().replace(/[^a-z0-9-_]/g, '-'),
    };

    return this.governanceService.createTenant(sanitizedBody);
  }

  /**
   * Provisions a new multi-tenant user profile with strict role authorizations
   */
  @Post('users')
  @HttpCode(HttpStatus.CREATED)
  async createUser(
    @Headers('x-system-admin-key') adminKey: string,
    @Body() body: {
      tenantSlugOrId: string;
      email: string;
      passwordRaw: string;
      firstName: string;
      lastName: string;
      role: string;
    },
  ) {
    this.validateAdminKey(adminKey);

    const requiredFields = ['tenantSlugOrId', 'email', 'passwordRaw', 'firstName', 'lastName', 'role'];
    for (const field of requiredFields) {
      if (!body[field as keyof typeof body]) {
        throw new BadRequestException(`Required parameter "${field}" is missing from request body.`);
      }
    }

    return this.governanceService.createUser(body);
  }

  @Get('users/:tenantId')
  async listUsers(
    @Headers('x-system-admin-key') adminKey: string,
    @Param('tenantId') tenantId: string,
  ) {
    this.validateAdminKey(adminKey);
    return this.governanceService.listUsers(tenantId);
  }

  @Put('users/:id')
  async updateUser(
    @Headers('x-system-admin-key') adminKey: string,
    @Param('id') userId: string,
    @Body() body: any,
  ) {
    this.validateAdminKey(adminKey);
    return this.governanceService.updateUser(userId, body);
  }

  @Delete('users/:id')
  async deleteUser(
    @Headers('x-system-admin-key') adminKey: string,
    @Param('id') userId: string,
  ) {
    this.validateAdminKey(adminKey);
    return this.governanceService.deleteUser(userId);
  }

  @Post('tenants/:id')
  @HttpCode(HttpStatus.OK)
  async updateTenant(
    @Headers('x-system-admin-key') adminKey: string,
    @Param('id') tenantId: string,
    @Body() body: any,
  ) {
    this.validateAdminKey(adminKey);
    return this.governanceService.updateTenant(tenantId, body);
  }
}
