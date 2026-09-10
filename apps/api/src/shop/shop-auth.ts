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
      .getRequest<Request & { customer?: ShopCustomer }>();
    const header = request.headers.authorization;
    if (!header?.startsWith("Bearer ")) {
      if (optional) return true;
      throw new UnauthorizedException("مطلوب تسجيل الدخول");
    }

    const token = header.slice("Bearer ".length).trim();
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
    return true;
  }
}
