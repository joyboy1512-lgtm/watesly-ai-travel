export interface WhatsAppInboundMessage {
  phoneNumberId: string;
  from: string;
  contactName?: string;
  messageId: string;
  timestamp?: string;
  type: string;
  text?: string;
  raw: Record<string, unknown>;
}

export interface WhatsAppStatusUpdate {
  phoneNumberId: string;
  messageId: string;
  status: string;
  timestamp?: string;
  recipientId?: string;
  errors?: unknown[];
  raw: Record<string, unknown>;
}

export interface SendTextInput {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
}

export interface TemplateComponent {
  type: "header" | "body" | "footer" | "button";
  parameters?: Array<{ type: string; text?: string; [key: string]: unknown }>;
  [key: string]: unknown;
}

export interface SendTemplateInput {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  templateName: string;
  language?: string;
  components?: TemplateComponent[];
}

export interface SendResult {
  providerMessageId: string;
  status: "sent" | "queued" | "failed";
  mock: boolean;
  raw?: Record<string, unknown>;
}

export function verifyWebhookChallenge(input: {
  mode?: string;
  token?: string;
  challenge?: string;
  verifyToken: string;
}): string | null {
  if (input.mode === "subscribe" && input.token === input.verifyToken && input.challenge) {
    return input.challenge;
  }
  return null;
}

function extractMessageText(message: {
  type?: string;
  text?: { body?: string };
  image?: { caption?: string };
  video?: { caption?: string };
  document?: { caption?: string; filename?: string };
  audio?: { id?: string };
  button?: { text?: string; payload?: string };
  interactive?: {
    button_reply?: { title?: string; id?: string };
    list_reply?: { title?: string; id?: string };
  };
}): string | undefined {
  if (message.text?.body) return message.text.body;
  if (message.button?.text) return message.button.text;
  if (message.interactive?.button_reply?.title) {
    return message.interactive.button_reply.title;
  }
  if (message.interactive?.list_reply?.title) {
    return message.interactive.list_reply.title;
  }
  if (message.image?.caption) return message.image.caption;
  if (message.video?.caption) return message.video.caption;
  if (message.document?.caption) return message.document.caption;
  if (message.document?.filename) return `[مستند] ${message.document.filename}`;
  if (message.type === "image") return "[صورة]";
  if (message.type === "audio") return "[رسالة صوتية]";
  if (message.type === "video") return "[فيديو]";
  if (message.type === "sticker") return "[ملصق]";
  return undefined;
}

export function parseInboundWebhook(payload: unknown): WhatsAppInboundMessage[] {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          contacts?: Array<{
            wa_id?: string;
            profile?: { name?: string };
          }>;
          messages?: Array<{
            from?: string;
            id?: string;
            timestamp?: string;
            type?: string;
            text?: { body?: string };
            image?: { caption?: string };
            video?: { caption?: string };
            document?: { caption?: string; filename?: string };
            audio?: { id?: string };
            button?: { text?: string; payload?: string };
            interactive?: {
              button_reply?: { title?: string; id?: string };
              list_reply?: { title?: string; id?: string };
            };
          }>;
        };
      }>;
    }>;
  };

  const results: WhatsAppInboundMessage[] = [];

  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.messages) continue;

      const nameByWa = new Map(
        (value.contacts ?? [])
          .filter((c) => c.wa_id)
          .map((c) => [c.wa_id!, c.profile?.name || c.wa_id!]),
      );

      for (const message of value.messages) {
        if (!message.from || !message.id) continue;
        results.push({
          phoneNumberId,
          from: message.from,
          contactName: nameByWa.get(message.from),
          messageId: message.id,
          timestamp: message.timestamp,
          type: message.type || "text",
          text: extractMessageText(message),
          raw: message as unknown as Record<string, unknown>,
        });
      }
    }
  }

  return results;
}

/** Parse Meta delivery/read/failed status callbacks. */
export function parseStatusWebhook(payload: unknown): WhatsAppStatusUpdate[] {
  const root = payload as {
    entry?: Array<{
      changes?: Array<{
        value?: {
          metadata?: { phone_number_id?: string };
          statuses?: Array<{
            id?: string;
            status?: string;
            timestamp?: string;
            recipient_id?: string;
            errors?: unknown[];
          }>;
        };
      }>;
    }>;
  };

  const results: WhatsAppStatusUpdate[] = [];
  for (const entry of root.entry ?? []) {
    for (const change of entry.changes ?? []) {
      const value = change.value;
      const phoneNumberId = value?.metadata?.phone_number_id;
      if (!phoneNumberId || !value?.statuses) continue;
      for (const st of value.statuses) {
        if (!st.id || !st.status) continue;
        results.push({
          phoneNumberId,
          messageId: st.id,
          status: st.status,
          timestamp: st.timestamp,
          recipientId: st.recipient_id,
          errors: st.errors,
          raw: st as unknown as Record<string, unknown>,
        });
      }
    }
  }
  return results;
}

export async function sendWhatsAppText(input: SendTextInput): Promise<SendResult> {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";
  const base =
    process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com";

  if (!input.accessToken || input.accessToken.startsWith("mock")) {
    return {
      providerMessageId: `mock_${Date.now()}`,
      status: "sent",
      mock: true,
      raw: { to: input.to, body: input.body },
    };
  }

  const url = `${base}/${graphVersion}/${input.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "text",
      text: { body: input.body },
    }),
  });

  const raw = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      providerMessageId: "",
      status: "failed",
      mock: false,
      raw,
    };
  }

  return {
    providerMessageId: raw.messages?.[0]?.id || `wa_${Date.now()}`,
    status: "sent",
    mock: false,
    raw,
  };
}

export async function sendWhatsAppTemplate(
  input: SendTemplateInput,
): Promise<SendResult> {
  const graphVersion = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";
  const base =
    process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com";

  if (!input.accessToken || input.accessToken.startsWith("mock")) {
    return {
      providerMessageId: `mock_${Date.now()}`,
      status: "sent",
      mock: true,
      raw: {
        to: input.to,
        templateName: input.templateName,
        language: input.language || "ar",
      },
    };
  }

  const url = `${base}/${graphVersion}/${input.phoneNumberId}/messages`;
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: input.to,
      type: "template",
      template: {
        name: input.templateName,
        language: { code: input.language || "ar" },
        ...(input.components?.length
          ? { components: input.components }
          : {}),
      },
    }),
  });

  const raw = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };

  if (!response.ok) {
    return {
      providerMessageId: "",
      status: "failed",
      mock: false,
      raw,
    };
  }

  return {
    providerMessageId: raw.messages?.[0]?.id || `wa_${Date.now()}`,
    status: "sent",
    mock: false,
    raw,
  };
}
