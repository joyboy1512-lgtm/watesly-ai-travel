# كيانات قاعدة البيانات — Watesly Travel AI

## 1. مبادئ النمذجة

- PostgreSQL عبر Prisma.
- كل كيان تشغيلي يحمل `organizationId` ما لم يُذكر خلاف ذلك.
- المفاتيح الأساسية: `uuid` (مفضل) أو `cuid`.
- الطوابع الزمنية: `createdAt`, `updatedAt`؛ و`deletedAt` للحذف المنطقي عند الحاجة.
- المبالغ المالية تُخزَّن كأعداد صحيحة بالوحدة الصغرى (هللة/سنت) **أو** `Decimal` بدقة ثابتة — القرار النهائي عند التنفيذ؛ يجب تجنّب `float`.
- العميل النهائي لا يُعرض له حقول التكلفة/الربح حتى لو وُجدت في الجداول.
- كل عرض/حجز يحتفظ بمرجع المزود الأصلي لإعادة التحقق.

---

## 2. خريطة الكيانات عالية المستوى

```text
Organization
 ├── Subscription
 ├── UserMembership / Role / Permission
 ├── WhatsAppAccount
 ├── Contact
 │    └── Conversation
 │         ├── Message
 │         ├── TravelInquiry
 │         ├── Quote
 │         └── Handoff
 ├── Campaign / Template
 ├── TravelProviderConfig
 ├── PricingRule
 ├── Quote / QuoteItem
 ├── BookingRequest / Booking
 ├── Payment (اختياري مبسط)
 ├── Notification
 ├── ReportSnapshot (لاحقًا)
 └── AuditLog
```

---

## 3. كيانات المنصة والمؤسسات

### Organization
مؤسسة السفر (Tenant).

| الحقل | وصف |
|---|---|
| id | معرف |
| name | الاسم التجاري |
| slug | معرف نصي فريد |
| defaultCurrency | مثل SAR |
| timezone | المنطقة الزمنية |
| status | `active`, `suspended` |
| settings | JSON إعدادات عامة |

### Subscription
اشتراك المؤسسة في المنصة.

| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| planCode | `trial`, `starter`, `growth`, ... |
| status | `trialing`, `active`, `past_due`, `canceled` |
| seatsLimit | حد المستخدمين |
| conversationsLimit | حد اختياري |
| currentPeriodStart / End | فترة الفوترة |

> جداول خطط المنصة العامة قد تكون بدون `organizationId`.

---

## 4. الهوية والصلاحيات

### User
حساب المستخدم العالمي (البريد/الهاتف).

| الحقل | وصف |
|---|---|
| id | معرف |
| email | فريد |
| passwordHash | إن كانت المصادقة محلية |
| name | الاسم |
| status | `active`, `disabled` |
| lastLoginAt | آخر دخول |

### Membership
عضوية مستخدم داخل مؤسسة.

| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| userId | المستخدم |
| roleId | الدور |
| status | `active`, `invited`, `revoked` |

### Role
دور داخل مؤسسة (أو أدوار نظامية مسبقة).

| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | nullable لأدوار نظامية |
| code | `owner`, `admin`, `agent`, `viewer`, custom |
| name | اسم العرض |
| isSystem | هل دور نظامي |

### Permission / RolePermission
صلاحيات دقيقة مثل:

- `conversations.read`
- `conversations.reply`
- `campaigns.manage`
- `quotes.create`
- `quotes.send`
- `pricing.manage`
- `pricing.override`
- `bookings.create`
- `bookings.issue`
- `payments.manage`
- `providers.manage`
- `users.manage`
- `reports.read`
- `settings.manage`

---

## 5. واتساب والتواصل

### WhatsAppAccount
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| phoneNumberId | من Meta |
| businessAccountId | WABA |
| displayPhone | رقم العرض |
| status | `connected`, `disconnected`, `error` |
| webhookVerifiedAt | وقت التحقق |
| meta | JSON غير حساس للإعدادات |

> توكنات الوصول تُخزَّن مشفّرة أو في مدير أسرار، وليس كنص واضح في الوثائق/المستودع.

### Contact
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| waId | معرف واتساب/الرقم |
| name | الاسم |
| email | اختياري |
| tags | قائمة/JSON |
| source | `whatsapp`, `manual`, `campaign` |
| lastContactedAt | آخر تواصل |

### Conversation
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| contactId | العميل |
| whatsappAccountId | الحساب |
| status | `open`, `pending`, `closed` |
| assigneeType | `bot`, `human` |
| assignedUserId | الموظف إن وُجد |
| lastMessageAt | آخر رسالة |
| unreadCount | للوحة |

