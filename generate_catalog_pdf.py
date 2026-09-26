import os
import sys
import json
import requests
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Image as RLImage, Table, TableStyle, PageBreak, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from PIL import Image as PILImage

# Configure encoding for Windows console output
try:
    sys.stdout.reconfigure(encoding='utf-8')
except AttributeError:
    pass

# Setup paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FONTS_DIR = os.path.join(BASE_DIR, 'fonts')
IMG_DIR = os.path.join(BASE_DIR, 'img')
LOGO_PATH = os.path.join(BASE_DIR, 'Logo.jpeg')
OUTPUT_PDF = os.path.join(BASE_DIR, 'catalogo_valen_makeup.pdf')

# Register Montserrat Fonts (downloaded in previous step)
montserrat_reg = os.path.join(FONTS_DIR, 'Montserrat-Regular.ttf')
montserrat_bold = os.path.join(FONTS_DIR, 'Montserrat-Bold.ttf')

if os.path.exists(montserrat_reg) and os.path.exists(montserrat_bold):
    try:
        pdfmetrics.registerFont(TTFont('Montserrat', montserrat_reg))
        pdfmetrics.registerFont(TTFont('Montserrat-Bold', montserrat_bold))
        font_normal = 'Montserrat'
        font_bold = 'Montserrat-Bold'
        print("Successfully registered Montserrat fonts.")
    except Exception as e:
        print(f"Error registering Montserrat: {e}. Using Helvetica.")
        font_normal = 'Helvetica'
        font_bold = 'Helvetica-Bold'
else:
    print("Montserrat fonts not found in venv/fonts. Using Helvetica.")
    font_normal = 'Helvetica'
    font_bold = 'Helvetica-Bold'


# Helper: Format price as Colombian Peso
def format_price(price):
    if price is None:
        return "$ 0"
    try:
        return f"$ {int(price):,}".replace(",", ".")
    except ValueError:
        return "$ 0"


# Helper: Get product image with proper scaling
def get_product_image(img_rel_path, max_width=120, max_height=110):
    if not img_rel_path:
        return get_logo_placeholder(max_width, max_height)
        
    local_path = os.path.join(BASE_DIR, img_rel_path)
    
    # Download image if it doesn't exist locally
    if not os.path.exists(local_path):
        url = f"https://valen-makeup.vercel.app/{img_rel_path}"
        os.makedirs(os.path.dirname(local_path), exist_ok=True)
        try:
            print(f"Downloading missing product image: {url}")
            r = requests.get(url, timeout=5)
            if r.status_code == 200:
                with open(local_path, "wb") as f:
                    f.write(r.content)
            else:
                return get_logo_placeholder(max_width, max_height)
        except Exception as e:
            print(f"Failed to download image {url}: {e}")
            return get_logo_placeholder(max_width, max_height)
            
    # Calculate aspect ratio to fit container without distortion
    try:
        with PILImage.open(local_path) as img:
            w, h = img.size
        ratio = min(max_width / w, max_height / h)
        new_w = int(w * ratio)
        new_h = int(h * ratio)
        return RLImage(local_path, width=new_w, height=new_h)
    except Exception as e:
        print(f"Error loading image {local_path}: {e}")
        return get_logo_placeholder(max_width, max_height)


# Helper: Fallback image using scaled logo
def get_logo_placeholder(max_width, max_height):
    if os.path.exists(LOGO_PATH):
        try:
            with PILImage.open(LOGO_PATH) as img:
                w, h = img.size
            ratio = min(max_width / w, max_height / h)
            return RLImage(LOGO_PATH, width=int(w * ratio), height=int(h * ratio))
        except:
            pass
    return ""


