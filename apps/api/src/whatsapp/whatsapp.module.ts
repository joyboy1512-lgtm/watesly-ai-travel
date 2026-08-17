import { Module } from "@nestjs/common";
import { WhatsappController } from "./whatsapp.controller";
import { WhatsappService } from "./whatsapp.service";
import { PipelineModule } from "../pipeline/pipeline.module";
import { BookingsModule } from "../bookings/bookings.module";
import { AuditService } from "../common/audit.service";

@Module({
  imports: [PipelineModule, BookingsModule],
  controllers: [WhatsappController],
  providers: [WhatsappService, AuditService],
  exports: [WhatsappService],
})
export class WhatsappModule {}
