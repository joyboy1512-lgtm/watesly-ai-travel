type SendResult = {
  providerMessageId: string;
  status: "sent" | "queued" | "failed";
  mock: boolean;
  raw?: Record<string, unknown>;
};

type InboundMessage = {
  phoneNumberId: string;
  from: string;
  contactName?: string;
  messageId: string;
  timestamp?: string;
  type: string;
  text?: string;
  channelType?: string;
  raw: Record<string, unknown>;
};

export type MessagingChannelType =
  | "whatsapp"
  | "telegram"
  | "instagram"
  | "messenger";

export const CHANNEL_TYPES: MessagingChannelType[] = [
  "whatsapp",
  "telegram",
  "instagram",
  "messenger",
];

const ID_PREFIX: Record<Exclude<MessagingChannelType, "whatsapp">, string> = {
  telegram: "tg_",
  messenger: "ms_",
  instagram: "ig_",
};

const PEER_PREFIX: Record<Exclude<MessagingChannelType, "whatsapp">, string> = {
  telegram: "tg:",
  messenger: "ms:",
  instagram: "ig:",
};

export function normalizeChannelType(value?: string | null): MessagingChannelType {
  const raw = (value || "whatsapp").trim().toLowerCase();
  if (raw === "telegram" || raw === "instagram" || raw === "messenger") {
    return raw;
  }
  return "whatsapp";
}

export function isMessagingChannelType(value?: string | null): boolean {
  const raw = (value || "").trim().toLowerCase();
  return CHANNEL_TYPES.includes(raw as MessagingChannelType);
}

export function usesCustomerServiceWindow(channelType?: string | null): boolean {
  const type = normalizeChannelType(channelType);
  return type === "whatsapp" || type === "messenger" || type === "instagram";
}

export function prefixChannelId(channelType: string, rawId: string): string {
  const type = normalizeChannelType(channelType);
  const trimmed = rawId.trim();
  if (!trimmed || type === "whatsapp") return trimmed;
  const prefix = ID_PREFIX[type];
  return trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
}

export function stripChannelId(channelType: string, storedId: string): string {
  const type = normalizeChannelType(channelType);
  if (type === "whatsapp") return storedId;
  const prefix = ID_PREFIX[type];
  return storedId.startsWith(prefix) ? storedId.slice(prefix.length) : storedId;
}

export function formatPeerId(channelType: string, rawId: string): string {
  const type = normalizeChannelType(channelType);
  const trimmed = String(rawId).trim();
  if (!trimmed || type === "whatsapp") return trimmed;
  const prefix = PEER_PREFIX[type];
  return trimmed.startsWith(prefix) ? trimmed : `${prefix}${trimmed}`;
}

export function channelPeerId(waId: string): string {
  const value = String(waId || "");
  if (value.startsWith("tg:") || value.startsWith("ms:") || value.startsWith("ig:")) {
    return value.slice(3);
  }
  return value;
}

export interface ChannelSendInput {
  channelType?: string | null;
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}

export interface ChannelMediaInput {
  channelType?: string | null;
  phoneNumberId: string;
  accessToken: string;
  to: string;
  type: "image" | "video" | "document";
  link: string;
  filename?: string;
  caption?: string;
}

export interface ChannelProbeResult {
  ok: boolean;
  mode: "mock" | "live";
  message: string;
  displayPhone?: string;
  channelName?: string;
  externalId?: string;
  username?: string;
  raw?: Record<string, unknown>;
}

function graphRoot(): string {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";
  const base =
    process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com";
  return `${base}/${graphVersion}`;
}

function isMockToken(token?: string | null): boolean {
  return !token || token.startsWith("mock");
}

function mockSend(extra: Record<string, unknown>): SendResult {
  return {
    providerMessageId: `mock_${Date.now()}`,
    status: "sent",
    mock: true,
    raw: extra,
  };
}

function failedSend(raw: Record<string, unknown>): SendResult {
  return {
    providerMessageId: "",
    status: "failed",
    mock: false,
    raw,
  };
}

type TelegramApiResult = {
  ok?: boolean;
  description?: string;
  result?: Record<string, unknown>;
};

async function telegramCall(
  token: string,
  method: string,
  body?: Record<string, unknown>,
): Promise<{ ok: boolean; status: number; raw: TelegramApiResult }> {
  const url = `https://api.telegram.org/bot${token}/${method}`;
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  const raw = (await response.json().catch(() => ({}))) as TelegramApiResult;
  return { ok: Boolean(raw.ok) && response.ok, status: response.status, raw };
}

