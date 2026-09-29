import { isRunningInExpoGo } from 'expo';
import { Platform } from 'react-native';

// §10.2 kural 5: "Dinlenme sayacı set onaylanınca otomatik başlasın... Bitince titreşim +
// bildirim (uygulama arka plandayken de)." Uygulama ön plandayken zaten görünür sayaç +
// Vibration.vibrate() yeterli (bkz. RestTimerBar.tsx); bu modül SADECE arka plan durumunu
// kapatan yerel bildirimi yönetir — kullanıcı ekranı kilitleyip beklerken de tetiklenmeli.
//
// NOT (Expo SDK 53+ uyumluluğu):
// Expo Go'da Android üzerinde `expo-notifications` import edildiğinde veya push/token
// yöneticisi yüklendiğinde SDK 53'ten itibaren hata fırlatır (warnOfExpoGoPushUsage).
// Bu yüzden Android Expo Go ortamında `expo-notifications` require edilmez.
// Development build (APK) veya iOS simülatör/cihazında ise tam kapasite çalışır.

const isAndroidExpoGo = Platform.OS === 'android' && isRunningInExpoGo();

let Notifications: typeof import('expo-notifications') | null = null;

if (!isAndroidExpoGo) {
  try {
    Notifications = require('expo-notifications');
    Notifications?.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  } catch (err) {
    console.warn('[restNotification] Bildirim modülü yüklenemedi:', err);
  }
}

let scheduledId: string | null = null;
let permissionRequested = false;

async function ensurePermission(): Promise<boolean> {
  if (!Notifications) return false;
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('rest-timer', {
      name: 'Dinlenme sayacı',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 500, 200, 500],
      sound: 'default',
      enableVibrate: true,
      showBadge: false,
    });
  }
  if (permissionRequested) return true;
  permissionRequested = true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}

export async function scheduleRestEndNotification(seconds: number, exerciseName: string): Promise<void> {
  if (!Notifications) return;
  await cancelRestEndNotification();
  if (seconds <= 0) return;

  try {
    const granted = await ensurePermission();
    if (!granted) return; // sessizce vazgeç — ön plan sayacı zaten çalışıyor
    scheduledId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Dinlenme Süresi Bitti!',
        body: `${exerciseName || 'Sıradaki set'} seni bekliyor, haydi başla!`,
        sound: true,
        vibrate: [0, 500, 200, 500],
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
  if (!Notifications || !scheduledId) return;
  try {
    await Notifications.cancelScheduledNotificationAsync(scheduledId);
  } catch {
    // görmezden gel
  } finally {
    scheduledId = null;
  }
}
