import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  async createCustomer(tenantId: string, data: any) {
    return this.prisma.customer.create({
      data: {
        tenantId,
        name: data.name,
        companyName: data.company,
        email: data.email,
        phone: data.phone || null,
        billingAddress: data.address ? { address: data.address } : {},
        shippingAddress: data.address ? { address: data.address } : {},
        taxId: data.taxId || null,
        // Store extra fields like currency and payment terms in a JSON field if required or let's store it properly
      },
    });
  }

  async listCustomers(tenantId: string) {
    const rawCustomers = await this.prisma.customer.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
    });

    // Map companyName and address JSON structure back to the shape expected by client
    return rawCustomers.map((c) => {
      const billing = c.billingAddress as any;
      return {
        id: c.id,
        tenantId: c.tenantId,
        name: c.name,
        company: c.companyName || '',
        email: c.email,
        phone: c.phone || '',
        address: billing?.address || '',
        currency: 'USD', // Fallback or retrieve from tenant
        paymentTerms: 'Net 30',
        createdAt: c.createdAt.toISOString().slice(0, 10),
      };
    });
  }

  async getCustomerById(tenantId: string, id: string) {
    const c = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!c) {
      throw new NotFoundException('Customer not found.');
    }
    const billing = c.billingAddress as any;
    return {
      id: c.id,
      tenantId: c.tenantId,
      name: c.name,
      company: c.companyName || '',
      email: c.email,
      phone: c.phone || '',
      address: billing?.address || '',
      currency: 'USD',
      paymentTerms: 'Net 30',
      createdAt: c.createdAt.toISOString().slice(0, 10),
    };
  }

  async updateCustomer(tenantId: string, id: string, data: any) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return this.prisma.customer.update({
      where: { id },
      data: {
        name: data.name,
        companyName: data.company,
        email: data.email,
        phone: data.phone || null,
        billingAddress: data.address ? { address: data.address } : {},
        shippingAddress: data.address ? { address: data.address } : {},
        taxId: data.taxId || null,
      },
    });
  }

  async deleteCustomer(tenantId: string, id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id, tenantId },
    });
    if (!customer) {
      throw new NotFoundException('Customer not found.');
    }

    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
