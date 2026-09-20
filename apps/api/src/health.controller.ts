import {
  Controller,
  Get,
  ServiceUnavailableException,
} from "@nestjs/common";
import { APP_NAME } from "@watesly-travel/shared";
import { Public } from "./auth/decorators";
import { PrismaService } from "./prisma/prisma.service";
import { sharedPing } from "./common/shared-kv";

@Controller()
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Public()
  @Get("health")
  async health() {
    let postgres = false;
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      postgres = true;
    } catch {
      postgres = false;
    }
    const redis = await sharedPing();
    const payload = {
      ok: postgres && redis,
      service: "api",
      app: APP_NAME,
      postgres,
      redis,
      timestamp: new Date().toISOString(),
    };
    if (!payload.ok) {
      throw new ServiceUnavailableException(payload);
    }
    return payload;
  }
}
