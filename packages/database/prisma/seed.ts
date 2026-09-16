import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { seedDemoBookings } from "./seed-demo-bookings";
import { seedTravelCatalog } from "./seed-travel-catalog";

const prisma = new PrismaClient();

const PERMISSIONS: Array<{ code: string; name: string }> = [
  { code: "conversations.read", name: "قراءة المحادثات" },
  { code: "conversations.reply", name: "الرد على المحادثات" },
  { code: "campaigns.manage", name: "إدارة الحملات" },
  { code: "quotes.create", name: "إنشاء عروض الأسعار" },
  { code: "quotes.send", name: "إرسال عروض الأسعار" },
  { code: "pricing.manage", name: "إدارة قواعد التسعير" },
  { code: "pricing.override", name: "تجاوز التسعير" },
  { code: "pricing.view_cost", name: "عرض التكلفة والربح" },
  { code: "bookings.create", name: "إنشاء الحجوزات" },
  { code: "bookings.issue", name: "إصدار الحجوزات" },
  { code: "payments.manage", name: "إدارة المدفوعات" },
  { code: "providers.manage", name: "إدارة مزودي السفر" },
  { code: "users.manage", name: "إدارة المستخدمين" },
  { code: "whatsapp.manage", name: "إدارة واتساب" },
  { code: "reports.read", name: "قراءة التقارير" },
  { code: "settings.manage", name: "إدارة الإعدادات" },
  { code: "audit.read", name: "قراءة سجل التدقيق" },
];

const ROLE_PERMISSIONS: Record<string, string[]> = {
  owner: PERMISSIONS.map((p) => p.code),
  admin: PERMISSIONS.map((p) => p.code).filter(
    (code) => code !== "pricing.override",
  ),
  agent: [
    "conversations.read",
    "conversations.reply",
    "quotes.create",
    "quotes.send",
    "bookings.create",
    "reports.read",
  ],
  viewer: ["conversations.read", "reports.read"],
};

async function upsertPermissions() {
  for (const permission of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
  }
}

async function seedOrgDefaults(organizationId: string) {
  await prisma.subscription.upsert({
    where: { id: `${organizationId}-sub` },
    update: { status: "active", planCode: "trial" },
    create: {
      id: `${organizationId}-sub`,
      organizationId,
      planCode: "trial",
      status: "active",
      seatsLimit: 10,
    },
  });

  await prisma.travelProviderConfig.upsert({
    where: {
      organizationId_providerKey: {
        organizationId,
        providerKey: "mock",
      },
    },
    update: {
      displayName: "مزود تجريبي (Mock)",
      enabled: true,
      priority: 1,
      capabilities: ["flight", "hotel"],
    },
    create: {
      organizationId,
      providerKey: "mock",
      displayName: "مزود تجريبي (Mock)",
      enabled: true,
      priority: 1,
      capabilities: ["flight", "hotel"],
    },
  });

  await prisma.travelProviderConfig.upsert({
    where: {
      organizationId_providerKey: {
        organizationId,
        providerKey: "duffel",
      },
    },
    update: {
      displayName: "Duffel (طيران وفنادق)",
      enabled: true,
      priority: 50,
      capabilities: ["flight", "hotel"],
    },
    create: {
      organizationId,
      providerKey: "duffel",
      displayName: "Duffel (طيران وفنادق)",
      enabled: true,
      priority: 50,
      capabilities: ["flight", "hotel"],
    },
  });

  const existingRule = await prisma.pricingRule.findFirst({
    where: { organizationId, name: "هامش طيران افتراضي" },
  });
  if (!existingRule) {
    await prisma.pricingRule.create({
      data: {
        organizationId,
        name: "هامش طيران افتراضي",
        serviceType: "flight",
        ruleType: "percent_with_min",
        percentValue: 12,
        minProfitAmount: 1500,
        currency: "KWD",
        isActive: true,
        priority: 1,
      },
    });
  }

  const existingHotelRule = await prisma.pricingRule.findFirst({
    where: { organizationId, name: "هامش فنادق افتراضي" },
  });
  if (!existingHotelRule) {
    await prisma.pricingRule.create({
      data: {
        organizationId,
        name: "هامش فنادق افتراضي",
        serviceType: "hotel",
        ruleType: "percent_with_min",
        percentValue: 15,
        minProfitAmount: 1200,
        currency: "KWD",
        isActive: true,
        priority: 1,
      },
    });
  }

  await prisma.whatsAppAccount.upsert({
    where: {
      organizationId_phoneNumberId: {
        organizationId,
        phoneNumberId: `mock_${organizationId.slice(0, 8)}`,
      },
    },
    update: {
      status: "connected",
      accessTokenEnc: "mock",
      displayPhone: "+966500000000",
    },
    create: {
      organizationId,
      phoneNumberId: `mock_${organizationId.slice(0, 8)}`,
      businessAccountId: "mock_waba",
      displayPhone: "+966500000000",
      accessTokenEnc: "mock",
      status: "connected",
      webhookVerifiedAt: new Date(),
    },
  });

  await prisma.template.upsert({
    where: {
      organizationId_name_language: {
        organizationId,
        name: "welcome_travel",
        language: "ar",
      },
    },
    update: {
      body: "مرحبًا بك في وكالتنا. أرسل وجهتك وتاريخ سفرك لنجهّز لك عرضًا.",
      status: "approved",
    },
    create: {
      organizationId,
      name: "welcome_travel",
      language: "ar",
      category: "utility",
      status: "approved",
      body: "مرحبًا بك في وكالتنا. أرسل وجهتك وتاريخ سفرك لنجهّز لك عرضًا.",
    },
  });
}

