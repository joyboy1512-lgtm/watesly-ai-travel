import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { IS_PUBLIC_KEY } from "./decorators";
import type { AuthUser, JwtPayload } from "./auth.types";
import { PrismaService } from "../prisma/prisma.service";

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      throw new UnauthorizedException("مطلوب تسجيل الدخول");
    }

    const token = header.slice("Bearer ".length).trim();
    let payload: JwtPayload & { typ?: string };

    try {
      payload = await this.jwt.verifyAsync<JwtPayload & { typ?: string }>(token);
    } catch {
      throw new UnauthorizedException("جلسة غير صالحة");
    }

    if (payload.typ === "customer") {
      throw new UnauthorizedException("هذه الصفحة للموظفين فقط");
    }

    const membership = await this.prisma.membership.findFirst({
      where: {
        id: payload.membershipId,
        userId: payload.sub,
        organizationId: payload.organizationId,
        status: "active",
        user: { status: "active" },
        organization: { status: "active" },
      },
      include: {
        user: true,
        organization: true,
        role: {
          include: {
            permissions: {
              include: { permission: true },
            },
          },
        },
      },
    });

    if (!membership) {
      throw new UnauthorizedException("العضوية غير نشطة");
    }

    request.user = {
      userId: membership.user.id,
      email: membership.user.email,
      name: membership.user.name,
      organizationId: membership.organization.id,
      organizationName: membership.organization.name,
      membershipId: membership.id,
      roleCode: membership.role.code,
      permissions: membership.role.permissions.map((rp) => rp.permission.code),
    };

    return true;
  }
}
