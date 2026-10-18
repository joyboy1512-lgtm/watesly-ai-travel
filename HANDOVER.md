# تعريف موقع WeekendGate المنشور

هذا الملف يعرّف الموقع الأصلي المنشور على https://www.weekendgate.com كما هو: صفحاته، لوحة التحكم، اللغات، التقنيات، السيرفر، والمزودون.  
ليس نسخة بايثون التجريبية، ولا يغيّر الموقع.

تاريخ التعريف: 18 أكتوبر 2026.

لا يحتوي مفاتيح المزودين، ولا كلمة مرور قاعدة البيانات، ولا مفتاح الدخول إلى السيرفر. هذه الأسرار موجودة على السيرفر فقط.

## 1. ما هو الموقع

WeekendGate واجهة حجز سفر بالعربي والإنجليزي، تديرها شركة ترافل زون للسياحة والسفر. العميل يبحث عن طيران وفنادق وأنشطة وتنقلات، ويكمل الحجز من الموقع. فريق التشغيل يدير الحجوزات والعملاء والتسعير وواتساب من لوحة التحكم.

- العلامة الظاهرة للعميل: WeekendGate
- الاسم القانوني: شركة ترافل زون للسياحة والسفر / Travel Zone Tourism & Travel
- الترخيص السياحي: 2015/2587
- العنوان: حولي، شارع تونس، مجمع البحر سنتر، سرداب، مكتب 18
- الهاتف وواتساب: 90053224
- البريد: info@travelzone.tours
- العملة الافتراضية: الدينار الكويتي `KWD`
- الأرقام دائمًا لاتينية `0-9`، ورمز العملة بالإنجليزي في اللغتين

## 2. الروابط

| الغرض | الرابط |
| --- | --- |
| الموقع للعملاء | https://www.weekendgate.com |
| النطاق بدون www | https://weekendgate.com يحوّل إلى www |
| واجهة البرمجة | https://api.weekendgate.com |
| دخول الموظفين | https://www.weekendgate.com/login |
| لوحة التحكم بعد الدخول | https://www.weekendgate.com/dashboard |
| حساب العميل | https://www.weekendgate.com/account/login |
| المستودع | https://github.com/joyboy1512-lgtm/watesly-ai-travel |

الموقع المنشور مربوط بالمنظمة `watesly-demo`.

## 3. حساب المدير

| الحقل | القيمة |
| --- | --- |
| صفحة الدخول | https://www.weekendgate.com/login |
| البريد | `demo@watesly.travel` |
| كلمة المرور الابتدائية | `Demo1234!` |
| الاسم داخل النظام | مالك تجريبي |
| الدور | مالك `owner` على منظمة `watesly-demo` |

حساب بيانات تجربة أقدم، وليس حساب الموقع العام:

| البريد | المنظمة | الدور | كلمة المرور الابتدائية |
| --- | --- | --- | --- |
| `owner@ufuq.travel` | `ufuq-travel` (سفر الأفق) | مالك | `Demo1234!` |

كلمتا المرور هما كلمة البذرة في `packages/database/prisma/seed.ts`. الحسابان موجودان في قاعدة الإنتاج. كلمة المرور مخزّنة مشفّرة. إذا تغيّرت من شاشة الموظفين، تُستعاد أو تُغيَّر من لوحة التحكم.

بعد أول دخول: تغيير كلمة المرور، وإنشاء مستخدم باسم المبرمج من صفحة الموظفين.

الأدوار داخل كل منظمة:

- `owner` المالك: كل الصلاحيات، ومنها تجاوز التسعير
- `admin` المدير: كل الصلاحيات ما عدا تجاوز التسعير
- `agent` موظف المبيعات
- `viewer` مشاهد

إدارة الموظفين: https://www.weekendgate.com/dashboard/users

## 4. رحلة العميل

اللغة الافتراضية العربية واتجاهها من اليمين إلى اليسار. الإنجليزية من اليسار إلى اليمين. تبديل اللغة يغيّر `lang` و`dir` معًا.

### البحث والحجز

