import request from 'supertest';

describe('Customers (e2e)', () => {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
  const password = 'password123';

  async function registerAndGetCookie(email: string) {
    const registerRes = await request(baseUrl)
      .post('/auth/register')
      .send({ email, password, companyName: 'E2E Co' })
      .expect(201);

    const setCookie = registerRes.header['set-cookie'];
    expect(setCookie?.[0]).toContain('session=');

    return setCookie[0].split(';')[0];
  }

  it('CRUD happy path: create -> list -> get -> patch -> delete', async () => {
    const email = `e2e_${Date.now()}@example.com`;
    const cookie = await registerAndGetCookie(email);

    const createRes = await request(baseUrl)
      .post('/customers')
      .set('Cookie', cookie)
      .send({ name: 'Acme', email: 'acme@example.com', phone: '123' })
      .expect(201);

    expect(createRes.body?.id).toBeTruthy();
    expect(createRes.body?.name).toBe('Acme');

    const customerId = createRes.body.id as string;

    const listRes = await request(baseUrl)
      .get('/customers')
      .set('Cookie', cookie)
      .expect(200);

    expect(Array.isArray(listRes.body)).toBe(true);
    expect(listRes.body.some((c: any) => c.id === customerId)).toBe(true);

    const getRes = await request(baseUrl)
      .get(`/customers/${customerId}`)
      .set('Cookie', cookie)
      .expect(200);

    expect(getRes.body?.id).toBe(customerId);

    const patchRes = await request(baseUrl)
      .patch(`/customers/${customerId}`)
      .set('Cookie', cookie)
      .send({ name: 'Acme Updated' })
      .expect(200);

    expect(patchRes.body?.id).toBe(customerId);
    expect(patchRes.body?.name).toBe('Acme Updated');

    await request(baseUrl)
      .delete(`/customers/${customerId}`)
      .set('Cookie', cookie)
      .expect(200);

    await request(baseUrl)
      .get(`/customers/${customerId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('multi-tenant isolation: tenant B cannot read tenant A customer (404)', async () => {
    const emailA = `e2e_a_${Date.now()}@example.com`;
    const emailB = `e2e_b_${Date.now()}@example.com`;

    const cookieA = await registerAndGetCookie(emailA);
    const cookieB = await registerAndGetCookie(emailB);

    const createRes = await request(baseUrl)
      .post('/customers')
      .set('Cookie', cookieA)
      .send({ name: 'Tenant A Customer' })
      .expect(201);

    const customerId = createRes.body.id as string;

    await request(baseUrl)
      .get(`/customers/${customerId}`)
      .set('Cookie', cookieB)
      .expect(404);

    await request(baseUrl)
      .patch(`/customers/${customerId}`)
      .set('Cookie', cookieB)
      .send({ name: 'Hacked' })
      .expect(404);

    await request(baseUrl)
      .delete(`/customers/${customerId}`)
      .set('Cookie', cookieB)
      .expect(404);
  });
});
