import { Prisma } from "@watesly-travel/database";
import type { PrismaService } from "../prisma/prisma.service";

export function asSettings(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

export function asRecord(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return { ...(value as Record<string, unknown>) };
  }
  return {};
}

export async function readOrgSettings(
  prisma: PrismaService,
  organizationId: string,
): Promise<Record<string, unknown>> {
  const org = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { settings: true },
  });
  return asSettings(org?.settings);
}

export async function writeOrgSettings(
  prisma: PrismaService,
  organizationId: string,
  next: Record<string, unknown>,
) {
  await prisma.organization.update({
    where: { id: organizationId },
    data: { settings: next as Prisma.InputJsonValue },
  });
}