### Message
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| conversationId | المحادثة |
| direction | `inbound`, `outbound` |
| channel | `whatsapp`, `system` |
| type | `text`, `template`, `interactive`, ... |
| body | النص |
| templateName | إن وجد |
| providerMessageId | معرف واتساب |
| status | `queued`, `sent`, `delivered`, `read`, `failed` |
| sentByUserId | إن أرسلها موظف |
| rawPayload | JSON اختياري للتدقيق |

### Template
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| name | اسم القالب |
| language | مثل `ar` |
| category | تسويق/خدمة |
| status | `draft`, `approved`, `rejected` |
| body | محتوى/مكونات |

### Campaign
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| name | اسم الحملة |
| templateId | القالب |
| status | `draft`, `scheduled`, `running`, `completed`, `canceled` |
| scheduledAt | الجدولة |
| audienceFilter | JSON قواعد الجمهور |
| stats | JSON إحصاءات |

### CampaignRecipient
| الحقل | وصف |
|---|---|
| id | معرف |
| campaignId | الحملة |
| contactId | العميل |
| status | `pending`, `sent`, `failed`, `replied` |
| error | رسالة الخطأ إن وجدت |

---

## 6. استعلام السفر والذكاء الاصطناعي

### TravelInquiry
استعلام سفر موحّد (من واتساب أو اللوحة).

| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| conversationId | nullable |
| contactId | nullable |
| source | `whatsapp`, `direct`, `campaign_reply` |
| status | `collecting`, `ready_to_search`, `searched`, `quoted`, `handed_off`, `closed` |
| origin | مدينة/مطار المغادرة |
| destination | الوجهة |
| departDate | تاريخ الذهاب |
| returnDate | تاريخ العودة |
| adults / children / infants | أعداد الركاب |
| cabinClass | درجة السفر |
| budgetAmount / budgetCurrency | الميزانية |
| preferences | نص/JSON |
| serviceTypes | طيران/فندق/... |
| missingFields | قائمة الحقول الناقصة |
| aiSummary | ملخص للموظف |
| rawExtraction | JSON آخر استخراج |

### AiInteractionLog
سجل تفسير AI للتدقيق والجودة.

| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| inquiryId / conversationId / messageId | الربط |
| provider | مزود AI |
| model | اسم النموذج |
| inputHash | بصمة المدخلات |
| outputJson | نتيجة الاستخراج |
| latencyMs | الزمن |
| success | نجاح/فشل |

> لا يُستخدم AI لتخزين أسعار نهائية معتمدة.

---

## 7. مزودو السفر والتسعير

### TravelProviderConfig
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| providerKey | `mock`, `amadeus`, `other...` |
| displayName | اسم العرض |
| enabled | تفعيل |
| capabilities | JSON/XML قائمة القدرات |
| priority | أولوية البحث |
| configEncrypted | إعدادات حساسة مشفرة |

### ProviderOfferCache (اختياري)
تخزين مؤقت لعروض خام قصيرة العمر مع `organizationId` و`expiresAt`.

### PricingRule
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| name | اسم القاعدة |
| serviceType | `flight`, `hotel`, `insurance`, `car`, `transfer`, `all` |
| ruleType | `percent`, `fixed`, `percent_with_min` |
| percentValue | النسبة |
| fixedAmount | مبلغ ثابت |
| minProfitAmount | الحد الأدنى |
| currency | العملة |
| isActive | نشطة |
| priority | الأولوية |
| conditions | JSON شروط إضافية |

---

## 8. العروض والحجوزات والمدفوعات

### Quote
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| inquiryId | الاستعلام |
| conversationId | اختياري |
| contactId | اختياري |
| status | `draft`, `sent`, `accepted`, `expired`, `superseded`, `canceled` |
| currency | العملة |
| totalCostAmount | تكلفة داخلية |
| totalSellAmount | سعر البيع |
| totalProfitAmount | الربح |
| pricingRuleId | القاعدة المطبّقة الرئيسية أو المرجعية |
| expiresAt | انتهاء العرض |
| sentAt | وقت الإرسال |
| customerVisiblePayload | JSON ما يُسمح بإرساله للعميل |
| createdByUserId | إن أُنشئ يدويًا |

