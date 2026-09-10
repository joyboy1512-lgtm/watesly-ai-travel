import { Injectable } from "@nestjs/common";
import {
  createAiProvider,
  listToolAvailability,
  type AiChannel,
} from "@watesly-travel/ai-core";
import { TravelAiService } from "../ai/travel-ai.service";

@Injectable()
export class AssistantService {
  constructor(private readonly travelAi: TravelAiService) {}

  chat(input: {
    organizationId: string;
    userId?: string;
    channel: AiChannel;
    text: string;
    threadId?: string;
    contactId?: string;
    conversationId?: string;
    externalRef?: string;
  }) {
    return this.travelAi.turn(input);
  }

  thread(input: {
    organizationId: string;
    channel: AiChannel;
    userId?: string;
    threadId?: string;
    conversationId?: string;
    externalRef?: string;
    createIfMissing?: boolean;
  }) {
    return this.travelAi.getThread(input);
  }

  listThreads(organizationId: string, channel?: string) {
    return this.travelAi.listThreads(organizationId, channel);
  }

  createThread(input: {
    organizationId: string;
    userId?: string;
    channel?: AiChannel;
    title?: string;
    creditLimitUsd?: number | null;
  }) {
    return this.travelAi.createThread(input);
  }

  patchThread(input: {
    organizationId: string;
    threadId: string;
    title?: string;
    creditLimitUsd?: number | null;
    status?: "open" | "handed_off";
  }) {
    return this.travelAi.patchThread(input);
  }

  usage(organizationId: string) {
    return this.travelAi.listUsage(organizationId);
  }

  usageReport(
    organizationId: string,
    query?: { period?: string; from?: string; to?: string },
  ) {
    return this.travelAi.usageReport(organizationId, query);
  }

  getAiSettings(organizationId: string) {
    return this.travelAi.getAiSettings(organizationId);
  }

  setAiSettings(
    organizationId: string,
    input: { defaultThreadCreditUsd?: number | null },
  ) {
    return this.travelAi.setAiSettings(organizationId, input);
  }

  status() {
    const provider = createAiProvider();
    return {
      provider: provider.name,
      model:
        process.env.OPENAI_MODEL?.trim() ||
        (provider.name === "openai" ? "gpt-5.6-luna" : "mock-rules-v1"),
      tools: listToolAvailability(),
    };
  }
}
