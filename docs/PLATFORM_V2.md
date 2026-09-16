# WeekendGate Platform v2

**Branch:** `cursor/weekendgate-platform-f5c3`  
**Production deploy:** **NOT performed** (by design — current live site unchanged)

## Safety

| Guard | Behavior |
|-------|----------|
| `NEXT_PUBLIC_WG_PLATFORM` | Default **unset/off** → homepage header/footer stay as today; sitemap stays classic |
| New routes only | `/trip-builder`, `/deals`, `/destinations`, `/account/trips`, … additive |
| API | New `/shop/platform/*` only — existing `/shop/*` untouched |
| Data store | In-memory platform service — **no production DB migration required** to keep site safe |
| Payments | Sandbox checkout + statuses include `partially_refunded` |

## Delivered surfaces

1. Trip Builder — original / discount / savings / final; swap components  
2. Weekend Deals — Dubai, Bahrain, Doha, Istanbul, Riyadh, Muscat  
3. Destination SEO pages + breadcrumbs + plan CTA  
4. Customer account subnav — trips, points, alerts, referrals, notifications  
5. My Trips + document links  
6. Price alerts  
7. Weekend Points + admin-tunable rules endpoint  
8. Referral codes  
9. In-app (+email channel tagged) notifications  
10. Checkout summary + sandbox pay  
11. Admin CMS/stats/funnel at `/dashboard/cms`  
12. SEO sitemap expansion **only when flag on**  
13. i18n prep: EN titles/fields in catalogs; shop UI remains AR/RTL  
14. Multi-currency fields on deals/trips (display still KWD-first)  
15. Security: no card PAN storage; platform APIs additive; secrets stay server-side  

## Enable on staging later

```bash
NEXT_PUBLIC_WG_PLATFORM=1
WG_PLATFORM=1
```

Then rebuild web + restart. Do **not** set on production until you approve.

## Next hardening (optional)

- Persist platform store to Postgres (Prisma models)  
- Wire real email/WhatsApp/push adapters  
- Staff auth gate on `/dashboard/cms`  
- English locale switcher for shop  
