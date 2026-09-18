# k6 load tests (Phase 7 Quality)

## Install (Windows)

```powershell
choco install k6
# or: winget install GrafanaLabs.k6
```

Verify: `k6 version`

## Auth cookie for `/dashboard`

1. Set `PLAYWRIGHT_QA_EMAIL` / `PLAYWRIGHT_QA_PASSWORD` in `.env.local`.
2. `npm.cmd run e2e:auth-setup`
3. `node scripts/k6/export-supabase-session.mjs` → writes `.k6-auth.env` (gitignored).

## Run

Against local production server:

```powershell
npm.cmd run build
npm.cmd run start
# another terminal:
npm.cmd run quality:k6
```

Against Vercel preview:

```powershell
$env:QUALITY_BASE_URL="https://your-preview.vercel.app"
npm.cmd run quality:k6
```

Defaults: `K6_VUS=50`, `K6_DURATION=30s`, 70% match / 30% dashboard.
