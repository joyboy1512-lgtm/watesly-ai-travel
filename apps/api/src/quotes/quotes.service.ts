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
    const expired = await this.prisma.quote.findMany({
      where: {
        ...(organizationId ? { organizationId } : {}),
        expiresAt: { lt: now },
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
}
