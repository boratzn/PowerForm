import os
import math
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# Common fonts
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"
FONT_MONO = "C:/Windows/Fonts/consola.ttf"

font_huge = ImageFont.truetype(FONT_BOLD, 54)
font_h1 = ImageFont.truetype(FONT_BOLD, 44)
font_h2 = ImageFont.truetype(FONT_BOLD, 34)
font_h3 = ImageFont.truetype(FONT_BOLD, 26)
font_sub = ImageFont.truetype(FONT_REG, 23)
font_badge = ImageFont.truetype(FONT_BOLD, 20)
font_tag = ImageFont.truetype(FONT_BOLD, 22)
font_footer = ImageFont.truetype(FONT_BOLD, 20)
font_card_head = ImageFont.truetype(FONT_BOLD, 22)
font_card_sub = ImageFont.truetype(FONT_REG, 17)

# App icon
raw_icon = Image.open("scratch/icon.png").convert("RGBA")

def get_rounded_icon(size, radius):
    icon_resized = raw_icon.resize((size, size), Image.Resampling.LANCZOS)
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, size, size], radius=radius, fill=255)
    rounded = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    rounded.paste(icon_resized, (0, 0), mask=mask)
    return rounded

# Preprocess phone screens
def get_phone_screen(screen_path, width, height, radius=24):
    raw = Image.open(screen_path).convert("RGBA")
    resized = raw.resize((width, height), Image.Resampling.LANCZOS)
    mask = Image.new("L", (width, height), 0)
    ImageDraw.Draw(mask).rounded_rectangle([0, 0, width, height], radius=radius, fill=255)
    rounded = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    rounded.paste(resized, (0, 0), mask=mask)
    return rounded

def draw_centered_text(draw, text, y, font, fill, width):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    x = (width - tw) // 2
    draw.text((x, y), text, font=font, fill=fill)
    return tw

def draw_pill(draw, text, y, bg_color, border_color, text_color, width, font=font_badge):
    bbox = font.getbbox(text)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    pw = tw + 48
    ph = 44
    px = (width - pw) // 2
    draw.rounded_rectangle([px, y, px + pw, y + ph], radius=22, fill=bg_color, outline=border_color, width=2)
    tx = (width - tw) // 2
    ty = y + (ph - th) // 2 - 2
    draw.text((tx, ty), text, font=font, fill=text_color)

def create_phone_frame(screen_img, screen_w, screen_h, border=10, radius=32, accent_rgb=(34, 197, 94)):
    frame_w = screen_w + border * 2
    frame_h = screen_h + border * 2
    
    phone = Image.new("RGBA", (frame_w, frame_h), (0, 0, 0, 0))
    pdraw = ImageDraw.Draw(phone)
    
    # Outer dark titanium bezel with accent color rim
    pdraw.rounded_rectangle([0, 0, frame_w, frame_h], radius=radius, fill=(16, 22, 32, 255), outline=(*accent_rgb, 230), width=2)
    pdraw.rounded_rectangle([2, 2, frame_w - 2, frame_h - 2], radius=radius - 2, outline=(38, 48, 65, 255), width=2)
    
    # Paste rounded screen
    phone.paste(screen_img, (border, border), screen_img)
    
    # Dynamic island
    di_w = int(screen_w * 0.22)
    di_h = max(18, int(border * 1.8))
    di_x = (frame_w - di_w) // 2
    di_y = border + 6
    pdraw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=di_h // 2, fill=(8, 11, 16, 255))
    pdraw.ellipse([di_x + di_w - 16, di_y + 4, di_x + di_w - 6, di_y + 14], fill=(20, 28, 40, 255))
    
    return phone

def create_ambient_bg(w, h):
    img = Image.new("RGB", (w, h), (9, 13, 20))
    draw = ImageDraw.Draw(img)
    grid_spacing = 72
    for gx in range(0, w, grid_spacing):
        draw.line([(gx, 0), (gx, h)], fill=(16, 23, 36), width=1)
    for gy in range(0, h, grid_spacing):
        draw.line([(0, gy), (w, gy)], fill=(16, 23, 36), width=1)
    return img

