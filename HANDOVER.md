# تسليم موقع WeekendGate لمبرمج

هذا الملف يشرح الموقع المنشور كما هو الآن: ماذا يفعل، كيف بُني، بأي لغات، أين يعمل، وكيف تُفتح لوحة التحكم. لا يحتوي مفاتيح المزودين ولا كلمة مرور قاعدة البيانات ولا مفتاح الدخول للسيرفر. هذه الأسرار موجودة فقط على السيرفر.

تاريخ هذه اللقطة: 17 أكتوبر 2026.

## 1. الروابط

| الغرض | الرابط |
| --- | --- |
| الموقع للعملاء | https://www.weekendgate.com |
| تحويل تلقائي من النطاق بدون www | https://weekendgate.com يعيد التوجيه إلى www |
| واجهة البرمجة | https://api.weekendgate.com |
| دخول الموظفين ولوحة التحكم | https://www.weekendgate.com/login |
| بعد تسجيل الدخول | https://www.weekendgate.com/dashboard |
| حساب العميل | https://www.weekendgate.com/account/login |

العلامة التجارية الظاهرة للعميل هي **WeekendGate**. الجهة القانونية المسجّلة في النظام:

- الاسم: شركة ترافل زون للسياحة والسفر / Travel Zone Tourism & Travel
- الترخيص السياحي: 2015/2587
- العنوان: حولي، شارع تونس، مجمع البحر سنتر، سرداب، مكتب 18
- الهاتف وواتساب: 90053224
- البريد: info@travelzone.tours

## 2. حساب المدير الجاهز للتسليم

الموقع المنشور مربوط بالمنظمة `watesly-demo`. هذا هو حساب المالك الذي يدخل لوحة التحكم:

| الحقل | القيمة |
| --- | --- |
| صفحة الدخول | https://www.weekendgate.com/login |
| البريد | `demo@watesly.travel` |
| كلمة المرور الابتدائية | `Demo1234!` |
| الاسم داخل النظام | مالك تجريبي |
| الدور | مالك (`owner`) على منظمة `watesly-demo` |
| الحالة | نشط |

يوجد حساب ثانٍ من بيانات التجربة الأولى، وليس هو حساب الموقع العام:

| البريد | المنظمة | الدور | كلمة المرور الابتدائية |
| --- | --- | --- | --- |
| `owner@ufuq.travel` | `ufuq-travel` (سفر الأفق) | مالك | `Demo1234!` |

كلمتا المرور هاتان هما كلمة بيانات البذرة في `packages/database/prisma/seed.ts`. الحسابان ما زالا موجودين في قاعدة الإنتاج بنفس الاسم. كلمة المرور مخزّنة مشفّرة ولا تُسترجع من قاعدة البيانات. إذا تغيّرت لاحقًا من شاشة الموظفين، استخدم الاستعادة من داخل لوحة التحكم أو غيّرها من هناك.

المطلوب من المبرمج بعد أول دخول: تغيير كلمة المرور، وإنشاء مستخدم باسمه من صفحة الموظفين، وعدم الإبقاء على `Demo1234!`.

صلاحيات الأدوار داخل كل منظمة:

- `owner` المالك: كل الصلاحيات بما فيها تجاوز التسعير
- `admin` مدير: كل الصلاحيات ما عدا تجاوز التسعير
- `agent` موظف مبيعات
- `viewer` مشاهد

إدارة الموظفين: https://www.weekendgate.com/dashboard/users

## 3. ماذا يرى العميل

الموقع واجهة حجز بالعربي والإنجليزي. العملة الافتراضية للوكالة دينار كويتي `KWD`. الأرقام دائمًا `0-9`، ورمز العملة دائمًا بالإنجليزي (`KWD` و`SAR` و`AED` وغيرها) في اللغتين.

الصفحات العامة الأساسية:

| المسار | الوظيفة |
| --- | --- |
| `/` | الصفحة الرئيسية والبحث: طيران، فنادق، سيارات، أنشطة |
| `/flights/results` | نتائج الطيران والحجز |
| `/hotels/results` | نتائج الفنادق، خريطة صغيرة فوق الفلاتر، بطاقات الفنادق |
| `/hotels/[hotelId]` | صفحة الفندق والغرف |
| `/hotels/book/review` و`/hotels/book/guests` | مراجعة الحجز وبيانات النزلاء |
| `/book` ومسار `/book/*` | إتمام حجز الطيران والدفع |
| `/activities/results` | الأنشطة |
| `/transfers/results` | التنقلات |
| `/trip-builder` | بناء رحلة كاملة |
| `/account` | حساب العميل: رحلات، محفوظات، نقاط، إحالات، تنبيهات |
| `/destinations` و`/deals` و`/articles` | وجهات وعروض ومقالات |
| `/about` و`/contact` و`/faq` | عن الشركة والتواصل والأسئلة |
| `/privacy` و`/terms` و`/booking-policy` و`/payment-policy` | الصفحات القانونية |

