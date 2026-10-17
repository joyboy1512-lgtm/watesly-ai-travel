"""Local sqlite store for accounts, travellers, and bookings."""

from __future__ import annotations

import hashlib
import json
import sqlite3
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
DB_PATH = ROOT / "data" / "weekendgate.sqlite"


def hash_password(password: str, salt: bytes | None = None) -> str:
    salt = salt or hashlib.sha256(password.encode("utf-8")).digest()[:16]
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return f"{salt.hex()}:{digest.hex()}"


def verify_password(password: str, stored: str) -> bool:
    try:
        salt_hex, digest_hex = stored.split(":", 1)
    except ValueError:
        return False
    salt = bytes.fromhex(salt_hex)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 120_000)
    return digest.hex() == digest_hex


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with connect() as conn:
        conn.executescript(
            """
            CREATE TABLE IF NOT EXISTS customers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              phone TEXT,
              password_hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS staff (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              name TEXT NOT NULL,
              email TEXT NOT NULL UNIQUE,
              role TEXT NOT NULL,
              password_hash TEXT NOT NULL
            );
            CREATE TABLE IF NOT EXISTS travelers (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              customer_id INTEGER NOT NULL,
              full_name TEXT NOT NULL,
              passport TEXT,
              dob TEXT,
              nationality TEXT
            );
            CREATE TABLE IF NOT EXISTS bookings (
              id INTEGER PRIMARY KEY AUTOINCREMENT,
              reference TEXT NOT NULL UNIQUE,
              customer_email TEXT,
              guest_name TEXT NOT NULL,
              phone TEXT,
              kind TEXT NOT NULL,
              title TEXT NOT NULL,
              details_json TEXT NOT NULL,
              total_kwd REAL NOT NULL,
              status TEXT NOT NULL,
              created_at TEXT NOT NULL
            );
            """
        )
        if not conn.execute("SELECT 1 FROM staff WHERE email = ?", ("demo@watesly.travel",)).fetchone():
            conn.execute(
                "INSERT INTO staff (name, email, role, password_hash) VALUES (?, ?, ?, ?)",
                ("Demo Admin", "demo@watesly.travel", "admin", hash_password("Demo1234!")),
            )
        if not conn.execute("SELECT 1 FROM customers WHERE email = ?", ("guest@watesly.travel",)).fetchone():
            conn.execute(
                "INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
                ("ضيف تجريبي", "guest@watesly.travel", "90053224", hash_password("Guest1234!")),
            )


def customer_by_email(email: str):
    with connect() as conn:
        return conn.execute("SELECT * FROM customers WHERE email = ?", (email.casefold(),)).fetchone()


def customer_by_id(customer_id: int):
    with connect() as conn:
        return conn.execute("SELECT * FROM customers WHERE id = ?", (customer_id,)).fetchone()


def register_customer(name: str, email: str, phone: str, password: str):
    with connect() as conn:
        conn.execute(
            "INSERT INTO customers (name, email, phone, password_hash) VALUES (?, ?, ?, ?)",
            (name.strip(), email.casefold().strip(), phone.strip(), hash_password(password)),
        )
        return conn.execute("SELECT * FROM customers WHERE email = ?", (email.casefold().strip(),)).fetchone()


def update_customer(customer_id: int, name: str, phone: str) -> None:
    with connect() as conn:
        conn.execute("UPDATE customers SET name = ?, phone = ? WHERE id = ?", (name.strip(), phone.strip(), customer_id))


def authenticate_customer(email: str, password: str):
    row = customer_by_email(email)
    if not row or not verify_password(password, row["password_hash"]):
        return None
    return row


def authenticate_staff(email: str, password: str):
    with connect() as conn:
        row = conn.execute("SELECT * FROM staff WHERE email = ?", (email.casefold().strip(),)).fetchone()
    if not row or not verify_password(password, row["password_hash"]):
        return None
    return row


def add_traveler(customer_id: int, full_name: str, passport: str, dob: str, nationality: str) -> None:
    with connect() as conn:
        conn.execute(
            "INSERT INTO travelers (customer_id, full_name, passport, dob, nationality) VALUES (?, ?, ?, ?, ?)",
            (customer_id, full_name.strip(), passport.strip(), dob.strip(), nationality.strip()),
        )


def travelers_for(customer_id: int):
    with connect() as conn:
        return conn.execute(
            "SELECT * FROM travelers WHERE customer_id = ? ORDER BY id DESC", (customer_id,)
        ).fetchall()


def next_reference(conn: sqlite3.Connection) -> str:
    row = conn.execute("SELECT COUNT(*) AS n FROM bookings").fetchone()
    return f"WG-{1001 + int(row['n'])}"


def create_booking(guest_name: str, email: str, phone: str, kind: str, title: str, details: dict, total_kwd: float):
    created = datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M UTC")
    with connect() as conn:
        reference = next_reference(conn)
        conn.execute(
            """
            INSERT INTO bookings
              (reference, customer_email, guest_name, phone, kind, title, details_json, total_kwd, status, created_at)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'confirmed', ?)
            """,
            (reference, email.casefold().strip(), guest_name.strip(), phone.strip(), kind, title, json.dumps(details, ensure_ascii=False), total_kwd, created),
        )
        return conn.execute("SELECT * FROM bookings WHERE reference = ?", (reference,)).fetchone()


def booking_by_reference(reference: str):
    with connect() as conn:
        return conn.execute("SELECT * FROM bookings WHERE reference = ?", (reference,)).fetchone()


def bookings_for_email(email: str):
    with connect() as conn:
        return conn.execute(
            "SELECT * FROM bookings WHERE customer_email = ? ORDER BY id DESC", (email.casefold(),)
        ).fetchall()


def all_bookings():
    with connect() as conn:
        return conn.execute("SELECT * FROM bookings ORDER BY id DESC").fetchall()


def all_customers():
    with connect() as conn:
        return conn.execute("SELECT id, name, email, phone FROM customers ORDER BY id").fetchall()
