# WeekendGate unified snapshot

This branch is the **GitHub / backup source of truth** for the published WeekendGate site.

## Provenance

| Item | Value |
| --- | --- |
| Live host | `www.weekendgate.com` on `64.226.69.159` (`/var/www/weekendgate`) |
| Last reconstructed deploy | 26 Sep 2026 — `cursor/pricing-rule-crud-f5c3` @ `03b00b1` |
| Earlier full rsync | 16 Sep 2026 — `cursor/sync-live-weekendgate-f5c3` @ `e707e55` |

This agent VM has no droplet SSH key, so the snapshot is the last stack that was built and restarted on the live PM2 apps (`weekendgate-web`, `weekendgate-api`) rather than a fresh disk rsync. Secrets (`.env`) are not stored here.

## What is included

The full monorepo: shop, API, worker packages, dashboard, Hotelbeds/Duffel/Travelport integrations, and pricing rules.

## How to refresh from the droplet

```bash
rsync -a --delete \
  --exclude node_modules --exclude .next --exclude dist --exclude .git \
  --exclude .env --exclude .env.production --exclude '*.log' \
  root@64.226.69.159:/var/www/weekendgate/ ./
```

Do not commit credentials or `node_modules`.
