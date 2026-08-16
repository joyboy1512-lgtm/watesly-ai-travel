# WeekendGate WhatsApp suite patches

This branch mirrors the four independent WhatsApp dashboard pages deployed to `www.weekendgate.com` (`/var/www/weekendgate`):

| Page | Route | Role |
|------|-------|------|
| واتساب | `/dashboard/whatsapp` | Link, edit, sync Meta WhatsApp accounts |
| القنوات | `/dashboard/channels` | Channel ops: sync, default, delete |
| القوالب | `/dashboard/templates` | Template CRUD + preview |
| الحملات | `/dashboard/campaigns` | Campaign create/send + stats table |

Shared light theme styles: `apps/web/src/app/wa-suite.css` (also appended to server `globals.css`).

## Travel providers (Amadeus / Travelport / Travelfusion)

Dashboard: `/dashboard/providers` — catalog, encrypted credentials, enable/disable.

| Provider | Status | Activate |
|----------|--------|----------|
| Mock | live | `FLIGHT_PROVIDER=mock` |
| Duffel | live | `FLIGHT_PROVIDER=duffel` + `DUFFEL_ACCESS_TOKEN` |
| Amadeus | ready (live search) | `FLIGHT_PROVIDER=amadeus` + `AMADEUS_CLIENT_ID` / `AMADEUS_CLIENT_SECRET` |
| Travelport | scaffold | `FLIGHT_PROVIDER=travelport` + `TRAVELPORT_*` |
| Travelfusion (LCC/domestic) | scaffold | `FLIGHT_PROVIDER=travelfusion` + `TRAVELFUSION_*` |

API: `GET /providers/catalog`, `GET|POST /providers`, `PATCH /providers/:id`.

**Note:** Production source of truth remains on the droplet; this repo snapshot documents the UI work for review.