| المسار | الوظيفة |
| --- | --- |
| `/` | الرئيسية: بحث الطيران والفنادق والسيارات والأنشطة |
| `/flights/results` | نتائج الطيران واختيار الرحلة |
| `/book` | بدء حجز الطيران |
| `/book/review` | مراجعة حجز الطيران |
| `/book/checkout` | بيانات المسافر قبل الدفع |
| `/book/pay` | الدفع: بطاقة مستضافة، كي نت، أو Apple Pay عند التفعيل |
| `/book/status` | حالة الحجز بعد الدفع |
| `/hotels/results` | نتائج الفنادق، خريطة صغيرة فوق الفلاتر، وبطاقة السعر |
| `/hotels/[hotelId]` | الفندق والغرف والأسعار |
| `/hotels/book/review` | مراجعة حجز الفندق |
| `/hotels/book/guests` | بيانات النزلاء |
| `/activities/results` | نتائج الأنشطة |
| `/activities/book/review` | مراجعة حجز النشاط |
| `/transfers/results` | نتائج التنقلات |
| `/transfers/book/review` | مراجعة حجز التنقل |
| `/trip-builder` | بناء رحلة كاملة |
| `/trip-builder/results` | نتائج الرحلة المجمّعة |
| `/trip-builder/travelers` | مسافرو الرحلة |
| `/trip-builder/payment` | دفع الرحلة |
| `/trip-builder/confirm` | تأكيد الرحلة |
| `/trip-builder/my-trip/[id]` | رحلة محفوظة |
| `/bookings/manage` | إدارة حجز قائم |
| `/chat` | محادثة العميل |

### الحساب والمحتوى

| المسار | الوظيفة |
| --- | --- |
| `/account/login` | دخول العميل |
| `/account/register` | تسجيل عميل |
| `/account` | الحساب |
| `/account/trips` | الرحلات |
| `/account/saved` | المحفوظات |
| `/account/points` | النقاط |
| `/account/referrals` | الإحالات |
| `/account/alerts` | التنبيهات |
| `/account/notifications` | الإشعارات |
| `/destinations` و`/destinations/[slug]` | الوجهات |
| `/deals` و`/deals/[slug]` | العروض |
| `/articles` و`/articles/[slug]` | المقالات |
| `/catalog` | الكتالوج العام |
| `/about` | عن الشركة |
| `/contact` | التواصل |
| `/faq` | الأسئلة |
| `/privacy` | الخصوصية |
| `/terms` | الشروط |
| `/booking-policy` | سياسة الحجز |
| `/payment-policy` | سياسة الدفع |

`/ui-preview` صفحة داخلية لمعاينة الشكل، وليست صفحة للعميل.

وسائل الدفع الظاهرة في الواجهة: بطاقة عبر صفحة مستضافة، كي نت، وApple Pay. الموقع يذكر أن تفعيلها مرتبط بحساب التاجر، وأن أرقام البطاقات ورمز الأمان لا تُخزَّن في الموقع.

## 5. لوحة التحكم

الدخول من https://www.weekendgate.com/login. القائمة كما تظهر للموظف:

