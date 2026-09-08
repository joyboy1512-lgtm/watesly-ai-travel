import {
  BadRequestException,
  ConflictException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import bcrypt from "bcryptjs";
import { ROLE_PERMISSIONS } from "@watesly-travel/shared";
import { PrismaService } from "../prisma/prisma.service";
import type { JwtPayload } from "./auth.types";
import type { LoginDto, RegisterOrganizationDto } from "./auth.dto";
import {
  createSystemRolesWithPermissions,
  seedOrgDefaults,
} from "../common/org-bootstrap";

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  async login(dto: LoginDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password ?? "";

    if (!email || !password) {
      throw new BadRequestException("البريد وكلمة المرور مطلوبان");
    }

    const user = await this.prisma.user.findUnique({
      where: { email },
      include: {
        memberships: {
          where: { status: "active", organization: { status: "active" } },
          include: {
            organization: true,
            role: {
              include: {
                permissions: { include: { permission: true } },
              },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    });

    if (!user || user.status !== "active") {
      throw new UnauthorizedException("بيانات الدخول غير صحيحة");
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      throw new UnauthorizedException("بيانات الدخول غير صحيحة");
    }

    const membership = user.memberships[0];
    if (!membership) {
      throw new UnauthorizedException("لا توجد عضوية نشطة لهذا المستخدم");
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    await this.prisma.auditLog.create({
      data: {
        organizationId: membership.organizationId,
        actorUserId: user.id,
        action: "auth.login",
        entityType: "User",
        entityId: user.id,
      },
    });

    return this.buildAuthResponse({
      userId: user.id,
      email: user.email,
      name: user.name,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      membershipId: membership.id,
      roleCode: membership.role.code,
      permissions: membership.role.permissions.map((rp) => rp.permission.code),
    });
  }

  async register(dto: RegisterOrganizationDto) {
    const email = dto.email?.trim().toLowerCase();
    const password = dto.password ?? "";
    const organizationName = dto.organizationName?.trim();
    const organizationSlug = dto.organizationSlug?.trim().toLowerCase();
    const ownerName = dto.ownerName?.trim();

    if (!email || !password || !organizationName || !organizationSlug || !ownerName) {
      throw new BadRequestException("جميع الحقول مطلوبة");
    }

    if (password.length < 8) {
      throw new BadRequestException("كلمة المرور يجب أن تكون 8 أحرف على الأقل");
    }

    if (!/^[a-z0-9-]+$/.test(organizationSlug)) {
      throw new BadRequestException(
        "معرّف المؤسسة يجب أن يكون بالإنجليزية الصغيرة والأرقام والشرطة فقط",
      );
    }

    const existingUser = await this.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      throw new ConflictException("البريد مستخدم مسبقًا");
    }

    const existingOrg = await this.prisma.organization.findUnique({
      where: { slug: organizationSlug },
    });
    if (existingOrg) {
      throw new ConflictException("معرّف المؤسسة مستخدم مسبقًا");
    }

    const passwordHash = await bcrypt.hash(password, 12);

    const result = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: organizationName,
          slug: organizationSlug,
          defaultCurrency: "KWD",
          timezone: "Asia/Kuwait",
          status: "active",
        },
      });

      const roleIds = await createSystemRolesWithPermissions(tx, organization.id);

      const user = await tx.user.create({
        data: {
          email,
          name: ownerName,
          passwordHash,
          status: "active",
          lastLoginAt: new Date(),
        },
      });

      const membership = await tx.membership.create({
        data: {
          organizationId: organization.id,
          userId: user.id,
          roleId: roleIds.owner!,
          status: "active",
        },
      });

      await tx.auditLog.create({
        data: {
          organizationId: organization.id,
          actorUserId: user.id,
          action: "auth.register",
          entityType: "Organization",
          entityId: organization.id,
          after: { slug: organization.slug, email },
        },
      });

      await seedOrgDefaults(tx, organization.id);

      return {
        organization,
        user,
        membership,
        permissions: ROLE_PERMISSIONS.owner ?? [],
      };
    });

    return this.buildAuthResponse({
      userId: result.user.id,
      email: result.user.email,
      name: result.user.name,
      organizationId: result.organization.id,
      organizationName: result.organization.name,
      membershipId: result.membership.id,
      roleCode: "owner",
      permissions: result.permissions,
    });
  }

  async me(userId: string, organizationId: string) {
    const membership = await this.prisma.membership.findFirst({
      where: {
        userId,
        organizationId,
        status: "active",
      },
      include: {
        user: true,
        organization: true,
        role: {
          include: {
            permissions: { include: { permission: true } },
          },
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException("العضوية غير موجودة");
    }

    return {
      user: {
        id: membership.user.id,
        email: membership.user.email,
        name: membership.user.name,
      },
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        slug: membership.organization.slug,
        defaultCurrency: membership.organization.defaultCurrency,
        timezone: membership.organization.timezone,
      },
      role: {
        code: membership.role.code,
        name: membership.role.name,
      },
      permissions: membership.role.permissions.map((rp) => rp.permission.code),
    };
  }

  private async buildAuthResponse(input: {
    userId: string;
    email: string;
    name: string;
    organizationId: string;
    organizationName: string;
    membershipId: string;
    roleCode: string;
    permissions: string[];
  }) {
    const payload: JwtPayload = {
      sub: input.userId,
      email: input.email,
      organizationId: input.organizationId,
      membershipId: input.membershipId,
      roleCode: input.roleCode,
      permissions: input.permissions,
    };

    const accessToken = await this.jwt.signAsync(payload);

    return {
      accessToken,
      tokenType: "Bearer",
      user: {
        id: input.userId,
        email: input.email,
        name: input.name,
      },
      organization: {
        id: input.organizationId,
        name: input.organizationName,
      },
      role: {
        code: input.roleCode,
      },
      permissions: input.permissions,
    };
  }
}
