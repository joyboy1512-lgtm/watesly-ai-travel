import { Module } from "@nestjs/common";
import { PricingController } from "./pricing.controller";
import { AuditService } from "../common/audit.service";

@Module({
  controllers: [PricingController],
  providers: [AuditService],
})
export class PricingModule {}
