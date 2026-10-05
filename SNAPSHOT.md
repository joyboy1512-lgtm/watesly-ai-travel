# WeekendGate unified snapshot

This branch is the **GitHub / backup source of truth** for the published WeekendGate site.

## Provenance

| Item | Value |
| --- | --- |
| Live host | `www.weekendgate.com` on `64.226.69.159` (`/var/www/weekendgate`) |
| Live rsync | 5 Oct 2026 01:33 UTC from droplet disk (no `.env`) |
| Running build | Next.js `BUILD_ID` + API `dist` dated 26 Sep 2026 17:58 UTC |
| PM2 apps | `weekendgate-web` :3012, `weekendgate-api` cluster, `weekendgate-worker` |

Source files on the droplet were copied over this branch. Secrets (`.env`, `apps/api/.env`, docker-data, uploads) stay on the server only.

## What is included

The live monorepo source: shop, API, worker packages, dashboard, Hotelbeds/Duffel/Travelport integrations, and pricing rules. GitHub-only tests that were not on the droplet disk were kept.

## How to refresh from the droplet

```bash
rsync -a \
  --exclude node_modules --exclude .next --exclude dist --exclude .git \
  --exclude .env --exclude .env.production --exclude .env.local \
  --exclude '*.log' --exclude docker-data --exclude backups \
  --exclude .cache --exclude .turbo --exclude uploads --exclude '*.tgz' \
  root@64.226.69.159:/var/www/weekendgate/ ./
```

Do not commit credentials or `node_modules`.
