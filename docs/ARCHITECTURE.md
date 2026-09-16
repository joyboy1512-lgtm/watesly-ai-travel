# هندسة النظام — Watesly Travel AI

## 1. الهدف من الوثيقة

وصف المعمارية المستهدفة للمنصة كـ Multi-Tenant SaaS، مع فصل واضح بين الواجهة، الـ API، العمال (Workers)، والحزم المشتركة، وضمان:

- عزل بيانات المؤسسات
- قابلية استبدال مزودي السفر والذكاء الاصطناعي وواتساب
- منع اختراع الأسعار
- ضوابط للعمليات الحساسة

---

## 2. الأسلوب المعماري

- **Monorepo** مُدار بـ Turborepo
- **Modular Monolith** في الـ API في المرحلة الأولى (وحدات واضحة داخل NestJS)
- إمكانية فصل خدمات لاحقًا عند الحاجة (بحث السفر، التسعير، الإرسال) دون إعادة كتابة العقود
- **Event/Queue driven** للعمليات غير المتزامنة: إرسال واتساب، حملات، بحث طويل، إعادة تحقق، إشعارات

```
                    ┌──────────────────────┐
                    │   WhatsApp Cloud API │
                    └──────────┬───────────┘
                               │ Webhooks
┌──────────────┐      ┌────────▼────────┐      ┌─────────────────┐
│  Next.js Web │─────▶│   NestJS API    │─────▶│  PostgreSQL     │
│  (لوحة التحكم)│◀─────│   REST + Auth   │◀─────│  (Prisma)       │
└──────────────┘      └────────┬────────┘      └─────────────────┘
                               │
                               │ Jobs
                      ┌────────▼────────┐
                      │  Redis + Queue  │
                      └────────┬────────┘
                               │
                      ┌────────▼────────┐
                      │  Worker App     │
                      │  (campaigns,    │
                      │   AI, search,   │
                      │   revalidate)   │
                      └────────┬────────┘
                               │
        ┌──────────────────────┼──────────────────────┐
        ▼                      ▼                      ▼
 ┌─────────────┐      ┌────────────────┐      ┌──────────────┐
 │ AI Providers│      │ Travel Adapters│      │ WhatsApp API │
 │ (abstracted)│      │ (multi-vendor) │      │  sender      │
 └─────────────┘      └────────────────┘      └──────────────┘
```

---

## 3. هيكل المستودع المقترح

```text
WATESLY TRAVEL AI/
├── apps/
│   ├── web/                 # Next.js — لوحة التحكم العربية
│   ├── api/                 # NestJS — REST API
│   └── worker/              # معالجات الطوابير
├── packages/
│   ├── ui/                  # مكوّنات واجهة مشتركة
│   ├── database/            # Prisma schema + client
│   ├── auth/                # أدوات الهوية والصلاحيات المشتركة
│   ├── config/              # إعدادات ESLint/TS/Env مشتركة
│   ├── shared/              # أنواع ودوال مشتركة
│   ├── ai-core/             # تجريد مزودي الذكاء الاصطناعي
│   ├── whatsapp-core/       # واتساب: إرسال/استقبال/قوالب
│   ├── travel-core/         # نماذج البحث والعروض والحجز المشتركة
│   ├── pricing-engine/      # محرك قواعد الربح والتسعير
│   └── provider-sdk/        # عقود Adapters + مزود تجريبي
├── docs/                    # الوثائق
├── .env.example
├── .gitignore
└── README.md
```

> في هذه المرحلة تُنشأ المجلدات فقط دون تثبيت حزم أو سقالات تطبيقات.

---

## 4. مسؤوليات التطبيقات

### 4.1 `apps/web` — Next.js
- لوحة تحكم عربية RTL
- مصادقة المستخدمين
- شاشات: لوحة التحكم، المحادثات، الحملات، العملاء، العروض، الحجوزات، المزودين، التسعير، الصلاحيات، التقارير، الإعدادات
- تتحدث فقط مع `apps/api` عبر REST
- لا تتصل مباشرة بقاعدة البيانات أو مزودي السفر

### 4.2 `apps/api` — NestJS
- REST API موثق (OpenAPI/Swagger لاحقًا)
- المصادقة والتفويض
- فرض `organizationId` على كل عملية Tenant
- استقبال Webhooks واتساب
- تنسيق حالات المحادثة والعروض والحجوزات
- دفع المهام إلى الطوابير
- لا ينفّذ عمليات طويلة داخل طلب HTTP إن أمكن

