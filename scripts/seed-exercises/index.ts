import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { fetchRawExercises } from './fetch';
import { printReport, transformExercises } from './transform';
import { translateExercises } from './translate';
import { writeToSupabase } from './write';

// FITNESS_APP_SPEC.md §15 Paket 2 — tüm aşamaları sırayla çalıştırır. ANTHROPIC_API_KEY
// ve/veya Supabase env değişkenleri yoksa ilgili aşama atlanır (ama script çökmez) —
// böylece "fetch + transform + rapor" kısmı hiçbir credential olmadan da doğrulanabilir.
//
// Kullanım:
//   npm run seed:exercises            # önbellek varsa ağa gitmez
//   npm run seed:exercises -- --refresh   # free-exercise-db'yi yeniden indir

async function main() {
  const forceRefresh = process.argv.includes('--refresh');

  const raw = await fetchRawExercises({ forceRefresh });
  const { exercises, muscleLinks, media, report } = transformExercises(raw);
  printReport(report);

  const outDir = path.join(import.meta.dirname, '.cache');
  await mkdir(outDir, { recursive: true });
  await writeFile(path.join(outDir, 'mapping-report.json'), JSON.stringify(report, null, 2));

  const translated = await translateExercises(exercises);

  await writeFile(path.join(outDir, 'transformed-exercises.json'), JSON.stringify(translated, null, 2));
  await writeFile(path.join(outDir, 'muscle-links.json'), JSON.stringify(muscleLinks, null, 2));
  await writeFile(path.join(outDir, 'media.json'), JSON.stringify(media, null, 2));
  console.log(`[index] Ara çıktılar yazıldı: ${outDir}`);

  await writeToSupabase({ exercises: translated, muscleLinks, media });

  console.log(
    `\n[index] Bitti. ${translated.length} egzersiz işlendi, ` +
      `${translated.filter((e) => e.instructions_tr).length} tanesi çevrildi.`
  );
}

main().catch((err) => {
  console.error('[index] Script hata ile durdu:', err);
  process.exitCode = 1;
});
