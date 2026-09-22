import hashlib
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

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

BASE_DIR = Path(__file__).resolve().parent
DB_FILE = BASE_DIR / "catalog.db"
JSON_SOURCE = BASE_DIR / "extracted_products.json"
DATABASE_URL = os.environ.get("DATABASE_URL", "").strip()
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "2006").strip() or "2006"

# Dynamic flag to track if PostgreSQL is currently working
_POSTGRES_ACTIVE = False


def _check_postgres_working() -> bool:
    global _POSTGRES_ACTIVE
    if not DATABASE_URL or psycopg is None:
        _POSTGRES_ACTIVE = False
        return False
    try:
        conn = psycopg.connect(DATABASE_URL, connect_timeout=3)
        conn.close()
        _POSTGRES_ACTIVE = True
        return True
    except Exception as e:
        print(f"[db.py] PostgreSQL unavailable ({e}). Falling back to local SQLite.")
        _POSTGRES_ACTIVE = False
        return False


# Check on startup
_check_postgres_working()


def get_database_backend() -> str:
    return "postgres" if _POSTGRES_ACTIVE else "sqlite"


def _get_connection():
    global _POSTGRES_ACTIVE
    if _POSTGRES_ACTIVE:
        try:
            return psycopg.connect(DATABASE_URL, row_factory=dict_row)
        except Exception as e:
            print(f"[db.py] Error connecting to PostgreSQL ({e}), falling back to SQLite.")
            _POSTGRES_ACTIVE = False

    conn = sqlite3.connect(DB_FILE)
    conn.row_factory = sqlite3.Row
    return conn


def _placeholder() -> str:
    return "%s" if _POSTGRES_ACTIVE else "?"


def _active_true() -> Any:
    return True if _POSTGRES_ACTIVE else 1


def _active_false() -> Any:
    return False if _POSTGRES_ACTIVE else 0


def _hash_password(password: str) -> str:
    return hashlib.sha256(password.encode("utf-8")).hexdigest()


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
        "category_id": row.get("category_id") if isinstance(row, dict) else row["category_id"],
        "category": row.get("category_name") if isinstance(row, dict) else row["category_name"],
    }


def _category_from_row(row) -> Dict[str, Any]:
    if row is None:
        return {}
    return {
        "id": row["id"],
        "name": row["name"],
    }


def _execute_schema_updates(cursor):
    if _POSTGRES_ACTIVE:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS categories (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS admin (
                role TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id SERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL DEFAULT 0,
                image TEXT NOT NULL DEFAULT '',
                page INTEGER DEFAULT 1,
                active BOOLEAN NOT NULL DEFAULT TRUE,
                category_id INTEGER REFERENCES categories(id)
            )
            """
        )
        cursor.execute("ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id INTEGER REFERENCES categories(id)")
    else:
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS categories (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL UNIQUE
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS admin (
                role TEXT PRIMARY KEY,
                password_hash TEXT NOT NULL
            )
            """
        )
        cursor.execute(
            """
            CREATE TABLE IF NOT EXISTS products (
                id INTEGER PRIMARY KEY,
                name TEXT NOT NULL,
                price INTEGER NOT NULL DEFAULT 0,
                image TEXT NOT NULL DEFAULT '',
                page INTEGER DEFAULT 1,
                active INTEGER NOT NULL DEFAULT 1,
                category_id INTEGER
            )
            """
        )
        if not _column_exists(cursor, "products", "category_id"):
            cursor.execute("ALTER TABLE products ADD COLUMN category_id INTEGER")


def _column_exists(cursor, table_name: str, column_name: str) -> bool:
    if _POSTGRES_ACTIVE:
        cursor.execute(
            "SELECT column_name FROM information_schema.columns WHERE table_name = %s AND column_name = %s",
            (table_name, column_name),
        )
        return cursor.fetchone() is not None

    cursor.execute(f"PRAGMA table_info({table_name})")
    rows = cursor.fetchall()
    return any(row[1] == column_name for row in rows)


def _row_first_val(row) -> int:
    if row is None:
        return 0
    if isinstance(row, (tuple, list)):
        return int(row[0])
    if isinstance(row, dict):
        return int(row.get("count") or next(iter(row.values()), 0))
    try:
        return int(row[0])
    except Exception:
        return 0