| المسار | الاسم في القائمة | الوظيفة |
| --- | --- | --- |
| `/dashboard` | لوحة التحكم | الملخص التشغيلي |
| `/dashboard/inquiries` | الاستعلامات المباشرة | الطلبات المباشرة |
| `/dashboard/inquiries/book` | — | حجز من الاستعلام |
| `/dashboard/inquiries/book/hotel` | — | حجز فندق من الاستعلام |
| `/dashboard/inquiries/book/activity` | — | حجز نشاط من الاستعلام |
| `/dashboard/inquiries/book/transfer` | — | حجز تنقل من الاستعلام |
| `/dashboard/conversations` | المحادثات | صندوق المحادثات وربطه بواتساب |
| `/dashboard/conversations/[id]` | — | محادثة واحدة |
| `/dashboard/assistant` | مساعد السفر | إعداد المساعد |
| `/dashboard/contacts` | العملاء | سجل العملاء |
| `/dashboard/quotes` | عروض الأسعار | عروض تُرسل للعميل |
| `/dashboard/bookings` | الحجوزات | قائمة الحجوزات |
| `/dashboard/bookings/[id]` | — | حجز واحد |
| `/dashboard/providers` | مزودو السفر | Duffel وHotelbeds ومن يمكن تفعيله |
| `/dashboard/currency` | العملة وسعر الصرف | عرض العملات وأسعار التحويل |
| `/dashboard/pricing` | قواعد التسعير | هامش الربح وقواعد السعر |
| `/dashboard/whatsapp` | واتساب | ربط حساب واتساب ميتا |
| `/dashboard/channels` | القنوات | قنوات التواصل |
| `/dashboard/templates` | القوالب | قوالب الرسائل |
| `/dashboard/campaigns` | الحملات | حملات الرسائل |
| `/dashboard/catalog` | كتالوج ميتا | كتالوج واتساب |
| `/dashboard/users` | الموظفون والصلاحيات | المستخدمون والأدوار |
| `/dashboard/audit` | سجل التدقيق | من غيّر ماذا |
| `/dashboard/cms` | CMS · المحتوى | صفحات ومحتوى الموقع |
| `/dashboard/settings` | الإعدادات | إعدادات المنظمة |

## 6. اللغات والتقنيات

### الواجهة

- العربية افتراضية، اتجاه RTL
- الإنجليزية، اتجاه LTR
- نصوص المتجر في مزوّد `ShopI18nProvider`، ونصوص اللوحة بجانبها
- أسعار المتجر لا تُترجم: الأرقام لاتينية ورمز العملة إنجليزي

### البرمجة

- TypeScript للواجهة والواجهة البرمجية والعامل المشترك
- CSS لتصميم الصفحات، بدون إطار مكونات خارجي للصفحات
- SQL عبر Prisma على PostgreSQL
- تشغيل الموقع المنشور لا يعتمد على Python أو PHP

| الجزء | التقنية |
| --- | --- |
| الواجهة | Next.js 15 وReact 19، الحزمة `@watesly-travel/web` |
| الواجهة البرمجية | NestJS 11، الحزمة `@watesly-travel/api` |
| الطوابير | `@watesly-travel/worker` مع BullMQ |
| قاعدة البيانات | PostgreSQL 17 عبر Prisma 6 |
| الكاش والطوابير | Redis 7 |
| مدير الحزم | pnpm 9.15.4 |
| تشغيل Node | Node.js 20.20.2 |
| إدارة العمليات | PM2 |
| البروكسي | Caddy |
| المستودع | Turborepo، الاسم الداخلي `watesly-travel-ai` |

الحزم:

- `apps/web` الموقع ولوحة التحكم
- `apps/api` نقاط الـ API
- `apps/worker` واتساب والمهام الخلفية
- `packages/database` مخطط Prisma
- `packages/shared` العملة والشركة والنصوص المشتركة
- `packages/pricing-engine` قواعد التسعير
- `packages/provider-sdk` الاتصال بمزودي السفر
- `packages/travel-core` منطق السفر
- `packages/ai-core` المساعد والصوت
- `packages/whatsapp-core` واتساب ميتا
- `packages/auth` و`packages/config` و`packages/ui`

## 7. السيرفر والنشر

سيرفر إنتاج واحد في فرانكفورت:

- الاسم: `ubuntu-s-2vcpu-4gb-120gb-intel-fra1`
- العنوان: `64.226.69.159`
- الدخول: SSH بالمستخدم `root` بمفتاح خاص عند المالك. المفتاح غير موجود في هذا الملف ولا في Git
- مجلد الموقع: `/var/www/weekendgate`
- نسخة البناء قبل التبديل: `/var/www/wg-stage`
- النسخ الاحتياطية: `/var/www/backups`

Caddy يستقبل HTTPS ثم يوزّع:

| المسار | الوجهة |
| --- | --- |
| `https://www.weekendgate.com/api/*` | `127.0.0.1:3011` الواجهة البرمجية |
| بقية `www.weekendgate.com` | `127.0.0.1:3012` موقع Next.js |
| `https://api.weekendgate.com` | `127.0.0.1:3011` |
| `weekendgate.com` | تحويل دائم إلى www |