# =============================================================================
# MOCKUP 1: REELS & TIKTOK COVER (9:16 - 1080x1920)
# =============================================================================
def generate_reels_cover():
    w, h = 1080, 1920
    img = create_ambient_bg(w, h)
    draw = ImageDraw.Draw(img)

    # Top Header - Clear, bold, safe from top notch
    draw_pill(draw, "YENİ NESİL FITNESS ASİSTANI", 170, (20, 38, 26), (34, 197, 94), (34, 197, 94), w)
    draw_centered_text(draw, "Cebindeki Yapay Zeka", 232, font_h1, (255, 255, 255), w)
    draw_centered_text(draw, "POWERFORM AI KOÇ", 290, font_huge, (34, 197, 94), w)
    draw_centered_text(draw, "Kişiye özel antrenman programı & akıllı makro takibi.", 360, font_sub, (148, 163, 184), w)

    # Hero Phone (AI Koc) - Clean and completely unobstructed
    pw = 510
    ph = int(pw / (461 / 1024)) # 1132px
    screen = get_phone_screen("scratch/screens/screen_1.jpg", pw, ph, radius=26)
    phone = create_phone_frame(screen, pw, ph, border=12, radius=38, accent_rgb=(34, 197, 94))
    
    # Phone glow aura
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    ImageDraw.Draw(glow).ellipse([w // 2 - 320, 420, w // 2 + 320, 1580], fill=(34, 197, 94, 40))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=65))
    img.paste(glow, (0, 0), glow)

    # Paste phone centered
    px = (w - phone.width) // 2
    py = 415
    img.paste(phone, (px, py), phone)

    # Bottom Call To Action & Store Info (Safe zone: y=1610 to 1750)
    btn_w = 580
    btn_h = 72
    btn_x = (w - btn_w) // 2
    btn_y = 1620
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=36, fill=(34, 197, 94))
    draw_centered_text(draw, "Hemen Ücretsiz İndir!", btn_y + 16, font_h2, (10, 15, 22), w)

    draw_centered_text(draw, "Google Play'de Yayında  •  PowerForm", 1720, font_footer, (148, 163, 184), w)

    out_path = "PowerForm_Mockup_ReelsCover_9x16.jpg"
    img.save(out_path, quality=95)
    img.save("scratch/" + out_path, quality=95)
    print(f"Saved: {out_path}")

# =============================================================================
# MOCKUP 2: INSTAGRAM FEED POST (1:1 - 1080x1080)
# =============================================================================
def generate_instagram_feed():
    w, h = 1080, 1080
    img = create_ambient_bg(w, h)
    draw = ImageDraw.Draw(img)

    # Top Header
    draw_pill(draw, "YAPAY ZEKA FITNESS DEVRİMİ", 40, (20, 38, 26), (34, 197, 94), (34, 197, 94), w)
    draw_centered_text(draw, "POWERFORM", 98, font_huge, (255, 255, 255), w)
    draw_centered_text(draw, "Tabağını Çek · Antrenmanını Planla · Hedefine Ulaş", 162, font_sub, (148, 163, 184), w)

    # Perfectly sized Duo Phones to avoid any vertical overflow
    # pw=310 -> ph = 310 / 0.4502 = 688px
    pw = 310
    ph = int(pw / (461 / 1024)) # 688px

    # Left phone (Food Vision)
    screen_food = get_phone_screen("scratch/screens/screen_2.jpg", pw, ph, radius=18)
    phone_food = create_phone_frame(screen_food, pw, ph, border=8, radius=26, accent_rgb=(56, 189, 248))
    
    # Right phone (AI Koc)
    screen_koc = get_phone_screen("scratch/screens/screen_1.jpg", pw, ph, radius=18)
    phone_koc = create_phone_frame(screen_koc, pw, ph, border=8, radius=26, accent_rgb=(34, 197, 94))

    # Glow behind phones
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([100, 220, 520, 920], fill=(56, 189, 248, 32))
    gdraw.ellipse([560, 220, 980, 920], fill=(34, 197, 94, 32))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=50))
    img.paste(glow, (0, 0), glow)

    # Position Phones side-by-side with clear margins
    y_phones = 215
    x_food = 145
    x_koc = 605
    img.paste(phone_food, (x_food, y_phones), phone_food)
    img.paste(phone_koc, (x_koc, y_phones), phone_koc)

    # Clean label badges above/below each phone without covering the phone screen
    # Feature 1 badge below food phone
    f_badge_y = y_phones + phone_food.height + 15 # ~ 934px
    draw.text((x_food + 25, f_badge_y), "• AI Yemek Tanıma", font=font_card_head, fill=(56, 189, 248))
    draw.text((x_koc + 30, f_badge_y), "• Akıllı AI Koç", font=font_card_head, fill=(34, 197, 94))

    # Bottom CTA Bar
    draw_centered_text(draw, "Google Play'de Ücretsiz İndir!", 985, font_tag, (255, 255, 255), w)
    draw_centered_text(draw, "POWERFORM  •  AKILLI FITNESS ASİSTANI", 1025, font_footer, (148, 163, 184), w)

    out_path = "PowerForm_Mockup_InstagramFeed_1x1.jpg"
    img.save(out_path, quality=95)
    img.save("scratch/" + out_path, quality=95)
    print(f"Saved: {out_path}")

