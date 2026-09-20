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
import { readOrgSettings, writeOrgSettings } from "../common/org-settings";
import {
  mergePermissions,
  overrideForMembership,
  readTeamSettings,
  sanitizePermissionCodes,
  writeTeamSettings,
  type PermissionOverride,
} from "../common/team-permissions";
import { PERMISSION_CATALOG, ROLE_PERMISSIONS } from "@watesly-travel/shared";

function rolePermissionsFromRole(code: string): string[] {
  return [...(ROLE_PERMISSIONS[code] || ROLE_PERMISSIONS.agent || [])];
}

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
        role: {
          select: {
            id: true,
            code: true,
            name: true,
            permissions: { include: { permission: true } },
          },
        },
      },
      orderBy: { createdAt: "asc" },
    });

    const settings = await readOrgSettings(this.prisma, user.organizationId);
    return {
      catalog: PERMISSION_CATALOG,
      items: members.map((m) => {
        const rolePermissions = m.role.permissions.map((rp) => rp.permission.code);
        const override = overrideForMembership(settings, m.id);
        return {
          membershipId: m.id,
          status: m.status,
          user: m.user,
          role: { id: m.role.id, code: m.role.code, name: m.role.name },
          override: override || { grant: [], revoke: [] },
          permissions: mergePermissions(m.role.code, rolePermissions, override),
        };
      }),
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
      grant?: string[];
      revoke?: string[];
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

    const override: PermissionOverride = {
      grant: sanitizePermissionCodes(body.grant),
      revoke: sanitizePermissionCodes(body.revoke),
    };
    if (override.grant?.length || override.revoke?.length) {
      const settings = await readOrgSettings(this.prisma, actor.organizationId);
      const team = readTeamSettings(settings);
      team.permissionOverrides = {
        ...(team.permissionOverrides || {}),
        [membership.id]: override,
      };
      await writeOrgSettings(
        this.prisma,
        actor.organizationId,
        writeTeamSettings(settings, team),
      );
    }

    await this.audit.log({
      organizationId: actor.organizationId,
      actorUserId: actor.userId,
      action: "users.invite",
      entityType: "Membership",
      entityId: membership.id,
      after: { email, roleCode, override },
    });

    return {
      membershipId: membership.id,
      status: membership.status,
      user: membership.user,
      role: membership.role,
      override,
      permissions: mergePermissions(roleCode, rolePermissionsFromRole(roleCode), override),
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
    @Body()
    body: {
      roleCode?: string;
      status?: string;
      grant?: string[];
      revoke?: string[];
    },
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

    let override = overrideForMembership(
      await readOrgSettings(this.prisma, actor.organizationId),
      membershipId,
    );
    if (body.grant !== undefined || body.revoke !== undefined) {
      if (updated.role.code === "owner") {
        throw new BadRequestException("لا يمكن تقييد صلاحيات المالك");
      }
      override = {
        grant: sanitizePermissionCodes(body.grant),
        revoke: sanitizePermissionCodes(body.revoke),
      };
      const settings = await readOrgSettings(this.prisma, actor.organizationId);
      const team = readTeamSettings(settings);
      team.permissionOverrides = {
        ...(team.permissionOverrides || {}),
        [membershipId]: override,
      };
      await writeOrgSettings(
        this.prisma,
        actor.organizationId,
        writeTeamSettings(settings, team),
      );
    }

    return {
      membershipId: updated.id,
      status: updated.status,
      user: updated.user,
      role: updated.role,
      override: override || { grant: [], revoke: [] },
      permissions: mergePermissions(
        updated.role.code,
        rolePermissionsFromRole(updated.role.code),
        override,
      ),
    };
  }
}
