import db
import re
import json

with open("catalogo.js", "r", encoding="utf-8") as f:
    js_content = f.read()

match = re.search(r'const INLINE_PRODUCTS = (\[.*?\]);', js_content, re.DOTALL)
if not match:
    print("Could not find INLINE_PRODUCTS")
    exit(1)

products = json.loads(match.group(1))

# Get existing products from Neon DB
db_products = db.get_products(active_only=False)
existing_names = {p['name'].lower().strip() for p in db_products}

added = 0
for p in products:
    name = str(p.get("name", "")).strip()
    if name.lower() not in existing_names:
        # insert
        cat_id = int(p.get("category_id", 2)) if p.get("category_id") else 2
        try:
            db.create_product(
                name=name,
                price=int(p.get("price", 0)),
                image=str(p.get("image", "")).strip(),
                page=int(p.get("page", 1)),
                active=bool(p.get("active", True)),
                category_id=cat_id
            )
            added += 1
            existing_names.add(name.lower())
        except Exception as e:
            print(f"Error adding {name}: {e}")

print(f"Added {added} products to database (Postgres={db._POSTGRES_ACTIVE}).")
