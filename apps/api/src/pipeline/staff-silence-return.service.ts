import {
  Injectable,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { parseInboundIntent } from "../whatsapp/inbound-intent";
import { BotPipelineService } from "./bot-pipeline.service";
import { STAFF_SILENCE_MS, staffSilenceDecision } from "./staff-silence";

const SWEEP_MS = 20_000;

@Injectable()
export class StaffSilenceReturnService implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pipeline: BotPipelineService,
  ) {}

  onModuleInit() {
    const instance = process.env.NODE_APP_INSTANCE;
    if (instance != null && instance !== "" && instance !== "0") return;
    this.timer = setInterval(() => {
      void this.sweep().catch((err: unknown) => {
        console.error("[staff-silence] sweep failed", err);
      });
    }, SWEEP_MS);
    this.timer.unref?.();
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async sweep(nowMs = Date.now()) {
    if (this.running) return;
    this.running = true;
    try {
      const conversations = await this.prisma.conversation.findMany({
        where: {
          assigneeType: "human",
          status: { in: ["open", "pending"] },
        },
        select: { id: true, organizationId: true, contactId: true },
        take: 40,
        orderBy: { updatedAt: "asc" },
      });

      for (const conversation of conversations) {
        try {
          await this.consider(conversation, nowMs);
        } catch (err) {
          console.error("[staff-silence] conversation failed", conversation.id, err);
        }
      }
    } finally {
      this.running = false;
    }
  }

  private async consider(
    conversation: { id: string; organizationId: string; contactId: string },
    nowMs: number,
  ) {
    const [handoff, lastInbound, lastStaff, lastOutbound] = await Promise.all([
      this.prisma.handoff.findFirst({
        where: {
          conversationId: conversation.id,
          status: { in: ["open", "accepted"] },
        },
        orderBy: { requestedAt: "desc" },
        select: { requestedAt: true },
      }),
      this.prisma.message.findFirst({
        where: { conversationId: conversation.id, direction: "inbound" },
        orderBy: { createdAt: "desc" },
        select: { id: true, body: true, createdAt: true },
      }),
      this.prisma.message.findFirst({
        where: {
          conversationId: conversation.id,
          direction: "outbound",
          sentByUserId: { not: null },
        },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
      this.prisma.message.findFirst({
        where: { conversationId: conversation.id, direction: "outbound" },
        orderBy: { createdAt: "desc" },
        select: { createdAt: true },
      }),
    ]);

    const decision = staffSilenceDecision({
      nowMs,
      handoffAtMs: handoff?.requestedAt.getTime() ?? null,
      lastInboundAtMs: lastInbound?.createdAt.getTime() ?? null,
      lastStaffReplyAtMs: lastStaff?.createdAt.getTime() ?? null,
      lastOutboundAtMs: lastOutbound?.createdAt.getTime() ?? null,
    });
    if (!decision.returnToAssistant) return;

    const claimed = await this.prisma.conversation.updateMany({
      where: {
        id: conversation.id,
        organizationId: conversation.organizationId,
        assigneeType: "human",
        status: { in: ["open", "pending"] },
      },
      data: {
        assigneeType: "bot",
        assignedUserId: null,
        status: "open",
      },
    });
    if (claimed.count !== 1) return;

    await this.prisma.handoff.updateMany({
      where: {
        conversationId: conversation.id,
        organizationId: conversation.organizationId,
        status: { in: ["open", "accepted"] },
      },
      data: { status: "returned_to_bot" },
    });

    const pending = lastInbound?.body?.trim() || "";
    const shouldAnswer =
      decision.answerPendingCustomer &&
      pending.length > 0 &&
      parseInboundIntent(pending).type !== "handoff" &&
      nowMs - (lastInbound?.createdAt.getTime() ?? nowMs) < STAFF_SILENCE_MS + 60 * 60 * 1000;

    console.info(
      `[staff-silence] returned conversation=${conversation.id} answer=${shouldAnswer}`,
    );

    if (!shouldAnswer || !lastInbound) return;

    await this.pipeline.handleInboundText({
      organizationId: conversation.organizationId,
      conversationId: conversation.id,
      contactId: conversation.contactId,
      messageId: lastInbound.id,
      text: pending,
    });
  }
}
