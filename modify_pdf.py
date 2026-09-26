"""Script para eliminar el precio '45.000' de la última página del PDF."""
import subprocess
import sys

try:
    import fitz  # PyMuPDF
except ImportError:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "PyMuPDF"])
    import fitz

pdf_path = r"AAA MAYORISTAS AGOSTO 2026 - SIN PRECIOS.pdf"

doc = fitz.open(pdf_path)

# Ir a la última página (122)
last_page = doc[-1]

# Buscar y eliminar el texto "45.000"
# La posición del texto es: (237.7, 510.7, 432.3, 595.1)
text_instances = last_page.search_for("45.000")

if text_instances:
    for inst in text_instances:
        print(f"Encontrado '45.000' en posición: {inst}")
        # Cubrir el texto con un rectángulo blanco
        # Usamos el bbox del bloque de texto que encontramos antes para mayor precisión
        rect = fitz.Rect(237.72314453125, 510.6867370605469, 432.3404846191406, 595.112548828125)
        
        # Agregar redacción (elimina el texto completamente)
        last_page.add_redact_annot(rect, fill=(1, 1, 1))  # Blanco
    
    # Aplicar las redacciones
    last_page.apply_redactions()
    print("Precio '45.000' eliminado exitosamente.")
else:
    print("No se encontró el texto '45.000'")

# Guardar el PDF modificado (sobreescribir)
doc.save(pdf_path, incremental=True, encryption=fitz.PDF_ENCRYPT_KEEP)
doc.close()

print(f"\nPDF guardado: {pdf_path}")

# Verificación
doc2 = fitz.open(pdf_path)
last_page2 = doc2[-1]
remaining_text = last_page2.get_text().strip()
if remaining_text:
    print(f"ADVERTENCIA: Aún queda texto en la última página: '{remaining_text}'")
else:
    print("✓ Verificado: No queda texto en la última página.")
doc2.close()
