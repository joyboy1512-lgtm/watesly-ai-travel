"""The trial sells through one Python source. A live supplier can implement the same calls later."""

from __future__ import annotations


class LocalCatalog:
    code = "local"
    label_ar = "كتالوج بايثون المحلي"
    label_en = "Local Python catalogue"

    def connected(self) -> bool:
        return True


def active_source() -> LocalCatalog:
    return LocalCatalog()
