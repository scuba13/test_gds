import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import { Pool } from 'pg';
import { hashPassword } from '../src/auth/password';

async function main() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set');
  }

  const pool = new Pool({ connectionString });
  const adapter = new PrismaPg(pool);
  const prisma = new PrismaClient({ adapter });
  await prisma.$connect();

  const email = process.env.SEED_USER_EMAIL ?? 'demo@example.com';
  const password = process.env.SEED_USER_PASSWORD ?? 'password123';
  const companyName = process.env.SEED_COMPANY_NAME ?? 'Demo Company';

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });

  if (existing) {
    // eslint-disable-next-line no-console
    console.log(`[seed] user already exists: ${email} (skipping)`);
    await prisma.$disconnect();
    return;
  }

  const passwordHash = await hashPassword(password);

  const company = await prisma.company.create({
    data: {
      name: companyName,
    },
    select: { id: true },
  });

  const user = await prisma.user.create({
    data: {
      companyId: company.id,
      email,
      passwordHash,
    },
    select: { id: true },
  });

  const customerA = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Acme Ltda',
      email: 'acme@example.com',
      phone: '11999999999',
    },
    select: { id: true },
  });

  await prisma.contact.create({
    data: {
      companyId: company.id,
      customerId: customerA.id,
      name: 'Alice',
      email: 'alice@acme.example',
      phone: '11888887777',
    },
  });

  const opp1 = await prisma.opportunity.create({
    data: {
      companyId: company.id,
      customerId: customerA.id,
      title: 'Upgrade CRM',
      amount: 1200.5,
      stage: 'NEW',
    },
    select: { id: true, stage: true },
  });

  await prisma.opportunityStageHistory.create({
    data: {
      companyId: company.id,
      opportunityId: opp1.id,
      fromStage: opp1.stage,
      toStage: 'QUALIFIED',
      changedByUserId: user.id,
    },
  });

  await prisma.opportunity.update({
    where: { id: opp1.id },
    data: { stage: 'QUALIFIED' },
  });

  await prisma.opportunity.create({
    data: {
      companyId: company.id,
      customerId: customerA.id,
      title: 'Consultoria',
      amount: 3000,
      stage: 'NEGOTIATION',
    },
  });

  const customerB = await prisma.customer.create({
    data: {
      companyId: company.id,
      name: 'Beta SA',
      email: 'beta@example.com',
    },
    select: { id: true },
  });

  await prisma.opportunity.create({
    data: {
      companyId: company.id,
      customerId: customerB.id,
      title: 'Licença anual',
      amount: 999.99,
      stage: 'PROPOSAL',
    },
  });

  // eslint-disable-next-line no-console
  console.log(
    `[seed] created company=${company.id} user=${email} password=${password}`,
  );

  await prisma.$disconnect();
}

main().catch((err) => {
  // eslint-disable-next-line no-console
  console.error('[seed] failed', err);
  process.exit(1);
});
