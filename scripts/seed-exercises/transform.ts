import {
  classifyShoulderRegion,
  DIRECT_MUSCLE_MAP,
  EQUIPMENT_FALLBACK,
  EQUIPMENT_MAP,
  inferTrackingType,
  inferUnilateral,
  LEVEL_MAP,
  UNMAPPED_MUSCLES,
} from './muscle-map';
import type {
  MappingReport,
  MediaItem,
  MuscleLink,
  RawExercise,
  TransformedExercise,
} from './types';

function slugify(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '') // aksan işaretlerini kaldır
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

const JSDELIVR_BASE = 'https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises';

function pushReportEntry(map: Record<string, string[]>, key: string, slug: string) {
  (map[key] ??= []).push(slug);
}

export type TransformResult = {
  exercises: TransformedExercise[];
  muscleLinks: MuscleLink[];
  media: MediaItem[];
  report: MappingReport;
};

// §15 Paket 2 madde 2-3: free-exercise-db kaydını bizim şemamıza dönüştürür,
// eşleşmeyen kas/ekipman isimlerini SESSİZCE ATLAMAZ — report'a yazar.
export function transformExercises(raw: RawExercise[]): TransformResult {
  const exercises: TransformedExercise[] = [];
  const muscleLinks: MuscleLink[] = [];
  const media: MediaItem[] = [];

  const report: MappingReport = {
    totalSource: raw.length,
    totalTransformed: 0,
    nullEquipmentCount: 0,
    approximateEquipmentMappings: {},
    unmappedMuscles: {},
    approximateMuscleMappings: {},
    shoulderClassification: { matched: {}, fallbackDefault: [] },
    emptyInstructionsSlugs: [],
  };

  const seenSlugs = new Set<string>();

  for (const item of raw) {
    const slug = slugify(item.name);
    if (seenSlugs.has(slug)) {
      // 2026-08-29 doğrulamasında 876/876 benzersizdi; ileride kaynak değişirse
      // sessizce üzerine yazmak yerine görünür şekilde atla.
      console.warn(`[transform] Yinelenen slug atlandı: ${slug} ("${item.name}")`);
      continue;
    }
    seenSlugs.add(slug);

    // ---- equipment ----
    let equipment = item.equipment ? EQUIPMENT_MAP[item.equipment] : undefined;
    if (!item.equipment) {
      report.nullEquipmentCount++;
      equipment = EQUIPMENT_FALLBACK;
    } else if (!equipment) {
      // EQUIPMENT_MAP kaynak veri setindeki 12 değeri de kapsıyor (2026-08-29 doğrulaması);
      // bu dal yeni bir equipment değeri eklenirse tetiklenir — sessizce atlamak yerine raporla.
      const key = `equipment:${item.equipment} (BİLİNMEYEN DEĞER)`;
      report.approximateEquipmentMappings[key] = (report.approximateEquipmentMappings[key] ?? 0) + 1;
      equipment = EQUIPMENT_FALLBACK;
    } else if (item.equipment === 'e-z curl bar' || equipment === 'other') {
      report.approximateEquipmentMappings[item.equipment] =
        (report.approximateEquipmentMappings[item.equipment] ?? 0) + 1;
    }

    // ---- instructions boş mu ----
    if (!item.instructions || item.instructions.length === 0) {
      report.emptyInstructionsSlugs.push(slug);
    }

    exercises.push({
      slug,
      name_en: item.name,
      name_tr: null, // §15 Paket 2: isimler İngilizce kalır, çevrilmez (bkz. muscle-map.ts yorumu)
      equipment,
      mechanic: item.mechanic,
      force: item.force,
      is_unilateral: inferUnilateral(item.name),
      difficulty: LEVEL_MAP[item.level],
      instructions_en: item.instructions ?? [],
      instructions_tr: null,
      cues_tr: null,
      common_mistakes_tr: null,
      tracking_type: inferTrackingType(item.category, item.force),
      is_custom: false,
      source: 'free-exercise-db',
    });

    // ---- kas bağlantıları ----
    const linkMuscles = (names: string[], role: 'primary' | 'secondary', volumeFactor: number) => {
      for (const rawMuscle of names) {
        if (rawMuscle === 'shoulders') {
          const { muscleGroupId, matchedKeyword } = classifyShoulderRegion(item.name);
          muscleLinks.push({ exercise_slug: slug, muscle_group_id: muscleGroupId, role, volume_factor: volumeFactor });
          if (matchedKeyword) {
            pushReportEntry(report.shoulderClassification.matched, muscleGroupId, slug);
          } else {
            report.shoulderClassification.fallbackDefault.push(slug);
          }
          continue;
        }
        if (UNMAPPED_MUSCLES.has(rawMuscle)) {
          pushReportEntry(report.unmappedMuscles, rawMuscle, slug);
          continue;
        }
        const mapped = DIRECT_MUSCLE_MAP[rawMuscle];
        if (!mapped) {
          pushReportEntry(report.unmappedMuscles, rawMuscle, slug);
          continue;
        }
        if (rawMuscle === 'middle back') {
          pushReportEntry(report.approximateMuscleMappings, 'middle back -> upper_back', slug);
        }
        muscleLinks.push({ exercise_slug: slug, muscle_group_id: mapped, role, volume_factor: volumeFactor });
      }
    };
    linkMuscles(item.primaryMuscles ?? [], 'primary', 1.0);
    linkMuscles(item.secondaryMuscles ?? [], 'secondary', 0.5);

    // ---- medya (jsdelivr CDN üzerinden, free-exercise-db public domain/Unlicense) ----
    (item.images ?? []).forEach((imgPath, i) => {
      media.push({
        exercise_slug: slug,
        media_type: 'image',
        url: `${JSDELIVR_BASE}/${imgPath}`,
        display_order: i,
        attribution: 'free-exercise-db (yuhonas/free-exercise-db, Unlicense)',
      });
    });
  }

  report.totalTransformed = exercises.length;
  return { exercises, muscleLinks, media, report };
}

