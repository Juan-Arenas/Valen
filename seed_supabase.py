import json
import os
import sys
import urllib.request
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent
JSON_FILE = BASE_DIR / "extracted_products.json"

try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

SUPABASE_URL = os.environ.get("SUPABASE_URL", "").strip().rstrip("/")
SUPABASE_KEY = os.environ.get("SUPABASE_ANON_KEY", "").strip() or os.environ.get("SUPABASE_KEY", "").strip()

if not SUPABASE_URL or not SUPABASE_KEY:
    print("Por favor configura SUPABASE_URL y SUPABASE_ANON_KEY en el archivo .env")
    print("Ejemplo:")
    print("SUPABASE_URL=https://xyz.supabase.co")
    print("SUPABASE_ANON_KEY=eyJhbGciOi...")
    sys.exit(1)

with open(JSON_FILE, "r", encoding="utf-8") as f:
    products = json.load(f)

print(f"Subiendo {len(products)} productos a Supabase en {SUPABASE_URL}...")

endpoint = f"{SUPABASE_URL}/rest/v1/products"

# Batch in chunks of 50
CHUNK_SIZE = 50
total_inserted = 0

for i in range(0, len(products), CHUNK_SIZE):
    chunk = products[i:i + CHUNK_SIZE]
    cleaned_chunk = []
    for p in chunk:
        cleaned_chunk.append({
            "id": int(p.get("id")),
            "name": str(p.get("name", "")).strip(),
            "price": int(p.get("price", 0)),
            "image": str(p.get("image", "img/product_1.jpg")).strip(),
            "page": int(p.get("page", 1)),
            "active": bool(p.get("active", True)),
            "category": str(p.get("category", "Maquillaje")).strip(),
            "category_id": int(p.get("category_id", 2)) if p.get("category_id") else 2
        })

    payload = json.dumps(cleaned_chunk).encode("utf-8")
    req = urllib.request.Request(
        endpoint,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": SUPABASE_KEY,
            "Authorization": f"Bearer {SUPABASE_KEY}",
            "Prefer": "resolution=merge-duplicates"
        },
        method="POST"
    )

    try:
        with urllib.request.urlopen(req) as res:
            total_inserted += len(chunk)
            print(f"Progreso: {total_inserted}/{len(products)} productos sincronizados...")
    except Exception as e:
        print(f"Error al subir lote {i}: {e}")

print(f"✅ ¡Sincronización completada! {total_inserted} productos listos en Supabase.")
