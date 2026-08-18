const OPTION_MAP: Record<string, number> = {
  أ: 0,
  ا: 0,
  "a": 0,
  "1": 0,
  ب: 1,
  "b": 1,
  "2": 1,
  ج: 2,
  "c": 2,
  "3": 2,
  د: 3,
  "d": 3,
  "4": 3,
  ه: 4,
  هـ: 4,
  "e": 4,
  "5": 4,
};

export type InboundIntent =
  | { type: "handoff" }
  | { type: "accept"; optionIndex: number; confirmPriceChange: boolean }
  | { type: "chat"; text: string };

export function parseInboundIntent(rawText: string): InboundIntent {
  const text = rawText.trim();
  const lower = text.toLowerCase();
  const compact = text.replace(/\s+/g, "");

  if (
    /(موظف|بشري|خدمة\s*عملاء|human|agent|support)/i.test(text)
  ) {
    return { type: "handoff" };
  }

  const confirmPrice =
    /أؤكد\s*السعر|اؤكد\s*السعر|confirm\s*price|أؤكد|اؤكد/i.test(text);

  if (
    confirmPrice ||
    text.includes("أوافق") ||
    text.includes("اوافق") ||
    lower.includes("accept") ||
    /^[أاببججددهـهa-e1-5]$/i.test(compact)
  ) {
    let optionIndex = 0;

    for (const [key, index] of Object.entries(OPTION_MAP)) {
      if (
        compact === key ||
        compact.startsWith(key) ||
        text.includes(`الخيار ${key}`) ||
        text.includes(`خيار ${key}`)
      ) {
        optionIndex = index;
        break;
      }
    }

    const labeled = text.match(/[أاببججددهـهa-e1-5]/i);
    if (labeled?.[0]) {
      const mapped = OPTION_MAP[labeled[0]] ?? OPTION_MAP[labeled[0].toLowerCase()];
      if (typeof mapped === "number") optionIndex = mapped;
    }

    return {
      type: "accept",
      optionIndex,
      confirmPriceChange: confirmPrice,
    };
  }

  return { type: "chat", text };
}
