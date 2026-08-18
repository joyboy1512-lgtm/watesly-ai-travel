import { Fragment, type ReactNode } from "react";
import { parseChatAttachments } from "@watesly-travel/shared";

type ChatOfferBodyProps = {
  content: string;
  role?: string;
};

const ICON_LINE =
  /^([\p{Extended_Pictographic}\uFE0F\u200D🔹🔸✅➡️⬅️•\-–—⭐✨📍✈️💼💰🗓️⏰🏨🛏🗺]+)\s+(.*)$/u;
const NUM_LINE = /^(\d{1,2}[.)\-])\s+(.*)$/;
const PRICE_HINT = /سعر|د\.?\s*ك|KWD|USD|\$|€|💰/;
const CTA_HINT =
  /هل تريد|هل ترغب|اكتب[:：]|المزيد|تثبيت|احجز|اختيار|حوّل|موظف|أكد|أكدّ/;
const LABEL_HINT = /مواعيد|الأمتعة|الخدمات|المسافات|الغرف|السفر والعودة|الإقلاع/;

function isCta(text: string) {
  const t = text.trim();
  return t.endsWith("؟") || t.endsWith("?") || CTA_HINT.test(t);
}

function renderInline(text: string, keyPrefix: string): ReactNode {
  const parts = text.split(/(\*[^*\n]+\*)/g);
  return parts.map((part, index) => {
    if (part.startsWith("*") && part.endsWith("*") && part.length > 1) {
      return <strong key={`${keyPrefix}-b-${index}`}>{part.slice(1, -1)}</strong>;
    }
    return <Fragment key={`${keyPrefix}-t-${index}`}>{part}</Fragment>;
  });
}

export function ChatOfferBody({ content, role }: ChatOfferBodyProps) {
  const parsed = parseChatAttachments(content);
  const body = parsed.text || (parsed.attachments.length ? "" : content);

  const media = parsed.attachments.length ? (
    <div className="ta-attach-list">
      {parsed.attachments.map((row) =>
        row.kind === "image" ? (
          <a key={row.url} href={row.url} target="_blank" rel="noreferrer" className="ta-attach-image">
            <img src={row.url} alt={row.name} />
            <span>{row.name}</span>
          </a>
        ) : (
          <a key={row.url} href={row.url} target="_blank" rel="noreferrer" className="ta-attach-file">
            📎 {row.name}
          </a>
        ),
      )}
    </div>
  ) : null;

  if (role === "user") {
    return (
      <>
        {media}
        {body ? <p className="ta-user-text">{body}</p> : null}
      </>
    );
  }

  const lines = body.replace(/\r/g, "").split("\n");
  if (!body.trim()) {
    return <div className="ta-offer">{media}</div>;
  }
  let sawHead = false;

  return (
    <div className="ta-offer">
      {media}
      {lines.map((raw, index) => {
        const line = raw.trimEnd();
        if (!line.trim()) {
          return <div key={`g-${index}`} className="ta-offer-gap" />;
        }
        if (/^[—\-–_]{2,}$/.test(line.trim())) {
          return <hr key={`d-${index}`} className="ta-offer-rule" />;
        }

        const num = line.match(NUM_LINE);
        const icon = line.match(ICON_LINE);
        const mark = num?.[1] ?? icon?.[1];
        const body = (num?.[2] ?? icon?.[2] ?? line).trim();
        const price = PRICE_HINT.test(body) || (icon?.[1] || "").includes("💰");
        const cta = isCta(body) && !price;
        const label = LABEL_HINT.test(body) && /[:：]$/.test(body.trim());
        const route = body.includes("✈️") || /^\(.*\)$/.test(body);
        const head = !sawHead && Boolean(mark) && !price && !cta && !label;
        if (head) sawHead = true;

        if (!mark) {
          return (
            <p
              key={`l-${index}`}
              className={`ta-offer-p${cta ? " cta" : ""}${price ? " price" : ""}`}
            >
              {renderInline(body, `${index}`)}
            </p>
          );
        }

        const className = [
          "ta-offer-row",
          head ? "head" : "",
          price ? "price" : "",
          cta ? "cta" : "",
          label ? "label" : "",
          route ? "route" : "",
        ]
          .filter(Boolean)
          .join(" ");

        return (
          <div key={`l-${index}`} className={className}>
            {mark ? <span className="ta-offer-ico">{mark}</span> : <span className="ta-offer-ico" />}
            <span className="ta-offer-txt">{renderInline(body, `${index}`)}</span>
          </div>
        );
      })}
    </div>
  );
}
