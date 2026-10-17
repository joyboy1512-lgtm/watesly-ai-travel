"""Offline trip assistant. It routes a sentence to the matching search."""

from __future__ import annotations

from weekendgate.catalog import DESTINATIONS

_PLACES = []
for row in DESTINATIONS:
    _PLACES.append((row["code"], [row["code"].casefold(), row["city_en"].casefold(), row["city_ar"], row["country_en"].casefold(), row["country_ar"]]))

_HOTEL_WORDS = ("فندق", "فنادق", "hotel", "stay", "إقامة")
_FLIGHT_WORDS = ("طير", "flight", "طيران", "تذكر")
_ACTIVITY_WORDS = ("نشاط", "أنشطة", "activity", "tour", "جولة")
_TRANSFER_WORDS = ("توصيل", "نقل", "transfer", "سيارة", "airport")


def _place(text: str) -> str | None:
    folded = text.casefold()
    for code, names in _PLACES:
        if any(name and name in folded or name in text for name in names):
            return code
    return None


def reply(lang: str, text: str) -> dict:
    cleaned = (text or "").strip()
    if not cleaned:
        empty = "اكتب مدينة وما تحتاجه، مثل: فندق في دبي." if lang != "en" else "Name a city and a service, for example: hotel in Dubai."
        return {"text": empty, "href": None, "label": None}
    code = _place(cleaned)
    folded = cleaned.casefold()
    kind = "hotels"
    if any(word in cleaned or word in folded for word in _FLIGHT_WORDS):
        kind = "flights"
    elif any(word in cleaned or word in folded for word in _ACTIVITY_WORDS):
        kind = "activities"
    elif any(word in cleaned or word in folded for word in _TRANSFER_WORDS):
        kind = "transfers"
    elif any(word in cleaned or word in folded for word in _HOTEL_WORDS):
        kind = "hotels"
    if not code:
        text_out = "لم أتعرف على الوجهة. جرّب دبي، الكويت، إسطنبول، الدوحة، أو لندن." if lang != "en" else "I could not read a destination. Try Dubai, Kuwait, Istanbul, Doha, or London."
        return {"text": text_out, "href": None, "label": None}
    if kind == "flights":
        href = f"/flights/results?origin=KWI&destination={code}"
        label = "نتائج الطيران" if lang != "en" else "Flight results"
        body = f"جهّزت رحلات من الكويت إلى {code}." if lang != "en" else f"Flights from Kuwait to {code} are ready."
    elif kind == "activities":
        href = f"/activities/results?destination={code}"
        label = "الأنشطة" if lang != "en" else "Activities"
        body = f"هذه أنشطة {code}." if lang != "en" else f"Activities in {code}."
    elif kind == "transfers":
        href = f"/transfers/results?destination={code}"
        label = "التوصيل" if lang != "en" else "Transfers"
        body = f"خيارات التوصيل في {code}." if lang != "en" else f"Transfers in {code}."
    else:
        href = f"/hotels/results?destination={code}"
        label = "فنادق الوجهة" if lang != "en" else "Hotels"
        body = f"هذه فنادق {code} بعد تطبيق قواعد الترتيب." if lang != "en" else f"Hotels in {code}, ordered with the shop ranking."
    return {"text": body, "href": href, "label": label}
