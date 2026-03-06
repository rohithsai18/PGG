# Railway Deployment

This repo is set up to deploy the API to Railway as a Docker service and attach it to a Railway PostgreSQL service in the same project.

## Services
- `Postgres`: Railway PostgreSQL service
- `API`: GitHub-backed service using the root [railway.json](/c:/Users/USER/PGG/PGG/railway.json) config

## Repo Setup
- Docker build source: `apps/api/Dockerfile`
- Railway config-as-code: `railway.json`
- API env template: `.env.railway.example`
- Health check: `/api/v1/health`

## Railway Steps
1. Push this repo to GitHub.
2. In Railway, create a new project.
3. Add a PostgreSQL service and leave it named `Postgres`, or update `.env.railway.example` if you rename it.
4. Add a GitHub service for this repo.
5. In the API service settings:
   - confirm Railway picks up `railway.json`
   - confirm the Dockerfile path is `apps/api/Dockerfile`
6. In the API service Variables tab, add the values from `.env.railway.example`.
   - `DATABASE_URL` should reference the Postgres service variable
   - Railway injects `PORT`; do not set it unless debugging a platform issue
7. Deploy the API service.
8. Once deployed, open:
   - `https://<railway-domain>/api/v1/health`
9. Validate core flows:
   - OTP request
   - OTP verify/login
   - brochure download
   - units list
   - booking flow

## Mobile APK
1. Update `apps/mobile/.env`:
   - `EXPO_PUBLIC_API_BASE_URL=https://<railway-domain>/api/v1`
2. Build the APK from the repo root:
   - `npm run apk`
3. Download the Expo EAS build artifact and install it on Android devices.

## Notes
- Prisma migrations run on API startup via `npm start`.
- Brochure download is public at `/api/v1/brochure`.
- Railway trial/free credits may not be sufficient for long-term hosting.
