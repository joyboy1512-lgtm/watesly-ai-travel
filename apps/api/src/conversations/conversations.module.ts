import { Module } from "@nestjs/common";
import { ConversationsController } from "./conversations.controller";
import { PipelineModule } from "../pipeline/pipeline.module";
import { AuditService } from "../common/audit.service";

@Module({
  imports: [PipelineModule],
  controllers: [ConversationsController],
  providers: [AuditService],
})
export class ConversationsModule {}