تبديل اللغة من واجهة الموقع يغيّر `lang` و`dir`: العربي من اليمين لليسار، والإنجليزي من اليسار لليمين.

## 4. لوحة التحكم

الدخول من https://www.weekendgate.com/login ثم تفتح القائمة على هذه الصفحات:

| المسار | الوظيفة |
| --- | --- |
| `/dashboard` | الرئيسية التشغيلية |
| `/dashboard/inquiries` | الاستعلامات المباشرة، ومنها حجز فندق أو نشاط أو انتقال |
| `/dashboard/conversations` | صندوق المحادثات وربطه بواتساب |
| `/dashboard/assistant` | مساعد السفر |
| `/dashboard/contacts` | العملاء |
| `/dashboard/quotes` | عروض الأسعار |
| `/dashboard/bookings` | الحجوزات |
| `/dashboard/providers` | مزودو الطيران والفنادق |
| `/dashboard/currency` | العملة وسعر الصرف |
| `/dashboard/pricing` | قواعد التسعير |
| `/dashboard/whatsapp` | ربط حساب واتساب ميتا |
| `/dashboard/channels` | القنوات |
| `/dashboard/templates` | قوالب الرسائل |
| `/dashboard/campaigns` | الحملات |
| `/dashboard/catalog` | كتالوج ميتا |
| `/dashboard/users` | الموظفون والصلاحيات |
| `/dashboard/audit` | سجل التدقيق |
| `/dashboard/cms` | محتوى الموقع |
| `/dashboard/settings` | الإعدادات |

## 5. اللغات والتقنيات

### لغات الواجهة

- العربية: اللغة الافتراضية، اتجاه RTL
- الإنجليزية: اتجاه LTR
- ملفات اللغة في مزوّد المتجر `ShopI18nProvider` ونصوص لوحة التحكم
- لا تُترجم أرقام الأسعار ولا رموز العملة

### لغات البرمجة

- TypeScript في الواجهة والواجهة البرمجية والعامل المشترك
- CSS لتصميم الواجهة، بدون إطار مكونات خارجي للصفحات
- SQL عبر Prisma على PostgreSQL
- لا يوجد Python أو PHP في تشغيل الموقع

### الإطار والإصدارات على السيرفر

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

الحزم الداخلية:

- `apps/web` الموقع ولوحة التحكم
- `apps/api` كل نقاط الـ API
- `apps/worker` مهام واتساب والخلفية
- `packages/database` مخطط Prisma
- `packages/shared` العملة والشركة والنصوص المشتركة
- `packages/pricing-engine` قواعد التسعير
- `packages/provider-sdk` الاتصال بمزودي السفر
- `packages/travel-core` منطق السفر
- `packages/ai-core` المساعد والصوت
- `packages/whatsapp-core` واتساب ميتا
- `packages/auth` و`packages/config` و`packages/ui`

## 6. كيف أُعدّ السيرفر

السيرفر إنتاج واحد في فرانكفورت:

- الاسم: `ubuntu-s-2vcpu-4gb-120gb-intel-fra1`
- العنوان: `64.226.69.159`
- الدخول: SSH بالمستخدم `root` بمفتاح خاص يحتفظ به المالك. المفتاح غير مكتوب في هذا الملف ولا في Git.
- مجلد الموقع: `/var/www/weekendgate`
- نسخة البناء التجريبية قبل النشر: `/var/www/wg-stage`
- النسخ الاحتياطية: `/var/www/backups`

Caddy يستقبل HTTPS ثم يوزّع الطلبات:

| المسار | الوجهة |
| --- | --- |
| `https://www.weekendgate.com/api/*` | `127.0.0.1:3011` الواجهة البرمجية |
| بقية `www.weekendgate.com` | `127.0.0.1:3012` موقع Next.js |
| `https://api.weekendgate.com` | `127.0.0.1:3011` |
| `weekendgate.com` | تحويل دائم إلى www |

عمليات PM2 الحالية، وكلها `online`:

