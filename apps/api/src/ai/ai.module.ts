import { Module } from "@nestjs/common";
import { TravelAiService } from "./travel-ai.service";

@Module({
  providers: [TravelAiService],
  exports: [TravelAiService],
})
export class AiModule {}
