/** Meta Graph helpers for WhatsApp health, webhooks, and message templates. */

export const GRAPH_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0";
export const GRAPH_BASE =
  process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com";

export const TIER_DAILY_LIMITS: Record<string, number | null> = {
  TIER_50: 50,
  TIER_250: 250,
  TIER_1K: 1_000,
  TIER_2K: 2_000,
  TIER_10K: 10_000,
  TIER_100K: 100_000,
  TIER_UNLIMITED: null,
};

export const QUALITY_LABELS_AR: Record<string, string> = {
  GREEN: "ممتاز",
  YELLOW: "متوسط — راقب الحملات",
  RED: "منخفض — قلّل الإرسال",
  UNKNOWN: "غير معروف",
};

const TEMPLATE_NAME_RE = /[^a-z0-9_]/g;
const BODY_VAR_RE = /\{\{(\d+)\}\}/g;

export function graphRoot(): string {
  return `${GRAPH_BASE.replace(/\/$/, "")}/${GRAPH_VERSION}`;
}

export function isMockToken(token?: string | null): boolean {
  return !token || token.startsWith("mock");
}

export function tierToDailyLimit(tier?: string | null): number | null | undefined {
  if (!tier) return undefined;
  const key = tier.toUpperCase().trim();
  if (key in TIER_DAILY_LIMITS) return TIER_DAILY_LIMITS[key];
  if (/^\d+$/.test(key)) return Number(key);
  return undefined;
}

export function formatTierHint(tier?: string | null, limit?: number | null): string {
  if (tier === "TIER_UNLIMITED" || (tier && limit == null && tier.toUpperCase() === "TIER_UNLIMITED")) {
    return "TIER_UNLIMITED: بدون حد يومي عملي";
  }
  if (tier && limit != null) return `${tier}: حتى ${limit.toLocaleString()} محادثة فريدة/24س`;
  if (limit != null) return `حتى ${limit.toLocaleString()} محادثة فريدة/24س`;
  if (tier) return `${tier}: لم يُعرف الحد الرقمي بعد`;
  return "لم تُزامَن الحدود من Meta بعد — اضغط مزامنة";
}

export function resolveEffectiveNameStatus(
  nameStatus?: string | null,
  newNameStatus?: string | null,
): string | null {
  const old = nameStatus ? String(nameStatus).toUpperCase() : null;
  const next = newNameStatus ? String(newNameStatus).toUpperCase() : null;
  if (next === "APPROVED" || old === "APPROVED") return "APPROVED";
  if (next === "PENDING" || old === "PENDING") return "PENDING";
  if (old === "DECLINED") return "DECLINED";
  return next || old;
}

export type PhoneHealth = {
  displayPhoneNumber?: string;
  verifiedName?: string;
  qualityRating?: string;
  messagingLimitTier?: string;
  messagingLimit?: number | null;
  metaPhoneStatus?: string;
  metaNameStatus?: string | null;
  metaNewNameStatus?: string;
};

export type WabaHealth = {
  metaAccountReviewStatus?: string;
  metaCanSendMessage?: string;
};

export type AccountHealth = PhoneHealth &
  WabaHealth & {
    metaStatusMessage: string;
    derivedStatus: "connected" | "disconnected" | "suspended";
    mock: boolean;
  };

export function parsePhoneHealth(data: Record<string, unknown>): PhoneHealth {
  const tierRaw =
    data.whatsapp_business_manager_messaging_limit ??
    data.messaging_limit_tier ??
    data.messaging_limit;
  let tierStr =
    tierRaw != null && String(tierRaw).trim()
      ? String(tierRaw).toUpperCase().trim()
      : undefined;
  let numericLimit: number | undefined;
  if (tierStr && /^\d+$/.test(tierStr)) {
    numericLimit = Number(tierStr);
    tierStr = undefined;
  }
  const quality = data.quality_rating;
  const limit =
    numericLimit != null ? numericLimit : tierToDailyLimit(tierStr ?? null);
  return {
    displayPhoneNumber:
      typeof data.display_phone_number === "string"
        ? data.display_phone_number
        : undefined,
    verifiedName:
      typeof data.verified_name === "string" ? data.verified_name : undefined,
    qualityRating: quality ? String(quality).toUpperCase() : undefined,
    messagingLimitTier: tierStr,
    messagingLimit: limit === undefined ? undefined : limit,
    metaPhoneStatus: data.status ? String(data.status).toUpperCase() : undefined,
    metaNameStatus: resolveEffectiveNameStatus(
      data.name_status as string | undefined,
      data.new_name_status as string | undefined,
    ),
    metaNewNameStatus: data.new_name_status
      ? String(data.new_name_status).toUpperCase()
      : undefined,
  };
}

