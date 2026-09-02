/**
 * Soft notification dispatch — persists CustomerNotification and optionally
 * tries WhatsApp when the customer has a linked contact.waId.
 */
import { createNotification, type CustomerNotification } from "@watesly-travel/shared";
import { sendWhatsAppText } from "@watesly-travel/whatsapp-core";
import type { PrismaService } from "../prisma/prisma.service";

export type PlatformNotifyInput = {
  organizationId: string;
  customerId: string;
  type: CustomerNotification["type"];
  title: string;
  body: string;
  channels?: CustomerNotification["channels"];
  href?: string;
};

export type PlatformNotifyDeps = {
  prisma: PrismaService;
};

function asChannels(channels: CustomerNotification["channels"] | undefined) {
  return channels?.length ? channels : (["in_app"] as CustomerNotification["channels"]);
}

export async function dispatchCustomerNotification(
  deps: PlatformNotifyDeps,
  input: PlatformNotifyInput,
): Promise<CustomerNotification> {
  const channels = asChannels(input.channels);
  const shaped = createNotification({
    customerId: input.customerId,
    type: input.type,
    title: input.title,
    body: input.body,
    channels,
    href: input.href,
  });

  try {
    const row = await deps.prisma.customerNotification.create({
      data: {
        id: shaped.id,
        organizationId: input.organizationId,
        customerId: input.customerId,
        type: shaped.type,
        title: shaped.title,
        body: shaped.body,
        channels: shaped.channels,
        href: shaped.href || null,
        readAt: null,
      },
    });
    shaped.id = row.id;
    shaped.createdAt = row.createdAt.toISOString();
  } catch {
    // Soft-fail persistence — caller may still keep in-memory copy
  }

  if (channels.includes("whatsapp")) {
    try {
      const customer = await deps.prisma.customer.findFirst({
        where: { id: input.customerId, organizationId: input.organizationId },
        include: { contact: true },
      });
      const waId = customer?.contact?.waId;
      if (waId) {
        const account = await deps.prisma.whatsAppAccount.findFirst({
          where: { organizationId: input.organizationId, status: "connected" },
          orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }],
        });
        if (account) {
          await sendWhatsAppText({
            phoneNumberId: account.phoneNumberId,
            accessToken: account.accessTokenEnc || "mock",
            to: waId,
            body: `${input.title}\n${input.body}`,
          });
        }
      }
    } catch {
      // Soft-fail WhatsApp — in-app row is enough
    }
  }

  return shaped;
}
