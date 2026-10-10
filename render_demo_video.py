import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont
import imageio

WIDTH = 544   # Divisible by 16 for perfect MP4 encoding
HEIGHT = 960  # 9:16 vertical video
FPS = 24
TOTAL_SECONDS = 25
TOTAL_FRAMES = FPS * TOTAL_SECONDS

OUTPUT_FILE = 'video_demo_valen.mp4'

# Fonts
try:
    font_title = ImageFont.truetype('arialbd.ttf', 24)
    font_subtitle = ImageFont.truetype('arialbd.ttf', 17)
    font_body = ImageFont.truetype('arial.ttf', 15)
    font_bold = ImageFont.truetype('arialbd.ttf', 15)
    font_small = ImageFont.truetype('arial.ttf', 12)
    font_badge = ImageFont.truetype('arialbd.ttf', 12)
    font_caption = ImageFont.truetype('arialbd.ttf', 16)
except Exception:
    font_title = ImageFont.load_default()
    font_subtitle = font_title
    font_body = font_title
    font_bold = font_title
    font_small = font_title
    font_badge = font_title
    font_caption = font_title

# Load assets
def load_thumb(path, size=(110, 110)):
    if os.path.exists(path):
        try:
            im = Image.open(path).convert('RGB')
            return im.resize(size, Image.Resampling.LANCZOS)
        except Exception:
            pass
    im = Image.new('RGB', size, (255, 200, 220))
    return im

logo_img = load_thumb('Logo.jpeg', (42, 42))
p1_img = load_thumb('img/product_1.jpg', (120, 120))
p2_img = load_thumb('img/product_10.jpg', (120, 120))
p3_img = load_thumb('img/product_100.jpg', (120, 120))
p4_img = load_thumb('img/product_101.jpg', (120, 120))

# Colors
C_DARK_BG = (18, 7, 26)
C_PHONE_FRAME = (35, 15, 42)
C_SCREEN_BG = (253, 242, 248) # #fdf2f8
C_PINK = (255, 45, 135)       # #ff2d87
C_PURPLE = (121, 40, 202)     # #7928ca
C_DARK = (30, 27, 75)
C_WHITE = (255, 255, 255)
C_GRAY = (148, 163, 184)
C_GREEN = (37, 211, 102)

PHONE_X = 22
PHONE_Y = 25
PHONE_W = 500
PHONE_H = 910
PHONE_R = 36

