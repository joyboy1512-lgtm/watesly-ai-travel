import { Module } from "@nestjs/common";
import { InquiriesController } from "./inquiries.controller";
import { PipelineModule } from "../pipeline/pipeline.module";

@Module({
  imports: [PipelineModule],
  controllers: [InquiriesController],
})
export class InquiriesModule {}
