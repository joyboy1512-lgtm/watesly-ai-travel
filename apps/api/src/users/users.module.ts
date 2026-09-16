import { Module } from "@nestjs/common";
import { UsersController } from "./users.controller";
import { AuditService } from "../common/audit.service";

@Module({
  controllers: [UsersController],
  providers: [AuditService],
})
export class UsersModule {}
