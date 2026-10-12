import os
import math
import struct
import wave
import subprocess
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import imageio
import imageio_ffmpeg

# =============================================================================
# VIDEO SPECIFICATIONS (Full HD 9:16 Vertical for TikTok / Reels / Shorts)
# =============================================================================
WIDTH = 1080
HEIGHT = 1920
FPS = 30
DURATION = 21.0
TOTAL_FRAMES = int(FPS * DURATION) # 630 frames

# Fonts
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

# Phone Mockup Dimensions
PHONE_SCREEN_W = 510
PHONE_SCREEN_H = int(PHONE_SCREEN_W / (461 / 1024)) # 1133px
PHONE_BORDER = 12
PHONE_RADIUS = 38
FRAME_W = PHONE_SCREEN_W + PHONE_BORDER * 2 # 534px
FRAME_H = PHONE_SCREEN_H + PHONE_BORDER * 2 # 1157px

# =============================================================================
# PREPROCESSING ASSETS
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

# Screenshots preprocessing with smooth rounded corners
screen_paths = {
    "koc": "scratch/screens/screen_1.jpg",
    "food": "scratch/screens/screen_2.jpg",
    "nutrition": "scratch/screens/screen_4.jpg",
    "library": "scratch/screens/screen_3.jpg",
    "workout": "scratch/screens/screen_5.jpg",
}

cached_screens = {}
for key, p in screen_paths.items():
    raw_img = Image.open(p).convert("RGBA")
    resized_img = raw_img.resize((PHONE_SCREEN_W, PHONE_SCREEN_H), Image.Resampling.LANCZOS)
    screen_mask = Image.new("L", (PHONE_SCREEN_W, PHONE_SCREEN_H), 0)
    ImageDraw.Draw(screen_mask).rounded_rectangle([0, 0, PHONE_SCREEN_W, PHONE_SCREEN_H], radius=26, fill=255)
    rounded_screen = Image.new("RGBA", (PHONE_SCREEN_W, PHONE_SCREEN_H), (0, 0, 0, 0))
    rounded_screen.paste(resized_img, (0, 0), mask=screen_mask)
    cached_screens[key] = rounded_screen

# Pre-render base background grid for speed
base_bg = Image.new("RGB", (WIDTH, HEIGHT), (9, 13, 20))
bg_draw = ImageDraw.Draw(base_bg)
grid_spacing = 72
for gx in range(0, WIDTH, grid_spacing):
    bg_draw.line([(gx, 0), (gx, HEIGHT)], fill=(16, 23, 36), width=1)
for gy in range(0, HEIGHT, grid_spacing):
    bg_draw.line([(0, gy), (WIDTH, gy)], fill=(16, 23, 36), width=1)

