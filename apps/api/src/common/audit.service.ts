import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async log(input: {
    organizationId?: string | null;
    actorUserId?: string | null;
    action: string;
    entityType?: string;
    entityId?: string;
    before?: unknown;
    after?: unknown;
  }) {
    await this.prisma.auditLog.create({
      data: {
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        entityType: input.entityType,
        entityId: input.entityId,
        before: input.before as object | undefined,
        after: input.after as object | undefined,
      },
    });
  }
}
