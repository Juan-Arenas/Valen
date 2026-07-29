import json
import sqlite3
from pathlib import Path
from typing import Any, Dict, List, Optional

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "catalog.db"
JSON_SOURCE = BASE_DIR / "extracted_products.json"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    conn = get_connection()
    cursor = conn.cursor()
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


def _seed_from_json(conn: sqlite3.Connection) -> None:
    if not JSON_SOURCE.exists():
        return

    try:
        with JSON_SOURCE.open("r", encoding="utf-8") as f:
            products = json.load(f)
    except (json.JSONDecodeError, OSError):
        return

    cursor = conn.cursor()
    for product in products:
        cursor.execute(
            "INSERT INTO products (id, name, price, image, page, active) VALUES (?, ?, ?, ?, ?, ?)",
            (
                int(product.get("id", 0)) or None,
                str(product.get("name", "")).strip(),
                int(product.get("price", 0)),
                str(product.get("image", "")).strip(),
                int(product.get("page", 1)) if product.get("page") is not None else 1,
                1 if product.get("active", True) else 0,
            ),
        )
    conn.commit()


def _product_from_row(row: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": row["id"],
        "name": row["name"],
        "price": row["price"],
        "image": row["image"],
        "page": row["page"],
        "active": bool(row["active"]),
    }


def get_products(active_only: bool = True) -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    if active_only:
        cursor.execute("SELECT * FROM products WHERE active = 1 ORDER BY id ASC")
    else:
        cursor.execute("SELECT * FROM products ORDER BY id ASC")
    rows = cursor.fetchall()
    conn.close()
    return [_product_from_row(row) for row in rows]


def get_product(product_id: int) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM products WHERE id = ?", (product_id,))
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
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO products (name, price, image, page, active) VALUES (?, ?, ?, ?, ?)",
        (name.strip(), price, image.strip(), page, 1 if active else 0),
    )
    product_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return product_id


def update_product(product_id: int, **fields: Any) -> bool:
    allowed_fields = {"name", "price", "image", "page", "active"}
    updates = []
    values: List[Any] = []

    for key, value in fields.items():
        if key not in allowed_fields:
            continue
        if key == "name" or key == "image":
            value = str(value).strip()
        if key == "active":
            value = 1 if bool(value) else 0
        updates.append(f"{key} = ?")
        values.append(value)

    if not updates:
        return False

    values.append(product_id)
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute(f"UPDATE products SET {', '.join(updates)} WHERE id = ?", tuple(values))
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed


def set_product_state(product_id: int, active: bool) -> bool:
    return update_product(product_id, active=active)
