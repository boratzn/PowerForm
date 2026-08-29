import { generateUuid } from '../lib/uuid';
import { db } from './client';
import { syncMutations } from './schema';

// §12.4 senkron kuyruğu — her yerel yazma bir mutation kaydı üretir. Henüz bir senkron
// motoru/backend yok (bkz. PROGRESS.md), ama mimari CLAUDE.md'nin "Offline-first" kuralına
// göre baştan doğru kurulsun diye kayıtlar burada birikiyor; motor eklendiğinde bu tablo
// olduğu gibi kullanılacak.
export async function recordMutation(
  table: string,
  operation: 'insert' | 'update' | 'delete',
  payload: Record<string, unknown>
): Promise<void> {
  await db.insert(syncMutations).values({
    id: generateUuid(),
    tableName: table,
    operation,
    payload,
  });
}
