import urllib.request
import json
import re
import os

urls = [
    'https://prodigiosastore.mitiendanube.com/productos/polvo-suelto-grande-xl-03-natural-bloomshell-30g-18t5m/',
    'https://prodigiosastore.mitiendanube.com/productos/polvo-suelto-grande-xl-01-white-bloomshell-30g-14wea/',
    'https://prodigiosastore.mitiendanube.com/productos/bloom-filter-linea-premium-polvo-suelto-bloomshell-gbkq4/',
    'https://prodigiosastore.mitiendanube.com/productos/kit-x-6-mini-favoritos-bloomshell-h2fo4/',
    'https://prodigiosastore.mitiendanube.com/productos/set-x-6-bloomshell-tus-mini-infaltables-de-labios-1n8kd/',
    'https://prodigiosastore.mitiendanube.com/productos/bloom-glow-bloomshell-iluminador-blush-1p3d1/',
    'https://prodigiosastore.mitiendanube.com/productos/paleta-rubor-velvet-x3-bloomshell-nueva-presentacion-15iik/',
    'https://prodigiosastore.mitiendanube.com/productos/kit-amor-y-amistad-bloomshell-edicion-limitada-kiss-love-x4-16k07/',
    'https://prodigiosastore.mitiendanube.com/productos/primer-bloom-poros-invisibles-bloomshell-1yyau/',
    'https://prodigiosastore.mitiendanube.com/productos/laminador-de-cejas-xl-bloomshell-tamano-grande-gel-de-cejas-1l1js/',
    'https://prodigiosastore.mitiendanube.com/productos/bloom-stop-bloomshell-parches-anti-acne-rosa-7haei/',
    'https://prodigiosastore.mitiendanube.com/productos/bloom-stickers-para-el-celular-termo-o-accesorios-bloomshell-1fxvu/',
    'https://prodigiosastore.mitiendanube.com/productos/set-de-brochas-en-cajita-18p6y/'
]

headers = {'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
results = []
os.makedirs('img', exist_ok=True)

for i, u in enumerate(urls):
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req, timeout=10) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            
            # Find name
            m_name = re.search(r"name\s*:\s*'([^']+)'", html)
            if m_name:
                name = m_name.group(1).encode('utf-8').decode('unicode_escape')
            else:
                m_title = re.search(r'<title>([^<]+)</title>', html)
                name = m_title.group(1).split('-')[0].strip() if m_title else 'Producto'
            
            # Find price
            price = 0
            m_price_match = re.search(r'\$(\d{1,3}(?:\.\d{3})+)', html)
            if m_price_match:
                price = int(m_price_match.group(1).replace('.', ''))
            
            # Find image
            m_img = re.search(r'property="og:image"\s*content="([^"]+)"', html)
            img_url = m_img.group(1) if m_img else ''
            
            # Download image locally
            local_img_path = f"img/recovered_{i+1}.jpg"
            if img_url:
                try:
                    img_req = urllib.request.Request(img_url, headers=headers)
                    with urllib.request.urlopen(img_req, timeout=10) as img_resp:
                        with open(local_img_path, 'wb') as img_f:
                            img_f.write(img_resp.read())
                except Exception as img_err:
                    print(f"Error downloading image for {name}: {img_err}")
            
            results.append({
                'name': name,
                'price': price,
                'image': local_img_path,
                'image_url': img_url,
                'category': 'Bloomshell',
                'url': u
            })
            print(f"[{i+1}/{len(urls)}] Recuperado: {name} | ${price:,} COP | {local_img_path}")
    except Exception as e:
        print(f"Error en {u}: {e}")

with open('recovered_bloomshell_collection.json', 'w', encoding='utf-8') as f:
    json.dump(results, f, indent=4, ensure_ascii=False)

print(f"\nExitosamente recuperados {len(results)} productos con imágenes y precios!")
