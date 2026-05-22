import request from 'supertest';

type CustomerDto = { id: string; name: string };

type OpportunityDto = {
  id: string;
  customerId: string;
  title: string;
  stage: string;
};

type HistoryDto = {
  id: string;
  opportunityId: string;
  fromStage: string;
  toStage: string;
};

function uniqueEmail(prefix: string) {
  const nonce = process.hrtime.bigint();
  return `${prefix}_${nonce}@example.com`;
}

function assertCustomerDto(value: unknown): asserts value is CustomerDto {
  if (!value || typeof value !== 'object') throw new Error('Invalid customer dto');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') throw new Error('Invalid customer dto: id');
  if (typeof v.name !== 'string') throw new Error('Invalid customer dto: name');
}

function assertOpportunityDto(value: unknown): asserts value is OpportunityDto {
  if (!value || typeof value !== 'object')
    throw new Error('Invalid opportunity dto');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') throw new Error('Invalid opportunity dto: id');
  if (typeof v.customerId !== 'string')
    throw new Error('Invalid opportunity dto: customerId');
  if (typeof v.title !== 'string') throw new Error('Invalid opportunity dto: title');
  if (typeof v.stage !== 'string') throw new Error('Invalid opportunity dto: stage');
}

function assertHistoryDto(value: unknown): asserts value is HistoryDto {
  if (!value || typeof value !== 'object') throw new Error('Invalid history dto');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') throw new Error('Invalid history dto: id');
  if (typeof v.opportunityId !== 'string')
    throw new Error('Invalid history dto: opportunityId');
  if (typeof v.fromStage !== 'string')
    throw new Error('Invalid history dto: fromStage');
  if (typeof v.toStage !== 'string')
    throw new Error('Invalid history dto: toStage');
}

function assertHistoryList(value: unknown): asserts value is HistoryDto[] {
  if (!Array.isArray(value)) throw new Error('Expected history list');
  for (const item of value) assertHistoryDto(item);
}

describe('Kanban stage transitions (e2e)', () => {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
  const password = 'password123';

  async function registerAndGetCookie(prefix: string) {
    const email = uniqueEmail(prefix);

    const registerRes = await request(baseUrl)
      .post('/auth/register')
      .send({ email, password, companyName: 'E2E Co' })
      .expect(201);

    const setCookie = registerRes.header['set-cookie'];
    expect(setCookie?.[0]).toContain('session=');

    return setCookie[0].split(';')[0];
  }

  async function createCustomer(cookie: string, name = 'Acme') {
    const res = await request(baseUrl)
      .post('/customers')
      .set('Cookie', cookie)
      .send({ name })
      .expect(201);

    assertCustomerDto(res.body);
    return res.body;
  }

  async function createOpportunity(cookie: string, customerId: string) {
    const res = await request(baseUrl)
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({
        customerId,
        title: 'Opp',
        amount: 10,
        stage: 'NEW',
      })
      .expect(201);

    assertOpportunityDto(res.body);
    return res.body;
  }

  it('move updates stage and creates history record', async () => {
    const cookie = await registerAndGetCookie('e2e_kanban');
    const customer = await createCustomer(cookie, 'Customer 1');
    const opp = await createOpportunity(cookie, customer.id);

    const moved = await request(baseUrl)
      .post(`/opportunities/${opp.id}/move`)
      .set('Cookie', cookie)
      .send({ toStage: 'QUALIFIED' })
      .expect(201);

    assertOpportunityDto(moved.body);
    expect(moved.body.stage).toBe('QUALIFIED');

    const historyRes = await request(baseUrl)
      .get(`/opportunities/${opp.id}/history`)
      .set('Cookie', cookie)
      .expect(200);

    assertHistoryList(historyRes.body);
    expect(historyRes.body.length).toBeGreaterThanOrEqual(1);

    const latest = historyRes.body[0];
    expect(latest.opportunityId).toBe(opp.id);
    expect(latest.fromStage).toBe('NEW');
    expect(latest.toStage).toBe('QUALIFIED');
  });

  it('multi-tenant isolation: tenant B cannot move nor read history (404)', async () => {
    const cookieA = await registerAndGetCookie('e2e_kanban_a');
    const cookieB = await registerAndGetCookie('e2e_kanban_b');

    const customerA = await createCustomer(cookieA, 'Tenant A Customer');
    const oppA = await createOpportunity(cookieA, customerA.id);

    await request(baseUrl)
      .post(`/opportunities/${oppA.id}/move`)
      .set('Cookie', cookieB)
      .send({ toStage: 'WON' })
      .expect(404);

    await request(baseUrl)
      .get(`/opportunities/${oppA.id}/history`)
      .set('Cookie', cookieB)
      .expect(404);
  });
});
