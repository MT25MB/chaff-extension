# make_icons.py — generates placeholder icons
from PIL import Image, ImageDraw
import os

os.makedirs('icons', exist_ok=True)

for size in [16, 48, 128]:
    img = Image.new('RGBA', (size, size), (10, 10, 15, 255))
    draw = ImageDraw.Draw(img)
    # Draw a simple lightning bolt shape in green
    margin = size // 6
    mid = size // 2
    pts = [
        (mid + margin, margin),
        (mid - margin//2, mid),
        (mid + margin//2, mid),
        (mid - margin, size - margin),
        (mid + margin//2, mid + margin//2),
        (mid - margin//2, mid + margin//2),
    ]
    draw.polygon(pts, fill=(74, 222, 128, 255))
    img.save(f'icons/icon{size}.png')
    print(f'Created icons/icon{size}.png')

print('Icons created!')