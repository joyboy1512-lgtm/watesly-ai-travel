function graphConfig() {
  return {
    version: process.env.WHATSAPP_GRAPH_API_VERSION || "v21.0",
    base: process.env.WHATSAPP_GRAPH_API_BASE || "https://graph.facebook.com",
  };
}

export async function downloadWhatsAppMedia(input: {
  mediaId: string;
  accessToken: string;
}): Promise<{ base64: string; mimeType: string } | null> {
  if (!input.mediaId || !input.accessToken || input.accessToken.startsWith("mock")) {
    return null;
  }
  const { version, base } = graphConfig();
  const metaResponse = await fetch(`${base}/${version}/${input.mediaId}`, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  if (!metaResponse.ok) return null;
  const meta = (await metaResponse.json().catch(() => ({}))) as {
    url?: string;
    mime_type?: string;
  };
  if (!meta.url) return null;
  const fileResponse = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${input.accessToken}` },
  });
  if (!fileResponse.ok) return null;
  const bytes = Buffer.from(await fileResponse.arrayBuffer());
  if (!bytes.length || bytes.length > 6_000_000) return null;
  return {
    base64: bytes.toString("base64"),
    mimeType: meta.mime_type || "image/jpeg",
  };
}
