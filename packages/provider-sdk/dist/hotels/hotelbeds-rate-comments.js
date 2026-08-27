"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseRateCommentsId = parseRateCommentsId;
exports.fetchHotelbedsRateComments = fetchHotelbedsRateComments;
exports.rateCommentsFromHb = rateCommentsFromHb;
const hotelbeds_auth_1 = require("./hotelbeds-auth");
const cache = new Map();
const TTL_MS = 60 * 60 * 1000;
function parseRateCommentsId(id, fallbackDate) {
    const raw = String(id || "").trim();
    if (!raw)
        return null;
    const parts = raw.split(/[|#~/,;]+/).map((p) => p.trim()).filter(Boolean);
    const datePart = parts.find((p) => /^\d{4}-\d{2}-\d{2}$/.test(p) || /^\d{8}$/.test(p));
    const code = parts.find((p) => p !== datePart && /^\d+$/.test(p)) ||
        parts.find((p) => p !== datePart) ||
        parts[0];
    if (!code)
        return null;
    let date = datePart || fallbackDate || "";
    if (/^\d{8}$/.test(date)) {
        date = `${date.slice(0, 4)}-${date.slice(4, 6)}-${date.slice(6, 8)}`;
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
        return null;
    return { code, date };
}
function commentTextFromRow(row) {
    const chunks = [];
    if (typeof row.description === "string" && row.description.trim()) {
        chunks.push(row.description.trim());
    }
    else if (row.description && typeof row.description === "object") {
        const content = row.description.content?.trim();
        if (content)
            chunks.push(content);
    }
    for (const item of row.commentsByRate || []) {
        if (item.comment?.trim())
            chunks.push(item.comment.trim());
    }
    return [...new Set(chunks)].join("\n");
}
async function fetchOne(creds, code, date) {
    const cacheKey = `${code}|${date}`;
    const hit = cache.get(cacheKey);
    if (hit && Date.now() - hit.at < TTL_MS)
        return hit.text;
    const qs = new URLSearchParams({ code, date });
    const url = `${creds.baseUrl}/hotel-api/1.0/ratecommentdetails?${qs}`;
    const response = await fetch(url, { headers: (0, hotelbeds_auth_1.hotelbedsHeaders)(creds) });
    const json = (await response.json().catch(() => ({})));
    if (!response.ok) {
        cache.set(cacheKey, { text: "", at: Date.now() });
        return "";
    }
    const text = (json.rateComments || [])
        .map(commentTextFromRow)
        .filter(Boolean)
        .join("\n");
    cache.set(cacheKey, { text, at: Date.now() });
    return text;
}
async function fetchHotelbedsRateComments(creds, ids, fallbackDate, limit = 8) {
    const unique = [...new Set(ids.map((id) => String(id || "").trim()).filter(Boolean))].slice(0, limit);
    const out = {};
    for (const id of unique) {
        const parsed = parseRateCommentsId(id, fallbackDate);
        if (!parsed)
            continue;
        try {
            const text = await fetchOne(creds, parsed.code, parsed.date);
            if (text)
                out[id] = text;
        }
        catch {
            // best-effort — CheckRate comments remain the primary source
        }
    }
    return out;
}
function rateCommentsFromHb(value) {
    if (!value)
        return undefined;
    const text = Array.isArray(value) ? value.filter(Boolean).join("\n") : value;
    const trimmed = text.trim();
    return trimmed || undefined;
}
//# sourceMappingURL=hotelbeds-rate-comments.js.map