def init_db() -> None:
    conn = _get_connection()
    cursor = conn.cursor()
    _execute_schema_updates(cursor)
    conn.commit()

    # Admin password initialization
    row = cursor.execute("SELECT COUNT(*) FROM admin").fetchone()
    admin_count = _row_first_val(row)
    if admin_count == 0:
        cursor.execute(
            f"INSERT INTO admin (role, password_hash) VALUES ({_placeholder()}, {_placeholder()})",
            ("admin", _hash_password(ADMIN_PASSWORD)),
        )
        conn.commit()

    # Product initialization
    row = cursor.execute("SELECT COUNT(*) FROM products").fetchone()
    product_count = _row_first_val(row)
    if product_count == 0:
        _seed_from_json(conn)

    if _POSTGRES_ACTIVE:
        _sync_postgres_sequence(cursor, "products")
        _sync_postgres_sequence(cursor, "categories")

    conn.commit()
    conn.close()


def _ensure_category(conn, name: str) -> Optional[int]:
    if not name:
        return None
    cursor = conn.cursor()
    placeholder = _placeholder()
    cursor.execute(
        f"SELECT id FROM categories WHERE name = {placeholder}",
        (name.strip(),),
    )
    existing = cursor.fetchone()
    if existing:
        return existing[0] if not isinstance(existing, dict) else existing["id"]
    if _POSTGRES_ACTIVE:
        cursor.execute(
            f"INSERT INTO categories (name) VALUES ({placeholder}) RETURNING id",
            (name.strip(),),
        )
        category_id = cursor.fetchone()["id"]
    else:
        cursor.execute(
            f"INSERT INTO categories (name) VALUES ({placeholder})",
            (name.strip(),),
        )
        category_id = cursor.lastrowid
    conn.commit()
    return category_id


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
        category_name = str(product.get("category", "")).strip()
        category_id = _ensure_category(conn, category_name) if category_name else None

        if product_id is not None:
            query = (
                f"INSERT INTO products (id, name, price, image, page, active, category_id) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})"
            )
            cursor.execute(query, (product_id, name, price, image, page, active, category_id))
        else:
            query = (
                f"INSERT INTO products (name, price, image, page, active, category_id) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})"
            )
            cursor.execute(query, (name, price, image, page, active, category_id))

    conn.commit()


def _sync_postgres_sequence(cursor, table_name: str, column_name: str = "id") -> None:
    if not _POSTGRES_ACTIVE:
        return
    try:
        cursor.execute(f"SELECT MAX({column_name}) AS max_id FROM {table_name}")
        row = cursor.fetchone()
        max_id = None
        if row:
            max_id = row[0] if isinstance(row, tuple) else row.get("max_id")
        if max_id is None:
            return
        cursor.execute(
            "SELECT setval(pg_get_serial_sequence(%s, %s), %s, true)",
            (table_name, column_name, max_id),
        )
    except Exception:
        pass


def _sync_to_json_file():
    """Sync all products to extracted_products.json so all consumers stay updated."""
    try:
        all_prods = get_products(active_only=False)
        with JSON_SOURCE.open("w", encoding="utf-8") as f:
            json.dump(all_prods, f, indent=4, ensure_ascii=False)
    except Exception as e:
        print(f"[db.py] Warning: could not sync to JSON: {e}")


