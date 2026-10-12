import os
import math
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio
import imageio_ffmpeg

# =============================================================================
# VIDEO SPECIFICATIONS (Full HD 9:16 Vertical for TikTok / Reels)
# =============================================================================
WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION = 28.0
TOTAL_FRAMES = int(FPS * DURATION) # 840 frames

# Fonts
FONT_BOLD = "C:/Windows/Fonts/segoeuib.ttf"
FONT_REG = "C:/Windows/Fonts/segoeui.ttf"

font_hero = ImageFont.truetype(FONT_BOLD, 54)
font_title1 = ImageFont.truetype(FONT_BOLD, 42)
font_title2 = ImageFont.truetype(FONT_BOLD, 42)
font_sub = ImageFont.truetype(FONT_REG, 23)
font_badge = ImageFont.truetype(FONT_BOLD, 20)
font_cta_btn = ImageFont.truetype(FONT_BOLD, 30)
font_card_head = ImageFont.truetype(FONT_BOLD, 30)
font_card_sub = ImageFont.truetype(FONT_REG, 22)
font_footer = ImageFont.truetype(FONT_BOLD, 20)

# Phone Mockup Dimensions
PHONE_SCREEN_W = 510
PHONE_SCREEN_H = int(PHONE_SCREEN_W / (461 / 1024)) # 1133px
PHONE_BORDER = 12
PHONE_RADIUS = 38
FRAME_W = PHONE_SCREEN_W + PHONE_BORDER * 2 # 534px
FRAME_H = PHONE_SCREEN_H + PHONE_BORDER * 2 # 1157px

# =============================================================================
# ASSETS PREPROCESSING
# =============================================================================
raw_icon = Image.open("scratch/icon.png").convert("RGBA")

# App Icon 150x150
icon_150 = raw_icon.resize((150, 150), Image.Resampling.LANCZOS)
m150 = Image.new("L", (150, 150), 0)
ImageDraw.Draw(m150).rounded_rectangle([0, 0, 150, 150], radius=34, fill=255)
icon_rounded_150 = Image.new("RGBA", (150, 150), (0, 0, 0, 0))
icon_rounded_150.paste(icon_150, (0, 0), mask=m150)

# App Icon 220x220 for Outro
icon_220 = raw_icon.resize((220, 220), Image.Resampling.LANCZOS)
m220 = Image.new("L", (220, 220), 0)
ImageDraw.Draw(m220).rounded_rectangle([0, 0, 220, 220], radius=50, fill=255)
icon_rounded_220 = Image.new("RGBA", (220, 220), (0, 0, 0, 0))
icon_rounded_220.paste(icon_220, (0, 0), mask=m220)

# Preprocess all 10 uploaded user screenshots
screen_files = {
    "programs": "scratch/screens_new/img_1.jpg",     # Programlar & Şablonlar
    "exercise": "scratch/screens_new/img_2.jpg",     # 3/4 sit-up egzersiz
    "today": "scratch/screens_new/img_3.jpg",        # Bugün antrenman & hacim
    "weight_trend": "scratch/screens_new/img_4.jpg", # Kilo takibi & MA
    "profile": "scratch/screens_new/img_5.jpg",      # Profil & araçlar merkezi
    "food_ai": "scratch/screens_new/img_6.jpg",      # Fotoğraftan Yemek Tanıma
    "body_photos": "scratch/screens_new/img_7.jpg",  # Vücut Form Takibi
    "ai_coach": "scratch/screens_new/img_8.jpg",     # Powerform AI Koç
    "transform": "scratch/screens_new/img_9.jpg",    # Before & After Dönüşüm Kartı
    "nutrition": "scratch/screens_new/img_10.jpg",   # Beslenme & Makrolar
}

