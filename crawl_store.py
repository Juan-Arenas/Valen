import urllib.request
import json
import re
import os
import sys
from bs4 import BeautifulSoup

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
product_urls = set()

# 1. Crawl all pages of /productos/
for page in range(1, 15):
    url = f"https://prodigiosastore.mitiendanube.com/productos/?mpage={page}"
    try:
        req = urllib.request.Request(url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            links = re.findall(r'href=["\'](https://prodigiosastore\.mitiendanube\.com/productos/[^"\'#\?]+)["\']', html)
            for l in links:
                if '/productos/' in l and not l.endswith('/productos/'):
                    product_urls.add(l)
            print(f"Catalog Page {page}: collected {len(product_urls)} products so far")
    except Exception as e:
        print(f"Error on page {page}: {e}")

# 2. Also search queries visited
search_queries = ['scrunchie', 'set+mini', 'encrespador', 'brochas+sirena', 'bloomshell', 'purpure', 'bioaqua']
for q in search_queries:
    for page in range(1, 5):
        url = f"https://prodigiosastore.mitiendanube.com/search/?q={q}&mpage={page}"
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=10) as resp:
                html = resp.read().decode('utf-8', errors='ignore')
                links = re.findall(r'href=["\'](https://prodigiosastore\.mitiendanube\.com/productos/[^"\'#\?]+)["\']', html)
                for l in links:
                    if '/productos/' in l and not l.endswith('/productos/'):
                        product_urls.add(l)
        except Exception as e:
            pass

print(f"\nTotal unique product URLs collected: {len(product_urls)}")

# 3. Scrape and download each product
products = []
os.makedirs('img', exist_ok=True)

for i, p_url in enumerate(sorted(product_urls)):
    try:
        req = urllib.request.Request(p_url, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Name
            m_name = re.search(r"name\s*:\s*'([^']+)'", html)
            if m_name:
                name = m_name.group(1).encode('utf-8').decode('unicode_escape')
            else:
                m_title = re.search(r'<title>([^<]+)</title>', html)
                name = m_title.group(1).split('-')[0].strip() if m_title else 'Producto'
            
            name = name.replace('\\/', ' / ').replace('\/', ' / ')
            
            # Price
            price = 0
            m_price = re.search(r'data-product-price=["\']?(\d+)["\']?', html)
            if m_price:
                price = int(m_price.group(1))
            if not price:
                m_price_match = re.search(r'\$(\d{1,3}(?:\.\d{3})+)', html)
                if m_price_match:
                    price = int(m_price_match.group(1).replace('.', ''))
            
            # Image
            m_img = re.search(r'property="og:image"\s*content="([^"]+)"', html)
            img_url = m_img.group(1) if m_img else ''
            
            local_img = f"img/store_prod_{i+1}.jpg"
            if img_url:
                try:
                    img_req = urllib.request.Request(img_url, headers=headers)
                    with urllib.request.urlopen(img_req, timeout=10) as img_resp:
                        with open(local_img, 'wb') as f:
                            f.write(img_resp.read())
                except Exception as img_err:
                    print(f"Error downloading img {i+1}: {img_err}")
            
            # Category guessing based on name
            category = 'Maquillaje'
            n_lower = name.lower()
            if any(k in n_lower for k in ['facial', 'serum', 'tonico', 'tónico', 'jabon', 'jabón', 'mascarilla', 'protector', 'limpiador', 'arroz', 'piel', 'exfoliante', 'anti acne', 'antiacne', 'anti acné']):
                category = 'Cuidado Facial'
            elif any(k in n_lower for k in ['shampoo', 'acondicionador', 'capilar', 'cabello', 'rizos', 'oleo', 'óleo', 'cebolla', 'repolarizacion']):
                category = 'Cabello'
            elif any(k in n_lower for k in ['brocha', 'beauty blender', 'esponja', 'encrespador', 'borla', 'perfilador', 'pinza', 'cosmetiquera', 'organizador']):
                category = 'Herramientas'
            elif any(k in n_lower for k in ['moña', 'moñita', 'gancho', 'balaca', 'gorro', 'scrunchie', 'caucho', 'tubo de seda', 'pinzas']):
                category = 'Accesorios'
            elif any(k in n_lower for k in ['corporal', 'mantequilla', 'splash', 'truly', 'shimmer']):
                category = 'Corporal'
            elif 'bloomshell' in n_lower or 'bloom' in n_lower:
                category = 'Bloomshell'
            
            products.append({
                'name': name,
                'price': price,
                'image': local_img,
                'image_url': img_url,
                'category': category,
                'url': p_url
            })
            print(f"[{i+1}/{len(product_urls)}] {name} | ${price:,} COP | {category}")
    except Exception as err:
        print(f"Error on {p_url}: {err}")

with open('all_store_scraped_products.json', 'w', encoding='utf-8') as f:
    json.dump(products, f, indent=4, ensure_ascii=False)

print(f"\nFinalizado! Total productos scrapeados: {len(products)}")
