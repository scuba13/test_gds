import { OpportunitiesService } from './opportunities.service';

describe('OpportunitiesService', () => {
  it('moveStage returns null when opportunity not found in tenant', async () => {
    const prisma = {
      $transaction: async (fn: any) => fn({
        opportunity: {
          findFirst: async () => null,
        },
      }),
    };

    const service = new OpportunitiesService(prisma as any);

    const res = await service.moveStage({
      companyId: 'c1',
      opportunityId: 'o1',
      toStage: 'QUALIFIED',
      changedByUserId: 'u1',
    });

    expect(res).toBeNull();
  });

  it('moveStage updates stage and creates history (transaction)', async () => {
    const calls: any[] = [];

    const existing = {
      id: 'o1',
      companyId: 'c1',
      customerId: 'cust1',
      title: 'Opp',
      amount: 10,
      stage: 'NEW',
      expectedCloseDate: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const prisma = {
      $transaction: async (fn: any) =>
        fn({
          opportunity: {
            findFirst: async () => existing,
            update: async (_args: any) => {
              calls.push(['opportunity.update', _args]);
              return { ...existing, stage: 'QUALIFIED' };
            },
          },
          opportunityStageHistory: {
            create: async (_args: any) => {
              calls.push(['opportunityStageHistory.create', _args]);
              return { id: 'h1', ..._args.data };
            },
          },
        }),
    };

    const service = new OpportunitiesService(prisma as any);

    const res = await service.moveStage({
      companyId: 'c1',
      opportunityId: 'o1',
      toStage: 'QUALIFIED',
      changedByUserId: 'u1',
    });

    expect(res).toEqual(expect.objectContaining({ id: 'o1', stage: 'QUALIFIED' }));

    expect(calls).toEqual([
      [
        'opportunity.update',
        {
          where: { id: 'o1' },
          data: { stage: 'QUALIFIED' },
        },
      ],
      [
        'opportunityStageHistory.create',
        {
          data: {
            companyId: 'c1',
            opportunityId: 'o1',
            fromStage: 'NEW',
            toStage: 'QUALIFIED',
            changedByUserId: 'u1',
          },
        },
      ],
    ]);
  });
});
