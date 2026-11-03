import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AuditService } from "../common/audit.service";
import { BotPipelineService } from "./bot-pipeline.service";
import { StaffSilenceReturnService } from "./staff-silence-return.service";

@Module({
  imports: [AiModule],
  providers: [BotPipelineService, StaffSilenceReturnService, AuditService],
  exports: [BotPipelineService],
})
export class PipelineModule {}
