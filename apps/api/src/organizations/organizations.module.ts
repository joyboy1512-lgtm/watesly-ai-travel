import { Module } from "@nestjs/common";
import { OrganizationsController } from "./organizations.controller";
import { FxController } from "./fx.controller";
import { AuditService } from "../common/audit.service";

@Module({
  controllers: [OrganizationsController, FxController],
  providers: [AuditService],
})
export class OrganizationsModule {}