export function parseWabaHealth(data: Record<string, unknown>): WabaHealth {
  const review = data.account_review_status;
  const health =
    data.health_status && typeof data.health_status === "object"
      ? (data.health_status as Record<string, unknown>)
      : {};
  let canSend = health.can_send_message;
  const entities = Array.isArray(health.entities) ? health.entities : [];
  for (const entity of entities) {
    if (
      entity &&
      typeof entity === "object" &&
      (entity as { entity_type?: string }).entity_type === "WABA"
    ) {
      canSend =
        (entity as { can_send_message?: unknown }).can_send_message || canSend;
      break;
    }
  }
  return {
    metaAccountReviewStatus: review ? String(review).toUpperCase() : undefined,
    metaCanSendMessage: canSend ? String(canSend).toUpperCase() : undefined,
  };
}

export function buildMetaStatusMessage(input: {
  metaPhoneStatus?: string | null;
  metaNameStatus?: string | null;
  metaCanSendMessage?: string | null;
  metaAccountReviewStatus?: string | null;
}): string {
  const issues: string[] = [];
  const canSend = (input.metaCanSendMessage || "").toUpperCase();
  const nameStatus = (input.metaNameStatus || "").toUpperCase();
  const phoneStatus = (input.metaPhoneStatus || "").toUpperCase();
  const reviewStatus = (input.metaAccountReviewStatus || "").toUpperCase();

  if (canSend === "BLOCKED") issues.push("Meta تعطّل الإرسال على هذا الحساب");
  else if (canSend === "LIMITED") issues.push("Meta يقيّد الإرسال حالياً");
  if (nameStatus === "DECLINED") {
    issues.push("اسم العرض مرفوض — قد يظهر «معطّلاً» في Business Manager");
  } else if (nameStatus === "PENDING") {
    issues.push("اسم العرض قيد مراجعة Meta");
  }
  if (phoneStatus && phoneStatus !== "CONNECTED") {
    issues.push(`حالة الرقم في Meta: ${phoneStatus}`);
  }
  if (reviewStatus && reviewStatus !== "APPROVED") {
    issues.push(`مراجعة WABA: ${reviewStatus}`);
  }
  return issues.length ? issues.join(" · ") : "متاح — متطابق مع Meta";
}

export function deriveAccountStatus(input: {
  metaPhoneStatus?: string | null;
  metaCanSendMessage?: string | null;
  metaNameStatus?: string | null;
  authError?: boolean;
}): "connected" | "disconnected" | "suspended" {
  if (input.authError) return "disconnected";
  const canSend = (input.metaCanSendMessage || "").toUpperCase();
  const phoneStatus = (input.metaPhoneStatus || "").toUpperCase();
  const nameStatus = (input.metaNameStatus || "").toUpperCase();
  if (canSend === "BLOCKED" || nameStatus === "DECLINED") return "suspended";
  if (phoneStatus && phoneStatus !== "CONNECTED") return "disconnected";
  return "connected";
}

export function isTokenAuthError(status: number, raw?: Record<string, unknown>): boolean {
  if (status === 401 || status === 403) return true;
  const error =
    raw?.error && typeof raw.error === "object"
      ? (raw.error as { code?: number })
      : {};
  return error.code === 190 || error.code === 102 || error.code === 10;
}

export type GraphResult = {
  ok: boolean;
  status: number;
  raw: Record<string, unknown>;
  message?: string;
};

async function graphRequest(
  method: "GET" | "POST" | "DELETE",
  path: string,
  accessToken: string,
  body?: Record<string, unknown>,
): Promise<GraphResult> {
  const url = path.startsWith("http")
    ? path
    : `${graphRoot()}/${path.replace(/^\//, "")}`;
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const raw = (await response.json().catch(() => ({}))) as {
    error?: { message?: string };
    [key: string]: unknown;
  };
  return {
    ok: response.ok,
    status: response.status,
    raw,
    message: raw.error?.message,
  };
}

