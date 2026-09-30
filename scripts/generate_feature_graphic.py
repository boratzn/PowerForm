import base64
import subprocess
import os
from PIL import Image

def generate():
    workspace_dir = "/Users/boratzn/Desktop/Powerform"
    icon_path = os.path.join(workspace_dir, "assets/icon.png")
    
    with open(icon_path, "rb") as f:
        icon_b64 = base64.b64encode(f.read()).decode("utf-8")

    html_content = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800;900&family=Syne:wght@700;800;900&display=swap');

  * {{
    margin: 0;
    padding: 0;
    box-sizing: border-box;
  }}

  body {{
    width: 1024px;
    height: 500px;
    overflow: hidden;
    background-color: #06090E;
    font-family: 'Plus Jakarta Sans', sans-serif;
    color: #FFFFFF;
    position: relative;
    display: flex;
    align-items: center;
  }}

  /* Dynamic Background Gradients */
  .bg-glow-1 {{
    position: absolute;
    width: 600px;
    height: 600px;
    left: -150px;
    top: -150px;
    background: radial-gradient(circle, rgba(0, 240, 255, 0.16) 0%, rgba(0, 240, 255, 0.03) 50%, transparent 70%);
    filter: blur(60px);
    pointer-events: none;
  }}

  .bg-glow-2 {{
    position: absolute;
    width: 700px;
    height: 700px;
    right: -100px;
    top: -100px;
    background: radial-gradient(circle, rgba(168, 85, 247, 0.14) 0%, rgba(59, 130, 246, 0.10) 40%, transparent 70%);
    filter: blur(70px);
    pointer-events: none;
  }}

  .bg-glow-center {{
    position: absolute;
    width: 500px;
    height: 350px;
    left: 300px;
    top: 100px;
    background: radial-gradient(ellipse, rgba(0, 240, 255, 0.08) 0%, transparent 60%);
    filter: blur(50px);
    pointer-events: none;
  }}

  /* High-Tech Grid Pattern */
  .grid-pattern {{
    position: absolute;
    inset: 0;
    background-image: 
      linear-gradient(to right, rgba(255, 255, 255, 0.03) 1px, transparent 1px),
      linear-gradient(to bottom, rgba(255, 255, 255, 0.03) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 90%);
    -webkit-mask-image: radial-gradient(ellipse at 50% 50%, black 40%, transparent 90%);
    pointer-events: none;
  }}

  /* Cyber Vignette */
  .vignette {{
    position: absolute;
    inset: 0;
    box-shadow: inset 0 0 100px rgba(0, 0, 0, 0.85);
    pointer-events: none;
  }}

  /* Main Container */
  .container {{
    position: relative;
    z-index: 10;
    width: 1024px;
    height: 500px;
    padding: 0 56px;
    display: flex;
    align-items: center;
    justify-content: space-between;
  }}

  /* Left Brand Content */
  .brand-section {{
    flex: 1;
    max-width: 530px;
    display: flex;
    flex-direction: column;
    gap: 16px;
  }}

  .logo-header {{
    display: flex;
    align-items: center;
    gap: 20px;
  }}

  .app-icon-wrapper {{
    position: relative;
    width: 92px;
    height: 92px;
    border-radius: 22px;
    padding: 2px;
    background: linear-gradient(135deg, rgba(0, 240, 255, 0.8), rgba(168, 85, 247, 0.4), rgba(255, 255, 255, 0.1));
    box-shadow: 0 12px 35px rgba(0, 240, 255, 0.35);
  }}

  .app-icon {{
    width: 100%;
    height: 100%;
    border-radius: 20px;
    object-fit: cover;
    display: block;
  }}

  .brand-title-wrap {{
    display: flex;
    flex-direction: column;
  }}

  .brand-name {{
    font-family: 'Syne', sans-serif;
    font-size: 50px;
    font-weight: 900;
    letter-spacing: 2px;
    line-height: 1;
    background: linear-gradient(180deg, #FFFFFF 30%, #A5F3FC 100%);
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
    text-shadow: 0 0 30px rgba(0, 240, 255, 0.3);
  }}

  .brand-badge {{
    display: inline-flex;
    align-items: center;
    gap: 6px;
    margin-top: 6px;
    padding: 4px 10px;
    border-radius: 20px;
    background: rgba(0, 240, 255, 0.12);
    border: 1px solid rgba(0, 240, 255, 0.3);
    width: fit-content;
  }}

  .brand-badge span {{
    font-size: 11px;
    font-weight: 800;
    letter-spacing: 1.5px;
    text-transform: uppercase;
    color: #00F0FF;
  }}

  .brand-badge .dot {{
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background-color: #00F0FF;
    box-shadow: 0 0 8px #00F0FF;
  }}

  .headline {{
    font-size: 23px;
    font-weight: 800;
    line-height: 1.3;
    color: #F1F5F9;
  }}

  .headline span {{
    color: #38BDF8;
  }}

  .subheadline {{
    font-size: 13.5px;
    font-weight: 500;
    line-height: 1.5;
    color: #94A3B8;
  }}

  .feature-pills {{
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    margin-top: 4px;
  }}

  .pill {{
    display: flex;
    align-items: center;
    gap: 7px;
    padding: 7px 13px;
    border-radius: 12px;
    background: rgba(18, 24, 38, 0.7);
    border: 1px solid rgba(255, 255, 255, 0.08);
    backdrop-filter: blur(12px);
    font-size: 11.5px;
    font-weight: 700;
    color: #E2E8F0;
    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  }}

  .pill svg {{
    width: 14px;
    height: 14px;
  }}

  /* Right Showcase Visual */
  .visual-section {{
    flex: 1;
    max-width: 380px;
    height: 420px;
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 14px;
    position: relative;
  }}

  /* Card 1: Live Workout Preview */
  .card-workout {{
    background: linear-gradient(135deg, rgba(20, 28, 45, 0.85) 0%, rgba(12, 17, 28, 0.95) 100%);
    border: 1px solid rgba(0, 240, 255, 0.25);
    border-radius: 18px;
    padding: 16px 20px;
    box-shadow: 0 20px 40px rgba(0, 0, 0, 0.6), 0 0 30px rgba(0, 240, 255, 0.12);
    backdrop-filter: blur(16px);
  }}

  .card-top {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
  }}

  .workout-tag {{
    display: flex;
    align-items: center;
    gap: 6px;
    font-size: 11px;
    font-weight: 700;
    color: #00F0FF;
    text-transform: uppercase;
    letter-spacing: 0.8px;
  }}

  .live-indicator {{
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background-color: #22C55E;
    box-shadow: 0 0 8px #22C55E;
  }}

  .timer-pill {{
    font-size: 12px;
    font-weight: 800;
    font-variant-numeric: tabular-nums;
    color: #CBD5E1;
    background: rgba(255, 255, 255, 0.06);
    padding: 3px 8px;
    border-radius: 6px;
  }}

  .exercise-title {{
    font-size: 16px;
    font-weight: 800;
    color: #FFFFFF;
    margin-bottom: 10px;
  }}

  .set-row {{
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: rgba(0, 0, 0, 0.35);
    border-radius: 10px;
    padding: 8px 12px;
    border: 1px solid rgba(255, 255, 255, 0.05);
  }}

  .set-info {{
    display: flex;
    align-items: center;
    gap: 12px;
  }}

  .set-num {{
    font-size: 12px;
    font-weight: 800;
    color: #00F0FF;
  }}

  .set-stats {{
    font-size: 14px;
    font-weight: 700;
    color: #F8FAFC;
  }}

  .set-badge {{
    background: linear-gradient(135deg, #10B981, #059669);
    font-size: 10px;
    font-weight: 800;
    padding: 3px 8px;
    border-radius: 6px;
    color: #FFFFFF;
    display: flex;
    align-items: center;
    gap: 4px;
  }}

  /* Card 2: AI Coach Insight */
  .card-coach {{
    background: linear-gradient(135deg, rgba(30, 24, 52, 0.85) 0%, rgba(16, 14, 30, 0.95) 100%);
    border: 1px solid rgba(168, 85, 247, 0.3);
    border-radius: 16px;
    padding: 14px 18px;
    box-shadow: 0 16px 35px rgba(0, 0, 0, 0.5), 0 0 25px rgba(168, 85, 247, 0.15);
    backdrop-filter: blur(16px);
  }}

  .coach-header {{
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 6px;
  }}

  .coach-icon {{
    width: 20px;
    height: 20px;
    border-radius: 6px;
    background: linear-gradient(135deg, #A855F7, #6366F1);
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
  }}

  .coach-name {{
    font-size: 11.5px;
    font-weight: 800;
    color: #D8B4FE;
    text-transform: uppercase;
    letter-spacing: 0.6px;
  }}

  .coach-text {{
    font-size: 12px;
    font-weight: 600;
    color: #E2E8F0;
    line-height: 1.4;
  }}

  .coach-highlight {{
    color: #38BDF8;
    font-weight: 700;
  }}

  /* Mini Stats Bar */
  .stats-bar {{
    display: flex;
    gap: 8px;
  }}

  .mini-stat {{
    flex: 1;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(255, 255, 255, 0.06);
    border-radius: 12px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }}

  .mini-stat-label {{
    font-size: 9.5px;
    font-weight: 700;
    text-transform: uppercase;
    color: #94A3B8;
  }}

  .mini-stat-value {{
    font-size: 14px;
    font-weight: 800;
    color: #F8FAFC;
    display: flex;
    align-items: baseline;
    gap: 3px;
  }}

  .mini-stat-unit {{
    font-size: 10px;
    color: #00F0FF;
  }}

</style>
</head>
<body>
  <!-- Decorative Light Layers -->
  <div class="bg-glow-1"></div>
  <div class="bg-glow-2"></div>
  <div class="bg-glow-center"></div>
  <div class="grid-pattern"></div>
  <div class="vignette"></div>

  <div class="container">
    <!-- Left Column: Branding & Features -->
    <div class="brand-section">
      <div class="logo-header">
        <div class="app-icon-wrapper">
          <img class="app-icon" src="data:image/png;base64,{icon_b64}" alt="Powerform Logo" />
        </div>
        <div class="brand-title-wrap">
          <div class="brand-name">POWERFORM</div>
          <div class="brand-badge">
            <div class="dot"></div>
            <span>AI WORKOUT & STRENGTH</span>
          </div>
        </div>
      </div>

      <div class="headline">
        Antrenmanını Akıllı Yönet,<br>
        <span>Hedeflerine Güç Kat.</span>
      </div>

      <div class="subheadline">
        Yapay zeka destekli koç, kişiselleştirilmiş programlar, set & RIR takibi ve anlık toparlanma analizleri tek uygulamada.
      </div>

      <div class="feature-pills">
        <div class="pill">
          <svg fill="#00F0FF" viewBox="0 0 24 24"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
          AI Koç Analizi
        </div>
        <div class="pill">
          <svg fill="#A855F7" viewBox="0 0 24 24"><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-5 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z"/></svg>
          Akıllı Programlar
        </div>
        <div class="pill">
          <svg fill="#22C55E" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 14.5v-9l6 4.5-6 4.5z"/></svg>
          Canlı Seans & Mola
        </div>
        <div class="pill">
          <svg fill="#F59E0B" viewBox="0 0 24 24"><path d="M16 6l2.29 2.29-4.88 4.88-4-4L2 16.59 3.41 18l6-6 4 4 6.3-6.29L22 12V6z"/></svg>
          1RM & Hacim Grafiği
        </div>
      </div>
    </div>

    <!-- Right Column: Interactive App Preview Cards -->
    <div class="visual-section">
      <!-- Live Set Card -->
      <div class="card-workout">
        <div class="card-top">
          <div class="workout-tag">
            <div class="live-indicator"></div>
            Canlı Seans
          </div>
          <div class="timer-pill">34:18 · 6/12 Set</div>
        </div>
        <div class="exercise-title">Barbell Bench Press</div>
        <div class="set-row">
          <div class="set-info">
            <span class="set-num">SET 3</span>
            <span class="set-stats">100 kg × 8 Tekrar</span>
          </div>
          <div class="set-badge">
            ✓ PR KIRILDI
          </div>
        </div>
      </div>

      <!-- AI Coach Card -->
      <div class="card-coach">
        <div class="coach-header">
          <div class="coach-icon">⚡</div>
          <div class="coach-name">Powerform AI Koç</div>
        </div>
        <div class="coach-text">
          "Göğüs hacmin bu hafta <span class="coach-highlight">%14 arttı</span>. 100 kg Bench Press ile tüm zamanların en yüksek güç skoruna ulaştın!"
        </div>
      </div>

      <!-- Quick Stats -->
      <div class="stats-bar">
        <div class="mini-stat">
          <div class="mini-stat-label">Toplam Hacim</div>
          <div class="mini-stat-value">6,420 <span class="mini-stat-unit">kg</span></div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-label">Tahmini 1RM</div>
          <div class="mini-stat-value">124 <span class="mini-stat-unit">kg</span></div>
        </div>
        <div class="mini-stat">
          <div class="mini-stat-label">Dinlenme</div>
          <div class="mini-stat-value">90 <span class="mini-stat-unit">sn</span></div>
        </div>
      </div>
    </div>
  </div>
</body>
</html>
"""

    temp_html_path = "/Users/boratzn/Desktop/Powerform/scratch/feature_graphic.html"
    os.makedirs(os.path.dirname(temp_html_path), exist_ok=True)
    with open(temp_html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
    
    output_png = os.path.join(workspace_dir, "powerform-feature-graphic-1024x500.png")
    output_jpg = os.path.join(workspace_dir, "powerform-feature-graphic-1024x500.jpg")

    cmd = [
        "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
        "--headless",
        "--disable-gpu",
        "--hide-scrollbars",
        "--window-size=1024,500",
        f"--screenshot={output_png}",
        f"file://{temp_html_path}"
    ]
    
    subprocess.run(cmd, check=True)

    # Validate and resize exactly to 1024x500 if Chrome rendered with any subpixel padding
    img = Image.open(output_png)
    if img.size != (1024, 500):
        img = img.resize((1024, 500), Image.Resampling.LANCZOS)
        img.save(output_png, "PNG")

    # Convert to high-quality JPEG as well (Google Play supports both PNG and JPEG)
    rgb_img = img.convert("RGB")
    rgb_img.save(output_jpg, "JPEG", quality=95)

    print(f"Generated: {output_png} (Size: {img.size})")
    print(f"Generated: {output_jpg}")

if __name__ == "__main__":
    generate()