# =============================================================================
# AUDIO GENERATION (Modern 128 BPM Synth & Bass Soundtrack)
# =============================================================================
def generate_soundtrack(wav_path):
    sample_rate = 44100
    total_samples = int(sample_rate * DURATION)
    left = [0.0] * total_samples
    right = [0.0] * total_samples

    def add_tone(start_time, dur, freq, amp=0.3, wave_type='sine'):
        start_idx = int(start_time * sample_rate)
        end_idx = min(total_samples, start_idx + int(dur * sample_rate))
        for i in range(start_idx, end_idx):
            t = (i - start_idx) / sample_rate
            env = math.exp(-3.2 * t / dur)
            if wave_type == 'sine':
                val = math.sin(2 * math.pi * freq * t) * amp * env
            elif wave_type == 'triangle':
                val = (2 * abs(2 * (t * freq - math.floor(t * freq + 0.5))) - 1) * amp * env
            elif wave_type == 'sweep':
                f_cur = freq[0] + (freq[1] - freq[0]) * (t / dur)
                val = math.sin(2 * math.pi * f_cur * t) * amp * env
            left[i] += val
            right[i] += val

    def add_kick(start_time, amp=0.55):
        start_idx = int(start_time * sample_rate)
        dur = 0.32
        end_idx = min(total_samples, start_idx + int(dur * sample_rate))
        for i in range(start_idx, end_idx):
            t = (i - start_idx) / sample_rate
            freq = 140 * math.exp(-20 * t) + 40
            env = math.exp(-9 * t)
            val = math.sin(2 * math.pi * freq * t) * amp * env
            left[i] += val
            right[i] += val

    def add_snare(start_time, amp=0.3):
        start_idx = int(start_time * sample_rate)
        dur = 0.22
        end_idx = min(total_samples, start_idx + int(dur * sample_rate))
        import random
        for i in range(start_idx, end_idx):
            t = (i - start_idx) / sample_rate
            env = math.exp(-13 * t)
            noise = (random.random() * 2 - 1) * amp * env
            tone = math.sin(2 * math.pi * 190 * t) * (amp * 0.4) * env
            left[i] += noise + tone
            right[i] += noise + tone

    # Intro bass drop & riser
    add_tone(0.1, 2.2, (110, 36), amp=0.6, wave_type='sweep')
    add_kick(0.1, amp=0.5)
    add_tone(1.2, 1.3, (180, 800), amp=0.35, wave_type='sweep')

    # Hook impact at 2.5s (Scene 1 AI Koç entrance)
    add_kick(2.5, amp=0.7)
    add_tone(2.5, 2.0, (140, 42), amp=0.5, wave_type='sweep')

    # Rhythmic beat from 2.5s to 18.5s (BPM 128 -> beat = 0.46875s)
    beat_len = 60.0 / 128.0
    cur_t = 2.5
    beat_count = 0
    while cur_t < 18.5:
        if beat_count % 2 == 0:
            add_kick(cur_t, amp=0.5)
        else:
            add_snare(cur_t, amp=0.32)
        # Hi-hat on 8th notes
        add_tone(cur_t + beat_len * 0.5, 0.05, 6200, amp=0.07, wave_type='triangle')
        # Bassline
        bass_freq = 55 if (beat_count % 8 < 4) else 65
        add_tone(cur_t, beat_len * 0.75, bass_freq, amp=0.25, wave_type='triangle')
        cur_t += beat_len
        beat_count += 1

    # Sound FX for specific scenes
    # Scene 2 (5.8s): Food Vision Laser Scan
    add_tone(5.8, 0.4, (900, 300), amp=0.28, wave_type='sweep')
    add_tone(7.0, 0.3, (850, 350), amp=0.22, wave_type='sweep')

    # Scene 3 (9.1s): Macro success chime
    for idx, f in enumerate([523, 659, 784]):
        add_tone(9.1 + idx * 0.08, 0.45, f, amp=0.18, wave_type='sine')

    # Scene 4 (12.4s): Library shimmer
    for idx, f in enumerate([587, 740, 880]):
        add_tone(12.4 + idx * 0.08, 0.45, f, amp=0.18, wave_type='sine')

    # Scene 5 (15.7s): Workout power chime
    for idx, f in enumerate([440, 554, 659, 880]):
        add_tone(15.7 + idx * 0.07, 0.5, f, amp=0.22, wave_type='sine')

    # Scene 6 (18.5s): Outro triumph chords
    for idx, f in enumerate([523, 659, 784, 1046, 1318]):
        add_tone(18.5 + idx * 0.09, 1.2, f, amp=0.24, wave_type='sine')

    # Master limiter & write WAV
    with wave.open(wav_path, 'wb') as wf:
        wf.setnchannels(2)
        wf.setsampwidth(2)
        wf.setframerate(sample_rate)
        raw_data = bytearray()
        for i in range(total_samples):
            # Soft master volume envelope with smooth fade out at end
            fade_factor = 1.0
            if i > total_samples - int(0.6 * sample_rate):
                fade_factor = max(0.0, (total_samples - i) / (0.6 * sample_rate))
            l = max(-0.95, min(0.95, left[i] * 0.85 * fade_factor))
            r = max(-0.95, min(0.95, right[i] * 0.85 * fade_factor))
            raw_data.extend(struct.pack('<hh', int(l * 32767), int(r * 32767)))
        wf.writeframes(raw_data)
    print(f"Soundtrack generated at: {wav_path}")

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
    x = (WIDTH - FRAME_W) // 2 # 273
    y = 395 + int(y_bob)

    # Ambient glow behind phone
    glow_w = 640
    glow_h = 1200
    glow_x = (WIDTH - glow_w) // 2
    glow_y = y - 20
    glow = Image.new("RGBA", (WIDTH, HEIGHT), (0, 0, 0, 0))
    glow_draw = ImageDraw.Draw(glow)
    glow_draw.ellipse([glow_x, glow_y, glow_x + glow_w, glow_y + glow_h], fill=(*accent_rgb, 36))
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

    # Dynamic scanner beam effect for Food Vision
    if scan_ratio is not None:
        scan_draw = ImageDraw.Draw(screen_img)
        beam_y = int(scan_ratio * PHONE_SCREEN_H)
        # Laser beam
        beam_color = (56, 189, 248, 240)
        scan_draw.line([(0, beam_y), (PHONE_SCREEN_W, beam_y)], fill=(56, 189, 248), width=4)
        # Scan highlight region
        trail_h = 45
        if beam_y > trail_h:
            trail = Image.new("RGBA", (PHONE_SCREEN_W, trail_h), (56, 189, 248, 30))
            screen_img.paste(trail, (0, beam_y - trail_h), trail)

    base_img.paste(screen_img, (sx, sy), screen_img)

    # Dynamic Island at top
    di_w = 110
    di_h = 24
    di_x = (WIDTH - di_w) // 2
    di_y = sy + 8
    draw.rounded_rectangle([di_x, di_y, di_x + di_w, di_y + di_h], radius=12, fill=(8, 11, 16))
    draw.ellipse([di_x + di_w - 20, di_y + 6, di_x + di_w - 8, di_y + 18], fill=(20, 28, 40))

