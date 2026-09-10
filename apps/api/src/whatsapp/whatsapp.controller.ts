import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  Post,
  Query,
  Req,
  Res,
  type RawBodyRequest,
} from "@nestjs/common";
import type { Request, Response } from "express";
import { CurrentUser, Public, RequirePermissions } from "../auth/decorators";
import type { AuthUser } from "../auth/auth.types";
import { WhatsappService } from "./whatsapp.service";

@Controller("whatsapp")
export class WhatsappController {
  constructor(private readonly whatsapp: WhatsappService) {}

  @Public()
  @Get("webhook")
  verify(
    @Query()
    query: {
      "hub.mode"?: string;
      "hub.verify_token"?: string;
      "hub.challenge"?: string;
    },
    @Res() res: Response,
  ) {
    const challenge = this.whatsapp.verify(query);
    return res.status(200).send(challenge);
  }

  @Public()
  @Post("webhook")
  async webhook(
    @Req() req: RawBodyRequest<Request>,
    @Body() body: unknown,
    @Headers("x-hub-signature-256") signature?: string,
  ) {
    const raw =
      req.rawBody ||
      Buffer.from(JSON.stringify(body ?? {}), "utf8");
    this.whatsapp.verifySignature(raw, signature);
    try {
      return await this.whatsapp.handleWebhook(body);
    } catch (error) {
      // Acknowledge to Meta even on unexpected failures.
      // eslint-disable-next-line no-console
      console.error("[whatsapp.webhook]", error);
      return { ok: false };
    }
  }

  @Public()
  @Post("telegram/webhook/:accountId")
  async telegramWebhook(
    @Param("accountId") accountId: string,
    @Body() body: unknown,
    @Headers("x-telegram-bot-api-secret-token") secret?: string,
  ) {
    try {
      return await this.whatsapp.handleTelegramWebhook(
        accountId,
        body,
        secret,
      );
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error("[telegram.webhook]", error);
      return { ok: false };
    }
  }

  @Get("accounts")
  @RequirePermissions("whatsapp.manage")
  list(@CurrentUser() user: AuthUser) {
    return this.whatsapp.listAccounts(user.organizationId);
  }

  @Post("accounts")
  @RequirePermissions("whatsapp.manage")
  upsert(
    @CurrentUser() user: AuthUser,
    @Body()
    body: {
      phoneNumberId?: string;
      businessAccountId?: string;
      displayPhone?: string;
      accessToken?: string;
      status?: string;
      channelName?: string;
      channelType?: string;
      isDefault?: boolean;
    },
  ) {
    return this.whatsapp.upsertAccount(user.organizationId, body, user.userId);
  }

  @Delete("accounts/:id")
  @RequirePermissions("whatsapp.manage")
  remove(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.whatsapp.deleteAccount(user.organizationId, id, user.userId);
  }

  @Post("accounts/:id/set-default")
  @RequirePermissions("whatsapp.manage")
  setDefault(@CurrentUser() user: AuthUser, @Param("id") id: string) {
    return this.whatsapp.setDefaultAccount(
      user.organizationId,
      id,
      user.userId,
    );
  }

  @Post("simulate")
  @RequirePermissions("conversations.reply")
  simulate(
    @CurrentUser() user: AuthUser,
    @Body() body: { waId: string; text: string; name?: string },
  ) {
    return this.whatsapp.simulateInbound(user.organizationId, body, user.userId);
  }

  @Post("accounts/:id/test")
  @RequirePermissions("whatsapp.manage")
  testConnection(
    @CurrentUser() user: AuthUser,
    @Param("id") id: string,
  ) {
    return this.whatsapp.testConnection(user.organizationId, id);
  }
}
