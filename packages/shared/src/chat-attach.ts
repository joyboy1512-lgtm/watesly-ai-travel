export type ChatAttachment = {
  kind: "image" | "file";
  name: string;
  url: string;
};

const ATTACH_RE =
  /<<attach kind="(image|file)" name="([^"]*)" url="([^"]+)">>/g;

function safeName(value: string) {
  return value.replace(/["<>]/g, "").slice(0, 120);
}

export function encodeChatAttachment(row: ChatAttachment): string {
  return `<<attach kind="${row.kind}" name="${safeName(row.name)}" url="${row.url}">>`;
}

export function parseChatAttachments(content: string): {
  text: string;
  attachments: ChatAttachment[];
} {
  const attachments: ChatAttachment[] = [];
  const text = String(content || "")
    .replace(ATTACH_RE, (_full, kind: string, name: string, url: string) => {
      attachments.push({
        kind: kind === "image" ? "image" : "file",
        name: name || "مرفق",
        url,
      });
      return "";
    })
    .trim();
  return { text, attachments };
}

export function chatTextForAi(content: string): string {
  const { text, attachments } = parseChatAttachments(content);
  const notes = attachments.map((row) =>
    row.kind === "image"
      ? `أرفق العميل صورة (${row.name}): ${row.url}`
      : `أرفق العميل ملفاً (${row.name}): ${row.url}`,
  );
  return [text, ...notes].filter(Boolean).join("\n");
}
