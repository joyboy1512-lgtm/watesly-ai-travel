/** Count distinct {{n}} placeholders in template text (highest index used). */
export function countTemplateVariables(text: string): number {
  const matches = text.matchAll(/\{\{\s*(\d+)\s*\}\}/g);
  let max = 0;
  for (const m of matches) {
    const n = Number.parseInt(m[1] ?? "0", 10);
    if (n > max) max = n;
  }
  return max;
}

/** Append a {{n}} placeholder to template body text. */
export function appendTemplateVariable(body: string, n: number): string {
  const token = `{{${n}}}`;
  if (!body.trim()) return token;
  const sep = body.endsWith(" ") ? "" : " ";
  return `${body}${sep}${token}`;
}

/** Extract distinct {{name}} or {{n}} placeholders from template text. */
export function extractTemplateVars(text: string): string[] {
  const found = new Set<string>();
  for (const m of text.matchAll(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g)) {
    if (m[1]) found.add(m[1]);
  }
  return Array.from(found);
}

/** Simple preview: keep placeholders visible for the composer bubble. */
export function previewTemplateBody(text: string): string {
  return text.trim();
}
