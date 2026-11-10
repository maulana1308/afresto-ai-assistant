import os
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import numpy as np
from collections import deque

def isolate_mascot(input_path, output_path):
    print(f"Loading user uploaded image from {input_path}...")
    orig = Image.open(input_path).convert('RGB')
    arr = np.array(orig)
    h, w, _ = arr.shape
    
    # Background criteria:
    # Background is off-white/light grey (min RGB > 215, color spread max - min <= 22)
    # Exclude golden burst (R > 200, B < 80, spread > 120) and dark outlines
    def is_bg_pixel(r, g, b):
        r, g, b = int(r), int(g), int(b)
        min_c = min(r, g, b)
        max_c = max(r, g, b)
        return min_c > 215 and (max_c - min_c) <= 22

    visited = np.zeros((h, w), dtype=bool)
    is_bg = np.zeros((h, w), dtype=bool)
    queue = deque()

    # Seed from borders (skipping top row where ear tip is)
    for x in range(w):
        if is_bg_pixel(*arr[0, x]):
            queue.append((0, x))
            visited[0, x] = True
        if is_bg_pixel(*arr[h-1, x]):
            queue.append((h-1, x))
            visited[h-1, x] = True

    for y in range(h):
        if is_bg_pixel(*arr[y, 0]):
            queue.append((y, 0))
            visited[y, 0] = True
        if is_bg_pixel(*arr[y, w-1]):
            queue.append((y, w-1))
            visited[y, w-1] = True

    while queue:
        cy, cx = queue.popleft()
        is_bg[cy, cx] = True
        for dy, dx in [(-1,0),(1,0),(0,-1),(0,1)]:
            ny, nx = cy + dy, cx + dx
            if 0 <= ny < h and 0 <= nx < w and not visited[ny, nx]:
                visited[ny, nx] = True
                if is_bg_pixel(*arr[ny, nx]):
                    queue.append((ny, nx))

    fg_mask = (~is_bg).astype(np.uint8) * 255
    mask_img = Image.fromarray(fg_mask, mode='L')
    
    # Smooth edges with slight Gaussian blur for clean anti-aliasing
    mask_smooth = mask_img.filter(ImageFilter.GaussianBlur(radius=0.75))
    
    rgba = orig.convert('RGBA')
    rgba.putalpha(mask_smooth)
    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    rgba.save(output_path)
    print(f"Isolated HD mascot saved to {output_path} (size: {rgba.size}, bbox: {rgba.getbbox()})")
    return rgba

def build_banner(mascot_img, out_paths):
    width = 446
    height = 248
    
    # Background: clean soft ivory/white gradient
    banner = Image.new('RGBA', (width, height), (255, 255, 255, 255))
    draw = ImageDraw.Draw(banner)
    
    for y in range(height):
        r = int(255 - (y / height) * 4)
        g = int(255 - (y / height) * 2)
        b = int(255 - (y / height) * 6)
        draw.line([(0, y), (width, y)], fill=(r, g, b, 255))
        
    # Subtle geometric confetti
    accent_overlay = Image.new('RGBA', (width, height), (0, 0, 0, 0))
    accent_draw = ImageDraw.Draw(accent_overlay)
    
    confetti = [
        (370, 20, 6, (244, 180, 0, 180)),
        (410, 50, 5, (244, 180, 0, 160)),
        (310, 15, 4, (244, 180, 0, 150)),
        (240, 30, 5, (27, 143, 62, 140)),
        (425, 90, 4, (27, 143, 62, 150)),
        (260, 95, 5, (244, 180, 0, 160)),
        (375, 110, 6, (27, 143, 62, 160)),
        (335, 65, 3, (244, 180, 0, 140)),
        (415, 130, 5, (244, 180, 0, 150)),
        (290, 110, 4, (27, 143, 62, 140)),
        (350, 165, 5, (244, 180, 0, 120)),
        (420, 190, 4, (27, 143, 62, 120))
    ]
    for cx, cy, sz, col in confetti:
        pts = [(cx, cy - sz), (cx + sz, cy), (cx, cy + sz), (cx - sz, cy)]
        accent_draw.polygon(pts, fill=col)
        
    banner = Image.alpha_composite(banner, accent_overlay)
    
    # Scale and composite mascot on the left
    target_h = 238
    target_w = int(mascot_img.width * (target_h / mascot_img.height))
    mascot_scaled = mascot_img.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    banner.alpha_composite(mascot_scaled, (6, 5))
    
    # Typography
    draw = ImageDraw.Draw(banner)
    try:
        font_hi = ImageFont.truetype('segoeuib.ttf', 18)
        font_name = ImageFont.truetype('segoeuib.ttf', 24)
        font_sub = ImageFont.truetype('segoeuib.ttf', 14)
        font_badge = ImageFont.truetype('segoeui.ttf', 11)
        font_desc = ImageFont.truetype('segoeui.ttf', 12)
    except:
        font_hi = ImageFont.truetype('arialbd.ttf', 18)
        font_name = ImageFont.truetype('arialbd.ttf', 24)
        font_sub = ImageFont.truetype('arialbd.ttf', 14)
        font_badge = ImageFont.truetype('arial.ttf', 11)
        font_desc = ImageFont.truetype('arial.ttf', 12)

    text_x = max(target_w + 14, 228)
    
    # Top greetings (visible within standard 110px sidepanel view)
    draw.text((text_x, 10), "Hai!", font=font_hi, fill=(16, 140, 60, 255))
    draw.text((text_x + 1, 31), "Aku AFRESTO!", font=font_name, fill=(217, 119, 6, 60))
    draw.text((text_x, 30), "Aku AFRESTO!", font=font_name, fill=(13, 110, 48, 255))
    draw.text((text_x, 60), "Semangat bertemu", font=font_sub, fill=(21, 128, 61, 255))
    draw.text((text_x, 78), "denganmu!! ✨", font=font_sub, fill=(21, 128, 61, 255))
    
    # Badge Pill
    pill_w = 170
    pill_h = 24
    pill_y = 104
    pill_img = Image.new('RGBA', (width, height), (0,0,0,0))
    pdraw = ImageDraw.Draw(pill_img)
    pdraw.rounded_rectangle(
        [text_x, pill_y, text_x + pill_w, pill_y + pill_h], 
        radius=12, 
        fill=(244, 180, 0, 35), 
        outline=(244, 180, 0, 190), 
        width=1
    )
    banner = Image.alpha_composite(banner, pill_img)
    
    draw = ImageDraw.Draw(banner)
    draw.text((text_x + 10, pill_y + 4), "🦊 Maskot Sahabat Guru", font=font_badge, fill=(180, 83, 9, 255))
    
    # Bottom secondary text (visible when banner is expanded or in full asset view)
    draw.text((text_x, 144), "Mitra Cerdas Pembuat Soal & Materi", font=font_desc, fill=(100, 116, 139, 210))
    draw.text((text_x, 164), "Terintegrasi LMS Afresto CBT", font=font_desc, fill=(148, 163, 184, 200))
    
    for p in out_paths:
        os.makedirs(os.path.dirname(p), exist_ok=True)
        banner.save(p)
        print(f"Saved banner to {p}")

