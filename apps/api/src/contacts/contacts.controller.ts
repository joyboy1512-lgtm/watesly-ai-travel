import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";

type TagProfile = {
  labels: string[];
  stage: string;
  gender: string;
  branch: string;
  marketing: boolean;
};

type CustomerRow = {
  key: string;
  contactId?: string;
  conversationId?: string | null;
  name: string | null;
  email: string | null;
  phone: string | null;
  tags: string[];
  stage: string;
  gender: string;
  branch: string;
  channel: string;
  channelType: string;
  marketing: boolean;
  source: string;
  bookingCount: number;
  inquiryCount: number;
  createdAt: string | null;
  lastContactedAt: string | null;
};

const CHANNEL_LABEL: Record<string, string> = {
  whatsapp: "واتساب",
  telegram: "تلجرام",
  instagram: "إنستغرام",
  messenger: "ماسنجر",
  booking: "حجز",
  manual: "يدوي",
};

function asTags(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.map((t) => String(t).trim()).filter(Boolean);
  }
  if (typeof raw === "string") {
    try {
      return asTags(JSON.parse(raw) as unknown);
    } catch {
      return raw
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
    }
  }
  return [];
}

function readProfile(raw: unknown, fallbackBranch: string): TagProfile {
  const defaults: TagProfile = {
    labels: [],
    stage: "lead",
    gender: "",
    branch: fallbackBranch,
    marketing: true,
  };
  if (Array.isArray(raw)) {
    return { ...defaults, labels: asTags(raw) };
  }
  if (raw && typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    return {
      labels: asTags(o.labels ?? o.tags ?? []),
      stage: String(o.stage || defaults.stage),
      gender: String(o.gender || ""),
      branch: String(o.branch || fallbackBranch),
      marketing: o.marketing !== false,
    };
  }
  return defaults;
}

function writeProfile(profile: TagProfile) {
  return {
    labels: profile.labels,
    stage: profile.stage,
    gender: profile.gender,
    branch: profile.branch,
    marketing: profile.marketing,
  };
}

function channelLabel(source: string, accountName?: string | null, accountType?: string | null) {
  if (accountName?.trim()) return accountName.trim();
  const key = (accountType || source || "").toLowerCase();
  return CHANNEL_LABEL[key] || source || "واتساب";
}

