import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateContactDto } from './dto/create-contact.dto';
import type { UpdateContactDto } from './dto/update-contact.dto';

@Injectable()
export class ContactsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForCustomer(companyId: string, customerId: string) {
    // Ensure customer belongs to company; return null when not found/cross-tenant.
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    if (!customer) return null;

    const contacts = await this.prisma.contact.findMany({
      where: { companyId, customerId },
      orderBy: { createdAt: 'desc' },
    });

    return contacts;
  }

  async createForCustomer(companyId: string, customerId: string, dto: CreateContactDto) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    if (!customer) return null;

    return this.prisma.contact.create({
      data: {
        companyId,
        customerId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.contact.findFirst({
      where: { id, companyId },
    });
  }

  updateById(companyId: string, id: string, dto: UpdateContactDto) {
    return this.prisma.contact.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  deleteById(companyId: string, id: string) {
    return this.prisma.contact.delete({
      where: { id },
    });
  }
}
