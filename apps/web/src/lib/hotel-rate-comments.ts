/** Short Arabic summary for long English Hotelbeds rate comments. */

export function summarizeRateCommentsAr(raw?: string): {
  summaryAr: string;
  original?: string;
} {
  const text = String(raw || "").trim();
  if (!text) return { summaryAr: "" };

  const lower = text.toLowerCase();
  const bits: string[] = [];

  if (/non[- ]?refundable|no refund|غير قابل/i.test(text)) {
    bits.push("غير قابل للاسترداد");
  } else if (/free cancellation|إلغاء مجاني/i.test(text)) {
    bits.push("إلغاء مجاني ضمن الشروط");
  }

  if (/no breakfast|room only|بدون إفطار/i.test(lower)) {
    bits.push("بدون إفطار");
  } else if (/breakfast included|includes breakfast|إفطار/i.test(lower)) {
    bits.push("يشمل الإفطار");
  }

  if (/pay at hotel|at the hotel|في الفندق/i.test(lower)) {
    bits.push("قد تُدفع رسوم في الفندق");
  }
  if (/city tax|tourist tax|resort fee|ضريبة/i.test(lower)) {
    bits.push("قد تُضاف ضريبة محلية");
  }
  if (/passport|id required|وثيقة/i.test(lower)) {
    bits.push("يُطلب إثبات هوية عند الوصول");
  }
  if (/deposit|تأمين/i.test(lower)) {
    bits.push("قد يُطلب تأمين عند الوصول");
  }

  if (!bits.length) {
    const short = text.length > 110 ? `${text.slice(0, 110).trim()}…` : text;
    return { summaryAr: short, original: text.length > 110 ? text : undefined };
  }

  return {
    summaryAr: bits.join(" · "),
    original: text,
  };
}