@Controller("contacts")
export class ContactsController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  @RequirePermissions("conversations.read")
  list(@CurrentUser() user: AuthUser, @Query("q") q?: string) {
    return this.prisma.contact.findMany({
      where: {
        organizationId: user.organizationId,
        OR: q
          ? [
              { waId: { contains: q } },
              { name: { contains: q, mode: "insensitive" } },
              { email: { contains: q, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { lastContactedAt: "desc" },
      take: 200,
    });
  }

  @Get("customers")
  @RequirePermissions("conversations.read")
  async customers(
    @CurrentUser() user: AuthUser,
    @Query("q") q?: string,
    @Query("name") name?: string,
    @Query("email") email?: string,
    @Query("phone") phone?: string,
    @Query("tag") tag?: string,
    @Query("stage") stage?: string,
    @Query("gender") gender?: string,
    @Query("branch") branch?: string,
    @Query("channel") channel?: string,
  ) {
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });
    const orgName = org?.name || "الفرع الرئيسي";

    const [contacts, bookings, inquiries] = await Promise.all([
      this.prisma.contact.findMany({
        where: { organizationId: user.organizationId },
        include: {
          conversations: {
            orderBy: { updatedAt: "desc" },
            take: 1,
            select: {
              id: true,
              whatsappAccount: {
                select: {
                  channelName: true,
                  channelType: true,
                  displayPhone: true,
                },
              },
            },
          },
        },
        orderBy: { updatedAt: "desc" },
        take: 800,
      }),
      this.prisma.booking.findMany({
        where: { organizationId: user.organizationId },
        select: {
          id: true,
          createdAt: true,
          passengerDetails: true,
          quote: {
            select: {
              contactId: true,
              contact: {
                select: { id: true, waId: true, name: true, email: true },
              },
            },
          },
        },
        take: 1000,
        orderBy: { createdAt: "desc" },
      }),
      this.prisma.travelInquiry.groupBy({
        by: ["contactId"],
        where: {
          organizationId: user.organizationId,
          contactId: { not: null },
        },
        _count: { _all: true },
      }),
    ]);

    const inquiryCountByContact = new Map(
      inquiries.map((row) => [row.contactId as string, row._count._all]),
    );

    const map = new Map<string, CustomerRow>();

    for (const contact of contacts) {
      const profile = readProfile(contact.tags, orgName);
      const convo = contact.conversations[0];
      const key = contact.email?.toLowerCase() || contact.waId;
      map.set(key, {
        key,
        contactId: contact.id,
        conversationId: convo?.id || null,
        name: contact.name,
        email: contact.email,
        phone: contact.waId,
        tags: profile.labels,
        stage: profile.stage,
        gender: profile.gender,
        branch: profile.branch || orgName,
        channel: channelLabel(
          contact.source,
          convo?.whatsappAccount?.channelName,
          convo?.whatsappAccount?.channelType,
        ),
        channelType:
          convo?.whatsappAccount?.channelType || contact.source || "whatsapp",
        marketing: profile.marketing,
        source: contact.source,
        bookingCount: 0,
        inquiryCount: inquiryCountByContact.get(contact.id) || 0,
        createdAt: contact.createdAt?.toISOString() || null,
        lastContactedAt: contact.lastContactedAt?.toISOString() || null,
      });
    }

    for (const booking of bookings) {
      const details = (booking.passengerDetails || {}) as {
        contact?: { email?: string; phone?: string };
        travelers?: Array<{ firstName?: string; lastName?: string }>;
      };
      const emailVal =
        details.contact?.email?.trim().toLowerCase() ||
        booking.quote.contact?.email?.trim().toLowerCase() ||
        null;
      const phoneVal =
        details.contact?.phone?.trim() || booking.quote.contact?.waId || null;
      const nameVal =
        [details.travelers?.[0]?.firstName, details.travelers?.[0]?.lastName]
          .filter(Boolean)
          .join(" ") ||
        booking.quote.contact?.name ||
        null;
      const key = emailVal || phoneVal || booking.id;
      const existing = map.get(key);
      if (existing) {
        existing.bookingCount += 1;
        if (!existing.name && nameVal) existing.name = nameVal;
        if (!existing.email && emailVal) existing.email = emailVal;
        if (!existing.phone && phoneVal) existing.phone = phoneVal;
        if (!existing.contactId && booking.quote.contactId) {
          existing.contactId = booking.quote.contactId;
        }
      } else {
        map.set(key, {
          key,
          contactId: booking.quote.contactId || undefined,
          conversationId: null,
          name: nameVal,
          email: emailVal,
          phone: phoneVal,
          tags: [],
          stage: "customer",
          gender: "",
          branch: orgName,
          channel: "حجز",
          channelType: "booking",
          marketing: true,
          source: "booking",
          bookingCount: 1,
          inquiryCount: 0,
          createdAt: booking.createdAt?.toISOString() || null,
          lastContactedAt: null,
        });
      }
    }

    let rows = Array.from(map.values()).sort((a, b) => {
      const at = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bt = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bt - at;
    });

    const weekAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const monthAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const stats = {
      total: rows.length,
      newThisWeek: rows.filter(
        (r) => r.createdAt && new Date(r.createdAt).getTime() >= weekAgo,
      ).length,
      unnamed: rows.filter((r) => {
        const n = (r.name || "").trim();
        return !n || n === r.phone;
      }).length,
      inactive30: rows.filter((r) => {
        const stamp = r.lastContactedAt || r.createdAt;
        if (!stamp) return false;
        return new Date(stamp).getTime() < monthAgo;
      }).length,
    };

    const nameQ = (q || name)?.trim().toLowerCase();
    const emailQ = email?.trim().toLowerCase();
    const phoneQ = phone?.trim().toLowerCase();
    const tagQ = tag?.trim().toLowerCase();
    const stageQ = stage?.trim().toLowerCase();
    const genderQ = gender?.trim().toLowerCase();
    const branchQ = branch?.trim().toLowerCase();
    const channelQ = channel?.trim().toLowerCase();

    if (nameQ) {
      rows = rows.filter(
        (r) =>
          (r.name || "").toLowerCase().includes(nameQ) ||
          (r.phone || "").toLowerCase().includes(nameQ) ||
          (r.email || "").toLowerCase().includes(nameQ),
      );
    }
    if (emailQ) {
      rows = rows.filter((r) => (r.email || "").toLowerCase().includes(emailQ));
    }
    if (phoneQ) {
      rows = rows.filter((r) => (r.phone || "").toLowerCase().includes(phoneQ));
    }
    if (tagQ) {
      rows = rows.filter((r) =>
        r.tags.some((t) => t.toLowerCase().includes(tagQ)),
      );
    }
    if (stageQ && stageQ !== "all") {
      rows = rows.filter((r) => r.stage.toLowerCase() === stageQ);
    }
    if (genderQ && genderQ !== "all") {
      rows = rows.filter((r) => r.gender.toLowerCase() === genderQ);
    }
    if (branchQ && branchQ !== "all") {
      rows = rows.filter((r) => r.branch.toLowerCase() === branchQ);
    }
    if (channelQ && channelQ !== "all") {
      rows = rows.filter(
        (r) =>
          r.channel.toLowerCase().includes(channelQ) ||
          r.channelType.toLowerCase() === channelQ,
      );
    }

    const all = Array.from(map.values());
    return {
      customers: rows,
      organizationName: orgName,
      stats,
      branches: Array.from(new Set(all.map((r) => r.branch).filter(Boolean))),
      channels: Array.from(new Set(all.map((r) => r.channel).filter(Boolean))),
    };
  }

  @Post()
  @RequirePermissions("conversations.reply")
  async create(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      waId?: string;
      phone?: string;
      name?: string;
      email?: string;
      tags?: string[];
      stage?: string;
      gender?: string;
      branch?: string;
      marketing?: boolean;
      source?: string;
    },
  ) {
    const waId = (body.waId || body.phone || "").replace(/\s+/g, "").trim();
    if (!waId) {
      return { ok: false, message: "رقم الهاتف مطلوب" };
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });
    const profile = writeProfile({
      labels: body.tags || [],
      stage: body.stage || "lead",
      gender: body.gender || "",
      branch: body.branch || org?.name || "الفرع الرئيسي",
      marketing: body.marketing !== false,
    });
    const row = await this.prisma.contact.upsert({
      where: {
        organizationId_waId: {
          organizationId: user.organizationId,
          waId,
        },
      },
      update: {
        name: body.name,
        email: body.email,
        tags: profile,
        source: body.source || "manual",
      },
      create: {
        organizationId: user.organizationId,
        waId,
        name: body.name || waId,
        email: body.email,
        tags: profile,
        source: body.source || "manual",
      },
    });
    return { ok: true, contact: row };
  }

  @Post("customers")
  @RequirePermissions("conversations.reply")
  async upsertCustomer(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      email?: string;
      phone?: string;
      name?: string;
      tags?: string[];
      stage?: string;
      gender?: string;
      branch?: string;
      marketing?: boolean;
    },
  ) {
    const phone = body.phone?.trim() || body.email?.trim();
    if (!phone) {
      return { ok: false, message: "الهاتف أو البريد مطلوب" };
    }
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });
    const existing = await this.prisma.contact.findUnique({
      where: {
        organizationId_waId: {
          organizationId: user.organizationId,
          waId: phone,
        },
      },
    });
    const current = readProfile(existing?.tags, org?.name || "الفرع الرئيسي");
    const profile = writeProfile({
      labels: body.tags ?? current.labels,
      stage: body.stage ?? current.stage,
      gender: body.gender ?? current.gender,
      branch: body.branch ?? current.branch,
      marketing: body.marketing ?? current.marketing,
    });
    const row = await this.prisma.contact.upsert({
      where: {
        organizationId_waId: {
          organizationId: user.organizationId,
          waId: phone,
        },
      },
      update: {
        name: body.name ?? existing?.name,
        email: body.email ?? existing?.email,
        tags: profile,
      },
      create: {
        organizationId: user.organizationId,
        waId: phone,
        name: body.name || phone,
        email: body.email,
        tags: profile,
        source: "manual",
      },
    });
    return { ok: true, contact: row };
  }

  @Post("import")
  @RequirePermissions("conversations.reply")
  async importRows(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      rows?: Array<{
        phone?: string;
        waId?: string;
        name?: string;
        email?: string;
        gender?: string;
        stage?: string;
        branch?: string;
        marketing?: boolean | string;
      }>;
    },
  ) {
    const rows = body.rows || [];
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });
    let created = 0;
    let updated = 0;
    for (const item of rows) {
      const waId = String(item.waId || item.phone || "")
        .replace(/\s+/g, "")
        .trim();
      if (!waId) continue;
      const marketing =
        item.marketing === false ||
        item.marketing === "0" ||
        item.marketing === "false" ||
        item.marketing === "لا"
          ? false
          : true;
      const profile = writeProfile({
        labels: [],
        stage: item.stage || "lead",
        gender: item.gender || "",
        branch: item.branch || org?.name || "الفرع الرئيسي",
        marketing,
      });
      const existing = await this.prisma.contact.findUnique({
        where: {
          organizationId_waId: {
            organizationId: user.organizationId,
            waId,
          },
        },
      });
      await this.prisma.contact.upsert({
        where: {
          organizationId_waId: {
            organizationId: user.organizationId,
            waId,
          },
        },
        update: {
          name: item.name || undefined,
          email: item.email || undefined,
          tags: profile,
        },
        create: {
          organizationId: user.organizationId,
          waId,
          name: item.name || waId,
          email: item.email,
          tags: profile,
          source: "import",
        },
      });
      if (existing) updated += 1;
      else created += 1;
    }
    return { ok: true, created, updated, total: rows.length };
  }

  @Patch(":id")
  @RequirePermissions("conversations.reply")
  async patch(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
    @Body()
    body: {
      name?: string;
      email?: string;
      tags?: string[];
      stage?: string;
      gender?: string;
      branch?: string;
      marketing?: boolean;
    },
  ) {
    const existing = await this.prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
    });
    if (!existing) return null;
    const org = await this.prisma.organization.findUnique({
      where: { id: user.organizationId },
      select: { name: true },
    });
    const current = readProfile(existing.tags, org?.name || "الفرع الرئيسي");
    const profile = writeProfile({
      labels: body.tags ?? current.labels,
      stage: body.stage ?? current.stage,
      gender: body.gender ?? current.gender,
      branch: body.branch ?? current.branch,
      marketing: body.marketing ?? current.marketing,
    });
    return this.prisma.contact.update({
      where: { id },
      data: {
        name: body.name ?? existing.name,
        email: body.email ?? existing.email,
        tags: profile,
      },
    });
  }

  @Get(":id")
  @RequirePermissions("conversations.read")
  get(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.prisma.contact.findFirst({
      where: { id, organizationId: user.organizationId },
      include: {
        conversations: { orderBy: { updatedAt: "desc" }, take: 10 },
        inquiries: { orderBy: { createdAt: "desc" }, take: 10 },
        quotes: { orderBy: { createdAt: "desc" }, take: 10 },
      },
    });
  }
}
