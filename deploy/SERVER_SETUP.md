# تشغيل WeekendGate على السيرفر (`www.weekendgate.com`)

الهدف: الموقع يعمل مباشرة عبر الدومين مع HTTPS.

## المتطلبات على السيرفر (Ubuntu مثال)

- Node.js 20+
- pnpm 9
- Docker + Docker Compose (لـ Postgres/Redis)
- Nginx
- Certbot
- PM2 (`npm i -g pm2`)

## 1) DNS

عند مزود الدومين وجّه إلى IP السيرفر:

- `A` → `@` → IP
- `A` → `www` → IP
- `A` → `api` → IP

انتظر انتشار DNS (غالبًا دقائق إلى ساعة).

## 2) رفع المشروع

```bash
cd /var/www
git clone <REPO_URL> weekendgate
cd weekendgate
pnpm install
```

## 3) البيئة

```bash
cp deploy/.env.production.example .env
nano .env   # غيّر الأسرار وكلمة مرور DB
```

تأكد خصوصًا من:

- `WEB_URL=https://www.weekendgate.com`
- `API_URL=https://api.weekendgate.com`
- `NEXT_PUBLIC_API_URL=https://api.weekendgate.com`
- `CORS_ORIGINS=https://www.weekendgate.com,https://weekendgate.com`

وفي `apps/web` إن لزم:

```bash
cp .env apps/web/.env.production
# أو ضع NEXT_PUBLIC_API_URL في بيئة البناء
```

## 4) قاعدة البيانات و Redis

```bash
docker compose up -d
pnpm db:generate
pnpm db:migrate
pnpm db:seed
```

## 5) البناء والتشغيل

```bash
pnpm build
pm2 start deploy/pm2.ecosystem.config.cjs
pm2 save
pm2 startup
```

تحقق محليًا على السيرفر:

- `curl http://127.0.0.1:3012`
- `curl http://127.0.0.1:3011/health`

> المنافذ `3011/3012` مقصودة لتجنب التعارض مع مشروع آخر على نفس الـ Droplet.

## 6) Nginx + SSL

```bash
sudo cp deploy/nginx/weekendgate.com.conf /etc/nginx/sites-available/weekendgate.com
sudo ln -sf /etc/nginx/sites-available/weekendgate.com /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx

sudo certbot --nginx -d weekendgate.com -d www.weekendgate.com -d api.weekendgate.com
```

## 7) افتح الموقع

- الواجهة: https://www.weekendgate.com  
- الدخول التجريبي بعد الـ seed: `demo@watesly.travel` / `Demo1234!`

## تحديث لاحق

```bash
cd /var/www/weekendgate
git pull
pnpm install
pnpm build
pm2 restart all
```

## ملاحظات

- لا تفتح المنافذ 3001/3002 للعامة؛ اتركها خلف Nginx فقط.
- غيّر كل كلمات المرور والأسرار قبل فتح الموقع للعملاء.
- للبحث الحقيقي لاحقًا: ضع `DUFFEL_ACCESS_TOKEN` وغيّر `FLIGHT_PROVIDER` / `HOTEL_PROVIDER`.
