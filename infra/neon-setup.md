# Neon Setup

1. Create a Neon project and PostgreSQL database.
2. Copy pooled `DATABASE_URL`.
3. Set `DATABASE_URL` in `apps/api/.env` (local) and Render env (prod).
4. Run:
```bash
cd apps/api
npx prisma migrate deploy
npm run prisma:seed
```
