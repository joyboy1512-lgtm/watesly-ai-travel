import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  NotFoundException,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import bcrypt from "bcryptjs";
import { CurrentUser, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { PrismaService } from "../prisma/prisma.service";
import { AuditService } from "../common/audit.service";

@Controller("users")
export class UsersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  @Get()
  @RequirePermissions("users.manage")
  async list(@CurrentUser() user: AuthUser) {
    const members = await this.prisma.membership.findMany({
      where: { organizationId: user.organizationId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            lastLoginAt: true,
          },
        },
        role: { select: { id: true, code: true, name: true } },
      },
      orderBy: { createdAt: "asc" },
    });

    return {
      items: members.map((m) => ({
        membershipId: m.id,
        status: m.status,
        user: m.user,
        role: m.role,
      })),
    };
  }

  @Post()
  @RequirePermissions("users.manage")
  async invite(
    @CurrentUser() actor: AuthUser,
    @Body()
    body: {
      email: string;
      name: string;
      password: string;
      roleCode?: string;
    },
  ) {
    const email = body.email?.trim().toLowerCase();
    const name = body.name?.trim();
    const password = body.password ?? "";
    const roleCode = body.roleCode || "agent";

    if (!email || !name || password.length < 8) {
      throw new BadRequestException(
        "الاسم والبريد وكلمة مرور (8 أحرف على الأقل) مطلوبة",
      );
    }

    if (roleCode === "owner") {
      throw new BadRequestException("لا يمكن إنشاء مالك إضافي بهذه الطريقة");
    }

    const role = await this.prisma.role.findFirst({
      where: {
        organizationId: actor.organizationId,
        code: roleCode,
      },
    });
    if (!role) throw new BadRequestException("الدور غير موجود");

    let user = await this.prisma.user.findUnique({ where: { email } });
    if (!user) {
      user = await this.prisma.user.create({
        data: {
          email,
          name,
          passwordHash: await bcrypt.hash(password, 12),
          status: "active",
        },
      });
    } else {
      const existing = await this.prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId: actor.organizationId,
            userId: user.id,
          },
        },
      });
      if (existing) {
        throw new ConflictException("المستخدم عضو بالفعل في المؤسسة");
      }
    }

    const membership = await this.prisma.membership.create({
      data: {
        organizationId: actor.organizationId,
        userId: user.id,
        roleId: role.id,
        status: "active",
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            lastLoginAt: true,
          },
        },
        role: { select: { id: true, code: true, name: true } },
      },
    });

    await this.audit.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "users.invite",
      entityType: "Membership",
      entityId: membership.id,
      after: { email, roleCode },
    });

    return {
      membershipId: membership.id,
      status: membership.status,
      user: membership.user,
      role: membership.role,
    };
  }


  @Patch("me")
  async updateMe(
    @CurrentUser() actor: AuthUser,
    @Body()
    body: {
      name?: string;
      currentPassword?: string;
      newPassword?: string;
    },
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: actor.userId },
    });
    if (!user) throw new NotFoundException("المستخدم غير موجود");

    const data: { name?: string; passwordHash?: string } = {};
    if (typeof body.name === "string" && body.name.trim()) {
      if (body.name.trim().length < 2) {
        throw new BadRequestException("الاسم قصير جدًا");
      }
      data.name = body.name.trim();
    }

    if (body.newPassword) {
      if (!body.currentPassword) {
        throw new BadRequestException("أدخل كلمة المرور الحالية");
      }
      if (body.newPassword.length < 8) {
        throw new BadRequestException("كلمة المرور الجديدة يجب أن تكون 8 أحرف على الأقل");
      }
      const ok = await bcrypt.compare(body.currentPassword, user.passwordHash);
      if (!ok) {
        throw new BadRequestException("كلمة المرور الحالية غير صحيحة");
      }
      data.passwordHash = await bcrypt.hash(body.newPassword, 12);
    }

    if (!Object.keys(data).length) {
      throw new BadRequestException("لا يوجد شيء للحفظ");
    }

    const updated = await this.prisma.user.update({
      where: { id: actor.userId },
      data,
      select: { id: true, email: true, name: true, status: true },
    });

    await this.audit.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "users.update_self",
      entityType: "User",
      entityId: actor.userId,
      after: { name: updated.name, passwordChanged: Boolean(data.passwordHash) },
    });

    return updated;
  }

  @Patch(":membershipId")
  @RequirePermissions("users.manage")
  async update(
    @CurrentUser() actor: AuthUser,
    @Param("membershipId") membershipId: string,
    @Body() body: { roleCode?: string; status?: string },
  ) {
    const membership = await this.prisma.membership.findFirst({
      where: { id: membershipId, organizationId: actor.organizationId },
      include: { role: true },
    });
    if (!membership) throw new NotFoundException("العضوية غير موجودة");

    if (membership.role.code === "owner" && body.roleCode && body.roleCode !== "owner") {
      throw new BadRequestException("لا يمكن تغيير دور المالك");
    }

    let roleId = membership.roleId;
    if (body.roleCode) {
      const role = await this.prisma.role.findFirst({
        where: {
          organizationId: actor.organizationId,
          code: body.roleCode,
        },
      });
      if (!role) throw new BadRequestException("الدور غير موجود");
      roleId = role.id;
    }

    const updated = await this.prisma.membership.update({
      where: { id: membershipId },
      data: {
        roleId,
        status: body.status || membership.status,
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            status: true,
            lastLoginAt: true,
          },
        },
        role: { select: { id: true, code: true, name: true } },
      },
    });

    await this.audit.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "users.update",
      entityType: "Membership",
      entityId: membershipId,
      before: { role: membership.role.code, status: membership.status },
      after: { role: updated.role.code, status: updated.status },
    });

    return {
      membershipId: updated.id,
      status: updated.status,
      user: updated.user,
      role: updated.role,
    };
  }
}
