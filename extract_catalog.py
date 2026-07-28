import fitz
import re
import os
import json
import sys

sys.stdout.reconfigure(encoding='utf-8')

doc = fitz.open("CATALOGO ACTUALIZADO 2026.pdf")
print("Total pages in PDF:", len(doc))

products = []
product_id = 1

price_pattern = re.compile(r'\$?\s*(\d{1,3}(?:\.\d{3})+)\b')

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
    
    # Extract all text blocks with coordinates
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
        
    # Find all price boxes on the page
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
                
    # Match products
    for img_rect in product_images:
        # Find candidates (any text blocks below the image)
        candidates = []
        for tb in cleaned_blocks:
            tb_rect = tb["rect"]
            if tb_rect.y0 >= img_rect.y1 - 20:
                if tb_rect.y0 < img_rect.y1 + 180:
                    img_center_x = (img_rect.x0 + img_rect.x1) / 2
                    tb_center_x = (tb_rect.x0 + tb_rect.x1) / 2
                    dist_x = abs(img_center_x - tb_center_x)
                    if dist_x < (img_rect.width / 2 + 50):
                        candidates.append(tb)
                        
        if not candidates:
            # Try relaxed
            for tb in cleaned_blocks:
                tb_rect = tb["rect"]
                if tb_rect.y0 >= img_rect.y1 - 30 and tb_rect.y0 < img_rect.y1 + 220:
                    img_center_x = (img_rect.x0 + img_rect.x1) / 2
                    tb_center_x = (tb_rect.x0 + tb_rect.x1) / 2
                    if abs(img_center_x - tb_center_x) < (img_rect.width / 2 + 90):
                        candidates.append(tb)
                        
        product_name = ""
        product_price = 0
        price_found = False
        
        # Look for price in candidates
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
                    price_found = True
                    cleaned_line = price_pattern.sub('', line).strip()
                    if cleaned_line and cleaned_line not in name_parts:
                        name_parts.append(cleaned_line)
                else:
                    if line not in name_parts and len(line) > 1:
                        name_parts.append(line)
            
            # Deduplicate name parts
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
            
        # IF price is still 0, find the closest price box on the page!
        if product_price == 0 and price_boxes:
            # Find the price box that is closest to the bottom of the image
            closest_price = None
            min_dist = 999999
            for pb in price_boxes:
                pb_rect = pb["rect"]
                # Calculate distance between image bottom-center and price box top-center
                img_cx = (img_rect.x0 + img_rect.x1) / 2
                img_cy = img_rect.y1
                pb_cx = (pb_rect.x0 + pb_rect.x1) / 2
                pb_cy = pb_rect.y0
                dist = ((img_cx - pb_cx) ** 2 + (img_cy - pb_cy) ** 2) ** 0.5
                
                # We prefer price boxes that are below the image
                if pb_rect.y0 >= img_rect.y1 - 10:
                    dist *= 0.8 # favor below
                if dist < min_dist:
                    min_dist = dist
                    closest_price = pb["price"]
            if closest_price:
                product_price = closest_price
                
        # Clean product name
        if "Incluye:" in product_name:
            product_name = product_name.split("Incluye:")[0].strip()
        if product_name.lower() in ["cuidado facial y corporal", "maquillaje", "cabello y ducha", "accesorios"]:
            continue
        if not product_name or len(product_name) < 3:
            product_name = "Producto de Maquillaje"
            
        # Crop image
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
            "page": page_num + 1
        })
        product_id += 1

with open("extracted_products.json", "w", encoding="utf-8") as f:
    json.dump(products, f, indent=4, ensure_ascii=False)

print(f"Fixed extraction completed! Total products: {len(products)}")
zero_prices = [p for p in products if p["price"] == 0]
print(f"Products with zero price now: {len(zero_prices)}")
