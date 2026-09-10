import {
  createParamDecorator,
  ExecutionContext,
  Injectable,
  SetMetadata,
  UnauthorizedException,
  type CanActivate,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { JwtService } from "@nestjs/jwt";
import type { Request } from "express";
import { PrismaService } from "../prisma/prisma.service";
import {
  CSRF_COOKIE,
  CUSTOMER_COOKIE,
  getSessionEpoch,
  isSessionJtiRevoked,
  parseCookieHeader,
} from "../common/session-cookies";

export const SHOP_CUSTOMER_OPTIONAL = "shopCustomerOptional";

export type ShopCustomer = {
  id: string;
  organizationId: string;
  phone: string;
  email: string | null;
  name: string | null;
  contactId: string | null;
};

export type CustomerJwtPayload = {
  sub: string;
  typ: "customer";
  organizationId: string;
  phone: string;
  /** Session epoch — bump on logout / password change. */
  sv?: number;
  jti?: string;
};

export const CurrentCustomer = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ShopCustomer => {
    const request = ctx.switchToHttp().getRequest<{ customer?: ShopCustomer }>();
    if (!request.customer) {
      throw new UnauthorizedException("مطلوب تسجيل الدخول");
    }
    return request.customer;
  },
);

export const ShopCustomerMaybe = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): ShopCustomer | undefined => {
    const request = ctx.switchToHttp().getRequest<{ customer?: ShopCustomer }>();
    return request.customer;
  },
);

export const OptionalCustomer = () => SetMetadata(SHOP_CUSTOMER_OPTIONAL, true);

@Injectable()
export class CustomerAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const optional = this.reflector.getAllAndOverride<boolean>(
      SHOP_CUSTOMER_OPTIONAL,
      [context.getHandler(), context.getClass()],
    );
    const request = context
      .switchToHttp()
      .getRequest<Request & { customer?: ShopCustomer; customerJti?: string }>();

    const bearer = request.headers.authorization?.startsWith("Bearer ");
    let token: string | null = null;
    if (bearer) {
      token = request.headers.authorization!.slice("Bearer ".length).trim() || null;
    } else {
      const cookies = parseCookieHeader(request.headers.cookie);
      token = cookies[CUSTOMER_COOKIE] || null;
    }
    const usedCookieAuth = !bearer && Boolean(token);

    if (!token) {
      if (optional) return true;
      throw new UnauthorizedException("مطلوب تسجيل الدخول");
    }

    // CSRF for cookie-authenticated mutating requests.
    if (usedCookieAuth) {
      const method = request.method.toUpperCase();
      if (method !== "GET" && method !== "HEAD" && method !== "OPTIONS") {
        const cookies = parseCookieHeader(request.headers.cookie);
        const cookieToken = cookies[CSRF_COOKIE];
        const headerToken = String(
          request.headers["x-csrf-token"] || request.headers["x-xsrf-token"] || "",
        ).trim();
        if (!cookieToken || !headerToken || cookieToken !== headerToken) {
          throw new UnauthorizedException("طلب غير صالح (CSRF)");
        }
      }
    }

    let payload: CustomerJwtPayload;
    try {
      payload = await this.jwt.verifyAsync<CustomerJwtPayload>(token);
    } catch {
      if (optional) return true;
      throw new UnauthorizedException("جلسة غير صالحة");
    }

    if (payload.typ !== "customer" || !payload.sub) {
      if (optional) return true;
      throw new UnauthorizedException("جلسة غير صالحة");
    }

    if (await isSessionJtiRevoked(payload.jti)) {
      if (optional) return true;
      throw new UnauthorizedException("تم إنهاء الجلسة");
    }

    const epoch = await getSessionEpoch(payload.sub);
    if (payload.sv != null && payload.sv < epoch) {
      if (optional) return true;
      throw new UnauthorizedException("تم إنهاء الجلسة");
    }

    const customer = await this.prisma.customer.findFirst({
      where: {
        id: payload.sub,
        organizationId: payload.organizationId,
        status: "active",
        organization: { status: "active" },
      },
    });
    if (!customer) {
      if (optional) return true;
      throw new UnauthorizedException("الحساب غير نشط");
    }

    request.customer = {
      id: customer.id,
      organizationId: customer.organizationId,
      phone: customer.phone,
      email: customer.email,
      name: customer.name,
      contactId: customer.contactId,
    };
    request.customerJti = payload.jti;
    return true;
  }
}
