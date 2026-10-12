import { and, desc, eq } from 'drizzle-orm';

import { dateKey } from '../lib/calculations';
import { generateUuid } from '../lib/uuid';
import { db, sqlite } from './client';
import { bodyPhotos } from './schema';

export type BodyPhoto = typeof bodyPhotos.$inferSelect;

export type SaveBodyPhotoInput = {
  photoUri: string;
  photoBase64?: string | null;
  photoType?: 'front' | 'side' | 'back' | 'other';
  periodType?: 'daily' | 'weekly' | 'monthly';
  date?: string; // YYYY-MM-DD
  time?: string | null; // HH:mm
  weightKg?: number | null;
  notes?: string | null;
};

/**
 * SQLite body_photos tablosunun varlığını garanti eder ve eksik kolonları ekler
 */
export function ensureBodyPhotosTable(): void {
  try {
    sqlite.execSync(
      'CREATE TABLE IF NOT EXISTS body_photos (client_uuid TEXT PRIMARY KEY NOT NULL, user_id TEXT NOT NULL, photo_uri TEXT NOT NULL, photo_base64 TEXT, photo_type TEXT NOT NULL DEFAULT \'front\', period_type TEXT NOT NULL DEFAULT \'daily\', date TEXT NOT NULL, time TEXT, weight_kg REAL, notes TEXT, created_at INTEGER DEFAULT (unixepoch()) NOT NULL);'
    );
    sqlite.execSync(
      'CREATE INDEX IF NOT EXISTS idx_body_photos_user_date ON body_photos(user_id, date);'
    );
  } catch (err) {
    console.warn('[bodyPhotos] ensureBodyPhotosTable uyarısı:', err);
  }

  // Eğer tablo önceden time kolonu olmadan oluşmuşsa güvenli şekilde ekle
  try {
    sqlite.execSync('ALTER TABLE body_photos ADD COLUMN time TEXT;');
  } catch (_) {
    // Kolon zaten varsa yoksay
  }
}

/**
 * Yeni vücut form fotoğrafı kaydeder (gün ve saat loglanır)
 */
export async function saveBodyPhoto(
  userId: string,
  input: SaveBodyPhotoInput
): Promise<BodyPhoto> {
  ensureBodyPhotosTable();

  const clientUuid = generateUuid();
  const now = new Date();
  const dateStr = input.date || dateKey(now);
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  const timeStr = input.time || `${hours}:${minutes}`;
  const nowSec = Math.floor(now.getTime() / 1000);

  const newRow: BodyPhoto = {
    clientUuid,
    userId,
    photoUri: input.photoUri,
    photoBase64: input.photoBase64 ?? null,
    photoType: input.photoType ?? 'front',
    periodType: input.periodType ?? 'daily',
    date: dateStr,
    time: timeStr,
    weightKg: input.weightKg ?? null,
    notes: input.notes ?? null,
    createdAt: nowSec,
  };

  await db.insert(bodyPhotos).values(newRow);
  return newRow;
}

/**
 * Kullanıcının vücut fotoğraflarını listeler
 */
export async function getBodyPhotos(
  userId: string,
  filter?: { periodType?: 'daily' | 'weekly' | 'monthly'; photoType?: string }
): Promise<BodyPhoto[]> {
  ensureBodyPhotosTable();
  try {
    const rows = await db
      .select()
      .from(bodyPhotos)
      .where(eq(bodyPhotos.userId, userId))
      .orderBy(desc(bodyPhotos.date), desc(bodyPhotos.createdAt));

    return rows.filter((r) => {
      if (filter?.periodType && r.periodType !== filter.periodType) return false;
      if (filter?.photoType && r.photoType !== filter.photoType) return false;
      return true;
    });
  } catch (err) {
    console.warn('[bodyPhotos] getBodyPhotos hatası:', err);
    return [];
  }
}

/**
 * Fotoğrafın gün ve saat metnini kullanıcı dostu formatlar
 */
export function formatPhotoDateTime(
  dateStr: string,
  timeStr?: string | null,
  lang: string = 'tr'
): { dateLabel: string; timeLabel: string; fullLabel: string } {
  const today = dateKey(new Date());
  const yesterday = dateKey(new Date(Date.now() - 24 * 60 * 60 * 1000));

  let dateLabel = dateStr;
  if (dateStr === today) {
    dateLabel = lang === 'tr' ? 'Bugün' : lang === 'de' ? 'Heute' : lang === 'es' ? 'Hoy' : 'Today';
  } else if (dateStr === yesterday) {
    dateLabel = lang === 'tr' ? 'Dün' : lang === 'de' ? 'Gestern' : lang === 'es' ? 'Ayer' : 'Yesterday';
  } else {
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));
      const locale = lang === 'tr' ? 'tr-TR' : lang === 'de' ? 'de-DE' : lang === 'es' ? 'es-ES' : 'en-US';
      dateLabel = d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    }
  }

  const timeLabel = timeStr || '';
  const fullLabel = timeLabel ? `${dateLabel}, ${timeLabel}` : dateLabel;

  return { dateLabel, timeLabel, fullLabel };
}

/**
 * En son eklenen vücut fotoğrafını döner (AI analizi için)
 */
export async function getLatestBodyPhoto(userId: string): Promise<BodyPhoto | null> {
  ensureBodyPhotosTable();
  try {
    const rows = await db
      .select()
      .from(bodyPhotos)
      .where(eq(bodyPhotos.userId, userId))
      .orderBy(desc(bodyPhotos.date), desc(bodyPhotos.createdAt))
      .limit(1);

    return rows[0] || null;
  } catch (err) {
    console.warn('[bodyPhotos] getLatestBodyPhoto hatası:', err);
    return null;
  }
}

/**
 * Fotoğrafı siler
 */
export async function deleteBodyPhoto(clientUuid: string): Promise<void> {
  ensureBodyPhotosTable();
  try {
    await db.delete(bodyPhotos).where(eq(bodyPhotos.clientUuid, clientUuid));
  } catch (err) {
    console.warn('[bodyPhotos] deleteBodyPhoto hatası:', err);
  }
}
