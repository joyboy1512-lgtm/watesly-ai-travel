import { Module } from "@nestjs/common";
import { ProvidersController } from "./providers.controller";
import { AuditService } from "../common/audit.service";

@Module({
  controllers: [ProvidersController],
  providers: [AuditService],
})
export class ProvidersModule {}
