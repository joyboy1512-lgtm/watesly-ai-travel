import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AuditService } from "../common/audit.service";
import { BotPipelineService } from "./bot-pipeline.service";

@Module({
  imports: [AiModule],
  providers: [BotPipelineService, AuditService],
  exports: [BotPipelineService],
})
export class PipelineModule {}