# Page layout callbacks for canvas styling
def draw_cover_background(canvas, doc):
    canvas.saveState()
    # Soft feminine background (very light sweet blush pink)
    canvas.setFillColor(HexColor('#FFF2F4'))
    canvas.rect(0, 0, 612, 792, fill=True, stroke=False)
    
    # Decorative organic circles/waves (rose gold)
    canvas.setStrokeColor(HexColor('#F8D8DC'))
    canvas.setLineWidth(3)
    canvas.circle(0, 792, 180, stroke=True, fill=False)
    canvas.circle(612, 0, 220, stroke=True, fill=False)
    canvas.circle(0, 0, 100, stroke=True, fill=False)
    
    # Elegant inner gold border
    canvas.setStrokeColor(HexColor('#D4AF37')) # Gold
    canvas.setLineWidth(1.5)
    canvas.rect(24, 24, 564, 744, fill=False, stroke=True)
    canvas.restoreState()


def draw_later_background(canvas, doc):
    canvas.saveState()
    # Light cream background for readability
    canvas.setFillColor(HexColor('#FFFDFD'))
    canvas.rect(0, 0, 612, 792, fill=True, stroke=False)
    
    # Soft pink/rose-gold horizontal lines for header and footer
    canvas.setStrokeColor(HexColor('#EAD5D9'))
    canvas.setLineWidth(1)
    canvas.line(36, 735, 576, 735) # Header separator
    canvas.line(36, 50, 576, 50)   # Footer separator
    
    # Small header logo on the left
    if os.path.exists(LOGO_PATH):
        try:
            canvas.drawImage(LOGO_PATH, 36, 742, width=32, height=32, mask='auto')
        except Exception as e:
            print(f"Error drawing header logo: {e}")
            
    # Header text
    canvas.setFont(f"{font_bold}", 11)
    canvas.setFillColor(HexColor('#C74B6E')) # Deep rose
    canvas.drawString(76, 755, "VALEN MAKEUP")
    
    canvas.setFont(f"{font_normal}", 8)
    canvas.setFillColor(HexColor('#D4AF37')) # Gold accent
    canvas.drawString(76, 743, "C A T Á L O G O  D E  P R O D U C T O S")
    
    # Header web URL on the right
    canvas.setFont(f"{font_normal}", 9)
    canvas.setFillColor(HexColor('#2B2D42')) # Charcoal
    canvas.drawRightString(576, 748, "valen-makeup.vercel.app")
    
    # Footer text
    canvas.setFont(f"{font_normal}", 8)
    canvas.setFillColor(HexColor('#5E5C68')) # Muted text
    canvas.drawString(36, 35, "Contacto: valen-makeup.vercel.app")
    canvas.drawRightString(576, 35, "Instagram: @valen_makeup")
    
    # Page numbers
    page_num = canvas.getPageNumber()
    canvas.setFont(f"{font_bold}", 8)
    canvas.setFillColor(HexColor('#C74B6E'))
    canvas.drawCentredString(306, 35, f"Página {page_num}")
    
    canvas.restoreState()


# Helper: Chunk list into rows of size n
def chunk_list(lst, n):
    for i in range(0, len(lst), n):
        yield lst[i:i + n]