export async function debugAccessToken(input: {
  accessToken: string;
  appId?: string;
  appSecret?: string;
}): Promise<{
  valid: boolean;
  mock: boolean;
  expiresAt?: string;
  scopes?: string[];
  error?: string;
  authError?: boolean;
}> {
  if (isMockToken(input.accessToken)) {
    return { valid: true, mock: true, scopes: ["whatsapp_business_messaging"] };
  }
  const appId = input.appId || process.env.WHATSAPP_APP_ID;
  const appSecret = input.appSecret || process.env.WHATSAPP_APP_SECRET;
  if (!appId || !appSecret) {
    const phone = await graphRequest(
      "GET",
      `debug_token?input_token=${encodeURIComponent(input.accessToken)}`,
      input.accessToken,
    );
    if (!phone.ok) {
      return {
        valid: false,
        mock: false,
        error: phone.message || "تعذر التحقق من التوكن",
        authError: isTokenAuthError(phone.status, phone.raw),
      };
    }
    return { valid: true, mock: false };
  }
  const appToken = `${appId}|${appSecret}`;
  const result = await graphRequest(
    "GET",
    `debug_token?input_token=${encodeURIComponent(input.accessToken)}`,
    appToken,
  );
  const data =
    result.raw.data && typeof result.raw.data === "object"
      ? (result.raw.data as {
          is_valid?: boolean;
          expires_at?: number;
          scopes?: string[];
        })
      : {};
  if (!result.ok || data.is_valid === false) {
    return {
      valid: false,
      mock: false,
      error: result.message || "التوكن غير صالح",
      authError: isTokenAuthError(result.status, result.raw),
    };
  }
  return {
    valid: true,
    mock: false,
    expiresAt: data.expires_at
      ? new Date(data.expires_at * 1000).toISOString()
      : undefined,
    scopes: data.scopes,
  };
}

export async function fetchPhoneHealth(input: {
  accessToken: string;
  phoneNumberId: string;
}): Promise<GraphResult> {
  return graphRequest(
    "GET",
    `${input.phoneNumberId}?fields=display_phone_number,verified_name,quality_rating,messaging_limit_tier,whatsapp_business_manager_messaging_limit,status,name_status,new_name_status`,
    input.accessToken,
  );
}

export async function fetchWabaHealth(input: {
  accessToken: string;
  wabaId: string;
}): Promise<GraphResult> {
  return graphRequest(
    "GET",
    `${input.wabaId}?fields=account_review_status,health_status`,
    input.accessToken,
  );
}

export function mockAccountHealth(input?: {
  displayPhone?: string;
  channelName?: string;
}): AccountHealth {
  return {
    displayPhoneNumber: input?.displayPhone,
    verifiedName: input?.channelName || "WeekendGate (تجريبي)",
    qualityRating: "GREEN",
    messagingLimitTier: "TIER_250",
    messagingLimit: 250,
    metaPhoneStatus: "CONNECTED",
    metaNameStatus: "APPROVED",
    metaAccountReviewStatus: "APPROVED",
    metaCanSendMessage: "AVAILABLE",
    metaStatusMessage: "متاح — وضع تجريبي (mock)",
    derivedStatus: "connected",
    mock: true,
  };
}

export async function syncAccountHealth(input: {
  accessToken: string;
  phoneNumberId: string;
  wabaId?: string | null;
  displayPhone?: string;
  channelName?: string;
}): Promise<AccountHealth> {
  if (isMockToken(input.accessToken)) {
    return mockAccountHealth({
      displayPhone: input.displayPhone,
      channelName: input.channelName,
    });
  }

  const phone = await fetchPhoneHealth({
    accessToken: input.accessToken,
    phoneNumberId: input.phoneNumberId,
  });
  if (!phone.ok) {
    const authError = isTokenAuthError(phone.status, phone.raw);
    return {
      ...mockAccountHealth(),
      mock: false,
      qualityRating: undefined,
      messagingLimitTier: undefined,
      messagingLimit: undefined,
      metaStatusMessage: authError
        ? "تعذر المصادقة مع Meta — تحقق من Access Token"
        : phone.message || "فشل مزامنة صحة الحساب",
      derivedStatus: authError ? "disconnected" : "disconnected",
    };
  }

  const phoneParsed = parsePhoneHealth(phone.raw);
  let wabaParsed: WabaHealth = {};
  if (input.wabaId) {
    const waba = await fetchWabaHealth({
      accessToken: input.accessToken,
      wabaId: input.wabaId,
    });
    if (waba.ok) wabaParsed = parseWabaHealth(waba.raw);
  }

  const metaStatusMessage = buildMetaStatusMessage({
    metaPhoneStatus: phoneParsed.metaPhoneStatus,
    metaNameStatus: phoneParsed.metaNameStatus,
    metaCanSendMessage: wabaParsed.metaCanSendMessage,
    metaAccountReviewStatus: wabaParsed.metaAccountReviewStatus,
  });
  return {
    ...phoneParsed,
    ...wabaParsed,
    metaStatusMessage,
    derivedStatus: deriveAccountStatus({
      metaPhoneStatus: phoneParsed.metaPhoneStatus,
      metaCanSendMessage: wabaParsed.metaCanSendMessage,
      metaNameStatus: phoneParsed.metaNameStatus,
    }),
    mock: false,
  };
}

