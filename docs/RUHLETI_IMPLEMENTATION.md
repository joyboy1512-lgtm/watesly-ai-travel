# رحلتي — خطة التنفيذ (WeekendGate)

تاريخ الفحص: 2026-09-02  
الفرع: `cursor/ruhelti-full-f5c3`  
**لا نشر على السيرفر** حتى موافقة صريحة.

## 1. فحص المشروع

| الطبقة | التقنية |
|--------|---------|
| Monorepo | pnpm 9 + Turborepo |
| الواجهة | Next.js 15.3, React 19, TypeScript |
| API | NestJS 11 (`apps/api`) |
| قاعدة البيانات | PostgreSQL + Prisma (`PlatformTrip` JSON components) |
| الحالة (واجهة) | React `useState` + Context جديد `TripBuilderProvider` |
| الجلسة | `localStorage` عبر `shop-session.ts` |
| i18n | `ShopI18nProvider` — نصوص عربية ثابتة + `dir`/`lang` |
| الألوان | `--tv-primary` / `#13357b` (ليس الأحمر المرجعي) |
| Feature flags | `NEXT_PUBLIC_WG_NEW_UI`, `NEXT_PUBLIC_WG_PLATFORM` |

### ما يبقى دون تغيير

- محرك البحث الرئيسي (`ShopHeroBanner` logic + `runSearch`)
- APIs الطيران/الفنادق الحقيقية (`/shop/search-flights`, `/shop/search-hotels`)
- تدفق الحجز الكلاسيكي (`/book/review`, `/book`)
- تكاملات المزودين الحالية

### ما كان موجودًا (scaffold)

- `/trip-builder` — صفحة بسيطة + demo components
- `platform.service.ts` — CRUD رحلة + checkout sandbox
- CTA في الهيرو عند `WG_PLATFORM=1` فقط
- `buildTripPriceBreakdown`, `PackageDraft` في `@watesly-travel/shared`

## 2. الملفات الجديدة

```
packages/shared/src/trip/
  types.ts              — TripDraftState, travelers, reprice, search
  labels.ts             — نص زر البحث حسب الخدمات
  validation.ts         — تحقق المسافرين والخدمات
  orchestration.ts      — بحث متوازي + حالات جزئية
  reprice.ts            — Reprice قبل الدفع
  timeline.ts           — جدول ملف الرحلة
  index.ts
  trip.test.ts

apps/web/src/lib/trip-builder/
  storage.ts            — sessionStorage (بدون جواز/بطاقة)
  mock-search.ts        — Mock adapter (WG_TRIP_USE_MOCK=1)
  orchestrate-client.ts — يستدعي API أو mock

apps/web/src/components/trip-builder/
  TripBuilderProvider.tsx
  RuheltiBoardingModal.tsx
  RuheltiTrigger.tsx
  TripProgressStepper.tsx
  TripResultsView.tsx
  TripTravelersForm.tsx
  TripPaymentView.tsx
  TripConfirmView.tsx
  TripFileView.tsx
  trip-builder.css

apps/web/src/app/trip-builder/
  layout.tsx            — Provider wrap
  results/page.tsx
  travelers/page.tsx
  payment/page.tsx
  confirm/page.tsx
  my-trip/[id]/page.tsx

apps/api/src/shop/
  trip-orchestration.service.ts
  (+ endpoints في platform.controller)
```

## 3. الملفات المعدّلة

- `ShopHeroBanner.tsx` — زر «رحلتي» منفصل (لا يغيّر البحث)
- `ShopHomeClient.tsx` — ربط Provider + prefilled flight ctx
- `StoreFront.tsx` — رابط رحلتي عند new UI
- `trip-builder/page.tsx` — إعادة توجيه أو فتح البوردنج
- `platform.css` + `trip-builder.css` — boarding pass بألوان الموقع
- `packages/shared/src/platform/index.ts` — export trip module
- `platform.controller.ts` — `POST /shop/platform/trips/:id/search`

## 4. Routes

| Route | الغرض |
|-------|--------|
| `/` | محرك البحث الحالي + زر رحلتي |
| `/trip-builder` | نقطة دخول / إعادة فتح البوردنج |
| `/trip-builder/results` | برنامج الرحلة + 3 خيارات |
| `/trip-builder/travelers` | بيانات المسافر |
| `/trip-builder/payment` | دفع موحّد |
| `/trip-builder/confirm` | تأكيد + حالة الإصدار |
| `/trip-builder/my-trip/[id]` | ملف الرحلة الحي |