def create_base_canvas():
    canvas = Image.new('RGB', (WIDTH, HEIGHT), C_DARK_BG)
    draw = ImageDraw.Draw(canvas)
    
    # Stylish subtle ambient glow in background
    for r in range(120, 0, -10):
        alpha = int((1 - r / 120) * 40)
        draw.ellipse([WIDTH//2 - r*2, HEIGHT//2 - r*2, WIDTH//2 + r*2, HEIGHT//2 + r*2], outline=(alpha + 20, 10, alpha + 30))

    # Phone border
    draw.rounded_rectangle([PHONE_X, PHONE_Y, PHONE_X + PHONE_W, PHONE_Y + PHONE_H], radius=PHONE_R, fill=C_SCREEN_BG, outline=C_PINK, width=3)
    
    # Dynamic Island
    island_w = 110
    island_h = 24
    island_x = PHONE_X + (PHONE_W - island_w) // 2
    draw.rounded_rectangle([island_x, PHONE_Y + 10, island_x + island_w, PHONE_Y + 10 + island_h], radius=12, fill=(0, 0, 0))
    
    return canvas

def draw_finger(draw, x, y, tap=False):
    r = 16 if not tap else 12
    # Outer glow
    draw.ellipse([x - r - 6, y - r - 6, x + r + 6, y + r + 6], outline=(255, 45, 135), width=2)
    # Inner circle
    fill_col = (255, 45, 135) if tap else (255, 100, 170)
    draw.ellipse([x - r, y - r, x + r, y + r], fill=fill_col, outline=C_WHITE, width=2)

def draw_caption(draw, step_text, caption_text):
    box_w = 460
    box_h = 66
    box_x = (WIDTH - box_w) // 2
    box_y = HEIGHT - 92
    
    draw.rounded_rectangle([box_x, box_y, box_x + box_w, box_y + box_h], radius=14, fill=(15, 4, 22), outline=C_PINK, width=2)
    
    # Step Badge
    badge_w = 140
    badge_h = 20
    draw.rounded_rectangle([box_x + 12, box_y + 8, box_x + 12 + badge_w, box_y + 8 + badge_h], radius=6, fill=C_PINK)
    draw.text((box_x + 18, box_y + 11), step_text, font=font_badge, fill=C_WHITE)
    
    # Caption
    draw.text((box_x + 14, box_y + 34), caption_text, font=font_caption, fill=C_WHITE)

def draw_screen_header(canvas, fav_count=0, cart_count=0):
    draw = ImageDraw.Draw(canvas)
    header_y = PHONE_Y + 40
    header_h = 56
    
    # Header bg
    draw.rectangle([PHONE_X + 2, header_y, PHONE_X + PHONE_W - 2, header_y + header_h], fill=C_WHITE)
    
    # Logo
    canvas.paste(logo_img, (PHONE_X + 16, header_y + 7))
    
    # Store Name
    draw.text((PHONE_X + 66, header_y + 16), "Valen Makeup Store", font=font_title, fill=C_DARK)
    
    # Header Icons
    fav_x = PHONE_X + PHONE_W - 90
    cart_x = PHONE_X + PHONE_W - 45
    
    draw.text((fav_x, header_y + 18), "♥", font=font_title, fill=C_PINK if fav_count > 0 else C_GRAY)
    if fav_count > 0:
        draw.ellipse([fav_x + 14, header_y + 10, fav_x + 28, header_y + 24], fill=C_PINK)
        draw.text((fav_x + 18, header_y + 11), str(fav_count), font=font_small, fill=C_WHITE)
        
    draw.text((cart_x, header_y + 18), "🛍", font=font_title, fill=C_PURPLE)
    if cart_count > 0:
        draw.ellipse([cart_x + 14, header_y + 10, cart_x + 30, header_y + 24], fill=C_PINK)
        draw.text((cart_x + 19, header_y + 11), str(cart_count), font=font_small, fill=C_WHITE)
        
    # Top announcement bar
    bar_y = header_y + header_h
    draw.rectangle([PHONE_X + 2, bar_y, PHONE_X + PHONE_W - 2, bar_y + 26], fill=C_PURPLE)
    draw.text((PHONE_X + 20, bar_y + 6), "🚚 Domicilios Pereira y Dosquebradas | Pago Contraentrega ✨", font=font_badge, fill=C_WHITE)

def draw_catalog_cards(canvas, offset_y=0, search_text="Buscar producto o categoría...", selected_cat="Todas", fav1=False):
    draw = ImageDraw.Draw(canvas)
    start_y = PHONE_Y + 124 + offset_y
    
    # Search box
    draw.rounded_rectangle([PHONE_X + 16, start_y + 10, PHONE_X + PHONE_W - 16, start_y + 44], radius=18, fill=C_WHITE, outline=(251, 207, 232), width=2)
    draw.text((PHONE_X + 30, start_y + 18), f"🔍 {search_text}", font=font_bold if search_text != "Buscar producto o categoría..." else font_body, fill=C_DARK if search_text != "Buscar producto o categoría..." else C_GRAY)
    
    # Category Pills
    pills_y = start_y + 54
    cats = [("Todas", 70), ("Labiales", 80), ("Sombras", 80), ("Bases", 70)]
    cur_x = PHONE_X + 16
    for c_name, c_w in cats:
        is_active = (c_name == selected_cat)
        bg = C_PINK if is_active else C_WHITE
        fg = C_WHITE if is_active else C_PURPLE
        draw.rounded_rectangle([cur_x, pills_y, cur_x + c_w, pills_y + 28], radius=14, fill=bg, outline=C_PINK if is_active else (251, 207, 232))
        draw.text((cur_x + 14, pills_y + 6), c_name, font=font_badge, fill=fg)
        cur_x += c_w + 10
        
    # Products Grid (2 columns)
    card_w = (PHONE_W - 44) // 2
    card_h = 230
    grid_y = pills_y + 38
    
    cards = [
        (PHONE_X + 16, grid_y, p1_img, "Gloss Brillo Y2K", "$18.000", fav1),
        (PHONE_X + 28 + card_w, grid_y, p2_img, "Paleta Glam Pink", "$35.000", False),
        (PHONE_X + 16, grid_y + card_h + 12, p3_img, "Base Cobertura Mate", "$28.000", False),
        (PHONE_X + 28 + card_w, grid_y + card_h + 12, p4_img, "Iluminador Baked Glow", "$22.000", False),
    ]
    
    for cx, cy, img, title, price, is_fav in cards:
        if cy + card_h > PHONE_Y + PHONE_H - 100 or cy < PHONE_Y + 120:
            continue
        draw.rounded_rectangle([cx, cy, cx + card_w, cy + card_h], radius=14, fill=C_WHITE, outline=(251, 207, 232), width=1)
        canvas.paste(img, (cx + (card_w - 120)//2, cy + 12))
        
        # Fav heart icon
        heart_x = cx + card_w - 32
        draw.ellipse([heart_x, cy + 8, heart_x + 24, cy + 32], fill=(255, 235, 245))
        draw.text((heart_x + 6, cy + 12), "♥", font=font_bold, fill=C_PINK if is_fav else C_GRAY)
        
        draw.text((cx + 12, cy + 142), title, font=font_bold, fill=C_DARK)
        draw.text((cx + 12, cy + 164), price, font=font_title, fill=C_PINK)
        
        # Add button
        btn_y = cy + 194
        draw.rounded_rectangle([cx + 10, btn_y, cx + card_w - 10, btn_y + 26], radius=8, fill=C_PINK)
        draw.text((cx + 36, btn_y + 6), "+ Agregar", font=font_badge, fill=C_WHITE)

    # Floating Lucky Wheel Button
    fw_x = PHONE_X + 20
    fw_y = PHONE_Y + PHONE_H - 110
    draw.rounded_rectangle([fw_x, fw_y, fw_x + 140, fw_y + 36], radius=18, fill=C_PINK, outline=C_WHITE, width=2)
    draw.text((fw_x + 14, fw_y + 10), "🎡 Girar Ruleta", font=font_bold, fill=C_WHITE)

def draw_lucky_wheel_modal(canvas, angle_deg, show_win=False):
    draw = ImageDraw.Draw(canvas)
    
    # Semi-transparent dark overlay
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (15, 4, 22, 180))
    canvas.paste(Image.alpha_composite(canvas.convert('RGBA'), overlay).convert('RGB'))
    
    # Modal Card
    card_w = 400
    card_h = 510
    card_x = PHONE_X + (PHONE_W - card_w) // 2
    card_y = PHONE_Y + 160
    
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=24, fill=C_WHITE, outline=C_PINK, width=3)
    
    draw.text((card_x + 80, card_y + 20), "🎡 Ruleta de la Suerte", font=font_title, fill=C_PURPLE)
    draw.text((card_x + 50, card_y + 54), "¡Gira y gana descuentos o regalos exclusivos!", font=font_small, fill=C_GRAY)
    
    # Wheel circle
    wheel_cx = card_x + card_w // 2
    wheel_cy = card_y + 210
    wheel_r = 120
    
    sectors = [
        ("10% DTO", C_PINK),
        ("Envío Gratis", C_PURPLE),
        ("$5.000 DTO", (236, 72, 153)),
        ("15% DTO", (147, 51, 234)),
        ("Gloss Gratis", (219, 39, 119)),
    ]
    
    num = len(sectors)
    arc_deg = 360 / num
    
    for i, (sec_name, sec_col) in enumerate(sectors):
        start_a = angle_deg + i * arc_deg
        end_a = start_a + arc_deg
        draw.pieslice([wheel_cx - wheel_r, wheel_cy - wheel_r, wheel_cx + wheel_r, wheel_cy + wheel_r],
                      start=start_a, end=end_a, fill=sec_col, outline=C_WHITE, width=2)
        
        # Sector label
        mid_rad = math.radians(start_a + arc_deg / 2)
        text_x = wheel_cx + int((wheel_r - 40) * math.cos(mid_rad))
        text_y = wheel_cy + int((wheel_r - 40) * math.sin(mid_rad))
        draw.text((text_x - 20, text_y - 6), sec_name, font=font_badge, fill=C_WHITE)
        
    # Center Pin
    draw.ellipse([wheel_cx - 16, wheel_cy - 16, wheel_cx + 16, wheel_cy + 16], fill=C_WHITE, outline=C_PINK, width=4)
    draw.polygon([(wheel_cx, wheel_cy - wheel_r - 10), (wheel_cx - 10, wheel_cy - wheel_r + 8), (wheel_cx + 10, wheel_cy - wheel_r + 8)], fill=C_PINK)
    
    # Spin button
    btn_y = card_y + 360
    draw.rounded_rectangle([card_x + 40, btn_y, card_x + card_w - 40, btn_y + 44], radius=14, fill=C_PINK)
    draw.text((card_x + 130, btn_y + 12), "GIRAR RULETA", font=font_bold, fill=C_WHITE)
    
    # Winning Card
    if show_win:
        win_y = card_y + 418
        draw.rounded_rectangle([card_x + 20, win_y, card_x + card_w - 20, win_y + 70], radius=12, fill=C_SCREEN_BG, outline=C_PINK, width=2)
        draw.text((card_x + 75, win_y + 10), "🎉 ¡Ganaste 10% DTO en tu compra!", font=font_bold, fill=C_PURPLE)
        draw.text((card_x + 95, win_y + 34), "Cupón Aplicado: VALEN10", font=font_title, fill=C_PINK)

def draw_cart_drawer(canvas, city="Pereira", coupon_applied=True):
    draw = ImageDraw.Draw(canvas)
    
    # Drawer overlay
    overlay = Image.new('RGBA', (WIDTH, HEIGHT), (15, 4, 22, 160))
    canvas.paste(Image.alpha_composite(canvas.convert('RGBA'), overlay).convert('RGB'))
    
    drawer_h = 580
    drawer_y = PHONE_Y + PHONE_H - drawer_h
    
    draw = ImageDraw.Draw(canvas)
    draw.rounded_rectangle([PHONE_X + 2, drawer_y, PHONE_X + PHONE_W - 2, PHONE_Y + PHONE_H], radius=24, fill=C_WHITE, outline=C_PINK, width=2)
    
    # Drawer header
    draw.text((PHONE_X + 24, drawer_y + 20), "🛍️ Tu Carrito de Compras", font=font_title, fill=C_DARK)
    
    # Free shipping progress bar
    bar_y = drawer_y + 56
    draw.rounded_rectangle([PHONE_X + 20, bar_y, PHONE_X + PHONE_W - 20, bar_y + 38], radius=10, fill=C_SCREEN_BG)
    draw.text((PHONE_X + 32, bar_y + 6), "🚚 ¡Te faltan $15.000 para Envío Gratis!", font=font_badge, fill=C_PURPLE)
    draw.rounded_rectangle([PHONE_X + 32, bar_y + 24, PHONE_X + PHONE_W - 32, bar_y + 30], radius=3, fill=(251, 207, 232))
    draw.rounded_rectangle([PHONE_X + 32, bar_y + 24, PHONE_X + 340, bar_y + 30], radius=3, fill=C_PINK)
    
    # Cart items list
    item1_y = bar_y + 48
    draw.rounded_rectangle([PHONE_X + 20, item1_y, PHONE_X + PHONE_W - 20, item1_y + 56], radius=10, fill=C_SCREEN_BG)
    canvas.paste(p1_img.resize((42, 42)), (PHONE_X + 30, item1_y + 7))
    draw.text((PHONE_X + 82, item1_y + 10), "Gloss Brillo Mágico Y2K", font=font_bold, fill=C_DARK)
    draw.text((PHONE_X + 82, item1_y + 30), "$18.000 x 1 unidad", font=font_body, fill=C_PINK)
    
    item2_y = item1_y + 64
    draw.rounded_rectangle([PHONE_X + 20, item2_y, PHONE_X + PHONE_W - 20, item2_y + 56], radius=10, fill=C_SCREEN_BG)
    canvas.paste(p2_img.resize((42, 42)), (PHONE_X + 30, item2_y + 7))
    draw.text((PHONE_X + 82, item2_y + 10), "Paleta Sombras Glam Pink", font=font_bold, fill=C_DARK)
    draw.text((PHONE_X + 82, item2_y + 30), "$35.000 x 1 unidad", font=font_body, fill=C_PINK)
    
    # City delivery toggle
    city_y = item2_y + 68
    draw.text((PHONE_X + 24, city_y), "Ciudad de Entrega:", font=font_bold, fill=C_DARK)
    
    btn_p_active = (city == "Pereira")
    btn_d_active = (city == "Dosquebradas")
    
    draw.rounded_rectangle([PHONE_X + 20, city_y + 20, PHONE_X + 240, city_y + 52], radius=10,
                           fill=C_PINK if btn_p_active else C_WHITE, outline=C_PINK)
    draw.text((PHONE_X + 50, city_y + 28), "Pereira ($7.000)", font=font_badge, fill=C_WHITE if btn_p_active else C_DARK)
    
    draw.rounded_rectangle([PHONE_X + 250, city_y + 20, PHONE_X + PHONE_W - 20, city_y + 52], radius=10,
                           fill=C_PINK if btn_d_active else C_WHITE, outline=C_PINK)
    draw.text((PHONE_X + 265, city_y + 28), "Dosquebradas ($8.000)", font=font_badge, fill=C_WHITE if btn_d_active else C_DARK)
    
    # Coupon code
    coup_y = city_y + 62
    draw.rounded_rectangle([PHONE_X + 20, coup_y, PHONE_X + PHONE_W - 130, coup_y + 32], radius=8, fill=C_WHITE, outline=C_PINK)
    draw.text((PHONE_X + 32, coup_y + 8), "VALEN10", font=font_bold, fill=C_PINK)
    draw.rounded_rectangle([PHONE_X + PHONE_W - 120, coup_y, PHONE_X + PHONE_W - 20, coup_y + 32], radius=8, fill=C_PURPLE)
    draw.text((PHONE_X + PHONE_W - 105, coup_y + 8), "Aplicado ✓", font=font_badge, fill=C_WHITE)
    
    # Totals
    fee = 7000 if city == "Pereira" else 8000
    subtotal = 53000
    discount = 5300 if coupon_applied else 0
    total = subtotal - discount + fee
    
    tot_y = coup_y + 42
    draw.rounded_rectangle([PHONE_X + 20, tot_y, PHONE_X + PHONE_W - 20, tot_y + 88], radius=10, fill=C_SCREEN_BG)
    draw.text((PHONE_X + 32, tot_y + 8), f"Subtotal: ${subtotal:,}", font=font_body, fill=C_DARK)
    if coupon_applied:
        draw.text((PHONE_X + 32, tot_y + 28), f"Descuento Ruleta (10%): -${discount:,}", font=font_body, fill=(21, 128, 61))
    draw.text((PHONE_X + 32, tot_y + 48), f"Domicilio {city}: ${fee:,}", font=font_body, fill=C_DARK)
    draw.text((PHONE_X + 32, tot_y + 68), f"TOTAL A PAGAR: ${total:,}", font=font_title, fill=C_PINK)
    
    # WhatsApp Button
    wa_y = tot_y + 96
    draw.rounded_rectangle([PHONE_X + 20, wa_y, PHONE_X + PHONE_W - 20, wa_y + 46], radius=12, fill=C_GREEN)
    draw.text((PHONE_X + 115, wa_y + 14), "💬 Pedir por WhatsApp", font=font_bold, fill=C_WHITE)

print(f"Generando video completo '{OUTPUT_FILE}' ({WIDTH}x{HEIGHT} a {FPS} FPS, {TOTAL_SECONDS}s)...")
writer = imageio.get_writer(OUTPUT_FILE, fps=FPS, quality=8, macro_block_size=16)

for f in range(TOTAL_FRAMES):
    t = f / FPS
    canvas = create_base_canvas()
    
    # Scene 1: 0s - 4s (Exploración del Catálogo)
    if t < 4.0:
        scroll_y = int(- (t / 4.0) * 80)
        draw_catalog_cards(canvas, offset_y=scroll_y)
        draw_screen_header(canvas, fav_count=0, cart_count=0)
        draw_caption(ImageDraw.Draw(canvas), "Paso 1: Catálogo", "Explora el catálogo en vivo con fotos HD y precios en COP ✨")
        # Finger movement
        fx = 250
        fy = 500 - int((t / 4.0) * 150)
        draw_finger(ImageDraw.Draw(canvas), fx, fy, tap=False)
        
    # Scene 2: 4s - 8s (Búsqueda y Filtro de Categoría)
    elif t < 8.0:
        draw_catalog_cards(canvas, offset_y=0, search_text="Gloss..." if t > 5.5 else "Buscar...", selected_cat="Labiales" if t > 6.8 else "Todas")
        draw_screen_header(canvas, fav_count=0, cart_count=0)
        draw_caption(ImageDraw.Draw(canvas), "Paso 2: Búsqueda y Filtros", "Buscador instantáneo en vivo y filtros por categorías 🔍💄")
        if t < 6.0:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 200, PHONE_Y + 150, tap=True)
        else:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 130, PHONE_Y + 195, tap=True)
            
    # Scene 3: 8s - 12s (Favoritos y Agregar al Carrito)
    elif t < 12.0:
        is_fav = (t > 9.2)
        cart_c = 1 if (t > 10.2 and t <= 11.2) else (2 if t > 11.2 else 0)
        draw_catalog_cards(canvas, offset_y=0, fav1=is_fav)
        draw_screen_header(canvas, fav_count=1 if is_fav else 0, cart_count=cart_c)
        draw_caption(ImageDraw.Draw(canvas), "Paso 3: Favoritos y Carrito", "Guarda tus favoritos con un toque y añade al carrito 💖🛍️")
        if t < 9.5:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 225, PHONE_Y + 235, tap=True) # Heart
        elif t < 11.0:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 130, PHONE_Y + 415, tap=True) # Add 1
        else:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 370, PHONE_Y + 415, tap=True) # Add 2
            
    # Scene 4: 12s - 18s (Ruleta de la Suerte)
    elif t < 18.0:
        draw_catalog_cards(canvas, offset_y=0)
        draw_screen_header(canvas, fav_count=1, cart_count=2)
        
        rel_t = t - 12.0
        if rel_t < 1.0:
            # Tap floating wheel
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 80, PHONE_Y + PHONE_H - 95, tap=True)
            draw_caption(ImageDraw.Draw(canvas), "Paso 4: Ruleta de la Suerte", "¡Toca la Ruleta Flotante para ganar premios reales! 🎡🎁")
        else:
            # Wheel spinning
            spin_t = rel_t - 1.0
            spin_angle = (spin_t * 540) % 360 if spin_t < 3.2 else 18.0
            show_winner = spin_t >= 3.2
            draw_lucky_wheel_modal(canvas, angle_deg=spin_angle, show_win=show_winner)
            draw_caption(ImageDraw.Draw(canvas), "Paso 4: ¡Girando Ruleta!", "¡Gana 10% DTO, Domicilio Gratis o Regalos para tu pedido! 🎉" if not show_winner else "¡Ganaste 10% DTO! Cupón VALEN10 aplicado automáticamente ✨")
            if spin_t < 1.2:
                draw_finger(ImageDraw.Draw(canvas), PHONE_X + PHONE_W//2, PHONE_Y + 540, tap=True)
                
    # Scene 5: 18s - 22s (Carrito Inteligente y Flete)
    elif t < 22.0:
        rel_t = t - 18.0
        city = "Pereira" if rel_t < 2.0 else "Dosquebradas"
        draw_screen_header(canvas, fav_count=1, cart_count=2)
        draw_cart_drawer(canvas, city=city, coupon_applied=True)
        draw_caption(ImageDraw.Draw(canvas), "Paso 5: Carrito Inteligente", "Selecciona Pereira o Dosquebradas: Flete calculado en vivo 🚚📍")
        if rel_t < 2.0:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 130, PHONE_Y + PHONE_H - 260, tap=True)
        else:
            draw_finger(ImageDraw.Draw(canvas), PHONE_X + 360, PHONE_Y + PHONE_H - 260, tap=True)
            
    # Scene 6: 22s - 25s (Checkout WhatsApp)
    else:
        draw_screen_header(canvas, fav_count=1, cart_count=2)
        draw_cart_drawer(canvas, city="Dosquebradas", coupon_applied=True)
        draw_caption(ImageDraw.Draw(canvas), "Paso 6: Pedido por WhatsApp", "¡Listo! Un solo toque y tu pedido se envía a WhatsApp 💬🌸")
        draw_finger(ImageDraw.Draw(canvas), PHONE_X + PHONE_W//2, PHONE_Y + PHONE_H - 55, tap=True)

    frame_arr = np.array(canvas)
    writer.append_data(frame_arr)
    
    if f % (FPS * 5) == 0:
        print(f"Progreso render: {int((f / TOTAL_FRAMES) * 100)}%...")

writer.close()
print(f"¡VIDEO GENERADO EXITOSAMENTE! Archivo: '{os.path.abspath(OUTPUT_FILE)}' ({os.path.getsize(OUTPUT_FILE) / (1024*1024):.2f} MB)")
