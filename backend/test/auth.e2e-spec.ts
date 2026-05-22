import request from 'supertest';

describe('Auth + tenant context (e2e)', () => {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
  const password = 'password123';

  it('register sets cookie, /me works, /protected/ping returns userId+companyId, logout clears cookie', async () => {
    const email = `e2e_${Date.now()}@example.com`;

    const registerRes = await request(baseUrl)
      .post('/auth/register')
      .send({ email, password, companyName: 'E2E Co' })
      .expect(201);

    const setCookie = registerRes.header['set-cookie'];
    expect(setCookie?.[0]).toContain('session=');
    expect(setCookie?.[0]).toContain('HttpOnly');

    const cookie = setCookie[0].split(';')[0];

    const meRes = await request(baseUrl)
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(meRes.body?.user?.email).toBe(email);
    expect(meRes.body?.user?.companyId).toBeTruthy();

    const pingRes = await request(baseUrl)
      .get('/protected/ping')
      .set('Cookie', cookie)
      .expect(200);

    expect(pingRes.body?.ok).toBe(true);
    expect(pingRes.body?.userId).toBeTruthy();
    expect(pingRes.body?.companyId).toBeTruthy();

    const logoutRes = await request(baseUrl)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(logoutRes.body).toEqual({ ok: true });
    expect(logoutRes.header['set-cookie']?.[0]).toContain('session=');
  });

  it('registering 2 users yields different companyId values (multi-tenant smoke)', async () => {
    const emailA = `e2e_a_${Date.now()}@example.com`;
    const emailB = `e2e_b_${Date.now()}@example.com`;

    const resA = await request(baseUrl)
      .post('/auth/register')
      .send({ email: emailA, password, companyName: 'E2E A Co' })
      .expect(201);

    const cookieA = resA.header['set-cookie'][0].split(';')[0];
    const meA = await request(baseUrl)
      .get('/auth/me')
      .set('Cookie', cookieA)
      .expect(200);

    const resB = await request(baseUrl)
      .post('/auth/register')
      .send({ email: emailB, password, companyName: 'E2E B Co' })
      .expect(201);

    const cookieB = resB.header['set-cookie'][0].split(';')[0];
    const meB = await request(baseUrl)
      .get('/auth/me')
      .set('Cookie', cookieB)
      .expect(200);

    expect(meA.body.user.companyId).not.toEqual(meB.body.user.companyId);
  });
});