def build_icons(mascot_img, out_dirs):
    size = 512
    icon = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    
    padding = 24
    radius = 110
    
    # Shadow
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(
        [padding, padding + 8, size - padding, size - padding + 8],
        radius=radius,
        fill=(0, 0, 0, 40)
    )
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    icon = Image.alpha_composite(icon, shadow)
    
    # Main badge
    badge = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(badge)
    bdraw.rounded_rectangle(
        [padding, padding, size - padding, size - padding],
        radius=radius,
        fill=(255, 255, 255, 255),
        outline=(244, 180, 0, 230),
        width=14
    )
    bdraw.rounded_rectangle(
        [padding + 8, padding + 8, size - padding - 8, size - padding - 8],
        radius=radius - 6,
        outline=(27, 143, 62, 100),
        width=4
    )
    icon = Image.alpha_composite(icon, badge)
    
    # Crop head + chest + scarf
    crop = mascot_img.crop((60, 0, 480, 415))
    target_h = 410
    target_w = int(crop.width * (target_h / crop.height))
    crop_resized = crop.resize((target_w, target_h), Image.Resampling.LANCZOS)
    
    pos_x = (size - target_w) // 2
    pos_y = padding + 18
    
    icon.alpha_composite(crop_resized, (pos_x, pos_y))
    
    # Save icon512
    icon.save(r'scratch\icon512.png')
    
    sizes = {
        'icon128.png': 128,
        'icon48.png': 48,
        'icon32.png': 32,
        'icon16.png': 16
    }
    
    for d in out_dirs:
        os.makedirs(d, exist_ok=True)
        for name, sz in sizes.items():
            resized = icon.resize((sz, sz), Image.Resampling.LANCZOS)
            p = os.path.join(d, name)
            resized.save(p)
            print(f"Saved {p} ({sz}x{sz})")
            
        # Also generate app.ico
        ico_path = os.path.join(d, 'app.ico')
        icon.save(ico_path, format='ICO', sizes=[(16,16), (32,32), (48,48), (64,64), (128,128)])
        print(f"Saved {ico_path}")

if __name__ == '__main__':
    user_uploaded_img = r'C:\Users\maula\.gemini\antigravity\brain\65a63ff4-d55a-4f07-bad2-3379b5a10f8a\.user_uploaded\media_1794332201678_e69700cc.jpg'
    isolated_path = r'scratch\mascot_isolated_perfect.png'
    
    mascot = isolate_mascot(user_uploaded_img, isolated_path)
    
    banner_targets = [r'icons\banner.png', r'dist\icons\banner.png']
    build_banner(mascot, banner_targets)
    
    icon_dirs = [r'icons', r'dist\icons']
    build_icons(mascot, icon_dirs)
    
    print("\nAll assets built successfully from the HD uncropped mascot!")
