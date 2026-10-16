import { Module } from "@nestjs/common";
import { QuotesController } from "./quotes.controller";
import { QuotesService } from "./quotes.service";
import { PipelineModule } from "../pipeline/pipeline.module";
import { AuditService } from "../common/audit.service";

@Module({
  imports: [PipelineModule],
  controllers: [QuotesController],
  providers: [QuotesService, AuditService],
})
export class QuotesModule {}
