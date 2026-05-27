import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class MetricsService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(companyId: string) {
    const [
      totalCustomers,
      totalContacts,
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      openPipelineAmount,
    ] = await Promise.all([
      this.prisma.customer.count({ where: { companyId } }),
      this.prisma.contact.count({ where: { companyId } }),
      this.prisma.opportunity.count({ where: { companyId } }),
      this.prisma.opportunity.count({
        where: { companyId, stage: { notIn: ['WON', 'LOST'] } },
      }),
      this.prisma.opportunity.count({ where: { companyId, stage: 'WON' } }),
      this.prisma.opportunity.count({ where: { companyId, stage: 'LOST' } }),
      this.prisma.opportunity.aggregate({
        where: { companyId, stage: { notIn: ['WON', 'LOST'] } },
        _sum: { amount: true },
      }),
    ]);

    return {
      totalCustomers,
      totalContacts,
      totalOpportunities,
      openOpportunities,
      wonOpportunities,
      lostOpportunities,
      openPipelineAmount: openPipelineAmount._sum.amount ?? 0,
    };
  }
}
