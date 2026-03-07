# Demo Real Estate Booking App

Monorepo demo for a real-estate unit booking flow.

## Stack
- Mobile: React Native (Expo + Expo Router) + TypeScript
- API: Node.js + Express + Prisma + TypeScript
- DB: PostgreSQL (Neon recommended)
- File storage: Cloudinary

## Structure
- `apps/mobile` Expo mobile app
- `apps/api` Express API + Prisma
- `packages/shared` Shared TypeScript contracts
- `infra` Deployment templates
- `docs` API flow and demo runbook

## Quick Start
1. Install dependencies:
```bash
npm install
```
or use workspace bootstrap from root:
```bash
npm run install:all
```

2. Configure env files:
```bash
cp apps/api/.env.example apps/api/.env
cp apps/mobile/.env.example apps/mobile/.env
```

Mobile env presets are also available:
```bash
npm run env:mobile:local
npm run env:mobile:railway
```
Restart Expo after switching because `EXPO_PUBLIC_*` variables are read at startup.

3. Start PostgreSQL for local development:
```bash
npm run dev:db
```
This starts a Docker Postgres container on `localhost:5436`, which matches the default `DATABASE_URL` in `apps/api/.env.example`.

4. Set real values in `apps/api/.env` for Cloudinary. If you use Neon instead of Docker, replace `DATABASE_URL` in `apps/api/.env` with your Neon connection string.

5. Run Prisma migration and seed:
```bash
cd apps/api
npx prisma migrate dev --name init
npm run prisma:seed
```

6. Start API:
```bash
npm run dev --workspace @real-estate/api
```

7. Start mobile:
```bash
npm run dev --workspace @real-estate/mobile
```

## Env Modes
- API local development uses [apps/api/.env](/c:/Users/USER/PGG/PGG/apps/api/.env).
- API Railway deployment uses [\.env.railway.example](/c:/Users/USER/PGG/PGG/.env.railway.example) as the variable template for Railway service settings.
- Mobile local preset is [apps/mobile/.env.local](/c:/Users/USER/PGG/PGG/apps/mobile/.env.local).
- Mobile Railway preset is [apps/mobile/.env.railway](/c:/Users/USER/PGG/PGG/apps/mobile/.env.railway).
- The active mobile env file consumed by Expo is [apps/mobile/.env](/c:/Users/USER/PGG/PGG/apps/mobile/.env); switch it with:
```bash
npm run env:mobile:local
npm run env:mobile:railway
```

## Root Commands
From the project root:
```bash
npm run install:all     # install all workspace dependencies
npm run build:all       # build shared + api (+ mobile if build script exists)
npm run dev:db          # start local Postgres on localhost:5436 via Docker
npm run dev:api         # start API dev server
npm run dev:mobile      # start Expo mobile dev server
npm run apk             # trigger EAS Android APK build
npm run ios:configure   # one-time interactive iOS credential setup with Expo/Apple
npm run ios:build       # trigger EAS iOS build
npm run ios:download    # download the latest finished iOS IPA into apps/mobile/builds/ios
npm run ios:submit      # submit the latest iOS build to TestFlight
npm run ios:testflight  # build, download the IPA locally, then submit to TestFlight
```

## Mobile Release Builds (APK / iOS)
Prerequisites:
- Expo account and EAS login (`npx eas login`)
- Configure app credentials (`npx eas build:configure`)

Commands:
```bash
npm run apk
npm run ios:configure
npm run ios:build
npm run ios:download
npm run ios:submit
npm run ios:testflight
```

Notes:
- Run `npm run ios:configure` once before the first non-interactive iOS/TestFlight build so EAS can create/validate Apple signing credentials
- `npm run ios:testflight` stores the downloaded `.ipa` under `apps/mobile/builds/ios`
- The production iOS build uses `EXPO_PUBLIC_API_BASE_URL=https://acceptable-communication-production-4b74.up.railway.app/api/v1`

## Booking Concurrency Safety
- Booking creation uses an atomic conditional reserve (`status=AVAILABLE -> RESERVED`) inside a DB transaction.
- If two users try to book the same unit concurrently, only one request succeeds; the other gets `409 UNIT_NOT_AVAILABLE`.
- Cost sheet creation is in the same transaction as booking creation to avoid partial writes.

## Docker Compose
Containerized API + Postgres with persistent database storage:
```bash
cp .env.docker.example .env.docker
docker compose --env-file .env.docker up -d --build
```

Notes:
- Postgres data persists in the named Docker volume `postgres-data`
- API brochure assets are mounted from `apps/api/assets` as a read-only bind mount
- API is exposed on `http://localhost:4000`
- Postgres is exposed only on `127.0.0.1:${POSTGRES_PORT}` by default

## Railway
Railway deployment is configured for the API via [railway.json](/c:/Users/USER/PGG/PGG/railway.json).

Seeding behavior:
- Migrations run automatically on container start.
- Runtime seeding runs only when `RUN_DB_SEED=true`.
- Recommended Railway usage: set `RUN_DB_SEED=true` only for first bootstrap or a deliberate reseed, then set it back to `false`.

Files:
- [railway.json](/c:/Users/USER/PGG/PGG/railway.json) for Dockerfile-based Railway deployment and health checks
- [\.env.railway.example](/c:/Users/USER/PGG/PGG/.env.railway.example) for API service variables
- [\.env.railway.bootstrap.example](/c:/Users/USER/PGG/PGG/.env.railway.bootstrap.example) for one-time bootstrap variables with `RUN_DB_SEED=true`
- [docs/railway-deploy.md](/c:/Users/USER/PGG/PGG/docs/railway-deploy.md) for the full Railway + APK flow

## CI
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs install, shared build, API build, and API tests on pushes/PRs.

## Demo Login
- Phone: any valid number (example `9999900001`)
- OTP: value of `DEMO_OTP_CODE` (default `123456`)