export async function subscribeWabaWebhook(input: {
  accessToken: string;
  wabaId: string;
}): Promise<{ ok: boolean; mock: boolean; message: string; raw?: Record<string, unknown> }> {
  if (isMockToken(input.accessToken) || !input.wabaId) {
    return {
      ok: true,
      mock: true,
      message: "تم تسجيل Webhook تجريبياً (mock)",
    };
  }
  const result = await graphRequest(
    "POST",
    `${input.wabaId}/subscribed_apps`,
    input.accessToken,
    {},
  );
  return {
    ok: result.ok,
    mock: false,
    message: result.ok
      ? "تم اشتراك التطبيق على Webhook واتساب"
      : result.message || "فشل اشتراك Webhook",
    raw: result.raw,
  };
}

export async function fetchWabaSubscribedApps(input: {
  accessToken: string;
  wabaId: string;
}): Promise<{ ok: boolean; mock: boolean; subscribed: boolean; message: string }> {
  if (isMockToken(input.accessToken) || !input.wabaId) {
    return {
      ok: true,
      mock: true,
      subscribed: true,
      message: "Webhook تجريبي جاهز",
    };
  }
  const result = await graphRequest(
    "GET",
    `${input.wabaId}/subscribed_apps`,
    input.accessToken,
  );
  const data = Array.isArray(result.raw.data) ? result.raw.data : [];
  return {
    ok: result.ok,
    mock: false,
    subscribed: result.ok && data.length > 0,
    message: result.ok
      ? data.length
        ? "التطبيق مشترك في Webhook"
        : "لا يوجد اشتراك Webhook — اضغط ضمان الويب هوك"
      : result.message || "تعذر قراءة حالة Webhook",
  };
}

export function normalizeTemplateName(name: string): string {
  const normalized = name
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
    .replace(TEMPLATE_NAME_RE, "")
    .replace(/_+/g, "_")
    .replace(/^_+|_+$/g, "");
  if (!normalized) {
    throw new Error("اسم القالب غير صالح");
  }
  return normalized.slice(0, 512);
}

export type LocalTemplateInput = {
  name: string;
  body: string;
  language?: string;
  category?: string;
  header?: string | null;
  footer?: string | null;
  headerType?: string | null;
  headerMediaUrl?: string | null;
};

export function buildMetaTemplateComponents(input: LocalTemplateInput): Record<string, unknown>[] {
  const components: Record<string, unknown>[] = [];
  const headerType = (input.headerType || "text").toLowerCase();
  if (headerType === "text" && input.header?.trim()) {
    components.push({ type: "HEADER", format: "TEXT", text: input.header.trim() });
  } else if (
    (headerType === "image" || headerType === "video" || headerType === "document") &&
    input.headerMediaUrl
  ) {
    components.push({
      type: "HEADER",
      format: headerType.toUpperCase(),
      example: { header_handle: [input.headerMediaUrl] },
    });
  }

  const bodyText = input.body.trim();
  const body: Record<string, unknown> = { type: "BODY", text: bodyText };
  const vars = [...bodyText.matchAll(BODY_VAR_RE)].map((m) => Number(m[1]));
  if (vars.length) {
    const count = Math.max(...vars);
    body.example = { body_text: [Array.from({ length: count }, () => "مثال")] };
  }
  components.push(body);

  if (input.footer?.trim()) {
    components.push({ type: "FOOTER", text: input.footer.trim().slice(0, 60) });
  }
  return components;
}

export type MetaTemplate = {
  id?: string;
  name: string;
  language: string;
  status: string;
  category?: string;
  components?: unknown[];
};