def draw_bottom_bar(draw, active_idx=0):
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

# =============================================================================
# FRAME RENDER LOGIC
# =============================================================================
def render_frame(frame_idx):
    t = frame_idx / FPS
    img = base_bg.copy()
    draw = ImageDraw.Draw(img)

    # Subtle floating motion for phone
    phone_bob = math.sin(t * 2.8) * 3.5

    # -------------------------------------------------------------------------
    # SCENE 0: Hook / Problem (0.0s - 2.5s)
    # -------------------------------------------------------------------------
    if t < 2.5:
        # Fade in
        fade = min(1.0, t / 0.35)

        draw_pill(draw, "SPOR SALONUNDA YALNIZ DEĞİLSİN", 210, (26, 38, 28), (34, 197, 94), (34, 197, 94))

        draw_centered_text(draw, "Antrenman & Beslenmeni", 295, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Şansa Bırakma!", 365, font_hero, (34, 197, 94))

        # Centered Feature Card
        card_y = 470
        card_w = 880
        card_h = 760
        card_x = (WIDTH - card_w) // 2
        draw.rounded_rectangle([card_x, card_y, card_x + card_w, card_y + card_h], radius=36, fill=(15, 21, 32), outline=(34, 197, 94), width=2)

        # App Logo & Branding
        img.paste(icon_rounded_150, (WIDTH // 2 - 75, card_y + 45), icon_rounded_150)
        draw_centered_text(draw, "POWERFORM", card_y + 215, font_hero, (255, 255, 255))
        draw_centered_text(draw, "Akıllı Fitness & Beslenme Asistanı", card_y + 285, font_sub, (148, 163, 184))

        draw.line([(card_x + 60, card_y + 335), (card_x + card_w - 60, card_y + 335)], fill=(30, 41, 59), width=1)

        items = [
            ("Yapay Zeka Fitness Koçu", "Kişiselleştirilmiş alt & üst vücut planları"),
            ("Fotoğraftan Yemek Tanıma", "Tabağını çek, kalori & makrolar anında hazır"),
            ("Canlı Seans & 100+ Egzersiz", "Set, tekrar ve RIR ile sürekli gelişim"),
        ]
        for idx, (head, desc) in enumerate(items):
            iy = card_y + 375 + idx * 115
            draw_check_circle(draw, card_x + 75, iy + 16, radius=16, circle_color=(34, 197, 94))
            draw.text((card_x + 115, iy), head, font=font_card_head, fill=(255, 255, 255))
            draw.text((card_x + 115, iy + 44), desc, font=font_card_sub, fill=(148, 163, 184))

        draw_centered_text(draw, "ÖZELLİKLERİ KEŞFET  ▼", 1320, font_badge, (34, 197, 94))
        draw_bottom_bar(draw, 0)

        if fade < 1.0:
            overlay = Image.new("RGB", (WIDTH, HEIGHT), (9, 13, 20))
            img = Image.blend(overlay, img, fade)

    # -------------------------------------------------------------------------
    # SCENE 1: AI Fitness Koçu (2.5s - 5.8s)
    # -------------------------------------------------------------------------
    elif t < 5.8:
        draw_pill(draw, "YAPAY ZEKA FITNESS KOÇU", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Sana Özel Antrenman Planı", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Saniyeler İçinde Hazır!", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Hedefine göre set, tekrar ve tükeniş stratejisi belirler.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "koc", (34, 197, 94), y_bob=phone_bob)
        draw_bottom_bar(draw, 0)

    # -------------------------------------------------------------------------
    # SCENE 2: Fotoğraftan Yemek Tanıma (5.8s - 9.1s)
    # -------------------------------------------------------------------------
    elif t < 9.1:
        local_t = t - 5.8
        draw_pill(draw, "AI YEMEK TANIMA • FOOD VISION", 160, (14, 32, 45), (56, 189, 248), (56, 189, 248))
        draw_centered_text(draw, "Tabağının Fotoğrafını Çek,", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Makrolar Anında Hazır!", 278, font_title2, (56, 189, 248))
        draw_centered_text(draw, "Yapay zeka yemeği tanır, kalori ve besinleri otomatik çıkarır.", 342, font_sub, (148, 163, 184))

        # Dynamic scanner laser sweep
        scan_progress = (local_t * 0.45) % 1.0
        draw_phone_frame(img, "food", (56, 189, 248), y_bob=phone_bob, scan_ratio=scan_progress)
        draw_bottom_bar(draw, 1)

    # -------------------------------------------------------------------------
    # SCENE 3: Günlük Beslenme & Makro Takibi (9.1s - 12.4s)
    # -------------------------------------------------------------------------
    elif t < 12.4:
        draw_pill(draw, "AKILLI BESLENME TAKİBİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Kalan Kalori & Makrolarını", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Tek Ekranda Canlı Gör!", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "Protein, karbonhidrat ve yağ dengesini zahmetsizce yönet.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "nutrition", (34, 197, 94), y_bob=phone_bob)
        draw_bottom_bar(draw, 2)

    # -------------------------------------------------------------------------
    # SCENE 4: 100+ Egzersiz Kütüphanesi (12.4s - 15.7s)
    # -------------------------------------------------------------------------
    elif t < 15.7:
        draw_pill(draw, "100+ EGZERSİZ KÜTÜPHANESİ", 160, (28, 22, 48), (168, 85, 247), (168, 85, 247))
        draw_centered_text(draw, "Yüzlerce Hareket &", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Doğru Form Rehberi", 278, font_title2, (168, 85, 247))
        draw_centered_text(draw, "Halter, dambıl, makine ve vücut ağırlığı seçenekleri.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "library", (168, 85, 247), y_bob=phone_bob)
        draw_bottom_bar(draw, 3)

    # -------------------------------------------------------------------------
    # SCENE 5: Canlı Seans & Antrenman Yönetimi (15.7s - 18.5s)
    # -------------------------------------------------------------------------
    elif t < 18.5:
        draw_pill(draw, "CANLI SEANS & RIR TAKİBİ", 160, (20, 38, 26), (34, 197, 94), (34, 197, 94))
        draw_centered_text(draw, "Setlerini ve Ağırlıklarını", 222, font_title1, (255, 255, 255))
        draw_centered_text(draw, "Canlı Olarak Kaydet", 278, font_title2, (34, 197, 94))
        draw_centered_text(draw, "RIR hedefleri ve dinlenme süreleriyle maksimum hipertrofi.", 342, font_sub, (148, 163, 184))

        draw_phone_frame(img, "workout", (34, 197, 94), y_bob=phone_bob)
        draw_bottom_bar(draw, 4)

    # -------------------------------------------------------------------------
    # SCENE 6: Outro / Call To Action (18.5s - 21.0s)
    # -------------------------------------------------------------------------
    else:
        draw_pill(draw, "GELİŞİMİNİ BİR ÜST SEVİYEYE TAŞI", 260, (20, 38, 26), (34, 197, 94), (34, 197, 94))

        # Pulse aura behind icon
        pulse = 15 * math.sin((t - 18.5) * 4.0)
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

        draw_centered_text(draw, "Antrenmanını Akıllı Yönet. Formunu Güçlendir.", 1030, font_sub, (203, 213, 225))
        draw_bottom_bar(draw, 4)

        # Smooth fade out at the very end (last 0.4s)
        if t > 20.6:
            fade_out = min(1.0, (t - 20.6) / 0.4)
            black_overlay = Image.new("RGB", (WIDTH, HEIGHT), (0, 0, 0))
            img = Image.blend(img, black_overlay, fade_out)

    return img

# =============================================================================
# MAIN RENDERING & VIDEO ENCODING PIPELINE
# =============================================================================
def main():
    final_output = "PowerForm_Tanitim_Reels_9x16.mp4"
    temp_video = "scratch/temp_visual_1080p.mp4"

    print(f"Step 2: Rendering {TOTAL_FRAMES} Full HD 1080x1920 frames ({FPS} fps, {DURATION}s)...")
    writer = imageio.get_writer(
        temp_video,
        fps=FPS,
        codec='libx264',
        pixelformat='yuv420p',
        macro_block_size=1,
        ffmpeg_params=[
            '-preset', 'medium',
            '-crf', '16', # Ultra-clean visual quality
            '-b:v', '10M',
            '-maxrate', '14M',
            '-bufsize', '20M',
        ]
    )

    for i in range(TOTAL_FRAMES):
        frame = render_frame(i)
        writer.append_data(np.array(frame))
        if i % 60 == 0 or i == TOTAL_FRAMES - 1:
            print(f"  Frame {i}/{TOTAL_FRAMES} ({(i / FPS):.1f}s / {DURATION}s) rendered.")

    writer.close()
    print("Video stream rendering complete.")

    print("Step 3: Creating clean, silent Full HD MP4 video with FFmpeg...")
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    mux_cmd = [
        ffmpeg_exe,
        "-y",
        "-i", temp_video,
        "-c:v", "copy",
        "-an", # No audio track - 100% silent for TikTok / Reels music picker
        "-movflags", "+faststart",
        final_output
    ]
    subprocess.run(mux_cmd, check=True)

    # Cleanup temp video
    if os.path.exists(temp_video):
        os.remove(temp_video)

    # Also copy to scratch
    import shutil
    shutil.copy(final_output, "scratch/PowerForm_Tanitim_Reels_9x16.mp4")

    print("\n========================================================")
    print("🎉 SUCCESS! Ultra HD Promo Video Generated Successfully!")
    print(f"File: {final_output}")
    print(f"Scratch copy: scratch/{final_output}")
    print(f"Resolution: {WIDTH}x{HEIGHT} (Full HD 9:16 Vertical)")
    print(f"Duration: {DURATION}s @ {FPS} FPS")
    print("========================================================\n")

if __name__ == "__main__":
    main()
