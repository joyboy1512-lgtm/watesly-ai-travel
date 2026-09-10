import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import {
  isProductionRuntime,
  requireStrongSecret,
} from "../common/security-env";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { JwtAuthGuard } from "./jwt.guard";
import { PermissionsGuard } from "./permissions.guard";

function jwtSecret(): string {
  if (isProductionRuntime()) {
    return requireStrongSecret("JWT_ACCESS_SECRET", process.env.JWT_ACCESS_SECRET);
  }
  return process.env.JWT_ACCESS_SECRET || "dev-only-change-me-watesly-travel";
}

@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: jwtSecret(),
      signOptions: {
        expiresIn: (process.env.JWT_ACCESS_TTL || "8h") as `${number}${"s" | "m" | "h" | "d"}`,
      },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtAuthGuard, PermissionsGuard],
  exports: [AuthService, JwtAuthGuard, PermissionsGuard],
})
export class AuthModule {}
