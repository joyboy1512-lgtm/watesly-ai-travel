# WeekendGate security hardening — current state & rollback

**Branch:** `cursor/security-harden-f5c3`  
**Scope:** code + config templates only. **No production deploy / PM2 restart without explicit approval.**

## Confirmed issues (proven in code)

| ID | Finding | Status |
|----|---------|--------|
| A1 | `/shop/unlock` could issue JWT without password/OTP (OTP default off) | Fixed in code |
| A2 | Unlock forced `status: "active"` (reactivated disabled accounts) | Fixed in code |
| A3 | Guest phone derived from SHA1(email\|name) | Fixed — random UUID guest |
| A4 | OTP debug codes / no real delivery gate | Fixed — fail-closed without delivery |
| P1 | Webhook accepted raw secret as signature; bookingId from body | Fixed — HMAC + intent-only |
| P2 | `authorized` treated as paid; `updateMany` by bookingId | Fixed |
| S1 | JWT / provider encryption hardcoded fallbacks | Fixed — fail-closed in production |
| S2 | Compose DB password / public binds (server) | Template provided — **not applied** |
| N1 | Postgres on `0.0.0.0` | Template binds `127.0.0.1` — **not applied** |

## Required env (production) before deploy

- `JWT_ACCESS_SECRET` (≥32 random chars, not a documented default)
- `PROVIDER_SECRETS_KEY` (set to **current** encryption material first; do not rotate blindly)
- Optional migration: `PROVIDER_SECRETS_KEY_LEGACY` during key rotation
- `SHOP_OTP_PEPPER` (≥16) **only if** `SHOP_OTP_DELIVERY` is enabled
- `SHOP_OTP_DELIVERY=http|whatsapp` + delivery credentials, or leave unset to force password login
- `PAYMENT_WEBHOOK_SECRET` (never the sandbox default in production)
- `REDIS_URL` (recommended for OTP / rate-limit / webhook receipts / session epoch)
- `TRUST_PROXY=1` when API sits behind Caddy on localhost
- `NEXT_PUBLIC_SHOP_COOKIE_AUTH=1` to stop persisting customer JWT in localStorage

## Encryption migration (do not skip)

1. Set `PROVIDER_SECRETS_KEY` to the material currently used to decrypt existing `v1:` blobs.
2. Re-encrypt provider configs under that key.
3. Only then rotate: set new key + keep old in `PROVIDER_SECRETS_KEY_LEGACY`.

## Backup / rollback (when deploy is approved)

1. Tarball apps + compose (exclude bulky node_modules/docker-data).
2. `pg_dump` before any migrate.
3. Rollback: restore tarball + previous compose, `pm2 restart weekendgate-api weekendgate-web`, restore DB if migrated.

## Explicit non-goals

- No live payment activation
- No design / hero search / shop UI visual changes
- No search business-logic changes
- No mass dependency upgrades
- No real customer-account testing
