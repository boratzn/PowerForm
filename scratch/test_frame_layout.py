import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

WIDTH = 1080
HEIGHT = 1920

# Load fonts
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_MONO = "C:/Windows/Fonts/consola.ttf"

font_hero = ImageFont.truetype(FONT_BOLD, 54)
font_title1 = ImageFont.truetype(FONT_BOLD, 42)
font_title2 = ImageFont.truetype(FONT_BOLD, 42)
font_sub = ImageFont.truetype(FONT_REG, 23)
font_badge = ImageFont.truetype(FONT_BOLD, 20)
font_cta_btn = ImageFont.truetype(FONT_BOLD, 30)
font_card_head = ImageFont.truetype(FONT_BOLD, 30)
font_card_sub = ImageFont.truetype(FONT_REG, 22)
font_footer = ImageFont.truetype(FONT_BOLD, 20)

# Phone setup - Perfectly sized for safe zones
PHONE_SCREEN_W = 510
PHONE_SCREEN_H = int(PHONE_SCREEN_W / (461 / 1024)) # ~ 1133px
PHONE_BORDER = 12
PHONE_RADIUS = 38
FRAME_W = PHONE_SCREEN_W + PHONE_BORDER * 2 # 534
FRAME_H = PHONE_SCREEN_H + PHONE_BORDER * 2 # 1157

# App Icon
raw_icon = Image.open("scratch/icon.png").convert("RGBA")
icon_140 = raw_icon.resize((150, 150), Image.Resampling.LANCZOS)
icon_mask = Image.new("L", (150, 150), 0)
ImageDraw.Draw(icon_mask).rounded_rectangle([0, 0, 150, 150], radius=34, fill=255)
icon_rounded = Image.new("RGBA", (150, 150), (0, 0, 0, 0))
icon_rounded.paste(icon_140, (0, 0), mask=icon_mask)

# Cache screenshots with high-quality resampling
cached_screens = {}
screen_files = {
    "koc": "scratch/screens/screen_1.jpg",
    "food": "scratch/screens/screen_2.jpg",
    "nutrition": "scratch/screens/screen_4.jpg",
    "library": "scratch/screens/screen_3.jpg",
    "workout": "scratch/screens/screen_5.jpg",
}

for key, path in screen_files.items():
    raw = Image.open(path).convert("RGBA")
    resized = raw.resize((PHONE_SCREEN_W, PHONE_SCREEN_H), Image.Resampling.LANCZOS)
    mask = Image.new("L", (PHONE_SCREEN_W, PHONE_SCREEN_H), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, PHONE_SCREEN_W, PHONE_SCREEN_H], radius=26, fill=255)
    rounded = Image.new("RGBA", (PHONE_SCREEN_W, PHONE_SCREEN_H), (0, 0, 0, 0))
    rounded.paste(resized, (0, 0), mask=mask)
    cached_screens[key] = rounded

def draw_centered_text(draw, text, y, font, fill):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    x = (WIDTH - tw) // 2
    draw.text((x, y), text, font=font, fill=fill)
    return tw

def draw_pill(draw, text, y, bg_color, border_color, text_color):
    bbox = font_badge.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw = tw + 48
    ph = 44
    px = (WIDTH - pw) // 2
    draw.rounded_rectangle([px, y, px + pw, y + ph], radius=22, fill=bg_color, outline=border_color, width=2)
    tx = (WIDTH - tw) // 2
    ty = y + (ph - th) // 2 - 2
    draw.text((tx, ty), text, font=font_badge, fill=text_color)

def draw_check_circle(draw, cx, cy, radius=14, circle_color=(34, 197, 94)):
    """Draws a crisp geometric checkmark inside a colored circle"""
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=circle_color)
    # Checkmark lines
    pts = [(cx - 6, cy), (cx - 2, cy + 5), (cx + 6, cy - 4)]
    draw.line(pts, fill=(10, 15, 22), width=3)

