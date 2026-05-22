import request from 'supertest';

describe('Auth (e2e)', () => {
  const baseUrl = process.env.E2E_BASE_URL ?? 'http://localhost:3001';
  const email = `e2e_${Date.now()}@example.com`;
  const password = 'password123';

  it('register sets cookie, /me works, logout clears cookie', async () => {
    const registerRes = await request(baseUrl)
      .post('/auth/register')
      .send({ email, password, companyName: 'E2E Co' })
      .expect(201);

    const setCookie = registerRes.header['set-cookie'];
    expect(Array.isArray(setCookie)).toBe(true);
    expect(setCookie?.[0]).toContain('session=');
    expect(setCookie?.[0]).toContain('HttpOnly');

    const cookie = setCookie[0].split(';')[0];

    const meRes = await request(baseUrl)
      .get('/auth/me')
      .set('Cookie', cookie)
      .expect(200);

    expect(meRes.body?.user?.email).toBe(email);
    expect(meRes.body?.user?.companyId).toBeTruthy();

    const logoutRes = await request(baseUrl)
      .post('/auth/logout')
      .set('Cookie', cookie)
      .expect(200);

    expect(logoutRes.body).toEqual({ ok: true });

    const logoutSetCookie = logoutRes.header['set-cookie'];
    expect(logoutSetCookie?.[0]).toContain('session=');
  });

  it('login sets cookie for an existing user', async () => {
    const loginEmail = `e2e_login_${Date.now()}@example.com`;

    // Ensure user exists (register)
    await request(baseUrl)
      .post('/auth/register')
      .send({
        email: loginEmail,
        password,
        companyName: 'E2E Login Co',
      })
      .expect(201);

    const loginRes = await request(baseUrl)
      .post('/auth/login')
      .send({ email: loginEmail, password })
      .expect(200);

    const setCookie = loginRes.header['set-cookie'];
    expect(setCookie?.[0]).toContain('session=');
    expect(setCookie?.[0]).toContain('HttpOnly');
  });
});