export async function telegramGetMe(token: string): Promise<{
  ok: boolean;
  message: string;
  id?: number;
  username?: string;
  firstName?: string;
  raw?: Record<string, unknown>;
}> {
  const { ok, raw } = await telegramCall(token, "getMe");
  const result = (raw.result || {}) as {
    id?: number;
    username?: string;
    first_name?: string;
  };
  if (!ok || !result.id) {
    return {
      ok: false,
      message: raw.description || "فشل التحقق من بوت تلجرام",
      raw: raw as Record<string, unknown>,
    };
  }
  return {
    ok: true,
    message: result.username ? `@${result.username}` : `bot ${result.id}`,
    id: result.id,
    username: result.username,
    firstName: result.first_name,
    raw: raw as Record<string, unknown>,
  };
}

export async function setTelegramWebhook(
  token: string,
  url: string,
  secretToken?: string,
): Promise<{ ok: boolean; message: string }> {
  const { ok, raw } = await telegramCall(token, "setWebhook", {
    url,
    secret_token: secretToken || undefined,
    drop_pending_updates: false,
  });
  return {
    ok,
    message: ok
      ? "تم ضبط Webhook تلجرام"
      : raw.description || "فشل ضبط Webhook تلجرام",
  };
}

async function graphGet(
  accessToken: string,
  id: string,
  fields: string,
): Promise<{ ok: boolean; raw: Record<string, unknown>; message?: string }> {
  const url = `${graphRoot()}/${id}?fields=${encodeURIComponent(fields)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const raw = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    [key: string]: unknown;
  };
  if (!response.ok) {
    return {
      ok: false,
      raw,
      message: raw.error?.message || "فشل التحقق عبر Graph API",
    };
  }
  return { ok: true, raw };
}

async function graphPost(
  accessToken: string,
  path: string,
  body: Record<string, unknown>,
): Promise<{ ok: boolean; raw: Record<string, unknown> }> {
  const url = `${graphRoot()}/${path}`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const raw = (await response.json().catch(() => ({}))) as Record<string, unknown>;
  return { ok: response.ok, raw };
}

export async function probeChannel(input: {
  channelType?: string | null;
  phoneNumberId: string;
  accessToken: string;
}): Promise<ChannelProbeResult> {
  const type = normalizeChannelType(input.channelType);
  if (isMockToken(input.accessToken)) {
    return {
      ok: true,
      mode: "mock",
      message: "الحساب يعمل بوضع تجريبي (mock). الإرسال المحلي ناجح دون اتصال خارجي.",
      externalId: input.phoneNumberId,
    };
  }

  try {
    if (type === "telegram") {
      const me = await telegramGetMe(input.accessToken);
      if (!me.ok) {
        return {
          ok: false,
          mode: "live",
          message: me.message,
          raw: me.raw,
        };
      }
      return {
        ok: true,
        mode: "live",
        message: `الاتصال ناجح · بوت ${me.message}`,
        displayPhone: me.username ? `@${me.username}` : undefined,
        channelName: me.firstName,
        username: me.username,
        externalId: me.id ? String(me.id) : undefined,
        raw: me.raw,
      };
    }

    const externalId = stripChannelId(type, input.phoneNumberId);
    const fields =
      type === "instagram"
        ? "id,username,name"
        : type === "messenger"
          ? "id,name,fan_count"
          : "display_phone_number,verified_name";
    const result = await graphGet(input.accessToken, externalId, fields);
    if (!result.ok) {
      return {
        ok: false,
        mode: "live",
        message: result.message || "فشل التحقق",
        raw: result.raw,
      };
    }
    const name =
      (result.raw.verified_name as string | undefined) ||
      (result.raw.name as string | undefined) ||
      (result.raw.username as string | undefined);
    const display =
      (result.raw.display_phone_number as string | undefined) ||
      (result.raw.username ? `@${result.raw.username}` : undefined);
    return {
      ok: true,
      mode: "live",
      message: `الاتصال ناجح${name ? ` · ${name}` : ""}`,
      displayPhone: display,
      channelName: name,
      externalId,
      username: result.raw.username as string | undefined,
      raw: result.raw,
    };
  } catch (error) {
    return {
      ok: false,
      mode: "live",
      message:
        error instanceof Error ? error.message : "تعذر الاتصال بمزوّد القناة",
    };
  }
}

export async function sendTelegramText(input: {
  accessToken: string;
  to: string;
  body: string;
}): Promise<SendResult> {
  if (isMockToken(input.accessToken)) {
    return mockSend({ channel: "telegram", to: input.to, body: input.body });
  }
  const { ok, raw } = await telegramCall(input.accessToken, "sendMessage", {
    chat_id: channelPeerId(input.to),
    text: input.body,
  });
  const result = (raw.result || {}) as { message_id?: number };
  if (!ok) return failedSend(raw as Record<string, unknown>);
  return {
    providerMessageId: result.message_id
      ? String(result.message_id)
      : `tg_${Date.now()}`,
    status: "sent",
    mock: false,
    raw: raw as Record<string, unknown>,
  };
}

export async function sendMessengerText(input: {
  pageId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<SendResult> {
  if (isMockToken(input.accessToken)) {
    return mockSend({ channel: "messenger", to: input.to, body: input.body });
  }
  const { ok, raw } = await graphPost(
    input.accessToken,
    `${stripChannelId("messenger", input.pageId)}/messages`,
    {
      recipient: { id: channelPeerId(input.to) },
      messaging_type: "RESPONSE",
      message: { text: input.body },
    },
  );
  if (!ok) return failedSend(raw);
  const messageId =
    (raw.message_id as string | undefined) || `ms_${Date.now()}`;
  return { providerMessageId: messageId, status: "sent", mock: false, raw };
}

export async function sendInstagramText(input: {
  igUserId: string;
  accessToken: string;
  to: string;
  body: string;
}): Promise<SendResult> {
  if (isMockToken(input.accessToken)) {
    return mockSend({ channel: "instagram", to: input.to, body: input.body });
  }
  const { ok, raw } = await graphPost(
    input.accessToken,
    `${stripChannelId("instagram", input.igUserId)}/messages`,
    {
      recipient: { id: channelPeerId(input.to) },
      message: { text: input.body },
    },
  );
  if (!ok) return failedSend(raw);
  const messageId =
    (raw.message_id as string | undefined) || `ig_${Date.now()}`;
  return { providerMessageId: messageId, status: "sent", mock: false, raw };
}

export async function sendTelegramMedia(input: {
  accessToken: string;
  to: string;
  type: "image" | "video" | "document";
  link: string;
  filename?: string;
  caption?: string;
}): Promise<SendResult> {
  if (isMockToken(input.accessToken)) {
    return mockSend({
      channel: "telegram",
      to: input.to,
      type: input.type,
      link: input.link,
    });
  }
  const chatId = channelPeerId(input.to);
  const method =
    input.type === "image"
      ? "sendPhoto"
      : input.type === "video"
        ? "sendVideo"
        : "sendDocument";
  const payload: Record<string, unknown> = {
    chat_id: chatId,
    caption: input.caption || undefined,
  };
  if (method === "sendPhoto") payload.photo = input.link;
  else if (method === "sendVideo") payload.video = input.link;
  else {
    payload.document = input.link;
    if (input.filename) payload.caption = input.caption || input.filename;
  }
  const { ok, raw } = await telegramCall(input.accessToken, method, payload);
  const result = (raw.result || {}) as { message_id?: number };
  if (!ok) return failedSend(raw as Record<string, unknown>);
  return {
    providerMessageId: result.message_id
      ? String(result.message_id)
      : `tg_${Date.now()}`,
    status: "sent",
    mock: false,
    raw: raw as Record<string, unknown>,
  };
}

export async function sendMetaMessagingMedia(input: {
  channelType: "messenger" | "instagram";
  phoneNumberId: string;
  accessToken: string;
  to: string;
  type: "image" | "video" | "document";
  link: string;
}): Promise<SendResult> {
  if (isMockToken(input.accessToken)) {
    return mockSend({
      channel: input.channelType,
      to: input.to,
      type: input.type,
      link: input.link,
    });
  }
  const attachmentType =
    input.type === "document" ? "file" : input.type;
  const { ok, raw } = await graphPost(
    input.accessToken,
    `${stripChannelId(input.channelType, input.phoneNumberId)}/messages`,
    {
      recipient: { id: channelPeerId(input.to) },
      messaging_type: input.channelType === "messenger" ? "RESPONSE" : undefined,
      message: {
        attachment: {
          type: attachmentType,
          payload: { url: input.link, is_reusable: true },
        },
      },
    },
  );
  if (!ok) return failedSend(raw);
  const messageId =
    (raw.message_id as string | undefined) || `${input.channelType}_${Date.now()}`;
  return { providerMessageId: messageId, status: "sent", mock: false, raw };
}

type TelegramMessage = {
  message_id?: number;
  text?: string;
  caption?: string;
  photo?: unknown[];
  video?: { file_id?: string };
  document?: { file_name?: string };
  from?: {
    id?: number;
    first_name?: string;
    last_name?: string;
    username?: string;
  };
  chat?: { id?: number };
};

export function parseTelegramUpdate(payload: unknown): InboundMessage[] {
  const root = payload as {
    update_id?: number;
    message?: TelegramMessage;
    edited_message?: TelegramMessage;
    callback_query?: {
      id?: string;
      data?: string;
      from?: TelegramMessage["from"];
      message?: TelegramMessage;
    };
  };

  const results: InboundMessage[] = [];
  const msg = root.message || root.edited_message;

  if (msg?.chat?.id != null) {
    const from = msg.from;
    const name = [from?.first_name, from?.last_name]
      .filter(Boolean)
      .join(" ") || from?.username;
    let type = "text";
    let text = msg.text || msg.caption;
    if (!text) {
      if (msg.photo?.length) {
        type = "image";
        text = "[صورة]";
      } else if (msg.video) {
        type = "video";
        text = "[فيديو]";
      } else if (msg.document) {
        type = "document";
        text = msg.document.file_name
          ? `[مستند] ${msg.document.file_name}`
          : "[مستند]";
      } else {
        return results;
      }
    }
    results.push({
      phoneNumberId: "",
      from: String(msg.chat.id),
      contactName: name,
      messageId: String(msg.message_id ?? root.update_id ?? Date.now()),
      type,
      text,
      channelType: "telegram",
      raw: msg as unknown as Record<string, unknown>,
    });
    return results;
  }

  if (root.callback_query?.from?.id != null) {
    const cq = root.callback_query;
    const from = cq.from!;
    const name = [from.first_name, from.last_name]
      .filter(Boolean)
      .join(" ");
    results.push({
      phoneNumberId: "",
      from: String(from.id),
      contactName: name || from.username,
      messageId: `cb_${cq.id || Date.now()}`,
      type: "callback",
      text: cq.data,
      channelType: "telegram",
      raw: cq as unknown as Record<string, unknown>,
    });
  }

  return results;
}

export function parseMetaMessagingWebhook(
  payload: unknown,
): InboundMessage[] {
  const root = payload as {
    object?: string;
    entry?: Array<{
      id?: string;
      messaging?: Array<{
        sender?: { id?: string };
        recipient?: { id?: string };
        timestamp?: number;
        message?: {
          mid?: string;
          text?: string;
          is_echo?: boolean;
          attachments?: Array<{ type?: string }>;
        };
        postback?: { title?: string; payload?: string; mid?: string };
      }>;
    }>;
  };

  const channelType =
    root.object === "instagram" ? "instagram" : "messenger";
  const results: InboundMessage[] = [];

  for (const entry of root.entry ?? []) {
    for (const event of entry.messaging ?? []) {
      if (event.message?.is_echo) continue;
      const from = event.sender?.id;
      const recipientId = event.recipient?.id || entry.id;
      if (!from || !recipientId) continue;

      let text: string | undefined;
      let type = "text";
      let messageId = "";

      if (event.message) {
        messageId = event.message.mid || `meta_${Date.now()}`;
        if (event.message.text) {
          text = event.message.text;
        } else if (event.message.attachments?.length) {
          const att = event.message.attachments[0];
          type = att?.type || "attachment";
          text =
            att?.type === "image"
              ? "[صورة]"
              : att?.type === "video"
                ? "[فيديو]"
                : "[مرفق]";
        } else {
          continue;
        }
      } else if (event.postback) {
        messageId = event.postback.mid || `postback_${Date.now()}`;
        text = event.postback.title || event.postback.payload;
        type = "postback";
      } else {
        continue;
      }

      results.push({
        phoneNumberId: recipientId,
        from,
        messageId,
        timestamp: event.timestamp
          ? String(Math.floor(Number(event.timestamp) / 1000))
          : undefined,
        type,
        text,
        channelType,
        raw: event as unknown as Record<string, unknown>,
      });
    }
  }

  return results;
}

export function metaWebhookObject(
  payload: unknown,
): "whatsapp" | "page" | "instagram" | "unknown" {
  const object = (payload as { object?: string } | null)?.object;
  if (object === "whatsapp_business_account") return "whatsapp";
  if (object === "page") return "page";
  if (object === "instagram") return "instagram";
  if (
    payload &&
    typeof payload === "object" &&
    "entry" in payload &&
    Array.isArray((payload as { entry?: unknown }).entry)
  ) {
    return "whatsapp";
  }
  return "unknown";
}
