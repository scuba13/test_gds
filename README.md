# CRM MVP (test_gds)

CRM web simples (MVP) com:
- Auth (JWT em cookie **HttpOnly**)
- Multi-tenant (1 empresa por usuário; isolamento por `companyId`)
- CRUD de **Clientes**, **Contatos** e **Oportunidades**
- Kanban de oportunidades com drag-and-drop + histórico de stage
- Dashboard com métricas reais do banco

## Requisitos
- Docker + Docker Compose

## Rodar (1 comando)

```bash
docker compose up --build -d
```

Acesse:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001

## Fluxo de uso (UI)
1. Abra http://localhost:5173
2. Faça **Cadastrar** ou **Login**
3. Crie um cliente
4. Selecione o cliente e crie contatos
5. Crie oportunidades e use o kanban para mover stages
6. Veja o **Dashboard** (métricas reais)

## Seed (dados de demo)

O seed cria:
- 1 company + 1 usuário demo
- customers + contacts + opportunities + histórico de stage

Para rodar o seed localmente (conectando no Postgres do compose):

```bash
cd backend
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/app?schema=public" npm run prisma:seed
```

Defaults do seed (pode sobrescrever via env):
- `SEED_USER_EMAIL` (default: `demo@example.com`)
- `SEED_USER_PASSWORD` (default: `password123`)
- `SEED_COMPANY_NAME` (default: `Demo Company`)

## Testes

Unit:
```bash
cd backend
npm test
```

E2E:
```bash
cd backend
npm run test:e2e
```

## Notas técnicas
- Sessão: JWT em cookie HttpOnly (não usar localStorage)
- Isolamento multi-tenant: todas queries filtram por `companyId`; cross-tenant retorna 404
- Frontend usa proxy same-origin em `/api/*` (no `frontend/server.js`) para simplificar uso de cookie HttpOnly em dev
