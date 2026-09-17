type SendResult = {
  providerMessageId: string;
  status: "sent" | "queued" | "failed";
  mock: boolean;
  raw?: Record<string, unknown>;
};

function graphConfig() {
  return {
    version: process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0",
    base: process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com",
  };
}

function isMockToken(token?: string) {
  return !token || token.startsWith("mock");
}

async function postWhatsAppMessage(
  phoneNumberId: string,
  accessToken: string,
  payload: Record<string, unknown>,
): Promise<SendResult> {
  if (isMockToken(accessToken)) {
    return {
      providerMessageId: `mock_${Date.now()}`,
      status: "sent",
      mock: true,
      raw: payload,
    };
  }
  const { version, base } = graphConfig();
  const response = await fetch(`${base}/${version}/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ messaging_product: "whatsapp", ...payload }),
  });
  const raw = (await response.json().catch(() => ({}))) as {
    messages?: Array<{ id?: string }>;
    error?: { message?: string };
  };
  if (!response.ok) {
    return { providerMessageId: "", status: "failed", mock: false, raw };
  }
  return {
    providerMessageId: raw.messages?.[0]?.id || `wa_${Date.now()}`,
    status: "sent",
    mock: false,
    raw,
  };
}

export type SendProductInput = {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  catalogId: string;
  productRetailerId: string;
  body?: string;
};

export function buildSingleProductPayload(input: {
  to: string;
  catalogId: string;
  productRetailerId: string;
  body?: string;
}) {
  return {
    to: input.to,
    type: "interactive",
    interactive: {
      type: "product",
      body: { text: input.body || "اختر من الكتالوج" },
      action: {
        catalog_id: input.catalogId,
        product_retailer_id: input.productRetailerId,
      },
    },
  };
}

export function buildMultiProductPayload(input: {
  to: string;
  catalogId: string;
  header: string;
  body?: string;
  footer?: string;
  sectionTitle: string;
  productRetailerIds: string[];
}) {
  return {
    to: input.to,
    type: "interactive",
    interactive: {
      type: "product_list",
      header: { type: "text", text: input.header },
      body: { text: input.body || "تصفّح عروض WeekendGate" },
      ...(input.footer ? { footer: { text: input.footer } } : {}),
      action: {
        catalog_id: input.catalogId,
        sections: [
          {
            title: input.sectionTitle.slice(0, 24),
            product_items: input.productRetailerIds.slice(0, 30).map((id) => ({
              product_retailer_id: id,
            })),
          },
        ],
      },
    },
  };
}

export function buildCatalogCtaPayload(input: {
  to: string;
  body: string;
  button: string;
  url: string;
}) {
  return {
    to: input.to,
    type: "interactive",
    interactive: {
      type: "cta_url",
      body: { text: input.body },
      action: {
        name: "cta_url",
        parameters: {
          display_text: input.button,
          url: input.url,
        },
      },
    },
  };
}

export async function sendWhatsAppProductMessage(
  input: SendProductInput,
): Promise<SendResult> {
  return postWhatsAppMessage(
    input.phoneNumberId,
    input.accessToken,
    buildSingleProductPayload(input),
  );
}

export async function sendWhatsAppProductList(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  catalogId: string;
  header: string;
  body?: string;
  footer?: string;
  sectionTitle: string;
  productRetailerIds: string[];
}): Promise<SendResult> {
  return postWhatsAppMessage(
    input.phoneNumberId,
    input.accessToken,
    buildMultiProductPayload(input),
  );
}

export async function sendWhatsAppCatalogCta(input: {
  phoneNumberId: string;
  accessToken: string;
  to: string;
  body: string;
  button: string;
  url: string;
}): Promise<SendResult> {
  return postWhatsAppMessage(
    input.phoneNumberId,
    input.accessToken,
    buildCatalogCtaPayload(input),
  );
}

export type GraphCatalogProduct = {
  retailer_id: string;
  name: string;
  description?: string;
  availability?: string;
  condition?: string;
  price: string;
  currency: string;
  image_url: string;
  url?: string;
  brand?: string;
};

export async function upsertMetaCatalogProduct(input: {
  accessToken: string;
  catalogId: string;
  product: GraphCatalogProduct;
}): Promise<{ ok: boolean; mock: boolean; id?: string; error?: string; raw?: unknown }> {
  if (isMockToken(input.accessToken) || !input.catalogId) {
    return { ok: true, mock: true, id: `mock_${input.product.retailer_id}` };
  }
  const { version, base } = graphConfig();
  const response = await fetch(`${base}/${version}/${input.catalogId}/products`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      retailer_id: input.product.retailer_id,
      name: input.product.name,
      description: input.product.description,
      availability: input.product.availability || "in stock",
      condition: input.product.condition || "new",
      price: input.product.price,
      currency: input.product.currency,
      image_url: input.product.image_url,
      url: input.product.url,
      brand: input.product.brand || "WeekendGate",
      visibility: "published",
    }),
  });
  const raw = (await response.json().catch(() => ({}))) as {
    id?: string;
    error?: { message?: string };
  };
  if (!response.ok) {
    return { ok: false, mock: false, error: raw.error?.message || "فشل مزامنة المنتج", raw };
  }
  return { ok: true, mock: false, id: raw.id, raw };
}
