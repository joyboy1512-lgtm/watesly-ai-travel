"""Shop money. Same rules as the published site: base KWD, Latin digits, ISO code."""

from __future__ import annotations

CURRENCIES = ("KWD", "SAR", "AED", "BHD", "OMR", "QAR", "USD", "EUR")

# 1 KWD → target. Mirrors packages/shared/src/platform/currency.ts
KWD_TO = {
    "KWD": 1.0,
    "USD": 3.26,
    "EUR": 3.01,
    "SAR": 12.23,
    "AED": 11.97,
    "BHD": 1.23,
    "OMR": 1.25,
    "QAR": 11.87,
}

FRACTION = {
    "KWD": 3,
    "BHD": 3,
    "OMR": 3,
    "USD": 2,
    "EUR": 2,
    "SAR": 2,
    "AED": 2,
    "QAR": 2,
}


def convert_kwd(amount_kwd: float, currency: str) -> float:
    code = currency if currency in KWD_TO else "KWD"
    return amount_kwd * KWD_TO[code]


def format_kwd(amount_kwd: float, currency: str = "KWD") -> str:
    """Format a KWD major amount in the selected currency.

    Digits stay Western (0-9) for every language. The ISO code follows the number.
    """
    code = currency if currency in KWD_TO else "KWD"
    frac = FRACTION[code]
    major = convert_kwd(amount_kwd, code)
    rounded = round(major + 1e-12, frac)
    formatted = f"{rounded:,.{frac}f}"
    return f"{formatted} {code}"
