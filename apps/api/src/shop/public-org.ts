import { BadRequestException, Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";

export type PublicOrg = {
  id: string;
  name: string;
  slug: string;
  defaultCurrency: string;
  timezone: string;
};

@Injectable()
export class PublicOrgService {
  constructor(private readonly prisma: PrismaService) {}

  async resolve(): Promise<PublicOrg> {
    const slug =
      process.env.PUBLIC_ORG_SLUG?.trim() ||
      process.env.PUBLIC_ASSISTANT_ORG_SLUG?.trim();
    const organization = slug
      ? await this.prisma.organization.findFirst({
          where: { slug, status: "active" },
        })
      : await this.prisma.organization.findFirst({
          where: { status: "active" },
          orderBy: { createdAt: "asc" },
        });
    if (!organization) {
      throw new BadRequestException("لا توجد منظمة مفعّلة للموقع");
    }
    return {
      id: organization.id,
      name: organization.name,
      slug: organization.slug,
      defaultCurrency: organization.defaultCurrency,
      timezone: organization.timezone,
    };
  }
}
