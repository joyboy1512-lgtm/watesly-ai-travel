# Production env checklist (no secrets in git)

## Must set
- JWT_ACCESS_SECRET
- PROVIDER_SECRETS_KEY (current material first)
- PAYMENT_WEBHOOK_SECRET (unique, not sandbox default)
- TRUST_PROXY=1 (behind Caddy)

## Auth / OTP
- SHOP_OTP_DELIVERY unset/off → password-only unlock (secure)
- SHOP_OTP_DELIVERY=http + SHOP_OTP_WEBHOOK_URL + SHOP_OTP_PEPPER
- SHOP_UNLOCK_REQUIRE_OTP=1 recommended when delivery is ready

## Sessions
- CUSTOMER_JWT_TTL=12h (or CUSTOMER_JWT_TTL)
- NEXT_PUBLIC_SHOP_COOKIE_AUTH=1 on web
- COOKIE_SECURE=1 / NODE_ENV=production

## Shared store
- REDIS_URL=redis://127.0.0.1:6380

## Payments
- PAYMENT_ENV=sandbox until PSP go-live is separately approved
