import json
import os
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

try:
    import psycopg
    from psycopg.rows import dict_row
except ImportError:  # pragma: no cover
    psycopg = None

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "catalog.db"
JSON_SOURCE = BASE_DIR / "extracted_products.json"
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
USE_POSTGRES = bool(DATABASE_URL)


def _get_connection():
    if USE_POSTGRES:
        if psycopg is None:
            raise RuntimeError("psycopg[binary] is required when DATABASE_URL is set.")
        return psycopg.connect(DATABASE_URL, row_factory=dict_row)

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def _placeholder() -> str:
    return "%s" if USE_POSTGRES else "?"


def _active_true() -> Any:
    return True if USE_POSTGRES else 1


def _active_false() -> Any:
    return False if USE_POSTGRES else 0


def init_db() -> None:
    conn = _get_connection()
    cursor = conn.cursor()

    if USE_POSTGRES:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL DEFAULT 0,
                image TEXT NOT NULL DEFAULT '',
                page INTEGER DEFAULT 1,
                active BOOLEAN NOT NULL DEFAULT TRUE
            )
            """
        )
    else:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL DEFAULT 0,
                image TEXT NOT NULL DEFAULT '',
                page INTEGER DEFAULT 1,
                active INTEGER NOT NULL DEFAULT 1
            )
            """
        )

    conn.commit()

    if cursor.execute("SELECT COUNT(*) FROM products").fetchone()[0] == 0:
        _seed_from_json(conn)
    conn.close()


def _seed_from_json(conn) -> None:
    if not JSON_SOURCE.exists():
        return

    try:
        with JSON_SOURCE.open("r", encoding="utf-8") as f:
            products = json.load(f)
    except (json.JSONDecodeError, OSError):
        return

    cursor = conn.cursor()
    placeholder = _placeholder()
    for product in products:
        product_id = int(product.get("id", 0)) or None
        name = str(product.get("name", "")).strip()
        price = int(product.get("price", 0))
        image = str(product.get("image", "")).strip()
        page = int(product.get("page", 1)) if product.get("page") is not None else 1
        active = _active_true() if product.get("active", True) else _active_false()

        if product_id is not None:
            query = (
                f"INSERT INTO products (id, name, price, image, page, active) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})"
            )
            cursor.execute(query, (product_id, name, price, image, page, active))
        else:
            query = (
                f"INSERT INTO products (name, price, image, page, active) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})"
            )
            cursor.execute(query, (name, price, image, page, active))

    conn.commit()


def _product_from_row(row) -> Dict[str, Any]:
    if row is None:
        return {}
    return {
        "id": row["id"],
        "name": row["name"],
        "price": row["price"],
        "image": row["image"],
        "page": row["page"],
        "active": bool(row["active"]),
    }


def get_products(active_only: bool = True) -> List[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    if active_only:
        if USE_POSTGRES:
            cursor.execute("SELECT * FROM products WHERE active = TRUE ORDER BY id ASC")
        else:
            cursor.execute("SELECT * FROM products WHERE active = 1 ORDER BY id ASC")
    else:
        cursor.execute("SELECT * FROM products ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [_product_from_row(row) for row in rows]


def get_product(product_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = " + _placeholder(), (product_id,))
    row = cursor.fetchone()
    conn.close()
    return _product_from_row(row) if row else None


def create_product(
    name: str,
    price: int,
    image: str,
    page: int = 1,
    active: bool = True,
) -> int:
    conn = _get_connection()
    cursor = conn.cursor()
    placeholder = _placeholder()
    active_value = _active_true() if active else _active_false()
    if USE_POSTGRES:
        cursor.execute(
            f"INSERT INTO products (name, price, image, page, active) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}) RETURNING id",
            (name.strip(), price, image.strip(), page, active_value),
        )
        product_id = cursor.fetchone()["id"]
    else:
        cursor.execute(
            f"INSERT INTO products (name, price, image, page, active) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})",
            (name.strip(), price, image.strip(), page, active_value),
        )
        product_id = cursor.lastrowid

    conn.commit()
    conn.close()
    return product_id


def update_product(product_id: int, **fields: Any) -> bool:
    allowed_fields = {"name", "price", "image", "page", "active"}
    updates = []
    values: List[Any] = []
    placeholder = _placeholder()

    for key, value in fields.items():
        if key not in allowed_fields:
            continue
        if key in {"name", "image"}:
            value = str(value).strip()
        if key == "active":
            value = _active_true() if bool(value) else _active_false()
        updates.append(f"{key} = {placeholder}")
        values.append(value)

    if not updates:
        return False

    values.append(product_id)
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE products SET {', '.join(updates)} WHERE id = {placeholder}", tuple(values))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed


def set_product_state(product_id: int, active: bool) -> bool:
    return update_product(product_id, active=active)
