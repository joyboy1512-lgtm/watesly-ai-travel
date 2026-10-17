"""Small HTML builder. Pages are assembled in Python, then escaped."""

from __future__ import annotations

from html import escape

VOID = {"input", "img", "br", "meta", "link", "source"}


def esc(value) -> str:
    return escape("" if value is None else str(value), quote=True)


def attrs(items: dict) -> str:
    parts = []
    for key, value in items.items():
        if value is None or value is False:
            continue
        name = key[:-1] if key.endswith("_") else key
        name = name.replace("_", "-")
        if value is True:
            parts.append(name)
        else:
            parts.append(f'{name}="{esc(value)}"')
    return (" " + " ".join(parts)) if parts else ""


def tag(name: str, *children, **kwargs) -> str:
    body = "".join(str(child) for child in children if child is not None)
    if name in VOID:
        return f"<{name}{attrs(kwargs)}>"
    return f"<{name}{attrs(kwargs)}>{body}</{name}>"
