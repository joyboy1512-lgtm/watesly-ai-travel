"""Sell-price rules for the Python trial. Base amounts stay in KWD."""

from __future__ import annotations

CHILD_NIGHT_KWD = 5.0


def markup_percent() -> float:
    from weekendgate.store import get_setting

    raw = get_setting("markup_percent", "0")
    try:
        value = float(raw)
    except (TypeError, ValueError):
        return 0.0
    if value < 0:
        return 0.0
    return min(value, 100.0)


def apply_markup(amount: float) -> float:
    percent = markup_percent()
    if not percent:
        return round(float(amount) + 1e-9, 3)
    return round(float(amount) * (1 + percent / 100) + 1e-9, 3)


def child_supplement(nights: int, children: int) -> float:
    return CHILD_NIGHT_KWD * max(0, nights) * max(0, children)


def quote_stay(per_night: float, nights: int, rooms: int, children: int = 0) -> float:
    base = float(per_night) * max(1, nights) * max(1, rooms)
    return apply_markup(base + child_supplement(nights, children))