def get_categories() -> List[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM categories ORDER BY name ASC")
    rows = cursor.fetchall()
    conn.close()
    return [_category_from_row(row) for row in rows]


def get_category(category_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT * FROM categories WHERE id = {_placeholder()}", (category_id,))
    row = cursor.fetchone()
    conn.close()
    return _category_from_row(row) if row else None


def _get_category_id_by_name(conn, name: str) -> Optional[int]:
    cursor = conn.cursor()
    placeholder = _placeholder()
    cursor.execute(
        f"SELECT id FROM categories WHERE name = {placeholder}",
        (name.strip(),),
    )
    row = cursor.fetchone()
    if not row:
        return None
    return row[0] if not isinstance(row, dict) else row["id"]


def create_category(name: str) -> int:
    conn = _get_connection()
    cursor = conn.cursor()
    existing_id = _get_category_id_by_name(conn, name)
    if existing_id is not None:
        conn.close()
        return existing_id

    placeholder = _placeholder()
    if _POSTGRES_ACTIVE:
        cursor.execute(
            f"INSERT INTO categories (name) VALUES ({placeholder}) RETURNING id",
            (name.strip(),),
        )
        category_id = cursor.fetchone()["id"]
    else:
        cursor.execute(
            f"INSERT INTO categories (name) VALUES ({placeholder})",
            (name.strip(),),
        )
        category_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return category_id


def update_category(category_id: int, name: str) -> bool:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE categories SET name = {_placeholder()} WHERE id = {_placeholder()}",
        (name.strip(), category_id),
    )
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    _sync_to_json_file()
    return changed


def delete_category(category_id: int) -> bool:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM categories WHERE id = {_placeholder()}", (category_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    _sync_to_json_file()
    return deleted


def get_products(active_only: bool = True, category_id: Optional[int] = None) -> List[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    placeholder = _placeholder()
    category_filter = ""
    params: List[Any] = []

    if category_id is not None:
        category_filter = f" AND p.category_id = {placeholder}"
        params.append(category_id)

    if active_only:
        if _POSTGRES_ACTIVE:
            cursor.execute(
                f"SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = TRUE {category_filter} ORDER BY p.id ASC",
                tuple(params),
            )
        else:
            cursor.execute(
                f"SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.active = 1 {category_filter} ORDER BY p.id ASC",
                tuple(params),
            )
    else:
        cursor.execute(
            f"SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE 1=1 {category_filter} ORDER BY p.id ASC",
            tuple(params),
        )

    rows = cursor.fetchall()
    conn.close()
    return [_product_from_row(row) for row in rows]


def get_product(product_id: int) -> Optional[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"SELECT p.*, c.name AS category_name FROM products p LEFT JOIN categories c ON p.category_id = c.id WHERE p.id = {_placeholder()}",
        (product_id,),
    )
    row = cursor.fetchone()
    conn.close()
    return _product_from_row(row) if row else None


def create_product(
    name: str,
    price: int,
    image: str,
    page: int = 1,
    active: bool = True,
    category_id: Optional[int] = None,
) -> int:
    conn = _get_connection()
    cursor = conn.cursor()
    placeholder = _placeholder()
    active_value = _active_true() if active else _active_false()

    if _POSTGRES_ACTIVE:
        cursor.execute(
            f"INSERT INTO products (name, price, image, page, active, category_id) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}) RETURNING id",
            (name.strip(), price, image.strip(), page, active_value, category_id),
        )
        product_id = cursor.fetchone()["id"]
    else:
        cursor.execute(
            f"INSERT INTO products (name, price, image, page, active, category_id) VALUES ({placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder}, {placeholder})",
            (name.strip(), price, image.strip(), page, active_value, category_id),
        )
        product_id = cursor.lastrowid

    conn.commit()
    conn.close()
    _sync_to_json_file()
    return product_id


def update_product(product_id: int, **fields: Any) -> bool:
    allowed_fields = {"name", "price", "image", "page", "active", "category_id"}
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
        if key == "category_id" and value is None:
            updates.append("category_id = NULL")
            continue
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
    _sync_to_json_file()
    return changed


def set_product_state(product_id: int, active: bool) -> bool:
    return update_product(product_id, active=active)


def delete_product(product_id: int) -> bool:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(f"DELETE FROM products WHERE id = {_placeholder()}", (product_id,))
    deleted = cursor.rowcount > 0
    conn.commit()
    conn.close()
    _sync_to_json_file()
    return deleted


def _get_admin_record() -> Optional[Dict[str, Any]]:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(f"SELECT role, password_hash FROM admin WHERE role = {_placeholder()}", ("admin",))
    row = cursor.fetchone()
    conn.close()
    if not row:
        return None
    return {"role": row["role"] if isinstance(row, dict) else row[0], "password_hash": row["password_hash"] if isinstance(row, dict) else row[1]}


def check_admin_password(password: str) -> bool:
    record = _get_admin_record()
    if not record:
        return False
    return _hash_password(password) == record["password_hash"]


def set_admin_password(password: str) -> bool:
    conn = _get_connection()
    cursor = conn.cursor()
    cursor.execute(
        f"UPDATE admin SET password_hash = {_placeholder()} WHERE role = {_placeholder()}",
        (_hash_password(password), "admin"),
    )
    changed = cursor.rowcount > 0
    conn.commit()
    conn.close()
    return changed