cached_screens = {}
for key, p in screen_files.items():
    raw_img = Image.open(p).convert("RGBA")
    resized_img = raw_img.resize((PHONE_SCREEN_W, PHONE_SCREEN_H), Image.Resampling.LANCZOS)
    screen_mask = Image.new("L", (PHONE_SCREEN_W, PHONE_SCREEN_H), 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle([0, 0, PHONE_SCREEN_W, PHONE_SCREEN_H], radius=26, fill=255)
    rounded_screen = Image.new("RGBA", (PHONE_SCREEN_W, PHONE_SCREEN_H), (0, 0, 0, 0))
    rounded_screen.paste(resized_img, (0, 0), mask=screen_mask)
    cached_screens[key] = rounded_screen

# Base background grid
base_bg = Image.new("RGB", (WIDTH, HEIGHT), (9, 13, 20))
bg_draw = ImageDraw.Draw(base_bg)
grid_spacing = 72
for gx in range(0, WIDTH, grid_spacing):
    bg_draw.line([(gx, 0), (gx, HEIGHT)], fill=(16, 23, 36), width=1)
for gy in range(0, HEIGHT, grid_spacing):
    bg_draw.line([(0, gy), (WIDTH, gy)], fill=(16, 23, 36), width=1)

# =============================================================================
# GRAPHIC HELPER FUNCTIONS
# =============================================================================
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

def draw_check_circle(draw, cx, cy, radius=16, circle_color=(34, 197, 94)):
    draw.ellipse([cx - radius, cy - radius, cx + radius, cy + radius], fill=circle_color)
    pts = [(cx - 6, cy), (cx - 2, cy + 5), (cx + 6, cy - 4)]
    draw.line(pts, fill=(10, 15, 22), width=3)

def draw_phone_frame(base_img, screen_key, accent_rgb, y_bob=0, scan_ratio=None):
    draw = ImageDraw.Draw(base_img)
    x = (WIDTH - FRAME_W) // 2
    y = 395 + int(y_bob)

    # Ambient glow behind phone
    glow_w = 640
    glow_h = 1200
    glow_x = (WIDTH - glow_w) // 2
    glow_y = y - 20
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([glow_x, glow_y, glow_x + glow_w, glow_y + glow_h], fill=(*accent_rgb, 38))
    glow = glow.filter(ImageFilter.GaussianBlur(radius=55))
    base_img.paste(glow, (0, 0), glow)

    # Phone Frame outer bezel
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

    # Paste Screenshot
    sx = x + PHONE_BORDER
    sy = y + PHONE_BORDER
    screen_img = cached_screens[screen_key].copy()

    # Laser scanner effect if requested
    if scan_ratio is not None:
        scan_draw = ImageDraw.Draw(screen_img)
        beam_y = int(scan_ratio * PHONE_SCREEN_H)
        scan_draw.line([(0, beam_y), (PHONE_SCREEN_W, beam_y)], fill=(56, 189, 248), width=4)
        trail_h = 50
        if beam_y > trail_h:
            trail = Image.new("RGBA", (PHONE_SCREEN_W, trail_h), (56, 189, 248, 35))
            screen_img.paste(trail, (0, beam_y - trail_h), trail)

    base_img.paste(screen_img, (sx, sy), screen_img)

    # Dynamic Island
    di_w = 110
    di_h = 24
    di_x = (WIDTH - di_w) // 2
    di_y = sy + 8
    draw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=12, fill=(8, 11, 16))
    draw.ellipse([di_x + di_w - 20, di_y + 6, di_x + di_w - 8, di_y + 18], fill=(20, 28, 40))

def draw_top_progress(draw, progress_ratio):
    # Top Progress Bar (0 to 1080px)
    h = 6
    w = int(WIDTH * progress_ratio)
    draw.rectangle([0, 0, WIDTH, h], fill=(20, 28, 40))
    if w > 0:
        draw.rectangle([0, 0, w, h], fill=(34, 197, 94))

def draw_footer_bar(draw):
    y = 1600
    draw_centered_text(draw, "POWERFORM  •  YENİ NESİL FITNESS ASİSTANI", y + 15, font_footer, (148, 163, 184))

