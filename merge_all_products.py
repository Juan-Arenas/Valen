import json
import re

# Load existing base products
with open('extracted_products.json', 'r', encoding='utf-8') as f:
    existing_products = json.load(f)

# Load scraped products
with open('all_store_scraped_products.json', 'r', encoding='utf-8') as f:
    scraped_products = json.load(f)

print(f"Existing products: {len(existing_products)}")
print(f"Scraped products to consider: {len(scraped_products)}")

# Create set of normalized existing product names
def normalize_name(name):
    return re.sub(r'[^a-zA-Z0-9]', '', (name or '').lower())

existing_names = {normalize_name(p['name']): p for p in existing_products}

added_count = 0
updated_count = 0
max_id = max(p['id'] for p in existing_products) if existing_products else 0

CATEGORY_MAP = {
    'Cuidado Facial': 1,
    'Maquillaje': 2,
    'Cabello': 3,
    'Accesorios': 4,
    'Herramientas': 5,
    'Corporal': 6,
    'Bloomshell': 7
}

for item in scraped_products:
    norm = normalize_name(item['name'])
    
    # Fix price if > 100000 (cents issue)
    raw_price = item['price']
    if raw_price > 200000:
        price = raw_price // 100
    else:
        price = raw_price
    
    cat_name = item.get('category', 'Maquillaje')
    cat_id = CATEGORY_MAP.get(cat_name, 2)
    
    if norm in existing_names:
        # Update existing product with better image or category if needed
        existing = existing_names[norm]
        if 'recovered_' not in existing.get('image', '') and 'store_prod_' not in existing.get('image', ''):
            existing['image'] = item['image']
            updated_count += 1
    else:
        max_id += 1
        new_prod = {
            'id': max_id,
            'name': item['name'],
            'price': price,
            'image': item['image'],
            'page': 52,
            'active': True,
            'category_id': cat_id,
            'category': cat_name
        }
        existing_products.append(new_prod)
        existing_names[norm] = new_prod
        added_count += 1

print(f"Added {added_count} new unique products!")
print(f"Updated {updated_count} existing products with high-res photos!")
print(f"Total products now in catalog: {len(existing_products)}")

with open('extracted_products.json', 'w', encoding='utf-8') as f:
    json.dump(existing_products, f, indent=4, ensure_ascii=False)
