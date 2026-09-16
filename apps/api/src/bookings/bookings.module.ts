import { Module } from "@nestjs/common";
import { BookingsController } from "./bookings.controller";
import { BookingsService } from "./bookings.service";
import { AuditService } from "../common/audit.service";
import { PipelineModule } from "../pipeline/pipeline.module";

@Module({
  imports: [PipelineModule],
  controllers: [BookingsController],
  providers: [BookingsService, AuditService],
  exports: [BookingsService],
})
export class BookingsModule {}
