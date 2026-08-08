from PIL import Image
from pathlib import Path
logo_path = Path('Logo.jpeg')
if not logo_path.exists():
    raise SystemExit('Logo.jpeg not found')
img = Image.open(logo_path).convert('RGBA')
size = min(img.width, img.height)
left = (img.width - size) // 2
top = (img.height - size) // 2
img = img.crop((left, top, left + size, top + size))
img.save('favicon.ico', sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)])
img.resize((180, 180), Image.LANCZOS).save('apple-touch-icon.png')
print('generated favicon.ico and apple-touch-icon.png')