# =============================================================================
# FRAME RENDERER
# =============================================================================
def render_frame(frame_idx):
    t = frame_idx / FPS
    progress_ratio = min(1.0, t / DURATION)
    img = base_bg.copy()
    draw = ImageDraw.Draw(img)

    # Subtle floating motion
    phone_bob = math.sin(t * 3.0) * 3.5

    # -------------------------------------------------------------------------
    # SCENE 0: Hook / Intro (0.0s - 2.4s)
    # -------------------------------------------------------------------------
    if t < 2.4:
        draw_pill(draw, "SPOR SALONUNDA ŞANSA YER YOK", 210, (26, 38, 28), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Sıradan Fitness Uygulamalarını", 295, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Unutun! ⚡", 365, font_hero, (34, 197, 94))

        card_y = 470
        card_w = 880
        card_h = 760
        card_x = (WIDTH - card_w) // 2
        draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=36, fill=(15, 21, 32), outline=(34, 197, 94), width=2)

        img.paste(icon_rounded_150, (WIDTH // 2 - 75, card_y + 45), icon_rounded_150)
        draw_centered_text(draw, "POWERFORM", card_y + 215, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Akıllı Fitness & Beslenme Asistanı", card_y + 285, font_sub, (148, 163, 184))

        draw.line([(card_x + 60, card_y + 335), (card_x + card_w - 60, card_y + 335)], fill=(30, 41, 59), width=1)

        items = [
            ("Yapay Zeka Fitness Koçu", "Haftalık check-in & 90 gün simülasyonu"),
            ("Fotoğraftan Yemek Tanıma", "Tabağını çek, kalori & makrolar anında hazır"),
            ("Canlı Seans & 100+ Egzersiz", "Set, hacim, RIR ve dönüşüm kartı"),
        ]
        for idx, (head, desc) in enumerate(items):
            iy = card_y + 375 + idx * 115
            draw_check_circle(draw, card_x + 75, iy + 16, radius=16, circle_color=(34, 197, 94))
            draw.text((card_x + 115, iy), head, font=font_card_head, fill=(255, 255, 255))
            draw.text((card_x + 115, iy + 44), desc, font=font_card_sub, fill=(148, 163, 184))

        draw_centered_text(draw, "TÜM ÖZELLİKLERİ KEŞFET  ▼", 1320, font_badge, (34, 197, 94))

    # -------------------------------------------------------------------------
    # SCENE 1: Powerform AI Koç & 90 Gün Projeksiyonu (2.4s - 4.8s)
    # -------------------------------------------------------------------------
    elif t < 4.8:
        draw_pill(draw, "YAPAY ZEKA FITNESS KOÇU", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Haftalık Analiz &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Gelecekteki Sen Simülasyonu", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Mevcut ritmine göre 3 ay sonraki kilonu ve formunu gör.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "ai_coach", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 2: Fotoğraftan Yemek Tanıma (4.8s - 7.2s)
    # -------------------------------------------------------------------------
    elif t < 7.2:
        local_t = t - 4.8
        draw_pill(draw, "AI YEMEK TANIMA • FOOD VISION", 160, (14, 32, 45), (56, 189, 248), (56, 189, 248))
        draw_centered_text(draw, "Tabağının Fotoğrafını Çek,", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Makrolar Anında Hazır!", 278, font_title2, (56, 189, 248))
        draw_centered_text(draw, "Yapay zeka yemeği tanır, kalori ve besinleri otomatik çıkarır.", 342, font_sub, (148, 163, 184))

        scan_progress = (local_t * 0.45) % 1.0
        draw_phone_frame(img, "food_ai", (56, 189, 248), y_bob=phone_bob, scan_ratio=scan_progress)

    # -------------------------------------------------------------------------
    # SCENE 3: Günlük Kalori & Makro Takibi (7.2s - 9.6s)
    # -------------------------------------------------------------------------
    elif t < 9.6:
        draw_pill(draw, "AKILLI BESLENME TAKİBİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Kalan Kalori & Protein", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Tek Ekranda Canlı Takip", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Öğün dökümü, kalori bütçesi ve makro dengesi cebinde.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "nutrition", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 4: Bilimsel Hazır Antrenman Şablonları (9.6s - 12.0s)
    # -------------------------------------------------------------------------
    elif t < 12.0:
        draw_pill(draw, "BİLİMSEL HAZIR ŞABLONLAR", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Full Body, Upper / Lower &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Güç Odaklı Planlar", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Hedefine ve haftalık zamanına en uygun hazır antrenmanlar.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "programs", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 5: 100+ Egzersiz Kütüphanesi & Rehber (12.0s - 14.4s)
    # -------------------------------------------------------------------------
    elif t < 14.4:
        draw_pill(draw, "100+ EGZERSİZ KÜTÜPHANESİ", 160, (28, 22, 48), (168, 85, 247), (168, 85, 247))
        draw_centered_text(draw, "Doğru Form Rehberi &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Kişisel Rekor (PR) Takibi", 278, font_title2, (168, 85, 247))
        draw_centered_text(draw, "Kas grubu filtreleri, yapılış talimatları ve rekor vitrini.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "exercise", (168, 85, 247), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 6: Bugünün Antrenmanı, Seri & Hacim (14.4s - 16.8s)
    # -------------------------------------------------------------------------
    elif t < 16.8:
        draw_pill(draw, "CANLI SEANS & HACİM ANALİZİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Çalışılan Kaslar, Seri &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Haftalık Hacim İstatistiği", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Tek dokunuşla seansı başlat, rekorlarını ve kas dengeni izle.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "today", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 7: Bilimsel Kilo Trendi (16.8s - 19.2s)
    # -------------------------------------------------------------------------
    elif t < 19.2:
        draw_pill(draw, "BİLİMSEL KİLO TRENDİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "7 Günlük Hareketli Ortalama &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Net Değişim Hızı", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Su dalgalanmalarına aldanmadan gerçek kilo trendini yakala.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "weight_trend", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 8: Vücut Form Takibi (19.2s - 21.4s)
    # -------------------------------------------------------------------------
    elif t < 21.4:
        draw_pill(draw, "VÜCUT FORM TAKİBİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Haftalık & Aylık Form Takibi,", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "AI Check-in Entegrasyonu", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Görsel gelişimini arşivle, kas hatlarının değişimini incele.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "body_photos", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 9: Before & After Dönüşüm Kartı (21.4s - 23.6s)
    # -------------------------------------------------------------------------
    elif t < 23.6:
        draw_pill(draw, "BEFORE & AFTER DÖNÜŞÜM KARTI", 160, (38, 30, 16), (251, 191, 36), (251, 191, 36))
        draw_centered_text(draw, "Dönüşümünü Yan Yana Koy,", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Hikayende Şıkça Paylaş!", 278, font_title2, (251, 191, 36))
        draw_centered_text(draw, "Instagram ve TikTok formatında otomatik dönüşüm görseli.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "transform", (251, 191, 36), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 10: İlerleme & Araçlar Merkezi (23.6s - 25.6s)
    # -------------------------------------------------------------------------
    elif t < 25.6:
        draw_pill(draw, "HEPSİ TEK BİR UYGULAMADA", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "İlerleme & Araçlar Merkezi,", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Eksiksiz Fitness Çözümü", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Uyku, ölçüler, rekorlar, kalori ve koçluk tek noktada.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "profile", (34, 197, 94), y_bob=phone_bob)

    # -------------------------------------------------------------------------
    # SCENE 11: Outro / Call To Action (25.6s - 28.0s)
    # -------------------------------------------------------------------------
    else:
        draw_pill(draw, "GELİŞİMİNİ BİR ÜST SEVİYEYE TAŞI", 260, (20, 38, 26), (34, 197, 94), (34, 197, 94))

        pulse = 15 * math.sin((t - 25.6) * 4.0)
        glow_rad = int(250 + pulse)
        glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([WIDTH // 2 - glow_rad, 480 - glow_rad, WIDTH // 2 + glow_rad, 480 + glow_rad], fill=(34, 197, 94, 65))
        glow = glow.filter(ImageFilter.GaussianBlur(radius=80))
        img.paste(glow, (0, 0), glow)

        img.paste(icon_rounded_220, (WIDTH // 2 - 110, 370), icon_rounded_220)

        draw_centered_text(draw, "POWERFORM", 630, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Yapay Zeka Destekli Antrenman & Beslenme", 705, font_sub, (148, 163, 184))

        draw_centered_text(draw, "Google Play'de Yayında", 820, font_card_head, (255, 255, 255))

        btn_w = 640
        btn_h = 76
        btn_x = (WIDTH - btn_w) // 2
        btn_y = 890
        draw.rounded_rectangle([btn_x, btn_y, btn_x + btn_w, btn_y + btn_h], radius=38, fill=(34, 197, 94))
        draw_centered_text(draw, "Hemen Ücretsiz İndir!", btn_y + 18, font_cta_btn, (10, 15, 22))

        draw_centered_text(draw, "Disiplin Sonucu Değiştirir. Hedeflerine Ulaş.", 1030, font_sub, (203, 213, 225))

        # Smooth fade out at the very end (last 0.4s)
        if t > 27.6:
            fade_out = min(1.0, (t - 27.6) / 0.4)
            black_overlay = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
            img = Image.blend(img, black_overlay, fade_out)

    # Progress bar and footer
    draw_top_progress(draw, progress_ratio)
    draw_footer_bar(draw)

    return img

# =============================================================================
# MAIN RENDERING & VIDEO ENCODING
# =============================================================================
def main():
    final_output = "PowerForm_TikTok_Tanitim_9x16.mp4"
    temp_video = "scratch/temp_tiktok_1080p.mp4"

    print(f"🎬 TikTok Video Derlemesi Başlıyor:")
    print(f"   Çözünürlük: {WIDTH}x{HEIGHT} (Full HD 9:16 Dikey)")
    print(f"   Süre: {DURATION}s @ {FPS} FPS ({TOTAL_FRAMES} kare)")
    print(f"   Ses: Tamamen sessiz (TikTok müzik seçimine uygun)")

    writer = imageio.get_writer(
        temp_video,
        fps=FPS,
        codec='libx264',
        pixelformat='yuv420p',
        macro_block_size=1,
        ffmpeg_params=[
            '-preset', 'fast',
            '-crf', '17',
            '-b:v', '10M',
            '-maxrate', '14M',
            '-bufsize', '20M',
        ]
    )

    for i in range(TOTAL_FRAMES):
        frame = render_frame(i)
        writer.append_data(np.array(frame))
        if i % 60 == 0 or i == TOTAL_FRAMES - 1:
            print(f"  Kare {i}/{TOTAL_FRAMES} ({(i / FPS):.1f}s / {DURATION}s) tamamlandı.")

    writer.close()
    print("Video akışı başarıyla oluşturuldu.")

    print("FFmpeg ile sessiz nihai MP4 oluşturuluyor...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    mux_cmd = [
        ffmpeg_exe,
        "-y",
        "-i", temp_video,
        "-c:v", "copy",
        "-an", # Kesinlikle sessiz - TikTok trend sesleri için
        "-movflags", "+faststart",
        final_output
    ]
    subprocess.run(mux_cmd, check=True)

    if os.path.exists(temp_video):
        os.remove(temp_video)

    import shutil
    shutil.copy(final_output, f"scratch/{final_output}")

    print("\n========================================================")
    print(f"🎉 BAŞARILI! TikTok Tanıtım Videosu Hazırlandı!")
    print(f"Dosya: {final_output}")
    print(f"Scratch Kopyası: scratch/{final_output}")
    print("========================================================\n")

if __name__ == "__main__":
    main()
