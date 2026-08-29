import { randomUUID } from 'expo-crypto';

// Hermes'te global `crypto.randomUUID` yok — expo-crypto üzerinden üretiyoruz.
// client_uuid'ler (§12.4) idempotentlik için kritik, bu yüzden tek merkezi yer burası.
export function generateUuid(): string {
  return randomUUID();
}