### 4.3 `apps/worker`
- إرسال رسائل الحملات على دفعات
- تشغيل مسار AI Travel Agent
- تنفيذ عمليات البحث عبر Adapters
- إعادة التحقق من السعر والتوافر
- إشعارات وتقارير مجدولة لاحقًا
- إعادة المحاولة (Retry) مع سياسات واضحة

---

## 5. الحزم المشتركة

| الحزمة | الدور |
|---|---|
| `packages/shared` | أنواع مشتركة، ثوابت، أخطاء قياسية، معرفات حالات |
| `packages/config` | إعدادات TypeScript/ESLint/Prettier المشتركة |
| `packages/database` | Prisma schema، client، helpers للـ tenancy |
| `packages/auth` | JWT/session helpers، RBAC utilities |
| `packages/ui` | مكوّنات UI عربية قابلة لإعادة الاستخدام |
| `packages/ai-core` | واجهة مزود AI + استخراج كيانات السفر + سياسات عدم التسعير |
| `packages/whatsapp-core` | عميل واتساب، قوالب، تطبيع الرسائل الواردة |
| `packages/travel-core` | نماذج Search/Offer/Quote/Booking المشتركة |
| `packages/pricing-engine` | تطبيق قواعد الربح على تكلفة المزود |
| `packages/provider-sdk` | `TravelProviderAdapter` + Mock Provider + تسجيل المزودين |

---

## 6. طبقة Multi-Tenancy

### القاعدة
كل كيان تشغيلي يحتوي على `organizationId` إلزاميًا (ما عدا جداول المنصة العامة).

### آليات العزل
1. **على مستوى التطبيق**: كل طلب مصادق يستخرج `organizationId` من الجلسة/الرمز، ولا يُقبل من العميل كتفضيل حر إلا لـ Platform Admin.
2. **على مستوى الاستعلام**: كل Query/Mutation يفلتر بـ `organizationId`.
3. **على مستوى قاعدة البيانات**: فهارس مركّبة تبدأ بـ `organizationId` حيث يلزم؛ سياسات لاحقة (Row Level Security) اختيارية بعد استقرار الـ MVP.
4. **على مستوى التخزين المؤقت والمهام**: مفاتيح Redis والطوابير تتضمن `organizationId`.

---

## 7. مسار محادثة السفر (Happy Path)

```text
رسالة واتساب واردة
  → Webhook API
  → حفظ Message + تحديث Conversation
  → إنزال Job: ai.interpret
  → AI يستخرج الحقول المعروفة ويحدد الناقص
  → إن ناقص: سؤال العميل
  → إن مكتمل: Job: travel.search
  → Adapters تبحث عند المزودين المفعّلين
  → Pricing Engine يحوّل التكلفة إلى سعر بيع
  → إنشاء Quote داخلي (تكلفة/بيع/ربح)
  → إرسال ملخص البيع فقط للعميل عبر واتساب
  → عند الموافقة: Job: travel.revalidate
  → إنشاء BookingRequest / Booking
  → عند التعقيد: Human Handoff
```

---

## 8. تجريد مزودي السفر (Provider Adapters)

### العقد الأساسي (مفهومي)

```ts
interface TravelProviderAdapter {
  readonly id: string;
  readonly capabilities: ProviderCapability[]; // flight, hotel, insurance, car, transfer
  searchFlights(input: FlightSearchInput, ctx: ProviderContext): Promise<FlightOffer[]>;
  searchHotels(input: HotelSearchInput, ctx: ProviderContext): Promise<HotelOffer[]>;
  // ... بقية القدرات حسب الدعم
  revalidateOffer(input: RevalidateInput, ctx: ProviderContext): Promise<RevalidationResult>;
  createBooking(input: BookingInput, ctx: ProviderContext): Promise<ProviderBookingResult>;
}
```

### قواعد مهمة
- لا تعتمد المنصة على Amadeus وحدها.
- كل مزود Adapter مستقل داخل `provider-sdk` أو امتداد لاحق.
- يجب وجود **Mock Provider** واضح للاختبار والتطوير.
- كل عرض قادم من المزود يحمل:
  - `providerId`
  - `providerOfferId` / raw reference
  - `costAmount` + `currency`
  - `expiresAt` إن وُجد
  - بصمة قابلية إعادة التحقق

---

## 9. تجريد الذكاء الاصطناعي

`ai-core` يقدّم:

- فهم نية الرسالة (`intent`)
- استخراج كيانات السفر (مغادرة، وجهة، تواريخ، ركاب، درجة، ميزانية، تفضيلات)
- تحديد الحقول الناقصة واقتراح السؤال التالي
- تلخيص المحادثة للموظف عند التحويل البشري

