import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

// §10.2 kural 5: "Dinlenme sayacı set onaylanınca otomatik başlasın... Bitince titreşim +
// bildirim (uygulama arka plandayken de)." Uygulama ön plandayken zaten görünür sayaç +
// Vibration.vibrate() yeterli (bkz. RestTimerBar.tsx); bu modül SADECE arka plan durumunu
// kapatan yerel bildirimi yönetir — kullanıcı ekranı kilitleyip beklerken de tetiklenmeli.

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

let scheduledId: string | null = null;
let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Dinlenme sayacı',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
    });
  }
  if (permissionRequested) return true;
  permissionRequested = true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleRestEndNotification(seconds: number, exerciseName: string): Promise<void> {
  await cancelRestEndNotification();
  if (seconds <= 0) return;

  try {
    const granted = await ensurePermission();
    if (!granted) return; // sessizce vazgeç — ön plan sayacı zaten çalışıyor
    scheduledId = await Notifications.scheduleNotificationAsync({
      content: {
        title: 'Dinlenme bitti',
        body: `${exerciseName} — sıradaki sete hazır ol.`,
        sound: true,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds,
        channelId: 'rest-timer',
      },
    });
  } catch (err) {
    // Bildirim izni/kanalı olmayan ortamlarda (ör. simülatör) sessizce düş — kritik yol değil.
    console.warn('[restNotification] Zamanlanamadı:', err);
  }
}

export async function cancelRestEndNotification(): Promise<void> {
  if (!scheduledId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(scheduledId);
  } catch {
    // görmezden gel
  } finally {
    scheduledId = null;
  }
}