def generate_catalog():
    print("Generating catalog PDF...")
    
    # 1. Fetch products from API (fallback to local JSON if website is down)
    products_url = "https://valen-makeup.vercel.app/api/products?active=true"
    print("Fetching active products from valen-makeup.vercel.app...")
    try:
        r = requests.get(products_url, timeout=10)
        r.raise_for_status()
        products = r.json()
        print(f"Successfully fetched {len(products)} active products.")
    except Exception as e:
        print(f"Failed to query live API: {e}. Falling back to local extracted_products.json.")
        try:
            with open(os.path.join(BASE_DIR, "extracted_products.json"), "r", encoding="utf-8") as f:
                products = json.load(f)
            # Filter active locally if possible
            products = [p for p in products if p.get('active', True) is not False]
            print(f"Loaded {len(products)} products from local file.")
        except Exception as file_err:
            print(f"Critical error loading local backup: {file_err}")
            return
            
    if not products:
        print("Error: No products to display.")
        return
        
    # Group products by category
    categories_map = {}
    for p in products:
        cat_name = p.get('category') or 'Maquillaje General'
        cat_name = cat_name.strip()
        if not cat_name:
            cat_name = 'Maquillaje General'
            
        if cat_name not in categories_map:
            categories_map[cat_name] = []
        categories_map[cat_name].append(p)
        
    # Sort categories putting 'Maquillaje General' at the end
    sorted_cats = sorted([k for k in categories_map.keys() if k != 'Maquillaje General'])
    if 'Maquillaje General' in categories_map:
        sorted_cats.append('Maquillaje General')
        
    # Setup document
    # Margins: Left/Right = 36 pt (0.5 inch). Top/Bottom margins are slightly larger to clear header/footer
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=68,
        bottomMargin=62
    )
    
    # Setup styles
    name_style = ParagraphStyle(
        'ProductName',
        fontName=font_normal,
        fontSize=8.5,
        leading=10,
        textColor=HexColor('#2B2D42'), # charcoal
        alignment=1, # center
    )
    price_style = ParagraphStyle(
        'ProductPrice',
        fontName=font_bold,
        fontSize=10.5,
        leading=12,
        textColor=HexColor('#C74B6E'), # deep rose
        alignment=1, # center
    )
    category_style = ParagraphStyle(
        'CategoryHeader',
        fontName=font_bold,
        fontSize=18,
        leading=22,
        textColor=HexColor('#C74B6E'),
        alignment=1, # center
        spaceAfter=15
    )
    
    story = []
    
    # 2. Cover Page Story
    story.append(Spacer(1, 100))
    if os.path.exists(LOGO_PATH):
        try:
            story.append(RLImage(LOGO_PATH, width=160, height=160))
        except Exception as e:
            print(f"Error adding logo to cover: {e}")
            story.append(Spacer(1, 160))
    else:
        story.append(Spacer(1, 160))
        
    story.append(Spacer(1, 40))
    
    # Brand Name and Subtitle
    brand_style = ParagraphStyle(
        'CoverBrand',
        fontName=font_bold,
        fontSize=34,
        leading=40,
        textColor=HexColor('#C74B6E'),
        alignment=1
    )
    cover_sub_style = ParagraphStyle(
        'CoverSub',
        fontName=font_normal,
        fontSize=12,
        leading=16,
        textColor=HexColor('#D4AF37'), # Gold
        alignment=1,
        spaceAfter=10
    )
    cover_info_style = ParagraphStyle(
        'CoverInfo',
        fontName=font_normal,
        fontSize=10,
        leading=15,
        textColor=HexColor('#5E5C68'),
        alignment=1
    )
    
    story.append(Paragraph("VALEN MAKEUP", brand_style))
    story.append(Spacer(1, 10))
    story.append(Paragraph("C A T Á L O G O   D E   P R O D U C T O S", cover_sub_style))
    story.append(Paragraph("Belleza, Maquillaje y Accesorios Exclusivos", cover_info_style))
    
    story.append(Spacer(1, 120))
    story.append(Paragraph("Visítanos en: <b>valen-makeup.vercel.app</b>", cover_info_style))
    story.append(Paragraph("Síguenos en Instagram: <b>@valen_makeup</b>", cover_info_style))
    story.append(Paragraph("Edición 2026", cover_info_style))
    
    story.append(PageBreak()) # Move to next page
    
    # 3. Product Cards Grid loop
    is_first = True
    for cat in sorted_cats:
        cat_products = categories_map[cat]
        if not cat_products:
            continue
            
        # Add Page Break between categories to maintain clean separation
        if not is_first:
            story.append(PageBreak())
        else:
            is_first = False
            
        # Category Title Page Header
        story.append(Spacer(1, 5))
        story.append(Paragraph(cat.upper(), category_style))
        
        # Build Grid cells
        table_rows = []
        for row_items in chunk_list(cat_products, 3):
            row_cells = []
            for item in row_items:
                # Generate single card table
                img_flowable = get_product_image(item.get('image'), max_width=120, max_height=110)
                name_para = Paragraph(item.get('name', 'Producto'), name_style)
                price_para = Paragraph(format_price(item.get('price', 0)), price_style)
                
                # Nested table for the card structure (1 col, 3 rows)
                card_data = [
                    [img_flowable],
                    [name_para],
                    [price_para]
                ]
                
                # Total height of card is 115 (Image) + 40 (Name) + 20 (Price) = 175 points
                card_table = Table(card_data, colWidths=[164], rowHeights=[115, 42, 18])
                card_table.setStyle(TableStyle([
                    ('ALIGN', (0,0), (-1,-1), 'CENTER'),
                    ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
                    ('VALIGN', (0,1), (0,1), 'TOP'), # Align name text to the top
                    ('BACKGROUND', (0,0), (-1,-1), HexColor('#FFFFFF')),
                    ('BOX', (0,0), (-1,-1), 0.5, HexColor('#F2DFE2')), # Very light rose border
                    ('TOPPADDING', (0,0), (-1,-1), 4),
                    ('BOTTOMPADDING', (0,0), (-1,-1), 4),
                    ('LEFTPADDING', (0,0), (-1,-1), 4),
                    ('RIGHTPADDING', (0,0), (-1,-1), 4),
                ]))
                row_cells.append(card_table)
                
            # Pad empty row cells with empty string
            while len(row_cells) < 3:
                row_cells.append("")
                
            table_rows.append(row_cells)
            
        # Create Outer grid table
        # 3 columns of 180 points = 540 points total printable width.
        # Height of each row is 205 (which gives 30 points of vertical space between cards).
        grid_table = Table(table_rows, colWidths=[180, 180, 180], rowHeights=[205] * len(table_rows))
        grid_table.setStyle(TableStyle([
            ('ALIGN', (0,0), (-1,-1), 'CENTER'),
            ('VALIGN', (0,0), (-1,-1), 'MIDDLE'),
            ('LEFTPADDING', (0,0), (-1,-1), 0),
            ('RIGHTPADDING', (0,0), (-1,-1), 0),
            ('TOPPADDING', (0,0), (-1,-1), 0),
            ('BOTTOMPADDING', (0,0), (-1,-1), 0),
        ]))
        
        story.append(grid_table)
        
    # 4. Closing Page
    story.append(PageBreak())
    story.append(Spacer(1, 150))
    if os.path.exists(LOGO_PATH):
        try:
            story.append(RLImage(LOGO_PATH, width=120, height=120))
        except:
            story.append(Spacer(1, 120))
    else:
        story.append(Spacer(1, 120))
        
    story.append(Spacer(1, 30))
    
    closing_title_style = ParagraphStyle(
        'ClosingTitle',
        fontName=font_bold,
        fontSize=20,
        leading=24,
        textColor=HexColor('#C74B6E'),
        alignment=1,
        spaceAfter=15
    )
    closing_text_style = ParagraphStyle(
        'ClosingText',
        fontName=font_normal,
        fontSize=11,
        leading=16,
        textColor=HexColor('#5E5C68'),
        alignment=1
    )
    
    story.append(Paragraph("¡Gracias por tu preferencia!", closing_title_style))
    story.append(Paragraph("Esperamos haberte ayudado a encontrar el complemento perfecto para resaltar tu belleza y estilo único.", closing_text_style))
    story.append(Spacer(1, 40))
    
    story.append(Paragraph("Haz tus pedidos directamente en nuestro sitio web:", closing_text_style))
    story.append(Paragraph("<font size=13 color='#C74B6E'><b>valen-makeup.vercel.app</b></font>", ParagraphStyle('WebLink', parent=closing_text_style, spaceBefore=5, spaceAfter=20)))
    
    story.append(Paragraph("O contáctanos en Instagram:", closing_text_style))
    story.append(Paragraph("<font size=12 color='#D4AF37'><b>@valen_makeup</b></font>", ParagraphStyle('InstaLink', parent=closing_text_style, spaceBefore=5)))
    
    # Build Document
    print("Building PDF structure...")
    doc.build(
        story,
        onFirstPage=draw_cover_background,
        onLaterPages=draw_later_background
    )
    print(f"Catalog generated successfully at: {OUTPUT_PDF}")


if __name__ == '__main__':
    generate_catalog()