| العملية | المجلد | المنفذ |
| --- | --- | --- |
| `weekendgate-web` | `/var/www/weekendgate/apps/web` | 3012، نسختان |
| `weekendgate-api` | `/var/www/weekendgate/apps/api` | 3011، نسختان |
| `weekendgate-worker` | `/var/www/weekendgate/apps/worker` | بدون منفذ عام |

قاعدة البيانات على نفس الجهاز: المضيف `127.0.0.1`، المنفذ `5433`، الاسم `watesly_travel`، المستخدم `watesly`. كلمة المرور في ملف البيئة فقط.

ملف البيئة الوحيد للإنتاج:

`/var/www/weekendgate/apps/api/.env`

لا يُنسخ إلى Git. مثال المفاتيح بدون قيم في `.env.example` و`deploy/.env.production.example`.

طريقة النشر التي استُخدمت للتعديلات الأخيرة، بدون توقف طويل:

1. مزامنة ملفات الإنتاج إلى `/var/www/wg-stage` مع الإبقاء على `node_modules` كرابط إلى الإنتاج.
2. وضع الملفات المعدّلة فوق النسخة التجريبية.
3. البناء: `pnpm --filter @watesly-travel/web build` مع `NODE_OPTIONS=--max-old-space-size=1800`.
4. نقل مجلد `.next` القديم إلى `.next.prev` ثم نسخ البناء الجديد.
5. `pm2 reload weekendgate-web --update-env`.

البناء المحلي للتطوير:

```bash
pnpm install
pnpm docker:up
pnpm db:generate
pnpm dev
```

المنافذ المحلية في `docker-compose.yml`: Postgres على `5433`، PgBouncer على `6432`، Redis على `6380`. الواجهة في التطوير على `3002`، والواجهة البرمجية على `3001`.

## 7. المزودون المرتبطون الآن

القيم السرية غير مكتوبة هنا. الحالة الظاهرة في الإنتاج:

| المزود | الحالة |
| --- | --- |
| الطيران | Duffel، والمتغير `FLIGHT_PROVIDER=duffel` |
| الفنادق | Hotelbeds، والمتغير `HOTEL_PROVIDER=hotelbeds` |
| التنقلات | `hotelbeds-transfers` |
| الأنشطة | `hotelbeds-activities` |
| عنوان Hotelbeds الحالي | `https://api.test.hotelbeds.com` وهذا عنوان الاختبار وليس عقد الإنتاج النهائي |
| الذكاء والمساعد الصوتي | OpenAI، النموذج المسجّل `gpt-5.6-luna` |
| العملة الافتراضية | `KWD` |
| وضع التجربة العشوائي | `TRAVEL_MOCK_ENABLED=false` |
| منظمة الموقع العام | `PUBLIC_ORG_SLUG=watesly-demo` |
| منصة الرحلات | `WG_PLATFORM=1` |

Hotelbeds وDuffel مفعّلان من لوحة المزودين. مفاتيحهما مشفّرة في قاعدة البيانات أو في ملف البيئة. Travelport وAmadeus وTravelfusion موجودون في الكود كمزودين يمكن تفعيلهم لاحقًا، وليسوا مزود الطيران الشغّال الآن.

## 8. ما يسلَّم للمبرمج

1. هذا الملف.
2. مستودع GitHub: https://github.com/joyboy1512-lgtm/watesly-ai-travel
3. الموقع المنشور على https://www.weekendgate.com ونسخة الملفات على السيرفر في `/var/www/weekendgate`. النسخة المنشورة هي المرجع إذا اختلف فرع Git عن السيرفر، لأن التعديلات نُشرت مباشرة على السيرفر.
4. حساب المالك `demo@watesly.travel` كما في القسم 2.
5. مفتاح SSH للسيرفر، يُسلَّم يدويًا خارج Git وخارج هذا الملف.
6. ملف `/var/www/weekendgate/apps/api/.env` يبقى على السيرفر. لا يُرسل في بريد ولا يُرفع إلى المستودع.

بعد التسليم يُفضَّل:

- تغيير `Demo1234!` فورًا.
- إنشاء مستخدم للمبرمج من `/dashboard/users` ثم إيقاف الاعتماد على الحساب التجريبي عند انتهاء العمل.
- عدم لصق مفاتيح Hotelbeds أو Duffel أو OpenAI في الشات أو في Git.
- معرفة أن بحث الفنادق الحالي يضرب بيئة Hotelbeds التجريبية إلى أن يُستبدل العنوان والمفاتيح بعقد الإنتاج.