export async function createMessageTemplate(input: {
  accessToken: string;
  wabaId: string;
  template: LocalTemplateInput;
}): Promise<{
  ok: boolean;
  mock: boolean;
  id?: string;
  status: string;
  name: string;
  error?: string;
  raw?: Record<string, unknown>;
}> {
  const name = normalizeTemplateName(input.template.name);
  if (isMockToken(input.accessToken) || !input.wabaId) {
    return {
      ok: true,
      mock: true,
      id: `mock_tpl_${Date.now()}`,
      status: "PENDING",
      name,
    };
  }
  const result = await graphRequest(
    "POST",
    `${input.wabaId}/message_templates`,
    input.accessToken,
    {
      name,
      language: input.template.language || "ar",
      category: (input.template.category || "MARKETING").toUpperCase(),
      components: buildMetaTemplateComponents(input.template),
    },
  );
  if (!result.ok) {
    return {
      ok: false,
      mock: false,
      status: "REJECTED",
      name,
      error: result.message || "فشل إرسال القالب إلى ميتا",
      raw: result.raw,
    };
  }
  return {
    ok: true,
    mock: false,
    id: typeof result.raw.id === "string" ? result.raw.id : undefined,
    status: String(result.raw.status || "PENDING").toUpperCase(),
    name,
    raw: result.raw,
  };
}

export async function listMessageTemplates(input: {
  accessToken: string;
  wabaId: string;
}): Promise<{ ok: boolean; mock: boolean; items: MetaTemplate[]; error?: string }> {
  if (isMockToken(input.accessToken) || !input.wabaId) {
    return { ok: true, mock: true, items: [] };
  }
  const items: MetaTemplate[] = [];
  let path: string | null =
    `${input.wabaId}/message_templates?limit=100&fields=id,name,language,status,category,components`;
  for (let page = 0; page < 10 && path; page += 1) {
    const result = await graphRequest("GET", path, input.accessToken);
    if (!result.ok) {
      return {
        ok: false,
        mock: false,
        items,
        error: result.message || "فشل جلب القوالب من ميتا",
      };
    }
    const data = Array.isArray(result.raw.data) ? result.raw.data : [];
    for (const row of data) {
      if (!row || typeof row !== "object") continue;
      const item = row as Record<string, unknown>;
      if (!item.name || !item.language) continue;
      items.push({
        id: typeof item.id === "string" ? item.id : undefined,
        name: String(item.name),
        language: String(item.language),
        status: String(item.status || "PENDING").toLowerCase(),
        category: item.category ? String(item.category).toLowerCase() : undefined,
        components: Array.isArray(item.components) ? item.components : undefined,
      });
    }
    const paging =
      result.raw.paging && typeof result.raw.paging === "object"
        ? (result.raw.paging as { next?: string })
        : {};
    path = paging.next || null;
  }
  return { ok: true, mock: false, items };
}

export async function deleteMessageTemplate(input: {
  accessToken: string;
  wabaId: string;
  templateName: string;
}): Promise<{ ok: boolean; mock: boolean }> {
  if (isMockToken(input.accessToken) || !input.wabaId) {
    return { ok: true, mock: true };
  }
  const result = await graphRequest(
    "DELETE",
    `${input.wabaId}/message_templates?name=${encodeURIComponent(input.templateName)}`,
    input.accessToken,
  );
  return { ok: result.ok, mock: false };
}

export type CommerceReadiness = {
  ready: boolean;
  mock: boolean;
  catalogId?: string;
  catalogName?: string;
  whatsappLinked: boolean;
  issues: string[];
};

export async function inspectCommerceCatalog(input: {
  accessToken: string;
  catalogId?: string | null;
}): Promise<CommerceReadiness> {
  const issues: string[] = [];
  if (!input.catalogId) {
    issues.push("أدخل معرّف كتالوج ميتا من Commerce Manager");
    return { ready: false, mock: isMockToken(input.accessToken), whatsappLinked: false, issues };
  }
  if (isMockToken(input.accessToken)) {
    return {
      ready: true,
      mock: true,
      catalogId: input.catalogId,
      catalogName: "كتالوج تجريبي",
      whatsappLinked: true,
      issues: [],
    };
  }
  const result = await graphRequest(
    "GET",
    `${input.catalogId}?fields=id,name,product_count,vertical`,
    input.accessToken,
  );
  if (!result.ok) {
    issues.push(result.message || "تعذر قراءة الكتالوج من ميتا");
    return {
      ready: false,
      mock: false,
      catalogId: input.catalogId,
      whatsappLinked: false,
      issues,
    };
  }
  return {
    ready: true,
    mock: false,
    catalogId: input.catalogId,
    catalogName: typeof result.raw.name === "string" ? result.raw.name : undefined,
    whatsappLinked: true,
    issues: [],
  };
}