### قيود صارمة على AI
- **ممنوع** توليد أسعار أو توافر.
- **ممنوع** تأكيد الحجز.
- **ممنوع** تجاوز قواعد الصلاحيات أو التسعير.
- أي رقم سعر يُعرض للعميل يجب أن يأتي من Quote ناتج عن مزود + محرك تسعير.

---

## 10. محرك التسعير (`pricing-engine`)

المدخلات:
- عرض مزود بتكلفة حقيقية (`cost`)
- قواعد المؤسسة (`PricingRule`)
- سياق الخدمة (طيران/فندق/...) والعملة

المخرجات الداخلية:
- `costAmount`
- `sellAmount`
- `profitAmount`
- `pricingRuleId`
- `pricingBreakdown` (للتدقيق الداخلي فقط)

المخرجات الخارجية للعميل:
- سعر البيع فقط + تفاصيل الخدمة العامة

أنواع قواعد مقترحة:
- نسبة مئوية على التكلفة
- مبلغ ثابت
- حد أدنى للربح
- قواعد حسب نوع الخدمة / الوجهة / شركة الطيران / شريحة السعر (لاحقًا)

---

## 11. الطوابير والعمال

أنواع Jobs أولية مقترحة:

| Job | الغرض |
|---|---|
| `whatsapp.send` | إرسال رسالة/قالب |
| `campaign.dispatch` | توزيع حملة على شرائح |
| `ai.interpret` | تفسير رسالة واردة |
| `travel.search` | بحث عبر المزودين |
| `quote.generate` | توليد عرض بعد التسعير |
| `travel.revalidate` | إعادة تحقق قبل الحجز |
| `handoff.notify` | تنبيه الموظف |
| `audit.write` | كتابة تدقيق غير متزامن عند الحاجة |

التقنية المقترحة: Redis + مكتبة طوابير ناضجة (BullMQ مرشّحة)، مع قرار نهائي عند التنفيذ.

---

## 12. واجهة REST

مبادئ:
- موارد واضحة لكل وحدة (`/organizations`, `/conversations`, `/quotes`, ...)
- كل مسار Tenant يفرض عضوية وصلاحية
- ترقيم صفحات موحّد، أخطاء قياسية، معرّفات ارتباط (`requestId`)
- توثيق OpenAPI منذ بداية بناء الـ API
- Webhooks واتساب على مسار مخصص مع تحقق توقيع

---

## 13. البيانات والتخزين

| المخزن | الاستخدام |
|---|---|
| PostgreSQL | المصدر الحقيقي للبيانات التشغيلية |
| Redis | Cache قصير الأمد + Queue + أقفال خفيفة |
| Object Storage (لاحقًا) | مرفقات، صادرات تقارير، وسائط قوالب |

Prisma داخل `packages/database` هو طبقة الوصول القياسية.

---

## 14. المصادقة والتفويض (ملخص هندسي)

- جلسات/JWT للمستخدمين في اللوحة
- RBAC قائم على أدوار وصلاحيات دقيقة
- صلاحيات حساسة منفصلة: `bookings.issue`, `payments.capture`, `pricing.override`, `providers.manage`
- تفاصيل أوسع في [`SECURITY.md`](./SECURITY.md)

---

## 15. قابلية المراقبة (Observability) — لاحقًا

- سجلات منظمة (JSON) مع `organizationId`, `conversationId`, `requestId`
- مقاييس: زمن البحث، فشل المزودين، نجاح إعادة التحقق، حجم الحملات
- تتبع موزّع للطلبات العابرة للـ API/Worker

لا تُنفَّذ في مرحلة الوثائق الحالية.

---

## 16. قرارات معمارية مثبتة الآن

1. المشروع Monorepo مستقل.
2. فصل Web / API / Worker.
3. Multi-Tenant عبر `organizationId`.
4. Adapter pattern لمزودي السفر.
5. AI للفهم فقط وليس للتسعير.
6. Pricing Engine منفصل.
7. إعادة تحقق إلزامية قبل تأكيد الحجز.
8. العميل لا يرى التكلفة أو الهامش.

## 17. قرارات مؤجلة للموافقة

- اختيار مكتبة الطوابير النهائية
- اختيار مزود AI الأول
- اختيار أول مزود سفر حقيقي بعد الـ Mock
- اعتماد RLS على PostgreSQL في الـ MVP أو بعده
- استراتيجية الدفع الكاملة (تسجيل حالة مقابل بوابة)
