"""Script para revisar el PDF 'SIN PRECIOS' y detectar si quedaron precios."""
import subprocess
import sys

# Asegurar que PyMuPDF esté instalado
try:
    import fitz  # PyMuPDF
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF"])
    import fitz

import re

pdf_path = r"AAA MAYORISTAS AGOSTO 2026 - SIN PRECIOS.pdf"

doc = fitz.open(pdf_path)

# Patrones que indican precios (ej: $12.000, $5,500, 12000, etc.)
price_pattern = re.compile(r'\$\s*[\d.,]+|\d{2,3}[.,]\d{3}')

print(f"Total de páginas: {len(doc)}\n")

for page_num in range(len(doc)):
    page = doc[page_num]
    text = page.get_text()
    
    # Buscar precios en el texto
    matches = price_pattern.findall(text)
    if matches:
        print(f"=== PÁGINA {page_num + 1} ===")
        print(f"Precios encontrados: {matches}")
        print(f"Texto de la página:\n{text[:2000]}")
        print("-" * 60)

# También revisar la última página específicamente
last_page = doc[-1]
print(f"\n{'='*60}")
print(f"=== ÚLTIMA PÁGINA (Página {len(doc)}) - REVISIÓN COMPLETA ===")
print(f"{'='*60}")
last_text = last_page.get_text()
print(last_text)

# Revisar también los bloques de texto con posiciones
print(f"\n{'='*60}")
print("=== BLOQUES DE TEXTO CON POSICIONES (Última página) ===")
print(f"{'='*60}")
blocks = last_page.get_text("dict")["blocks"]
for i, block in enumerate(blocks):
    if "lines" in block:
        for line in block["lines"]:
            for span in line["spans"]:
                text = span["text"].strip()
                if text:
                    bbox = span["bbox"]
                    font_size = span["size"]
                    print(f"  Bloque {i}: '{text}' | Pos: {bbox} | Size: {font_size:.1f}")

doc.close()