## 5. البيانات

- **Prisma:** `PlatformTrip` — توسيع JSON `components` + `services` + `documents`
- **لا جداول جديدة** في المرحلة الأولى (JSON كافٍ للـ draft)
- **Mock:** `NEXT_PUBLIC_WG_TRIP_USE_MOCK=1` — نتائج تجريبية معزولة

## 6. APIs

- `POST /shop/platform/trips` — موجود
- `POST /shop/platform/trips/:id/search` — **جديد** orchestration
- `POST /shop/platform/trips/:id/reprice` — **جديد**
- `POST /shop/platform/me/checkout/pay` — موجود (sandbox)
- بحث حقيقي: يستدعي `shop.service` search داخليًا عند عدم Mock

## 7. الاختبارات

- `packages/shared/src/trip/trip.test.ts` — unit
- تشغيل: `node --import tsx --test packages/shared/src/trip/trip.test.ts`
- `pnpm --filter web build` + `pnpm typecheck`

## 8. Environment (بدون قيم)

- `NEXT_PUBLIC_WG_TRIP_USE_MOCK` — mock search (افتراضي 1 في dev)
- `NEXT_PUBLIC_WG_NEW_UI` — يظهر زر رحلتي
- `NEXT_PUBLIC_WG_PLATFORM` — APIs platform

## 9. Rollback

- إزالة `TripBuilderProvider` من `ShopHomeClient`
- إخفاء `onRuheltiClick` في `ShopHeroBanner`
- حذف routes الفرعية — `/trip-builder` يعيد التوجيه للرئيسية
- تعطيل `NEXT_PUBLIC_WG_NEW_UI` لإخفاء زر رحلتي

---

## 10. تقرير التسليم (2026-09-02)

### ما تم تنفيذه

- زر **رحلتي** منفصل عن محرك البحث (يظهر عند `NEXT_PUBLIC_WG_NEW_UI=1` أو `NEXT_PUBLIC_WG_PLATFORM=1`)
- واجهة **Boarding Pass** (modal) بألوان الموقع `#13357b`
- اختيار متعدد للخدمات الأربع + نص زر ديناميكي
- حقول ديناميكية قابلة للتوسيع لكل خدمة
- حالة موحدة `TripBuilderProvider` + `sessionStorage` (بدون جواز/دفع)
- بحث orchestration (mock افتراضي + API endpoint)
- صفحات: نتائج، مسافرين، دفع، تأكيد، ملف الرحلة
- Reprice قبل الدفع، مساعد رحلتك، جدول زمني
- 9 unit tests في `@watesly-travel/shared`

### ما يعمل ببيانات حقيقية

- Autocomplete المطارات/المدن (`/shop/airports`, `/shop/cities`)
- إنشاء رحلة platform (`POST /shop/platform/trips`)

### ما يزال Mock

- نتائج البحث المتكاملة (`NEXT_PUBLIC_WG_TRIP_USE_MOCK` افتراضي ≠ `0`)
- إصدار الحجوزات بعد الدفع (حالات محاكاة + polling)
- بوابات K-Net / Apple Pay / رابط دفع (تظهر فقط عند تفعيل env)

### نتائج الاختبارات

```
pnpm --filter @watesly-travel/shared test  → 9/9 pass
pnpm --filter web build                    → success
```

### Environment Variables (بدون قيم)

- `NEXT_PUBLIC_WG_NEW_UI` — إظهار زر رحلتي
- `NEXT_PUBLIC_WG_PLATFORM` — APIs platform
- `NEXT_PUBLIC_WG_TRIP_USE_MOCK` — mock search (افتراضي مفعّل)
- `NEXT_PUBLIC_WG_KNET`, `NEXT_PUBLIC_WG_APPLE_PAY`, `NEXT_PUBLIC_WG_PAY_LINK` — طرق دفع إضافية

### تشغيل محلي

```bash
pnpm install
NEXT_PUBLIC_WG_NEW_UI=1 NEXT_PUBLIC_WG_TRIP_USE_MOCK=1 pnpm --filter web dev
```

### مخاطر / متبقي

- E2E tests غير مضافة بعد
- API build يفشل بسبب تبعيات whatsapp-core موجودة مسبقًا
- ربط بحث حقيقي للفنادق/المواصلات/الأنشطة في orchestration server-side
- تشفير بيانات الجواز في backend عند الحفظ الدائم
- إشعارات push/email/whatsapp الفعلية بعد الإصدار
