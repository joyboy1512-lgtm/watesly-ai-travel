import { Module } from "@nestjs/common";
import { AssistantHoldService } from "./assistant-hold.service";
import { TravelAiService } from "./travel-ai.service";

@Module({
  providers: [TravelAiService, AssistantHoldService],
  exports: [TravelAiService, AssistantHoldService],
})
export class AiModule {}
