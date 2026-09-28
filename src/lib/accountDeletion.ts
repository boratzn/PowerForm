import { eq } from 'drizzle-orm';
import { Alert } from 'react-native';

import { db } from '../db/client';
import {
  bodyWeightLogs,
  nutritionEntries,
  nutritionTargets,
  programs,
  syncMutations,
  workoutSessions,
} from '../db/schema';
import { supabase } from './supabase';
import { useAuthStore } from '../stores/useAuthStore';

export async function deleteUserAccountAndData(): Promise<void> {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) return;

  try {
    // 1. Supabase'deki profili sil (ON DELETE CASCADE ile ilişkili tüm veriler temizlenir)
    const { error: supaErr } = await supabase
      .from('profiles')
      .delete()
      .eq('id', userId);

    if (supaErr) {
      console.warn('[accountDeletion] Supabase profil silme uyarısı:', supaErr);
    }

    // 2. Yerel SQLite üzerindeki kullanıcıya ait tüm verileri temizle
    await db.delete(workoutSessions).where(eq(workoutSessions.userId, userId));
    await db.delete(programs).where(eq(programs.userId, userId));
    await db.delete(bodyWeightLogs).where(eq(bodyWeightLogs.userId, userId));
    await db.delete(nutritionEntries).where(eq(nutritionEntries.userId, userId));
    await db.delete(nutritionTargets).where(eq(nutritionTargets.userId, userId));
    await db.delete(syncMutations);

    // 3. Oturumu kapat
    await useAuthStore.getState().signOut();

    Alert.alert(
      'Hesabınız Silindi',
      'Hesabınız ve tüm verileriniz başarıyla silindi.'
    );
  } catch (err: any) {
    console.error('[accountDeletion] Hata:', err);
    Alert.alert('Hata', err?.message ?? 'Hesap silinirken bir hata oluştu.');
  }
}
