import { eq } from 'drizzle-orm';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';

import { db } from '../db/client';
import { getWorkoutHistory, getSessionDetail } from '../db/history';
import { getUserPrograms } from '../db/programs';
import { bodyMeasurements, bodyWeightLogs, nutritionEntries, nutritionTargets } from '../db/schema';
import { formatDurationHuman } from './calculations';
import { useAuthStore } from '../stores/useAuthStore';

function escapeHtml(str: string | null | undefined): string {
  if (!str) return '—';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export async function exportAllUserData(): Promise<void> {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) {
    Alert.alert('Hata', 'Oturum açık değil.');
    return;
  }

  try {
    const profile = useAuthStore.getState().profile;
    const userEmail = useAuthStore.getState().session?.user.email ?? '—';

    // 1. Antrenman geçmişi ve detayları
    const summaries = await getWorkoutHistory(userId);
    const detailedSessions = [];
    for (const s of summaries) {
      const detail = await getSessionDetail(s.clientUuid);
      if (detail) detailedSessions.push(detail);
    }

    // 2. Özel programlar
    const customPrograms = await getUserPrograms(userId);

    // 3. Kilo kayıtları
    const weights = await db
      .select()
      .from(bodyWeightLogs)
      .where(eq(bodyWeightLogs.userId, userId));

    // Tarihe göre sırala (en yeniden eskiye)
    weights.sort((a, b) => b.loggedOn.localeCompare(a.loggedOn));

    // 3.1 Vücut ölçüleri
    const measurements = await db
      .select()
      .from(bodyMeasurements)
      .where(eq(bodyMeasurements.userId, userId));
    measurements.sort((a, b) => b.loggedOn.localeCompare(a.loggedOn));

    // 4. Beslenme kayıtları ve hedefleri
    const meals = await db
      .select()
      .from(nutritionEntries)
      .where(eq(nutritionEntries.userId, userId));

    meals.sort((a, b) => b.loggedOn.localeCompare(a.loggedOn));

    const targets = await db
      .select()
      .from(nutritionTargets)
      .where(eq(nutritionTargets.userId, userId));

    const exportDateStr = new Date().toLocaleString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

    // HTML Şablonunu Oluştur
    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Powerform - Kullanıcı Veri Raporu</title>
  <style>
    @page {
      size: A4;
      margin: 12mm 10mm 12mm 10mm;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
      color: #1F2937;
      background-color: #FFFFFF;
      margin: 0;
      padding: 0;
      font-size: 10px;
      line-height: 1.4;
    }
    .header {
      border-bottom: 2px solid #10B981;
      padding-bottom: 8px;
      margin-bottom: 12px;
      display: flex;
      justify-content: space-between;
      align-items: flex-end;
    }
    .brand {
      font-size: 20px;
      font-weight: 800;
      color: #111827;
      letter-spacing: -0.5px;
    }
    .brand span {
      color: #10B981;
    }
    .report-meta {
      text-align: right;
      font-size: 9px;
      color: #6B7280;
    }
    .report-meta strong {
      color: #111827;
    }
    .stats-row {
      display: flex;
      gap: 8px;
      margin-bottom: 14px;
    }
    .stat-card {
      flex: 1;
      background: #F9FAFB;
      border: 1px solid #E5E7EB;
      border-radius: 6px;
      padding: 8px 10px;
    }
    .stat-label {
      font-size: 8px;
      font-weight: 700;
      text-transform: uppercase;
      color: #6B7280;
      margin-bottom: 2px;
    }
    .stat-value {
      font-size: 15px;
      font-weight: 800;
      color: #111827;
    }
    h2 {
      font-size: 12px;
      font-weight: 700;
      color: #111827;
      border-left: 3px solid #10B981;
      padding-left: 6px;
      margin-top: 14px;
      margin-bottom: 6px;
      text-transform: uppercase;
    }
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 12px;
      font-size: 9px;
    }
    th {
      background-color: #F3F4F6;
      color: #374151;
      font-weight: 700;
      text-align: left;
      padding: 5px 6px;
      border: 1px solid #E5E7EB;
    }
    td {
      padding: 5px 6px;
      border: 1px solid #E5E7EB;
      color: #374151;
      vertical-align: top;
    }
    tr:nth-child(even) {
      background-color: #F9FAFB;
    }
    .badge {
      display: inline-block;
      padding: 2px 4px;
      border-radius: 3px;
      font-size: 8px;
      font-weight: 600;
      background: #E5E7EB;
      color: #374151;
    }
    .badge-accent {
      background: #D1FAE5;
      color: #065F46;
    }
    .footer {
      margin-top: 20px;
      border-top: 1px solid #E5E7EB;
      padding-top: 6px;
      font-size: 8px;
      color: #9CA3AF;
      text-align: center;
    }
  </style>
</head>
<body>
  <div class="header">
    <div>
      <div class="brand">POWER<span>FORM</span></div>
      <div style="font-size: 10px; color: #6B7280; font-weight: 600;">KİŞİSEL VERİ VE ANTRENMAN RAPORU (KVKK / GDPR)</div>
    </div>
    <div class="report-meta">
      <div>Kullanıcı: <strong>${escapeHtml(userEmail)}</strong></div>
      <div>Oluşturulma: <strong>${exportDateStr}</strong></div>
    </div>
  </div>

  <!-- Özet Kartları -->
  <div class="stats-row">
    <div class="stat-card">
      <div class="stat-label">Toplam Antrenman</div>
      <div class="stat-value">${detailedSessions.length} Seans</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Kilo Kayıtları</div>
      <div class="stat-value">${weights.length} Gün</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Beslenme Kayıtları</div>
      <div class="stat-value">${meals.length} Öğün</div>
    </div>
    <div class="stat-card">
      <div class="stat-label">Özel Programlar</div>
      <div class="stat-value">${customPrograms.length} Adet</div>
    </div>
  </div>

  <!-- Profil Bilgileri -->
  <h2>1. Profil ve Fiziksel Bilgiler</h2>
  <table>
    <tr>
      <th style="width: 25%;">E-posta</th>
      <th style="width: 15%;">Doğum Yılı</th>
      <th style="width: 15%;">Boy</th>
      <th style="width: 15%;">Cinsiyet</th>
      <th style="width: 15%;">Seviye</th>
      <th style="width: 15%;">Ana Hedef</th>
    </tr>
    <tr>
      <td>${escapeHtml(userEmail)}</td>
      <td>${profile?.birth_year ?? '—'}</td>
      <td>${profile?.height_cm ? `${profile.height_cm} cm` : '—'}</td>
      <td>${escapeHtml(profile?.sex)}</td>
      <td>${escapeHtml(profile?.experience)}</td>
      <td>${escapeHtml(profile?.primary_goal)}</td>
    </tr>
  </table>

  <!-- Antrenman Geçmişi -->
  <h2>2. Antrenman Geçmişi (${detailedSessions.length} Seans)</h2>
  ${
    detailedSessions.length === 0
      ? '<p style="color:#6B7280;">Henüz kaydedilmiş antrenman seansı bulunmuyor.</p>'
      : `
  <table>
    <thead>
      <tr>
        <th style="width: 12%;">Tarih</th>
        <th style="width: 20%;">Antrenman Adı</th>
        <th style="width: 10%;">Süre</th>
        <th style="width: 12%;">Hacim</th>
        <th style="width: 8%;">Toplam Set</th>
        <th style="width: 38%;">Egzersizler ve Setler</th>
      </tr>
    </thead>
    <tbody>
      ${detailedSessions
        .map((s) => {
          const dateStr = new Date(s.startedAt * 1000).toLocaleDateString('tr-TR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
          });
          const durationStr = s.durationSeconds ? formatDurationHuman(s.durationSeconds) : '—';
          const exercisesSummary = s.exercises
            .map((e) => {
              const setsStr = e.sets
                .map((st) => `${st.weightKg ?? 0}kg×${st.reps ?? 0}`)
                .join(', ');
              return `<strong>${escapeHtml(e.nameTr || e.nameEn)}</strong>: [${setsStr}]`;
            })
            .join('<br>');

          return `
            <tr>
              <td>${dateStr}</td>
              <td><strong>${escapeHtml(s.name || 'Serbest Antrenman')}</strong></td>
              <td>${durationStr}</td>
              <td><strong>${Math.round(s.totalVolumeKg).toLocaleString('tr-TR')} kg</strong></td>
              <td>${s.totalSets}</td>
              <td>${exercisesSummary || '—'}</td>
            </tr>
          `;
        })
        .join('')}
    </tbody>
  </table>
  `
  }

  <!-- Vücut Ağırlığı Takibi -->
  <h2>3. Vücut Ağırlığı Geçmişi (${weights.length} Kayıt)</h2>
  ${
    weights.length === 0
      ? '<p style="color:#6B7280;">Henüz kilo kaydı bulunmuyor.</p>'
      : `
  <table>
    <thead>
      <tr>
        <th style="width: 40%;">Tarih</th>
        <th style="width: 60%;">Ağırlık (kg)</th>
      </tr>
    </thead>
    <tbody>
      ${weights
        .slice(0, 50)
        .map(
          (w) => `
        <tr>
          <td>${w.loggedOn}</td>
          <td><strong>${w.weightKg} kg</strong></td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  ${weights.length > 50 ? `<p style="font-size: 8px; color: #9CA3AF;">* Toplam ${weights.length} kayıttan en son 50 tanesi listelenmiştir.</p>` : ''}
  `
  }

  <!-- Vücut Ölçüleri Takibi -->
  <h2>4. Vücut Ölçüleri (${measurements.length} Kayıt)</h2>
  ${
    measurements.length === 0
      ? '<p style="color:#6B7280;">Henüz vücut ölçüsü kaydı bulunmuyor.</p>'
      : `
  <table>
    <thead>
      <tr>
        <th style="width: 14%;">Tarih</th>
        <th style="width: 11%;">Sol Kol</th>
        <th style="width: 11%;">Sağ Kol</th>
        <th style="width: 11%;">Göğüs</th>
        <th style="width: 11%;">Bel</th>
        <th style="width: 11%;">Kalça</th>
        <th style="width: 11%;">Bacak</th>
        <th style="width: 10%;">Kalf</th>
        <th style="width: 10%;">Omuz</th>
      </tr>
    </thead>
    <tbody>
      ${measurements
        .slice(0, 50)
        .map(
          (m) => `
        <tr>
          <td>${m.loggedOn}</td>
          <td>${m.armLeftCm != null ? `${m.armLeftCm} cm` : '—'}</td>
          <td>${m.armRightCm != null ? `${m.armRightCm} cm` : '—'}</td>
          <td>${m.chestCm != null ? `${m.chestCm} cm` : '—'}</td>
          <td>${m.waistCm != null ? `${m.waistCm} cm` : '—'}</td>
          <td>${m.hipCm != null ? `${m.hipCm} cm` : '—'}</td>
          <td>${m.thighCm != null ? `${m.thighCm} cm` : '—'}</td>
          <td>${m.calfCm != null ? `${m.calfCm} cm` : '—'}</td>
          <td>${m.shoulderCm != null ? `${m.shoulderCm} cm` : '—'}</td>
        </tr>
      `
        )
        .join('')}
    </tbody>
  </table>
  ${measurements.length > 50 ? `<p style="font-size: 8px; color: #9CA3AF;">* Toplam ${measurements.length} kayıttan en son 50 tanesi listelenmiştir.</p>` : ''}
  `
  }

  <!-- Beslenme Kayıtları -->
  <h2>5. Beslenme Takibi (${meals.length} Öğün)</h2>
  ${
    meals.length === 0
      ? '<p style="color:#6B7280;">Henüz beslenme kaydı bulunmuyor.</p>'
      : `
  <table>
    <thead>
      <tr>
        <th style="width: 15%;">Tarih</th>
        <th style="width: 15%;">Öğün</th>
        <th style="width: 30%;">Gıda / Besin</th>
        <th style="width: 10%;">Miktar</th>
        <th style="width: 10%;">Kalori</th>
        <th style="width: 20%;">Makrolar (P / K / Y)</th>
      </tr>
    </thead>
    <tbody>
      ${meals
        .slice(0, 60)
        .map((m) => {
          const mealNames: Record<string, string> = {
            breakfast: 'Kahvaltı',
            lunch: 'Öğle',
            dinner: 'Akşam',
            snack: 'Ara Öğün',
          };
          const mealTr = mealNames[m.meal] ?? m.meal;
          return `
          <tr>
            <td>${m.loggedOn}</td>
            <td><span class="badge">${mealTr}</span></td>
            <td><strong>${escapeHtml(m.foodNameSnapshot)}</strong></td>
            <td>${m.quantityG} g</td>
            <td><strong>${Math.round(m.kcal)} kcal</strong></td>
            <td>${Math.round(m.proteinG)}g / ${Math.round(m.carbsG)}g / ${Math.round(m.fatG)}g</td>
          </tr>
        `;
        })
        .join('')}
    </tbody>
  </table>
  ${meals.length > 60 ? `<p style="font-size: 8px; color: #9CA3AF;">* Toplam ${meals.length} kayıttan en son 60 tanesi listelenmiştir.</p>` : ''}
  `
  }

  <div class="footer">
    Powerform App · Bu belge 6698 sayılı KVKK ve GDPR Veri Taşınabilirliği (Data Portability) kapsamında kullanıcının talebiyle üretilmiştir.
  </div>
</body>
</html>
    `;

    // PDF Dosyasını Üret
    const { uri } = await Print.printToFileAsync({ html });

    // Paylaşım Menüsünü Aç
    if (await Sharing.isAvailableAsync()) {
      await Sharing.shareAsync(uri, {
        UTI: '.pdf',
        mimeType: 'application/pdf',
        dialogTitle: 'Powerform Veri Raporunu Paylaş / Kaydet',
      });
    } else {
      await Print.printAsync({ uri });
    }
  } catch (err: any) {
    console.error('[dataExport] Hata:', err);
    Alert.alert('Hata', err?.message ?? 'Veriler PDF formatında dışa aktarılamadı.');
  }
}
