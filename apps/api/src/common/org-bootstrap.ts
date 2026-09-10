import type { Prisma, PrismaClient } from "@watesly-travel/database";
import {
  PERMISSION_CATALOG,
  ROLE_PERMISSIONS,
} from "@watesly-travel/shared";

type Db = PrismaClient | Prisma.TransactionClient;

export async function ensurePermissionCatalog(db: Db) {
  for (const permission of PERMISSION_CATALOG) {
    await db.permission.upsert({
      where: { code: permission.code },
      update: { name: permission.name },
      create: permission,
    });
  }
  return db.permission.findMany();
}

export async function createSystemRolesWithPermissions(
  db: Db,
  organizationId: string,
) {
  const permissions = await ensurePermissionCatalog(db);
  const permissionByCode = new Map(permissions.map((p) => [p.code, p.id]));
  const roleIds: Record<string, string> = {};

  for (const [code, name] of [
    ["owner", "المالك"],
    ["admin", "مدير"],
    ["agent", "موظف مبيعات"],
    ["viewer", "مشاهد"],
  ] as const) {
    const role = await db.role.upsert({
      where: {
        organizationId_code: { organizationId, code },
      },
      update: { name, isSystem: true },
      create: {
        organizationId,
        code,
        name,
        isSystem: true,
      },
    });

    roleIds[code] = role.id;
    await db.rolePermission.deleteMany({ where: { roleId: role.id } });

    const codes = ROLE_PERMISSIONS[code] ?? [];
    if (codes.length) {
      await db.rolePermission.createMany({
        data: codes
          .map((permissionCode) => permissionByCode.get(permissionCode))
          .filter((id): id is string => Boolean(id))
          .map((permissionId) => ({ roleId: role.id, permissionId })),
        skipDuplicates: true,
      });
    }
  }

  return roleIds;
}

export async function seedOrgDefaults(db: Db, organizationId: string) {
  await db.subscription.create({
    data: {
      organizationId,
      planCode: "trial",
      status: "active",
      seatsLimit: 5,
    },
  });

  await db.travelProviderConfig.create({
    data: {
      organizationId,
      providerKey: "duffel",
      displayName: "Duffel (طيران وفنادق)",
      enabled: true,
      priority: 1,
      capabilities: ["flight", "hotel"],
    },
  });

  await db.travelProviderConfig.create({
    data: {
      organizationId,
      providerKey: "mock",
      displayName: "مزود تجريبي (Mock)",
      enabled: true,
      priority: 10,
      capabilities: ["flight", "hotel"],
    },
  });

  await db.pricingRule.create({
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

  await db.pricingRule.create({
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

  await db.whatsAppAccount.create({
    data: {
      organizationId,
      phoneNumberId: `mock_${organizationId.slice(0, 8)}`,
      displayPhone: "+96550000000",
      accessTokenEnc: "mock",
      status: "connected",
      webhookVerifiedAt: new Date(),
    },
  });

  await db.template.create({
    data: {
      organizationId,
      name: "welcome_travel",
      language: "ar",
      category: "utility",
      status: "approved",
      body: "مرحبًا بك في وكالتنا. أرسل وجهتك وتاريخ سفرك لنجهّز لك عرضًا.",
    },
  });
}
