# test_gds

Monorepo placeholder.

## Dev (Docker)

```bash
docker compose up --build
```

- Backend: http://localhost:3001
- Frontend: http://localhost:5173
- Postgres: localhost:5432 (user/pass: postgres/postgres, db: app)

## Prisma

```bash
docker compose exec backend npx prisma migrate status
```
