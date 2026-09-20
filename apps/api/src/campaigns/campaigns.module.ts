import { Module } from "@nestjs/common";
import { CampaignsController } from "./campaigns.controller";
import { CampaignsService } from "./campaigns.service";
import { AuditService } from "../common/audit.service";

@Module({
  controllers: [CampaignsController],
  providers: [CampaignsService, AuditService],
  exports: [CampaignsService],
})
export class CampaignsModule {}