def draw_phone(base_img, screen_key, accent_rgb, y_offset=0):
    draw = ImageDraw.Draw(base_img)
    x = (WIDTH - FRAME_W) // 2 # 273
    y = 395 + int(y_offset)

    # Ambient glow behind phone
    glow_w = 640
    glow_h = 1200
    glow_x = (WIDTH - glow_w) // 2
    glow_y = y - 20
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([glow_x, glow_y, glow_x + glow_w, glow_y + glow_h], fill=(*accent_rgb, 35))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=55))
    base_img.paste(glow, (0, 0), glow)

    # Phone Frame outer shadow & metallic bezel
    draw.rounded_rectangle(
        [x, y, x + FRAME_W, y + FRAME_H],
        radius=PHONE_RADIUS,
        fill=(16, 22, 32),
        outline=(*accent_rgb, 220),
        width=2
    )
    # Inner border
    draw.rounded_rectangle(
        [x + 3, y + 3, x + FRAME_W - 3, y + FRAME_H - 3],
        radius=PHONE_RADIUS - 3,
        outline=(38, 48, 65),
        width=2
    )

    # Paste Screenshot cleanly
    sx = x + PHONE_BORDER
    sy = y + PHONE_BORDER
    screen_img = cached_screens[screen_key]
    base_img.paste(screen_img, (sx, sy), screen_img)

    # Dynamic Island at top
    di_w = 110
    di_h = 24
    di_x = (WIDTH - di_w) // 2
    di_y = sy + 8
    draw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=12, fill=(8, 11, 16))
    draw.ellipse([di_x + di_w - 20, di_y + 6, di_x + di_w - 8, di_y + 18], fill=(20, 28, 40))

def draw_bottom_bar(draw, active_idx=0):
    # Safe zone progress bar at y=1590
    y = 1595
    dot_count = 5
    spacing = 26
    total_w = (dot_count - 1) * spacing
    start_x = (WIDTH - total_w) // 2
    for i in range(dot_count):
        cx = start_x + i * spacing
        cy = y
        if i == active_idx:
            draw.ellipse([cx - 7, cy - 7, cx + 7, cy + 7], fill=(34, 197, 94))
        else:
            draw.ellipse([cx - 4, cy - 4, cx + 4, cy + 4], fill=(71, 85, 105))

    draw_centered_text(draw, "POWERFORM  •  YENİ NESİL FITNESS", y + 26, font_footer, (148, 163, 184))

