import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SecureStore from 'expo-secure-store';

const CHUNK_SIZE = 1800; // Android Keystore 2048 bayt sınırının altında güvenli eşik

export const SecureStoreAdapter = {
  async getItem(key: string): Promise<string | null> {
    try {
      const manifestStr = await SecureStore.getItemAsync(`${key}_manifest`);
      if (manifestStr) {
        const { chunks } = JSON.parse(manifestStr) as { chunks: number };
        let combined = '';
        for (let i = 0; i < chunks; i++) {
          const chunk = await SecureStore.getItemAsync(`${key}_chunk_${i}`);
          if (chunk) combined += chunk;
        }
        return combined || null;
      }

      const direct = await SecureStore.getItemAsync(key);
      if (direct) return direct;

      // Geriye dönük uyumluluk: AsyncStorage'daki eski session'ı SecureStore'a taşı
      const legacy = await AsyncStorage.getItem(key);
      if (legacy) {
        await this.setItem(key, legacy);
        await AsyncStorage.removeItem(key);
        return legacy;
      }

      return null;
    } catch (err) {
      console.warn('[SecureStoreAdapter] getItem hatası:', err);
      return null;
    }
  },

  async setItem(key: string, value: string): Promise<void> {
    try {
      if (value.length <= CHUNK_SIZE) {
        // Eski manifest kalıntılarını temizle
        const manifestStr = await SecureStore.getItemAsync(`${key}_manifest`);
        if (manifestStr) {
          const { chunks } = JSON.parse(manifestStr) as { chunks: number };
          for (let i = 0; i < chunks; i++) {
            await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
          }
          await SecureStore.deleteItemAsync(`${key}_manifest`);
        }
        await SecureStore.setItemAsync(key, value);
      } else {
        // Büyük veriyi güvenli parçalara böl (chunking)
        await SecureStore.deleteItemAsync(key);
        const chunkCount = Math.ceil(value.length / CHUNK_SIZE);
        for (let i = 0; i < chunkCount; i++) {
          const chunk = value.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
          await SecureStore.setItemAsync(`${key}_chunk_${i}`, chunk);
        }
        await SecureStore.setItemAsync(`${key}_manifest`, JSON.stringify({ chunks: chunkCount }));
      }
    } catch (err) {
      console.error('[SecureStoreAdapter] setItem hatası:', err);
    }
  },

  async removeItem(key: string): Promise<void> {
    try {
      const manifestStr = await SecureStore.getItemAsync(`${key}_manifest`);
      if (manifestStr) {
        const { chunks } = JSON.parse(manifestStr) as { chunks: number };
        for (let i = 0; i < chunks; i++) {
          await SecureStore.deleteItemAsync(`${key}_chunk_${i}`);
        }
        await SecureStore.deleteItemAsync(`${key}_manifest`);
      }
      await SecureStore.deleteItemAsync(key);
      await AsyncStorage.removeItem(key);
    } catch (err) {
      console.warn('[SecureStoreAdapter] removeItem hatası:', err);
    }
  },
};
