import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { CreateCustomerDto } from './dto/create-customer.dto';
import type { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.customer.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  create(companyId: string, dto: CreateCustomerDto) {
    return this.prisma.customer.create({
      data: {
        companyId,
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.customer.findFirst({
      where: { id, companyId },
    });
  }

  updateById(companyId: string, id: string, dto: UpdateCustomerDto) {
    return this.prisma.customer.update({
      where: { id },
      data: {
        name: dto.name,
        email: dto.email,
        phone: dto.phone,
      },
    });
  }

  deleteById(companyId: string, id: string) {
    return this.prisma.customer.delete({
      where: { id },
    });
  }
}
