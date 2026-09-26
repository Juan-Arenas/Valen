import json
import re
import os

# Helper to determine category by ID
def get_category(pid):
    if 1 <= pid <= 140:
        return 'Cuidado Facial y Corporal'
    elif 141 <= pid <= 409:
        return 'Maquillaje'
    elif 410 <= pid <= 465:
        return 'Cabello y Ducha'
    elif 466 <= pid <= 505:
        return 'Accesorios Cabello'
    elif 506 <= pid <= 613:
        return 'Accesorios Maquillaje'
    return 'Maquillaje' # default

# Process catalogo.js
catalogo_path = 'catalogo.js'
with open(catalogo_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Extract JSON from INLINE_PRODUCTS
match = re.search(r'const INLINE_PRODUCTS = (\[.*?\]);', content, re.DOTALL)
if match:
    json_str = match.group(1)
    try:
        products = json.loads(json_str)
        for p in products:
            p['category'] = get_category(p['id'])
        new_json_str = json.dumps(products, indent=4, ensure_ascii=False)
        new_content = content[:match.start(1)] + new_json_str + content[match.end(1):]
        with open(catalogo_path, 'w', encoding='utf-8') as f:
            f.write(new_content)
        print("Updated catalogo.js successfully.")
    except Exception as e:
        print(f"Error parsing catalogo.js JSON: {e}")

# Process extracted_products.json
extracted_path = 'extracted_products.json'
if os.path.exists(extracted_path):
    with open(extracted_path, 'r', encoding='utf-8') as f:
        try:
            products = json.load(f)
            for p in products:
                p['category'] = get_category(p['id'])
            with open(extracted_path, 'w', encoding='utf-8') as fw:
                json.dump(products, fw, indent=4, ensure_ascii=False)
            print("Updated extracted_products.json successfully.")
        except Exception as e:
            print(f"Error parsing extracted_products.json JSON: {e}")
