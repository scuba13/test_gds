import request from 'supertest';

type CustomerDto = { id: string; name: string };

type ContactDto = {
  id: string;
  customerId: string;
  name: string;
  email: string;
  phone: string | null;
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

function assertContactDto(value: unknown): asserts value is ContactDto {
  if (!value || typeof value !== 'object') throw new Error('Invalid contact dto');
  const v = value as Record<string, unknown>;
  if (typeof v.id !== 'string') throw new Error('Invalid contact dto: id');
  if (typeof v.customerId !== 'string')
    throw new Error('Invalid contact dto: customerId');
  if (typeof v.name !== 'string') throw new Error('Invalid contact dto: name');
  if (typeof v.email !== 'string') throw new Error('Invalid contact dto: email');
}

function assertContactList(value: unknown): asserts value is ContactDto[] {
  if (!Array.isArray(value)) throw new Error('Expected contact list');
  for (const item of value) assertContactDto(item);
}

describe('Contacts (e2e)', () => {
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

  it('CRUD happy path: create -> list-for-customer -> get -> patch -> delete', async () => {
    const cookie = await registerAndGetCookie('e2e_contacts');
    const customer = await createCustomer(cookie, 'Customer 1');

    const createRes = await request(baseUrl)
      .post(`/customers/${customer.id}/contacts`)
      .set('Cookie', cookie)
      .send({ name: 'Alice', email: 'alice@example.com', phone: '123' })
      .expect(201);

    assertContactDto(createRes.body);
    const contactId = createRes.body.id;

    const listRes = await request(baseUrl)
      .get(`/customers/${customer.id}/contacts`)
      .set('Cookie', cookie)
      .expect(200);

    assertContactList(listRes.body);
    expect(listRes.body.some((c) => c.id === contactId)).toBe(true);

    const getRes = await request(baseUrl)
      .get(`/contacts/${contactId}`)
      .set('Cookie', cookie)
      .expect(200);

    assertContactDto(getRes.body);
    expect(getRes.body.id).toBe(contactId);

    const patchRes = await request(baseUrl)
      .patch(`/contacts/${contactId}`)
      .set('Cookie', cookie)
      .send({ name: 'Alice Updated' })
      .expect(200);

    assertContactDto(patchRes.body);
    expect(patchRes.body.name).toBe('Alice Updated');

    await request(baseUrl)
      .delete(`/contacts/${contactId}`)
      .set('Cookie', cookie)
      .expect(200);

    await request(baseUrl)
      .get(`/contacts/${contactId}`)
      .set('Cookie', cookie)
      .expect(404);
  });

  it('validation: invalid email is rejected', async () => {
    const cookie = await registerAndGetCookie('e2e_contacts_email');
    const customer = await createCustomer(cookie, 'Customer 2');

    await request(baseUrl)
      .post(`/customers/${customer.id}/contacts`)
      .set('Cookie', cookie)
      .send({ name: 'Bob', email: 'not-an-email' })
      .expect(400);
  });

  it('multi-tenant isolation: tenant B cannot read tenant A contact/customer (404)', async () => {
    const cookieA = await registerAndGetCookie('e2e_contacts_a');
    const cookieB = await registerAndGetCookie('e2e_contacts_b');

    const customerA = await createCustomer(cookieA, 'Tenant A Customer');

    const createRes = await request(baseUrl)
      .post(`/customers/${customerA.id}/contacts`)
      .set('Cookie', cookieA)
      .send({ name: 'Eve', email: 'eve@example.com' })
      .expect(201);

    assertContactDto(createRes.body);
    const contactId = createRes.body.id;

    await request(baseUrl)
      .get(`/customers/${customerA.id}/contacts`)
      .set('Cookie', cookieB)
      .expect(404);

    await request(baseUrl)
      .get(`/contacts/${contactId}`)
      .set('Cookie', cookieB)
      .expect(404);

    await request(baseUrl)
      .patch(`/contacts/${contactId}`)
      .set('Cookie', cookieB)
      .send({ name: 'Hacked' })
      .expect(404);

    await request(baseUrl)
      .delete(`/contacts/${contactId}`)
      .set('Cookie', cookieB)
      .expect(404);
  });
});
