import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { OpportunityStage } from './dto/opportunity-stage';
import type { CreateOpportunityDto } from './dto/create-opportunity.dto';
import type { UpdateOpportunityDto } from './dto/update-opportunity.dto';

@Injectable()
export class OpportunitiesService {
  constructor(private readonly prisma: PrismaService) {}

  list(companyId: string) {
    return this.prisma.opportunity.findMany({
      where: { companyId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async customerExists(companyId: string, customerId: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, companyId },
      select: { id: true },
    });
    return Boolean(customer);
  }

  async create(companyId: string, dto: CreateOpportunityDto) {
    const ok = await this.customerExists(companyId, dto.customerId);
    if (!ok) return null;

    return this.prisma.opportunity.create({
      data: {
        companyId,
        customerId: dto.customerId,
        title: dto.title,
        amount: dto.amount,
        stage: dto.stage,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
      },
    });
  }

  findById(companyId: string, id: string) {
    return this.prisma.opportunity.findFirst({
      where: { id, companyId },
    });
  }

  updateById(companyId: string, id: string, dto: UpdateOpportunityDto) {
    return this.prisma.opportunity.update({
      where: { id },
      data: {
        customerId: dto.customerId,
        title: dto.title,
        amount: dto.amount,
        stage: dto.stage,
        expectedCloseDate: dto.expectedCloseDate
          ? new Date(dto.expectedCloseDate)
          : undefined,
      },
    });
  }

  deleteById(companyId: string, id: string) {
    return this.prisma.opportunity.delete({
      where: { id },
    });
  }

  async moveStage(params: {
    companyId: string;
    opportunityId: string;
    toStage: OpportunityStage;
    changedByUserId?: string;
  }) {
    const { companyId, opportunityId, toStage, changedByUserId } = params;

    return this.prisma.$transaction(async (tx) => {
      const existing = await tx.opportunity.findFirst({
        where: { id: opportunityId, companyId },
      });
      if (!existing) return null;

      if (existing.stage === toStage) {
        return existing;
      }

      const updated = await tx.opportunity.update({
        where: { id: opportunityId },
        data: { stage: toStage },
      });

      await tx.opportunityStageHistory.create({
        data: {
          companyId,
          opportunityId,
          fromStage: existing.stage,
          toStage,
          changedByUserId,
        },
      });

      return updated;
    });
  }

  listHistory(companyId: string, opportunityId: string) {
    return this.prisma.opportunityStageHistory.findMany({
      where: { companyId, opportunityId },
      orderBy: { changedAt: 'desc' },
    });
  }
}
