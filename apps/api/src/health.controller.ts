import { Controller, Get } from "@nestjs/common";
import { APP_NAME } from "@watesly-travel/shared";
import { Public } from "./auth/decorators";

@Controller()
export class HealthController {
  @Public()
  @Get("health")
  health() {
    return {
      ok: true,
      service: "api",
      app: APP_NAME,
      timestamp: new Date().toISOString(),
    };
  }
}
