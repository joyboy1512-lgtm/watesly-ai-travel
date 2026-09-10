# Security hardening — approval gate (no production deploy yet)

## Summary
Code-level security fixes for WeekendGate customer unlock, secrets fail-closed, payment webhook integrity, sessions/cookies/CSRF, and shared rate limits. **Design, search logic, and live payments were not changed.** Production services were **not** restarted.

## Classification

### Proven issues (before)
- Unlock JWT without password/OTP when OTP flag defaulted off
- Disabled accounts reactivated via `status: "active"` on unlock
- Guest identity derived from SHA1(name/email)
- OTP debug exposure path; OTP usable without delivery
- Webhook accepted raw secret as signature; bookingId trusted from body
- `authorized` treated as paid; payments updated with `updateMany` by bookingId
- JWT/provider encryption fell back to hardcoded defaults

### Fixed + tested (unit evidence)
- Unlock proof matrix (disabled / password / no-delivery / production create) — **15/15 security unit tests pass**
- Random guest phones
- OTP hash compare
- Webhook: reject raw-secret signature, unknown intent, amount mismatch; accept valid HMAC
- `authorized` → pending; captured/paid only when captured
- Trusted-proxy IP helper ignores public XFF

### Not verified in this environment
- Production firewall / live Postgres bind (`0.0.0.0:5433`) remediation (template only)
- Redis multi-instance behavior on production host (client implemented; REDIS_URL not exercised here)
- End-to-end browser cookie/CSRF against production Caddy
- Provider secret re-encryption of existing production blobs (migration plan documented only)

## Required settings before any prod deploy
See `docs/security/ENV_CHECKLIST.md` and `docs/security/CURRENT_STATE_AND_ROLLBACK.md`.

## Rollback
Documented in `CURRENT_STATE_AND_ROLLBACK.md`. **Awaiting explicit approval before any production restart or compose/firewall change.**