def render_scene(scene_id):
    img = Image.new("RGB", (WIDTH, HEIGHT), (9, 13, 20))
    draw = ImageDraw.Draw(img)

    # Ambient grid
    grid_spacing = 72
    for gx in range(0, WIDTH, grid_spacing):
        draw.line([(gx, 0), (gx, HEIGHT)], fill=(16, 23, 36), width=1)
    for gy in range(0, HEIGHT, grid_spacing):
        draw.line([(0, gy), (WIDTH, gy)], fill=(16, 23, 36), width=1)

    if scene_id == "hook":
        # Scene 0: Hook Intro
        draw_pill(draw, "SPOR SALONUNDA YALNIZ DEĞİLSİN", 210, (26, 38, 28), (34, 197, 94), (34, 197, 94))

        draw_centered_text(draw, "Antrenman & Beslenmeni", 295, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Şansa Bırakma!", 365, font_hero, (34, 197, 94))

        # Centered Feature Showcase Card
        card_y = 470
        card_w = 880
        card_h = 760
        card_x = (WIDTH - card_w) // 2
        draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=36, fill=(15, 21, 32), outline=(34, 197, 94), width=2)

        # App Logo & Branding
        img.paste(icon_rounded, (WIDTH // 2 - 75, card_y + 45), icon_rounded)
        draw_centered_text(draw, "POWERFORM", card_y + 215, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Akıllı Fitness & Beslenme Asistanı", card_y + 285, font_sub, (148, 163, 184))

        # Thin separator
        draw.line([(card_x + 60, card_y + 335), (card_x + card_w - 60, card_y + 335)], fill=(30, 41, 59), width=1)

        # 3 Key highlights with geometric checkmarks
        items = [
            ("Yapay Zeka Fitness Koçu", "Kişiselleştirilmiş alt & üst vücut planları"),
            ("Fotoğraftan Yemek Tanıma", "Tabağını çek, kalori & makrolar anında hazır"),
            ("Canlı Seans & 100+ Egzersiz", "Set, tekrar ve RIR ile sürekli gelişim"),
        ]
        for idx, (head, desc) in enumerate(items):
            iy = card_y + 375 + idx * 115
            # Draw check circle
            draw_check_circle(draw, card_x + 75, iy + 16, radius=16, circle_color=(34, 197, 94))
            draw.text((card_x + 115, iy), head, font=font_card_head, fill=(255, 255, 255))
            draw.text((card_x + 115, iy + 44), desc, font=font_card_sub, fill=(148, 163, 184))

        draw_centered_text(draw, "ÖZELLİKLERİ KEŞFET  ▼", 1320, font_badge, (34, 197, 94))
        draw_bottom_bar(draw, 0)

    elif scene_id == "koc":
        # Scene 1: AI Koc
        draw_pill(draw, "YAPAY ZEKA FITNESS KOÇU", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Sana Özel Antrenman Planı", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Saniyeler İçinde Hazır!", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Hedefine göre set, tekrar ve tükeniş stratejisi belirler.", 342, font_sub, (148, 163, 184))

        draw_phone(img, "koc", (34, 197, 94))
        draw_bottom_bar(draw, 0)

    elif scene_id == "food":
        # Scene 2: Fotoğraftan Yemek Tanıma
        draw_pill(draw, "AI YEMEK TANIMA • FOOD VISION", 160, (14, 32, 45), (56, 189, 248), (56, 189, 248))
        draw_centered_text(draw, "Tabağının Fotoğrafını Çek,", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Makrolar Anında Hazır!", 278, font_title2, (56, 189, 248))
        draw_centered_text(draw, "Yapay zeka yemeği tanır, kalori ve besinleri otomatik çıkarır.", 342, font_sub, (148, 163, 184))

        draw_phone(img, "food", (56, 189, 248))
        draw_bottom_bar(draw, 1)

    elif scene_id == "nutrition":
        # Scene 3: Beslenme ve Makro
        draw_pill(draw, "AKILLI BESLENME TAKİBİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Kalan Kalori & Makrolarını", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Tek Ekranda Canlı Gör!", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Protein, karbonhidrat ve yağ dengesini zahmetsizce yönet.", 342, font_sub, (148, 163, 184))

        draw_phone(img, "nutrition", (34, 197, 94))
        draw_bottom_bar(draw, 2)

    elif scene_id == "library":
        # Scene 4: Kütüphane
        draw_pill(draw, "100+ EGZERSİZ KÜTÜPHANESİ", 160, (28, 22, 48), (168, 85, 247), (168, 85, 247))
        draw_centered_text(draw, "Yüzlerce Hareket &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Doğru Form Rehberi", 278, font_title2, (168, 85, 247))
        draw_centered_text(draw, "Halter, dambıl, makine ve vücut ağırlığı seçenekleri.", 342, font_sub, (148, 163, 184))

        draw_phone(img, "library", (168, 85, 247))
        draw_bottom_bar(draw, 3)

    elif scene_id == "workout":
        # Scene 5: Antrenman Seansı
        draw_pill(draw, "CANLI SEANS & RIR TAKİBİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Setlerini ve Ağırlıklarını", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Canlı Olarak Kaydet", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "RIR hedefleri ve dinlenme süreleriyle maksimum hipertrofi.", 342, font_sub, (148, 163, 184))

        draw_phone(img, "workout", (34, 197, 94))
        draw_bottom_bar(draw, 4)

    elif scene_id == "outro":
        # Scene 6: Outro / CTA
        draw_pill(draw, "GELİŞİMİNİ BİR ÜST SEVİYEYE TAŞI", 260, (20, 38, 26), (34, 197, 94), (34, 197, 94))

        # App Icon
        icon_200 = raw_icon.resize((220, 220), Image.Resampling.LANCZOS)
        m200 = Image.new("L", (220, 220), 0)
        ImageDraw.Draw(m200).rounded_rectangle([0, 0, 220, 220], radius=50, fill=255)
        r200 = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
        r200.paste(icon_200, (0, 0), mask=m200)

        # Glow behind logo
        glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([WIDTH // 2 - 260, 480 - 260, WIDTH // 2 + 260, 480 + 260], fill=(34, 197, 94, 60))
        glow = glow.filter(ImageFilter.GaussianBlur(radius=80))
        img.paste(glow, (0, 0), glow)

        img.paste(r200, (WIDTH // 2 - 110, 370), r200)

        draw_centered_text(draw, "POWERFORM", 630, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Yapay Zeka Destekli Antrenman & Beslenme", 705, font_sub, (148, 163, 184))

        # Store text
        draw_centered_text(draw, "Google Play'de Yayında", 820, font_card_head, (255, 255, 255))

        # CTA Button
        btn_w = 640
        btn_h = 76
        btn_x = (WIDTH - btn_w) // 2
        btn_y = 890
        draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=38, fill=(34, 197, 94))
        draw_centered_text(draw, "Hemen Ücretsiz İndir!", btn_y + 18, font_cta_btn, (10, 15, 22))

        # Punchline
        draw_centered_text(draw, "Antrenmanını Akıllı Yönet. Formunu Güçlendir.", 1030, font_sub, (203, 213, 225))
        draw_bottom_bar(draw, 4)

    return img

scenes = ["hook", "koc", "food", "nutrition", "library", "workout", "outro"]
for s in scenes:
    frame = render_scene(s)
    path = f"scratch/frame_{s}.jpg"
    frame.save(path, quality=95)
    print(f"Saved {path}")
