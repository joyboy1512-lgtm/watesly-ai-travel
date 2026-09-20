import {
  BadRequestException,
  Injectable,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

const ACTIVE_BOOKING_STATUSES = ["draft", "on_hold", "issued", "completed"];
const PURGE_INTERVAL_MS = 15 * 60 * 1000;

@Injectable()
export class QuotesService implements OnModuleInit, OnModuleDestroy {
  private purgeTimer?: NodeJS.Timeout;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  onModuleInit() {
    void this.purgeExpiredQuotes();
    this.purgeTimer = setInterval(
      () => void this.purgeExpiredQuotes(),
      PURGE_INTERVAL_MS,
    );
  }

  onModuleDestroy() {
    if (this.purgeTimer) clearInterval(this.purgeTimer);
  }

  /** Remove quotes whose expiry datetime has passed (all organizations). */
  async purgeExpiredQuotes(organizationId?: string) {
    const now = new Date();
    const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const expired = await this.prisma.quote.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        status: { not: "archived" },
        OR: [{ expiresAt: { lt: now } }, { createdAt: { lt: threeDaysAgo } }],
      },
      select: {
        id: true,
        organizationId: true,
        status: true,
        bookings: { select: { id: true, status: true } },
      },
      take: 500,
    });

    const deletableIds = expired
      .filter((row) => this.canDeleteQuote(row))
      .map((row) => row.id);

    if (!deletableIds.length) return 0;

    await this.prisma.quote.deleteMany({
      where: { id: { in: deletableIds } },
    });

    return deletableIds.length;
  }

  private canDeleteQuote(row: {
    status: string;
    bookings: Array<{ status: string }>;
  }) {
    if (row.status === "booked") return false;
    return !row.bookings.some((booking) =>
      ACTIVE_BOOKING_STATUSES.includes(booking.status),
    );
  }

  async deleteQuote(input: {
    quoteId: string;
    organizationId: string;
    userId: string;
  }) {
    const row = await this.prisma.quote.findFirst({
      where: { id: input.quoteId, organizationId: input.organizationId },
      include: {
        items: { select: { id: true, description: true, serviceType: true } },
        bookings: { select: { id: true, status: true } },
      },
    });

    if (!row) {
      throw new NotFoundException("عرض السعر غير موجود");
    }

    if (!this.canDeleteQuote(row)) {
      throw new BadRequestException(
        "لا يمكن حذف عرض مرتبط بحجز نشط. ألغِ الحجز أولاً.",
      );
    }

    await this.prisma.quote.delete({ where: { id: row.id } });

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: "quotes.delete",
      entityType: "quote",
      entityId: row.id,
      before: {
        status: row.status,
        totalSellAmount: row.totalSellAmount,
        items: row.items,
      },
    });

    return { ok: true, id: row.id };
  }

  async bulkQuotes(input: {
    organizationId: string;
    userId: string;
    ids: string[];
    action?: "archive" | "unarchive" | "delete";
  }) {
    const ids = Array.from(new Set(input.ids.filter(Boolean)));
    if (!ids.length) return { ok: true, count: 0 };
    if (
      input.action !== "archive" &&
      input.action !== "unarchive" &&
      input.action !== "delete"
    ) {
      throw new BadRequestException("إجراء غير مدعوم");
    }

    const rows = await this.prisma.quote.findMany({
      where: { organizationId: input.organizationId, id: { in: ids } },
      include: {
        items: { select: { id: true, description: true, serviceType: true } },
        bookings: { select: { id: true, status: true } },
      },
    });
    if (!rows.length) return { ok: true, count: 0 };

    if (input.action === "delete") {
      const deletable = rows.filter((row) => this.canDeleteQuote(row));
      if (!deletable.length) {
        throw new BadRequestException(
          "لا يمكن حذف عروض مرتبطة بحجز نشط. ألغِ الحجز أولاً.",
        );
      }
      await this.prisma.quote.deleteMany({
        where: { id: { in: deletable.map((row) => row.id) } },
      });
      await this.audit.log({
        organizationId: input.organizationId,
        actorUserId: input.userId,
        action: "quotes.bulk.delete",
        entityType: "quote",
        entityId: deletable.map((row) => row.id).join(","),
        after: { count: deletable.length },
      });
      return { ok: true, count: deletable.length };
    }

    const archived = input.action === "archive";
    for (const row of rows) {
      const payload =
        row.customerVisiblePayload &&
        typeof row.customerVisiblePayload === "object" &&
        !Array.isArray(row.customerVisiblePayload)
          ? { ...(row.customerVisiblePayload as Record<string, unknown>) }
          : {};
      if (archived) {
        if (row.status === "archived") continue;
        payload._prevStatus = row.status;
        await this.prisma.quote.update({
          where: { id: row.id },
          data: {
            status: "archived",
            customerVisiblePayload: payload as object,
          },
        });
      } else {
        const prev =
          typeof payload._prevStatus === "string" && payload._prevStatus
            ? payload._prevStatus
            : row.sentAt
              ? "sent"
              : "draft";
        delete payload._prevStatus;
        await this.prisma.quote.update({
          where: { id: row.id },
          data: {
            status: prev === "archived" ? "draft" : prev,
            customerVisiblePayload: payload as object,
          },
        });
      }
    }

    await this.audit.log({
      organizationId: input.organizationId,
      actorUserId: input.userId,
      action: archived ? "quotes.bulk.archive" : "quotes.bulk.unarchive",
      entityType: "quote",
      entityId: rows.map((row) => row.id).join(","),
      after: { count: rows.length },
    });
    return { ok: true, count: rows.length };
  }
}
