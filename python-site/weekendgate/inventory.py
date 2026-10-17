"""Sellable quantities for the local Python catalogue."""

from __future__ import annotations

import sqlite3

from weekendgate.catalog import ACTIVITIES, FLIGHTS, HOTELS, TRANSFERS
from weekendgate.store import connect

FLIGHT_SEATS = 9
ACTIVITY_PLACES = 20
TRANSFER_CARS = 8


def hotel_key(hotel_id: str, rate_id: str) -> str:
    return f"hotel:{hotel_id}:{rate_id}"


def flight_key(flight_id: str) -> str:
    return f"flight:{flight_id}"


def activity_key(activity_id: str) -> str:
    return f"activity:{activity_id}"


def transfer_key(transfer_id: str) -> str:
    return f"transfer:{transfer_id}"


def seed_stock() -> None:
    rows = []
    for hotel in HOTELS:
        for room in hotel["rooms"]:
            for rate in room["rates"]:
                rows.append((hotel_key(hotel["id"], rate["id"]), int(rate["allotment"])))
    for flight in FLIGHTS:
        rows.append((flight_key(flight["id"]), FLIGHT_SEATS))
    for activity in ACTIVITIES:
        rows.append((activity_key(activity["id"]), ACTIVITY_PLACES))
    for transfer in TRANSFERS:
        rows.append((transfer_key(transfer["id"]), TRANSFER_CARS))
    with connect() as conn:
        conn.executemany(
            "INSERT OR IGNORE INTO stock (item_key, qty) VALUES (?, ?)",
            rows,
        )


def available(key: str) -> int | None:
    """Live quantity, or None when this item has not been seeded."""
    try:
        with connect() as conn:
            row = conn.execute("SELECT qty FROM stock WHERE item_key = ?", (key,)).fetchone()
    except sqlite3.OperationalError:
        return None
    if not row:
        return None
    return int(row["qty"])


def set_stock(key: str, qty: int) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO stock (item_key, qty) VALUES (?, ?) ON CONFLICT(item_key) DO UPDATE SET qty = excluded.qty",
            (key, max(0, int(qty))),
        )


def low_stock(limit: int = 8):
    with connect() as conn:
        return conn.execute(
            "SELECT item_key, qty FROM stock WHERE qty <= 3 ORDER BY qty, item_key LIMIT ?",
            (limit,),
        ).fetchall()


def _merged(items: list[tuple[str, int]]) -> list[tuple[str, int]]:
    totals: dict[str, int] = {}
    for key, qty in items:
        qty = int(qty)
        if qty <= 0:
            continue
        totals[key] = totals.get(key, 0) + qty
    return list(totals.items())


def reserve(conn, items: list[tuple[str, int]]) -> bool:
    merged = _merged(items)
    for key, qty in merged:
        row = conn.execute("SELECT qty FROM stock WHERE item_key = ?", (key,)).fetchone()
        if not row or int(row["qty"]) < qty:
            return False
    for key, qty in merged:
        conn.execute("UPDATE stock SET qty = qty - ? WHERE item_key = ?", (qty, key))
    return True


def release(conn, items: list[tuple[str, int]]) -> None:
    for key, qty in items:
        qty = int(qty)
        if qty <= 0:
            continue
        conn.execute(
            "INSERT INTO stock (item_key, qty) VALUES (?, ?) ON CONFLICT(item_key) DO UPDATE SET qty = qty + excluded.qty",
            (key, qty),
        )
