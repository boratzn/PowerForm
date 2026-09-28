import { eq } from 'drizzle-orm';
import { Alert, Share } from 'react-native';

import { db } from '../db/client';
import { getWorkoutHistory, getSessionDetail } from '../db/history';
import { getUserPrograms } from '../db/programs';
import { bodyWeightLogs, nutritionEntries, nutritionTargets } from '../db/schema';
import { useAuthStore } from '../stores/useAuthStore';

export async function exportAllUserData(): Promise<void> {
  const userId = useAuthStore.getState().session?.user.id;
  if (!userId) {
    Alert.alert('Hata', 'Oturum açık değil.');
    return;
  }

  try {
    const profile = useAuthStore.getState().profile;

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

    // 4. Beslenme kayıtları ve hedefleri
    const meals = await db
      .select()
      .from(nutritionEntries)
      .where(eq(nutritionEntries.userId, userId));

    const targets = await db
      .select()
      .from(nutritionTargets)
      .where(eq(nutritionTargets.userId, userId));

    const exportBundle = {
      app: 'Powerform',
      version: '1.0.0',
      exportedAt: new Date().toISOString(),
      user: {
        id: userId,
        email: useAuthStore.getState().session?.user.email,
        profile,
      },
      stats: {
        totalWorkouts: detailedSessions.length,
        totalWeightLogs: weights.length,
        totalMealsLogged: meals.length,
      },
      data: {
        workouts: detailedSessions,
        programs: customPrograms,
        bodyWeight: weights,
        nutrition: {
          targets: targets[0] ?? null,
          entries: meals,
        },
      },
    };

    const jsonString = JSON.stringify(exportBundle, null, 2);

    await Share.share(
      {
        title: 'Powerform Veri Dışa Aktarımı (KVKK)',
        message: jsonString,
      },
      {
        dialogTitle: 'Verilerini Dışa Aktar',
      }
    );
  } catch (err: any) {
    console.error('[dataExport] Hata:', err);
    Alert.alert('Hata', err?.message ?? 'Veri dışa aktarılamadı.');
  }
}
