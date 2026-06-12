import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class AgreementsService {
  constructor(private readonly prisma: PrismaService) {}

  async createAgreement(tenantId: string, data: any) {
    const { title, documentType, customerId, customerName, customerCompany, description, status, initialVersion } = data;
    
    return this.prisma.agreement.create({
      data: {
        tenantId,
        title,
        documentType,
        customerId,
        customerName,
        customerCompany,
        description: description || '',
        status: status || 'DRAFT',
        versions: {
          create: {
            versionLabel: initialVersion.versionLabel,
            changeDescription: initialVersion.changeDescription,
            fileName: initialVersion.fileName,
            fileSize: initialVersion.fileSize,
            uploadedBy: 'Rajesh S. (You)',
          },
        },
      },
      include: {
        versions: true,
      },
    });
  }

  async addVersion(tenantId: string, agreementId: string, versionData: any) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id: agreementId, tenantId },
    });

    if (!agreement) {
      throw new NotFoundException('Agreement not found.');
    }

    return this.prisma.agreementVersion.create({
      data: {
        agreementId,
        versionLabel: versionData.versionLabel,
        changeDescription: versionData.changeDescription,
        fileName: versionData.fileName,
        fileSize: versionData.fileSize,
        uploadedBy: 'Rajesh S. (You)',
      },
    });
  }

  async listAgreements(tenantId: string) {
    return this.prisma.agreement.findMany({
      where: { tenantId },
      orderBy: { updatedAt: 'desc' },
      include: {
        versions: true,
      },
    });
  }

  async getAgreementById(tenantId: string, id: string) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id, tenantId },
      include: {
        versions: true,
      },
    });
    if (!agreement) {
      throw new NotFoundException('Agreement not found.');
    }
    return agreement;
  }

  async updateAgreement(tenantId: string, id: string, data: any) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id, tenantId },
    });
    if (!agreement) {
      throw new NotFoundException('Agreement not found.');
    }

    return this.prisma.agreement.update({
      where: { id },
      data: {
        status: data.status,
      },
    });
  }

  async deleteAgreement(tenantId: string, id: string) {
    const agreement = await this.prisma.agreement.findFirst({
      where: { id, tenantId },
    });
    if (!agreement) {
      throw new NotFoundException('Agreement not found.');
    }

    return this.prisma.agreement.delete({
      where: { id },
    });
  }
}
