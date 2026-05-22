import request from 'supertest';

type CustomerDto = { id: string; name: string };

type OpportunityDto = {
  id: string;
  customerId: string;
  title: string;
  stage: string;
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
  if (!value || typeof value !== 'object') throw new Error('Invalid opportunity dto');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') throw new Error('Invalid opportunity dto: id');
  if (typeof v.customerId !== 'string')
    throw new Error('Invalid opportunity dto: customerId');
  if (typeof v.title !== 'string') throw new Error('Invalid opportunity dto: title');
  if (typeof v.stage !== 'string') throw new Error('Invalid opportunity dto: stage');
}

function assertOpportunityList(value: unknown): asserts value is OpportunityDto[] {
  if (!Array.isArray(value)) throw new Error('Expected opportunity list');
  for (const item of value) assertOpportunityDto(item);
}

describe('Opportunities (e2e)', () => {
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

  it('CRUD happy path: create -> list -> get -> patch -> delete', async () => {
    const cookie = await registerAndGetCookie('e2e_opps');
    const customer = await createCustomer(cookie, 'Customer 1');

    const createRes = await request(baseUrl)
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({
        customerId: customer.id,
        title: 'Opp 1',
        amount: 100,
        stage: 'NEW',
      })
      .expect(201);

    assertOpportunityDto(createRes.body);
    const oppId = createRes.body.id;

    const listRes = await request(baseUrl)
      .get('/opportunities')
      .set('Cookie', cookie)
      .expect(200);

    assertOpportunityList(listRes.body);
    expect(listRes.body.some((o) => o.id === oppId)).toBe(true);

    const getRes = await request(baseUrl)
      .get(`/opportunities/${oppId}`)
      .set('Cookie', cookie)
      .expect(200);

    assertOpportunityDto(getRes.body);

    const patchRes = await request(baseUrl)
      .patch(`/opportunities/${oppId}`)
      .set('Cookie', cookie)
      .send({ title: 'Opp 1 Updated', stage: 'QUALIFIED', amount: 250 })
      .expect(200);

    assertOpportunityDto(patchRes.body);
    expect(patchRes.body.title).toBe('Opp 1 Updated');
    expect(patchRes.body.stage).toBe('QUALIFIED');

    await request(baseUrl)
      .delete(`/opportunities/${oppId}`)
      .set('Cookie', cookie)
      .expect(200);

    await request(baseUrl)
      .get(`/opportunities/${oppId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('validation: missing customerId is rejected', async () => {
    const cookie = await registerAndGetCookie('e2e_opps_missing_customer');

    await request(baseUrl)
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({ title: 'Opp', amount: 10, stage: 'NEW' })
      .expect(400);
  });

  it('validation: negative amount is rejected', async () => {
    const cookie = await registerAndGetCookie('e2e_opps_negative_amount');
    const customer = await createCustomer(cookie, 'Customer 2');

    await request(baseUrl)
      .post('/opportunities')
      .set('Cookie', cookie)
      .send({
        customerId: customer.id,
        title: 'Opp',
        amount: -1,
        stage: 'NEW',
      })
      .expect(400);
  });

  it('multi-tenant isolation: tenant B cannot access tenant A opportunity (404)', async () => {
    const cookieA = await registerAndGetCookie('e2e_opps_a');
    const cookieB = await registerAndGetCookie('e2e_opps_b');

    const customerA = await createCustomer(cookieA, 'Tenant A Customer');

    const createRes = await request(baseUrl)
      .post('/opportunities')
      .set('Cookie', cookieA)
      .send({
        customerId: customerA.id,
        title: 'Tenant A Opp',
        amount: 42,
        stage: 'NEW',
      })
      .expect(201);

    assertOpportunityDto(createRes.body);
    const oppId = createRes.body.id;

    await request(baseUrl)
      .get(`/opportunities/${oppId}`)
      .set('Cookie', cookieB)
      .expect(404);

    await request(baseUrl)
      .patch(`/opportunities/${oppId}`)
      .set('Cookie', cookieB)
      .send({ stage: 'WON' })
      .expect(404);

    await request(baseUrl)
      .delete(`/opportunities/${oppId}`)
      .set('Cookie', cookieB)
      .expect(404);
  });
});
