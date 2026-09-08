import { Module } from "@nestjs/common";
import { CampaignsController } from "./campaigns.controller";
import { AuditService } from "../common/audit.service";

@Module({
  controllers: [CampaignsController],
  providers: [AuditService],
})
export class CampaignsModule {}