### QuoteItem
| الحقل | وصف |
|---|---|
| id | معرف |
| quoteId | العرض |
| organizationId | المؤسسة |
| serviceType | نوع الخدمة |
| providerId / providerKey | المزود |
| providerOfferRef | مرجع العرض لدى المزود |
| description | وصف للعميل |
| costAmount | تكلفة |
| sellAmount | بيع |
| profitAmount | ربح |
| pricingBreakdown | JSON داخلي |
| rawOfferSnapshot | لقطة العرض الأصلية |
| revalidationToken | إن لزم |
| expiresAt | انتهاء عنصر العرض |

### BookingRequest
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| quoteId | العرض |
| status | `pending_revalidation`, `price_changed`, `ready_to_book`, `submitted`, `rejected`, `canceled` |
| requestedBy | `customer`, `agent`, `system` |
| notes | ملاحظات |

### Booking
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| bookingRequestId | الطلب |
| quoteId | العرض |
| status | `draft`, `on_hold`, `confirmed`, `ticketed`, `failed`, `canceled` |
| providerBookingRef | مرجع المزود |
| totalCostAmount / totalSellAmount / totalProfitAmount | مبالغ داخلية |
| passengerDetails | JSON |
| issuedByUserId | من نفّذ الإصدار |
| issuedAt | وقت الإصدار |
| requiresApproval | هل يحتاج موافقة |
| approvedByUserId / approvedAt | اعتماد حساس |

### Payment (مبسط في MVP)
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| bookingId | الحجز |
| status | `unpaid`, `partial`, `paid`, `refunded`, `failed` |
| method | `manual`, `transfer`, `card_gateway_later` |
| amount / currency | المبلغ |
| recordedByUserId | من سجّل |
| reference | مرجع خارجي |

---

## 9. التحويل البشري والإشعارات والتدقيق

### Handoff
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| conversationId | المحادثة |
| inquiryId | اختياري |
| reason | سبب التحويل |
| status | `open`, `accepted`, `resolved`, `returned_to_bot` |
| requestedAt | وقت الطلب |
| acceptedByUserId | الموظف |
| contextSummary | ملخص AI/نظام |

### Notification
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | المؤسسة |
| userId | المستلم |
| type | `handoff`, `booking`, `price_change`, `campaign` |
| title / body | المحتوى |
| readAt | وقت القراءة |
| linkRef | مرجع كيان |

### AuditLog
| الحقل | وصف |
|---|---|
| id | معرف |
| organizationId | nullable لعمليات المنصة |
| actorUserId | الفاعل |
| action | مثل `pricing.rule.update` |
| entityType / entityId | الهدف |
| before / after | JSON |
| ip / userAgent | سياق |
| createdAt | الوقت |

---

## 10. علاقات أساسية (مختصر)

- Organization 1—N Users via Membership
- Organization 1—N Contacts / Conversations / Inquiries / Quotes / Bookings
- Contact 1—N Conversations
- Conversation 1—N Messages
- Conversation 0—1/ N TravelInquiry (يفضّل Inquiry مستقل قابل للربط)
- TravelInquiry 1—N Quotes
- Quote 1—N QuoteItems
- Quote 1—N BookingRequests
- BookingRequest 1—0..1 Booking
- Booking 1—N Payments
- Conversation 1—N Handoffs

---

## 11. فهارس مقترحة أولية

- `(organizationId, waId)` فريد على Contact
- `(organizationId, conversationId, createdAt)` على Message
- `(organizationId, status, lastMessageAt)` على Conversation
- `(organizationId, status, createdAt)` على Quote / Booking
- `(organizationId, providerKey)` على TravelProviderConfig
- `(organizationId, isActive, priority)` على PricingRule
- `(organizationId, createdAt)` على AuditLog

---

## 12. سياسات بيانات حساسة

| البيان | السياسة |
|---|---|
| تكلفة/ربح | داخلي فقط؛ لا يُمرَّر لواجهات العميل أو قوالب واتساب |
| توكنات واتساب/مزودين | مشفرة أو Secrets Manager |
| أرقام بطاقات | خارج النطاق؛ لا تُخزَّن |
| بيانات الركاب | حسب الحاجة للحجز مع تقليل الاحتفاظ |
| سجلات AI | بدون أسرار، مع إمكانية تنقيح لاحق |

---

## 13. ملاحظات تنفيذ لاحقة

- لم يُنشأ Prisma schema بعد (مقصود في هذه المرحلة).
- لم تُنفَّذ ترحيلات.
- يمكن تقسيم الـ schema إلى ملفات متعددة داخل `packages/database` عند البناء.
- أي جدول جديد يجب أن يجيب على سؤال: كيف يُعزل بـ `organizationId`؟