# =============================================================================
# MOCKUP 3: TRIO FLAGSHIP SHOWCASE (9:16 - 1080x1920)
# =============================================================================
def generate_trio_showcase():
    w, h = 1080, 1920
    img = create_ambient_bg(w, h)
    draw = ImageDraw.Draw(img)

    # Top Header
    draw_pill(draw, "HEPSİ BİR ARADA FITNESS DENEYİMİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94), w)
    draw_centered_text(draw, "Antrenman, Beslenme ve Koçluk", 222, font_h1, (255, 255, 255), w)
    draw_centered_text(draw, "TEK BİR UYGULAMADA", 280, font_huge, (34, 197, 94), w)
    draw_centered_text(draw, "Tüm spor hedeflerin için ihtiyacın olan her şey elinin altında.", 350, font_sub, (148, 163, 184), w)

    # 3 Phones: Left (Food Vision), Center (Hero AI Koc), Right (Live Workout)
    bg_w = 400
    bg_h = int(bg_w / (461 / 1024))
    fg_w = 470
    fg_h = int(fg_w / (461 / 1024))

    # Prepare frames
    p_left = create_phone_frame(get_phone_screen("scratch/screens/screen_2.jpg", bg_w, bg_h, radius=22), bg_w, bg_h, border=10, radius=32, accent_rgb=(56, 189, 248))
    p_right = create_phone_frame(get_phone_screen("scratch/screens/screen_5.jpg", bg_w, bg_h, radius=22), bg_w, bg_h, border=10, radius=32, accent_rgb=(168, 85, 247))
    p_center = create_phone_frame(get_phone_screen("scratch/screens/screen_1.jpg", fg_w, fg_h, radius=24), fg_w, fg_h, border=12, radius=36, accent_rgb=(34, 197, 94))

    # Glows
    glow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse([w // 2 - 380, 430, w // 2 + 380, 1550], fill=(34, 197, 94, 38))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=70))
    img.paste(glow, (0, 0), glow)

    # Paste Left Phone (offset left)
    img.paste(p_left, (35, 470), p_left)

    # Paste Right Phone (offset right)
    img.paste(p_right, (w - p_right.width - 35, 470), p_right)

    # Paste Center Phone (foreground, overlapping)
    cx = (w - p_center.width) // 2
    cy = 430
    img.paste(p_center, (cx, cy), p_center)

    # Clean bullet tags below (No emoji glyph boxes)
    draw_centered_text(draw, "• AI Koç   •   • AI Yemek Tanıma   •   • Canlı Seans Takibi", 1585, font_tag, (255, 255, 255), w)

    # High-converting CTA Button
    btn_w = 640
    btn_h = 76
    btn_x = (w - btn_w) // 2
    btn_y = 1650
    draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=38, fill=(34, 197, 94))
    draw_centered_text(draw, "Hemen Ücretsiz İndir!", btn_y + 18, font_h2, (10, 15, 22), w)

    draw_centered_text(draw, "Google Play'de Yayında", 1750, font_footer, (148, 163, 184), w)

    out_path = "PowerForm_Mockup_Showcase_Trio_9x16.jpg"
    img.save(out_path, quality=95)
    img.save("scratch/" + out_path, quality=95)
    print(f"Saved: {out_path}")

if __name__ == "__main__":
    generate_reels_cover()
    generate_instagram_feed()
    generate_trio_showcase()
    print("All promotional mockups generated with zero collisions!")
