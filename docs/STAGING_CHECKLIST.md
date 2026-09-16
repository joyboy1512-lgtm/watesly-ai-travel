# WeekendGate staging / production readiness

## Staging (prepare — do not auto-deploy Production)
- Build: `pnpm build` (web + api + packages)
- Env: `PAYMENT_ENV=sandbox`, Hotelbeds test base URL, `NEXT_PUBLIC_SITE_ENV=staging`
- robots: disallow indexing on preview/staging
- Smoke: home → flight search → hotel search → guests validation → manage booking lookup (no real pay)

## Production gate (requires explicit approval)
- [ ] Merchant payment credentials (KNET / Apple Pay / cards)
- [ ] Hotelbeds live keys (not sandbox quota)
- [ ] Flight provider live credentials
- [ ] SSL + secrets in Secret Manager only
- [ ] Legal license number confirmed for footer
- [ ] Rollback: previous pm2 release artifact + `git revert` of release tag

## Credentials still needed from owner
- Payment PSP webhook secret + merchant IDs
- Production Hotelbeds / Amadeus (or chosen GDS) keys
- Optional: analytics endpoint `NEXT_PUBLIC_ANALYTICS_URL`
