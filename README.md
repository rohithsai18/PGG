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

3. Set real values in `apps/api/.env` for Neon and Cloudinary.

4. Run Prisma migration and seed:
```bash
cd apps/api
npx prisma migrate dev --name init
npm run prisma:seed
```

5. Start API:
```bash
npm run dev --workspace @real-estate/api
```

6. Start mobile:
```bash
npm run dev --workspace @real-estate/mobile
```

## Root Commands
From the project root:
```bash
npm run install:all     # install all workspace dependencies
npm run build:all       # build shared + api (+ mobile if build script exists)
npm run dev:api         # start API dev server
npm run dev:mobile      # start Expo mobile dev server
npm run apk             # trigger EAS Android APK build
npm run ios:build       # trigger EAS iOS build
```

## Mobile Release Builds (APK / iOS)
Prerequisites:
- Expo account and EAS login (`npx eas login`)
- Configure app credentials (`npx eas build:configure`)

Commands:
```bash
npm run apk
npm run ios:build
```

## Booking Concurrency Safety
- Booking creation uses an atomic conditional reserve (`status=AVAILABLE -> RESERVED`) inside a DB transaction.
- If two users try to book the same unit concurrently, only one request succeeds; the other gets `409 UNIT_NOT_AVAILABLE`.
- Cost sheet creation is in the same transaction as booking creation to avoid partial writes.

## Docker (API)
Build and run:
```bash
docker build -f apps/api/Dockerfile -t real-estate-api .
docker run --rm -p 4000:4000 --env-file apps/api/.env real-estate-api
```

## CI
- GitHub Actions workflow: `.github/workflows/ci.yml`
- Runs install, shared build, API build, and API tests on pushes/PRs.

## Demo Login
- Phone: any valid number (example `9999900001`)
- OTP: value of `DEMO_OTP_CODE` (default `123456`)