export function printReport(report: MappingReport): void {
  console.log('\n=== EŞLEME RAPORU ===');
  console.log(`Kaynak kayıt: ${report.totalSource}  →  Dönüştürülen: ${report.totalTransformed}`);
  console.log(`equipment = null (→ 'other' varsayıldı): ${report.nullEquipmentCount}`);

  if (Object.keys(report.approximateEquipmentMappings).length) {
    console.log('\nYaklaşık equipment eşleşmeleri:');
    for (const [k, v] of Object.entries(report.approximateEquipmentMappings)) {
      console.log(`  '${k}' → 'other'  (${v} egzersiz)`);
    }
  }

  if (Object.keys(report.unmappedMuscles).length) {
    console.log('\n⚠️  Eşlenemeyen kas isimleri (muscle_groups tablosunda karşılığı yok, BAĞLANTI KURULMADI):');
    for (const [muscle, slugs] of Object.entries(report.unmappedMuscles)) {
      console.log(`  '${muscle}': ${slugs.length} egzersiz — örnek: ${slugs.slice(0, 5).join(', ')}`);
    }
  }

  if (Object.keys(report.approximateMuscleMappings).length) {
    console.log('\nYaklaşık kas eşleşmeleri:');
    for (const [k, slugs] of Object.entries(report.approximateMuscleMappings)) {
      console.log(`  ${k}: ${slugs.length} egzersiz`);
    }
  }

  const shoulderMatched = Object.values(report.shoulderClassification.matched).flat().length;
  console.log(
    `\n'shoulders' → front/side/rear_delt sınıflandırması: ${shoulderMatched} anahtar kelimeyle eşleşti, ` +
      `${report.shoulderClassification.fallbackDefault.length} varsayılan (side_delt) ile atandı (elle gözden geçir).`
  );

  if (report.emptyInstructionsSlugs.length) {
    console.log(`\nAdım adım talimatı boş olan egzersizler: ${report.emptyInstructionsSlugs.length}`);
  }
  console.log('======================\n');
}
