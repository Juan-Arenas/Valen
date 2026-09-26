import fitz
import re
import json

with open("catalogo.js", "r", encoding="utf-8") as f:
    js_content = f.read()

match = re.search(r'const INLINE_PRODUCTS = (\[.*?\]);', js_content, re.DOTALL)
if not match:
    print("Could not find INLINE_PRODUCTS")
    exit(1)

products = json.loads(match.group(1))
existing_names = {p['name'].lower().strip() for p in products}
product_id = max(p.get('id', 0) for p in products) + 1 if products else 1

doc = fitz.open("CATALOGO ACTUALIZADO (1).pdf")
print("Total pages in PDF:", len(doc))

price_pattern = re.compile(r'\$?\s*(\d{1,3}(?:\.\d{3})+)\b')
added_count = 0

for page_num in range(len(doc)):
    page = doc[page_num]
    text_blocks = page.get_text("blocks")
    images_info = page.get_image_info()
    
    # Check if there are prices
    page_text = page.get_text()
    prices_found = price_pattern.findall(page_text)
    if len(prices_found) == 0:
        continue
        
    page_rect = page.rect
    page_width, page_height = page_rect.width, page_rect.height
    product_images = []
    
    for img in images_info:
        bbox = img.get('bbox')
        if not bbox:
            continue
        x0, y0, x1, y1 = bbox
        r = fitz.Rect(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1))
        
        w = r.width
        h = r.height
        if w > page_width * 0.8 and h > page_height * 0.8:
            continue
        if w < 40 or h < 40:
            continue
            
        is_duplicate = False
        for existing in product_images:
            if (r & existing).get_area() > 0.8 * r.get_area():
                is_duplicate = True
                break
        if is_duplicate:
            continue
        product_images.append(r)
        
    product_images.sort(key=lambda r: (round(r.y0 / 30) * 30, r.x0))
    
    cleaned_blocks = []
    for b in text_blocks:
        x0, y0, x1, y1, text, block_no, block_type = b
        text_clean = text.strip()
        if not text_clean:
            continue
        lines = [l.strip() for l in text_clean.split('\n') if l.strip()]
        cleaned_blocks.append({
            "rect": fitz.Rect(min(x0, x1), min(y0, y1), max(x0, x1), max(y0, y1)),
            "text": " ".join(lines),
            "lines": lines
        })
        
    price_boxes = []
    for cb in cleaned_blocks:
        for line in cb["lines"]:
            match = price_pattern.search(line)
            if match:
                price_val = int(match.group(1).replace('.', ''))
                price_boxes.append({
                    "rect": cb["rect"],
                    "price": price_val,
                    "text": line
                })
                
    for img_rect in product_images:
        candidates = []
        for tb in cleaned_blocks:
            tb_rect = tb["rect"]
            if tb_rect.y0 >= img_rect.y1 - 20 and tb_rect.y0 < img_rect.y1 + 180:
                img_center_x = (img_rect.x0 + img_rect.x1) / 2
                tb_center_x = (tb_rect.x0 + tb_rect.x1) / 2
                dist_x = abs(img_center_x - tb_center_x)
                if dist_x < (img_rect.width / 2 + 50):
                    candidates.append(tb)
                        
        if not candidates:
            for tb in cleaned_blocks:
                tb_rect = tb["rect"]
                if tb_rect.y0 >= img_rect.y1 - 30 and tb_rect.y0 < img_rect.y1 + 220:
                    img_center_x = (img_rect.x0 + img_rect.x1) / 2
                    tb_center_x = (tb_rect.x0 + tb_rect.x1) / 2
                    if abs(img_center_x - tb_center_x) < (img_rect.width / 2 + 90):
                        candidates.append(tb)
                        
        product_name = ""
        product_price = 0
        
        if candidates:
            candidates.sort(key=lambda c: c["rect"].y0)
            all_lines = []
            for c in candidates:
                all_lines.extend(c["lines"])
                
            unique_lines = []
            for line in all_lines:
                if line not in unique_lines:
                    unique_lines.append(line)
                    
            name_parts = []
            for line in unique_lines:
                match = price_pattern.search(line)
                if match:
                    product_price = int(match.group(1).replace('.', ''))
                    cleaned_line = price_pattern.sub('', line).strip()
                    if cleaned_line and cleaned_line not in name_parts:
                        name_parts.append(cleaned_line)
                else:
                    if line not in name_parts and len(line) > 1:
                        name_parts.append(line)
            
            final_name_parts = []
            for p in name_parts:
                is_dup = False
                for fp in final_name_parts:
                    if p.lower() in fp.lower() or fp.lower() in p.lower():
                        is_dup = True
                        if len(p) > len(fp):
                            final_name_parts.remove(fp)
                            final_name_parts.append(p)
                        break
                if not is_dup:
                    final_name_parts.append(p)
            product_name = " ".join(final_name_parts).strip()
            
        if product_price == 0 and price_boxes:
            closest_price = None
            min_dist = 999999
            for pb in price_boxes:
                pb_rect = pb["rect"]
                img_cx = (img_rect.x0 + img_rect.x1) / 2
                img_cy = img_rect.y1
                pb_cx = (pb_rect.x0 + pb_rect.x1) / 2
                pb_cy = pb_rect.y0
                dist = ((img_cx - pb_cx) ** 2 + (img_cy - pb_cy) ** 2) ** 0.5
                
                if pb_rect.y0 >= img_rect.y1 - 10:
                    dist *= 0.8
                if dist < min_dist:
                    min_dist = dist
                    closest_price = pb["price"]
            if closest_price:
                product_price = closest_price
                
        if "Incluye:" in product_name:
            product_name = product_name.split("Incluye:")[0].strip()
        if product_name.lower() in ["cuidado facial y corporal", "maquillaje", "cabello y ducha", "accesorios"]:
            continue
        if not product_name or len(product_name) < 3:
            product_name = "Producto de Maquillaje"
            
        # Check against existing names to prevent duplicates
        if product_name.lower().strip() in existing_names:
            continue
        # Also let's avoid adding too many "Producto de Maquillaje" duplicates if it's already there
        if product_name.lower().strip() == "producto de maquillaje" and "producto de maquillaje" in existing_names:
            pass # Actually we might want to still add it if the price is different or we just ignore it.
            # Let's ignore it to avoid flooding.
            continue
            
        # We got a new product!
        image_filename = f"img/product_{product_id}.jpg"
        zoom = 2.0
        mat = fitz.Matrix(zoom, zoom)
        pad = 3
        clip_rect = fitz.Rect(
            max(0, img_rect.x0 - pad),
            max(0, img_rect.y0 - pad),
            min(page_width, img_rect.x1 + pad),
            min(page_height, img_rect.y1 + pad)
        )
        
        try:
            pix = page.get_pixmap(matrix=mat, clip=clip_rect)
            pix.save(image_filename)
        except Exception as e:
            pass
            
        products.append({
            "id": product_id,
            "name": product_name,
            "price": product_price,
            "image": image_filename,
            "page": page_num + 1,
            "category": "Nuevos",
            "category_id": 99,
            "active": True
        })
        existing_names.add(product_name.lower().strip())
        product_id += 1
        added_count += 1

print(f"Added {added_count} new products!")

# Write back to catalogo.js
import re
new_json = json.dumps(products, ensure_ascii=False)
with open("catalogo.js", "r", encoding="utf-8") as f:
    js_content = f.read()
    
# Replace using regex
new_js_content = re.sub(r'const INLINE_PRODUCTS = \[.*?\];', f'const INLINE_PRODUCTS = {new_json};', js_content, flags=re.DOTALL)

with open("catalogo.js", "w", encoding="utf-8") as f:
    f.write(new_js_content)
    
print("Updated catalogo.js successfully.")
