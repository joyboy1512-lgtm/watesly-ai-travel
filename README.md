# WeekendGate WhatsApp suite patches

This branch mirrors the four independent WhatsApp dashboard pages deployed to `www.weekendgate.com` (`/var/www/weekendgate`):

| Page | Route | Role |
|------|-------|------|
| واتساب | `/dashboard/whatsapp` | Link, edit, sync Meta WhatsApp accounts |
| القنوات | `/dashboard/channels` | Channel ops: sync, default, delete |
| القوالب | `/dashboard/templates` | Template CRUD + preview |
| الحملات | `/dashboard/campaigns` | Campaign create/send + stats table |

Shared light theme styles: `apps/web/src/app/wa-suite.css` (also appended to server `globals.css`).

**Note:** Production source of truth remains on the droplet; this repo snapshot documents the UI work for review.
