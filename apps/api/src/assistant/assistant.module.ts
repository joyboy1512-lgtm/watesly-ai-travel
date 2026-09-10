import { Module } from "@nestjs/common";
import { AiModule } from "../ai/ai.module";
import { AssistantController } from "./assistant.controller";
import { AssistantService } from "./assistant.service";
import { VoiceAssistantService } from "./voice-assistant.service";

@Module({
  imports: [AiModule],
  controllers: [AssistantController],
  providers: [AssistantService, VoiceAssistantService],
  exports: [AssistantService, VoiceAssistantService],
})
export class AssistantModule {}