عمليات PM2، وكلها تعمل:

| العملية | المجلد | المنفذ |
| --- | --- | --- |
| `weekendgate-web` | `/var/www/weekendgate/apps/web` | 3012، نسختان |
| `weekendgate-api` | `/var/www/weekendgate/apps/api` | 3011، نسختان |
| `weekendgate-worker` | `/var/www/weekendgate/apps/worker` | بدون منفذ عام |

قاعدة البيانات على نفس الجهاز: المضيف `127.0.0.1`، المنفذ `5433`، الاسم `watesly_travel`، المستخدم `watesly`. كلمة المرور في ملف البيئة فقط.

ملف البيئة الوحيد للإنتاج:

`/var/www/weekendgate/apps/api/.env`

لا يُنسخ إلى Git. مثال المفاتيح بدون قيم في `.env.example` و`deploy/.env.production.example`.

النشر الذي استُخدم للتعديلات الأخيرة:

1. مزامنة ملفات الإنتاج إلى `/var/www/wg-stage` مع الإبقاء على `node_modules` كرابط إلى الإنتاج.
2. وضع الملفات المعدّلة فوق النسخة التجريبية.
3. البناء: `pnpm --filter @watesly-travel/web build` مع `NODE_OPTIONS=--max-old-space-size=1800`.
4. نقل مجلد `.next` القديم إلى `.next.prev` ثم نسخ البناء الجديد.
5. `pm2 reload weekendgate-web --update-env`.

إذا اختلف فرع Git عن السيرفر، النسخة المنشورة في `/var/www/weekendgate` هي المرجع، لأن بعض التعديلات نُشرت مباشرة على السيرفر.

التشغيل المحلي للتطوير:

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm dev
```

المنافذ المحلية في `docker-compose.yml`: Postgres على `5433`، PgBouncer على `6432`، Redis على `6380`. الواجهة في التطوير على `3002`، والواجهة البرمجية على `3001`.

## 8. المزودون العاملون

| المزود | الحالة |
| --- | --- |
| الطيران | Duffel، والمتغير `FLIGHT_PROVIDER=duffel` |
| الفنادق | Hotelbeds، والمتغير `HOTEL_PROVIDER=hotelbeds` |
| التنقلات | `hotelbeds-transfers` |
| الأنشطة | `hotelbeds-activities` |
| عنوان Hotelbeds الحالي | `https://api.test.hotelbeds.com` وهذا عنوان الاختبار وليس عقد الإنتاج النهائي |
| المساعد والصوت | OpenAI، النموذج المسجّل `gpt-5.6-luna` |
| العملة الافتراضية | `KWD` |
| وضع التجربة العشوائي | `TRAVEL_MOCK_ENABLED=false` |
| منظمة الموقع العام | `PUBLIC_ORG_SLUG=watesly-demo` |
| منصة الرحلات | `WG_PLATFORM=1` |

Hotelbeds وDuffel مفعّلان من لوحة المزودين. مفاتيحهما مشفّرة في قاعدة البيانات أو في ملف البيئة. Travelport وAmadeus وTravelfusion موجودون في الكود ويمكن تفعيلهم لاحقًا، وهم ليسوا مزود الطيران الشغّال الآن.

## 9. ما بداخل ملف التحميل

1. هذا التعريف.
2. المستودع: https://github.com/joyboy1512-lgtm/watesly-ai-travel
3. الموقع المنشور: https://www.weekendgate.com والملفات على السيرفر في `/var/www/weekendgate`
4. حساب المالك في القسم 3
5. مفتاح SSH يُسلَّم يدويًا خارج هذا الملف
6. ملف `/var/www/weekendgate/apps/api/.env` يبقى على السيرفر

بعد التسليم: تغيير `Demo1234!`، إنشاء مستخدم المبرمج من `/dashboard/users`، وعدم وضع مفاتيح Hotelbeds أو Duffel أو OpenAI في Git أو في الشات.