async function createOrgWithOwner(input: {
  orgName: string;
  orgSlug: string;
  ownerName: string;
  ownerEmail: string;
  password: string;
}) {
  const passwordHash = await bcrypt.hash(input.password, 12);

  const organization = await prisma.organization.upsert({
    where: { slug: input.orgSlug },
    update: {
      name: input.orgName,
      status: "active",
      defaultCurrency: "KWD",
      timezone: "Asia/Kuwait",
    },
    create: {
      name: input.orgName,
      slug: input.orgSlug,
      defaultCurrency: "KWD",
      timezone: "Asia/Kuwait",
      status: "active",
    },
  });

  const allPermissions = await prisma.permission.findMany();
  const permissionByCode = new Map(allPermissions.map((p) => [p.code, p.id]));

  const roleIds: Record<string, string> = {};

  for (const [code, name] of [
    ["owner", "المالك"],
    ["admin", "مدير"],
    ["agent", "موظف مبيعات"],
    ["viewer", "مشاهد"],
  ] as const) {
    const role = await prisma.role.upsert({
      where: {
        organizationId_code: {
          organizationId: organization.id,
          code,
        },
      },
      update: { name, isSystem: true },
      create: {
        organizationId: organization.id,
        code,
        name,
        isSystem: true,
      },
    });

    roleIds[code] = role.id;

    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    const codes = ROLE_PERMISSIONS[code] ?? [];
    if (codes.length > 0) {
      await prisma.rolePermission.createMany({
        data: codes
          .map((permissionCode) => permissionByCode.get(permissionCode))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({
            roleId: role.id,
            permissionId,
          })),
        skipDuplicates: true,
      });
    }
  }

  const user = await prisma.user.upsert({
    where: { email: input.ownerEmail.toLowerCase() },
    update: {
      name: input.ownerName,
      passwordHash,
      status: "active",
    },
    create: {
      email: input.ownerEmail.toLowerCase(),
      name: input.ownerName,
      passwordHash,
      status: "active",
    },
  });

  await prisma.membership.upsert({
    where: {
      organizationId_userId: {
        organizationId: organization.id,
        userId: user.id,
      },
    },
    update: {
      roleId: roleIds.owner!,
      status: "active",
    },
    create: {
      organizationId: organization.id,
      userId: user.id,
      roleId: roleIds.owner!,
      status: "active",
    },
  });

  await seedOrgDefaults(organization.id);

  return { organization, user };
}

async function main() {
  await upsertPermissions();

  const demo = await createOrgWithOwner({
    orgName: "وكالة واتسلي التجريبية",
    orgSlug: "watesly-demo",
    ownerName: "مالك تجريبي",
    ownerEmail: "demo@watesly.travel",
    password: "Demo1234!",
  });

  const other = await createOrgWithOwner({
    orgName: "سفر الأفق",
    orgSlug: "ufuq-travel",
    ownerName: "مدير الأفق",
    ownerEmail: "owner@ufuq.travel",
    password: "Demo1234!",
  });

  try {
    await seedTravelCatalog(prisma);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn(
      "Travel catalog seed skipped/failed (network?). Run: pnpm --filter @watesly-travel/database exec tsx prisma/seed-travel-catalog.ts",
      error,
    );
  }

  try {
    await seedDemoBookings(prisma);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.warn("Demo bookings seed failed:", error);
  }

  // eslint-disable-next-line no-console
  console.log("Seed completed:");
  // eslint-disable-next-line no-console
  console.log(`- ${demo.organization.name}: demo@watesly.travel / Demo1234!`);
  // eslint-disable-next-line no-console
  console.log(`- ${other.organization.name}: owner@ufuq.travel / Demo1234!`);
}

main()
  .catch((error) => {
    // eslint-disable-next-line no-console
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
