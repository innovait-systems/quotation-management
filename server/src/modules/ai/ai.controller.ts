import { Controller, Post, Body, UseGuards, Req, BadRequestException } from '@nestjs/common';
import { AiService } from './ai.service';
import { TenantGuard } from '../../common/guards/tenant.guard';
import { RbacGuard } from '../../common/guards/rbac.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '@prisma/client';

@Controller('api/v1/ai')
@UseGuards(TenantGuard, RbacGuard)
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('generate')
  @Roles(UserRole.TENANT_ADMIN, UserRole.SALES, UserRole.OPERATIONS)
  async generateTemplate(
    @Req() req: any,
    @Body('prompt') prompt: string,
    @Body('entityType') entityType: string,
  ) {
    if (!prompt) {
      throw new BadRequestException('A natural language prompt must be provided in the request body.');
    }
    if (!entityType) {
      throw new BadRequestException('A target document entityType (e.g. QUOTATION, PURCHASE_ORDER, INVOICE) must be provided.');
    }

    const tenantId = req.tenant.id;
    return this.aiService.generateTemplateFromPrompt(tenantId, prompt, entityType);
  }
}
