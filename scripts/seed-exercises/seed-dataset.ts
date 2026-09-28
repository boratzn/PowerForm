import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createClient } from '@supabase/supabase-js';

const DATASET_URL = 'https://raw.githubusercontent.com/hasaneyldrm/exercises-dataset/main/data/exercises.json';
const CACHE_DIR = path.join(import.meta.dirname, '.cache');
const RAW_CACHE_FILE = path.join(CACHE_DIR, 'exercises-hasaneyldrm-raw.json');
const LOCAL_SEED_FILE = path.join(import.meta.dirname, '../../src/db/seed-data/exercises.json');

type DatasetExercise = {
  id: string;
  name: string;
  category: string;
  body_part: string;
  equipment: string;
  instructions: Record<string, string>;
  instruction_steps: {
    en?: string[];
    tr?: string[];
    [key: string]: string[] | undefined;
  };
  muscle_group: string;
  secondary_muscles: string[];
  target: string;
  media_id: string;
  image: string;
  gif_url: string;
  attribution: string;
  created_at: string;
};

export const MUSCLE_GROUPS_SEED = [
  { id: 'chest', name_tr: 'Göğüs', name_en: 'Chest', region: 'upper_body', display_order: 10 },
  { id: 'front_delt', name_tr: 'Ön Omuz', name_en: 'Front Delt', region: 'upper_body', display_order: 20 },
  { id: 'side_delt', name_tr: 'Yan Omuz', name_en: 'Side Delt', region: 'upper_body', display_order: 30 },
  { id: 'rear_delt', name_tr: 'Arka Omuz', name_en: 'Rear Delt', region: 'upper_body', display_order: 40 },
  { id: 'lats', name_tr: 'Kanat (Lat)', name_en: 'Lats', region: 'upper_body', display_order: 50 },
  { id: 'upper_back', name_tr: 'Üst Sırt', name_en: 'Upper Back', region: 'upper_body', display_order: 60 },
  { id: 'traps', name_tr: 'Trapez', name_en: 'Traps', region: 'upper_body', display_order: 70 },
  { id: 'biceps', name_tr: 'Biceps', name_en: 'Biceps', region: 'upper_body', display_order: 80 },
  { id: 'triceps', name_tr: 'Triceps', name_en: 'Triceps', region: 'upper_body', display_order: 90 },
  { id: 'forearms', name_tr: 'Ön Kol', name_en: 'Forearms', region: 'upper_body', display_order: 100 },
  { id: 'quads', name_tr: 'Ön Bacak (Quadriceps)', name_en: 'Quads', region: 'lower_body', display_order: 110 },
  { id: 'hamstrings', name_tr: 'Arka Bacak (Hamstring)', name_en: 'Hamstrings', region: 'lower_body', display_order: 120 },
  { id: 'glutes', name_tr: 'Kalça', name_en: 'Glutes', region: 'lower_body', display_order: 130 },
  { id: 'calves', name_tr: 'Baldır', name_en: 'Calves', region: 'lower_body', display_order: 140 },
  { id: 'abs', name_tr: 'Karın', name_en: 'Abs', region: 'core', display_order: 150 },
  { id: 'lower_back', name_tr: 'Bel (Alt Sırt)', name_en: 'Lower Back', region: 'core', display_order: 160 },
] as const;

type MuscleGroupId = (typeof MUSCLE_GROUPS_SEED)[number]['id'];

const EQUIPMENT_MAP: Record<string, string> = {
  'barbell': 'barbell',
  'olympic barbell': 'barbell',
  'ez barbell': 'barbell',
  'trap bar': 'barbell',
  'dumbbell': 'dumbbell',
  'cable': 'cable',
  'body weight': 'bodyweight',
  'kettlebell': 'kettlebell',
  'band': 'band',
  'resistance band': 'band',
  'smith machine': 'smith',
  'leverage machine': 'machine',
  'sled machine': 'machine',
  'skierg machine': 'machine',
  'stationary bike': 'machine',
  'elliptical machine': 'machine',
  'stepmill machine': 'machine',
  'upper body ergometer': 'machine',
  'assisted': 'machine',
  'medicine ball': 'other',
  'stability ball': 'other',
  'rope': 'other',
  'weighted': 'other',
  'bosu ball': 'other',
  'roller': 'other',
  'hammer': 'other',
  'wheel roller': 'other',
  'tire': 'other',
};

const TARGET_MAP: Record<string, MuscleGroupId> = {
  'abs': 'abs',
  'abdominals': 'abs',
  'core': 'abs',
  'lower abs': 'abs',
  'obliques': 'abs',
  'serratus anterior': 'chest',
  'pectorals': 'chest',
  'upper chest': 'chest',
  'chest': 'chest',
  'biceps': 'biceps',
  'brachialis': 'biceps',
  'triceps': 'triceps',
  'forearms': 'forearms',
  'wrist flexors': 'forearms',
  'wrist extensors': 'forearms',
  'wrists': 'forearms',
  'hands': 'forearms',
  'feet': 'calves',
  'grip muscles': 'forearms',
  'lats': 'lats',
  'latissimus dorsi': 'lats',
  'upper back': 'upper_back',
  'rhomboids': 'upper_back',
  'back': 'upper_back',
  'traps': 'traps',
  'trapezius': 'traps',
  'levator scapulae': 'traps',
  'sternocleidomastoid': 'traps',
  'spine': 'lower_back',
  'lower back': 'lower_back',
  'quads': 'quads',
  'quadriceps': 'quads',
  'inner thighs': 'quads',
  'adductors': 'quads',
  'groin': 'quads',
  'hamstrings': 'hamstrings',
  'glutes': 'glutes',
  'abductors': 'glutes',
  'hip flexors': 'glutes',
  'calves': 'calves',
  'soleus': 'calves',
  'shins': 'calves',
  'ankles': 'calves',
  'ankle stabilizers': 'calves',
  'rear deltoids': 'rear_delt',
  'rotator cuff': 'rear_delt',
};

function classifyShoulder(name: string): 'front_delt' | 'side_delt' | 'rear_delt' {
  const n = name.toLowerCase();
  if (/\bupright row\b/.test(n)) return 'side_delt';
  if (/\b(rear|reverse|face pull|posterior|row|pull apart)\b/.test(n)) return 'rear_delt';
  if (/\b(lateral|side raise)\b/.test(n)) return 'side_delt';
  if (/\b(overhead|military|front raise|arnold|press|push|jerk|clean)\b/.test(n)) return 'front_delt';
  return 'side_delt';
}

function mapMuscle(muscleName: string | undefined | null, exerciseName: string): MuscleGroupId | null {
  if (!muscleName) return null;
  const lower = muscleName.toLowerCase().trim();
  if (lower === 'delts' || lower === 'deltoids' || lower === 'shoulders') {
    return classifyShoulder(exerciseName);
  }
  if (lower === 'cardiovascular system') return null;
  return TARGET_MAP[lower] ?? null;
}

const UNILATERAL_RE = /\b(one[- ]arm|one[- ]leg|single[- ]arm|single[- ]leg|alternating|unilateral)\b/i;

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function loadEnv(): Promise<{ supabaseUrl: string; serviceRoleKey: string }> {
  try {
    const envFile = await readFile(path.join(import.meta.dirname, '../../.env'), 'utf-8');
    const parsed = Object.fromEntries(
      envFile
        .split('\n')
        .filter((l) => l.includes('='))
        .map((l) => l.split('=').map((s) => s.trim()))
    );
    const supabaseUrl = parsed.EXPO_PUBLIC_SUPABASE_URL || process.env.EXPO_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = parsed.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Supabase URL veya Service Role Key eksik!');
    }
    return { supabaseUrl, serviceRoleKey };
  } catch (err) {
    throw new Error(`Env okunamadı: ${err}`);
  }
}

async function fetchDataset(forceRefresh = false): Promise<DatasetExercise[]> {
  await mkdir(CACHE_DIR, { recursive: true });
  if (!forceRefresh) {
    try {
      const cached = await readFile(RAW_CACHE_FILE, 'utf-8');
      const data = JSON.parse(cached) as DatasetExercise[];
      console.log(`[fetch] Önbellekten okundu: ${data.length} kayıt (${RAW_CACHE_FILE})`);
      return data;
    } catch {
      // cache yok, indir
    }
  }

  console.log(`[fetch] İndiriliyor: ${DATASET_URL}`);
  const res = await fetch(DATASET_URL);
  if (!res.ok) throw new Error(`Dataset indirilemedi: HTTP ${res.status}`);
  const data = (await res.json()) as DatasetExercise[];
  await writeFile(RAW_CACHE_FILE, JSON.stringify(data, null, 2));
  console.log(`[fetch] İndirildi ve önbelleğe alındı: ${data.length} kayıt`);
  return data;
}

async function main() {
  const forceRefresh = process.argv.includes('--refresh');
  const { supabaseUrl, serviceRoleKey } = await loadEnv();
  const rawList = await fetchDataset(forceRefresh);

  console.log(`[process] ${rawList.length} egzersiz dönüştürülüyor...`);

  const seenSlugs = new Set<string>();

  type TransformedEx = {
    slug: string;
    name_en: string;
    name_tr: string | null;
    equipment: string;
    mechanic: string | null;
    force: string | null;
    is_unilateral: boolean;
    difficulty: string | null;
    instructions_en: string[];
    instructions_tr: string[];
    cues_tr: string[] | null;
    common_mistakes_tr: string[] | null;
    tracking_type: 'time' | 'weight_reps';
    is_custom: boolean;
    source: string;
  };

  type MuscleLink = {
    exercise_slug: string;
    muscle_group_id: MuscleGroupId;
    role: 'primary' | 'secondary';
    volume_factor: number;
  };

  type MediaLink = {
    exercise_slug: string;
    media_type: 'image' | 'gif';
    url: string;
    display_order: number;
    attribution: string;
  };

  const transformedExercises: TransformedEx[] = [];
  const muscleLinks: MuscleLink[] = [];
  const mediaItems: MediaLink[] = [];
  const localSeedList: any[] = [];

  for (const item of rawList) {
    let slug = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
    if (seenSlugs.has(slug)) {
      slug = `${slug}-${item.id}`;
    }
    seenSlugs.add(slug);

    const equipment = EQUIPMENT_MAP[item.equipment.toLowerCase()] ?? 'other';
    const isUnilateral = UNILATERAL_RE.test(item.name);
    const trackingType = item.category === 'cardio' || item.body_part === 'cardio' ? 'time' : 'weight_reps';

    const instructionsEn = item.instruction_steps?.en ?? (item.instructions?.en ? [item.instructions.en] : []);
    const instructionsTr = item.instruction_steps?.tr ?? (item.instructions?.tr ? [item.instructions.tr] : []);

    const primaryMuscle = mapMuscle(item.target, item.name);

    const exRow: TransformedEx = {
      slug,
      name_en: item.name,
      name_tr: null,
      equipment,
      mechanic: null,
      force: null,
      is_unilateral: isUnilateral,
      difficulty: 'beginner',
      instructions_en: instructionsEn,
      instructions_tr: instructionsTr,
      cues_tr: null,
      common_mistakes_tr: null,
      tracking_type: trackingType,
      is_custom: false,
      source: 'hasaneyldrm/exercises-dataset',
    };
    transformedExercises.push(exRow);

    // Primary muscle link
    if (primaryMuscle) {
      muscleLinks.push({
        exercise_slug: slug,
        muscle_group_id: primaryMuscle,
        role: 'primary',
        volume_factor: 1.0,
      });
    }

    // Secondary muscle links
    const secondaries = new Set<string>();
    if (item.muscle_group) secondaries.add(item.muscle_group);
    if (item.secondary_muscles) {
      for (const s of item.secondary_muscles) secondaries.add(s);
    }
    for (const s of secondaries) {
      const sm = mapMuscle(s, item.name);
      if (sm && sm !== primaryMuscle) {
        muscleLinks.push({
          exercise_slug: slug,
          muscle_group_id: sm,
          role: 'secondary',
          volume_factor: 0.5,
        });
      }
    }

    // Media
    const imageUrl = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/${item.image}`;
    const gifUrl = `https://cdn.jsdelivr.net/gh/hasaneyldrm/exercises-dataset@main/${item.gif_url}`;

    mediaItems.push({
      exercise_slug: slug,
      media_type: 'image',
      url: imageUrl,
      display_order: 0,
      attribution: item.attribution,
    });

    mediaItems.push({
      exercise_slug: slug,
      media_type: 'gif',
      url: gifUrl,
      display_order: 1,
      attribution: item.attribution,
    });

    // Local seed entry
    localSeedList.push({
      id: slug,
      slug,
      name_en: item.name,
      name_tr: null,
      equipment,
      tracking_type: trackingType,
      instructions_en: instructionsEn,
      instructions_tr: instructionsTr,
      primary_muscles: primaryMuscle ? [primaryMuscle] : [],
      image_url: imageUrl,
      gif_url: gifUrl,
    });
  }

  console.log(`[local-seed] ${localSeedList.length} egzersiz yerel seed dosyasına yazılıyor: ${LOCAL_SEED_FILE}`);
  await writeFile(LOCAL_SEED_FILE, JSON.stringify(localSeedList, null, 2));

  // Connect to Supabase
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  console.log(`[supabase] muscle_groups kontrol ve upsert (${MUSCLE_GROUPS_SEED.length} satır)...`);
  const { error: mgErr } = await supabase.from('muscle_groups').upsert([...MUSCLE_GROUPS_SEED], { onConflict: 'id' });
  if (mgErr) throw new Error(`muscle_groups hatası: ${mgErr.message}`);

  console.log(`[supabase] Eski sistem egzersizleri temizleniyor (CASCADE)...`);
  const { error: delErr } = await supabase.from('exercises').delete().eq('is_custom', false);
  if (delErr) throw new Error(`Eski egzersizleri silme hatası: ${delErr.message}`);

  console.log(`[supabase] ${transformedExercises.length} egzersiz ekleniyor...`);
  const slugToId = new Map<string, string>();
  for (const batch of chunk(transformedExercises, 200)) {
    const { data, error } = await supabase
      .from('exercises')
      .insert(batch)
      .select('id, slug');
    if (error) throw new Error(`exercises insert hatası: ${error.message}`);
    for (const r of data ?? []) slugToId.set(r.slug, r.id);
  }
  console.log(`[supabase] Egzersizler başarıyla eklendi (UUID eşleşmesi: ${slugToId.size}).`);

  console.log(`[supabase] exercise_muscles ekleniyor (${muscleLinks.length} bağlantı)...`);
  const muscleRowMap = new Map<string, { exercise_id: string; muscle_group_id: string; role: string; volume_factor: number }>();
  for (const l of muscleLinks) {
    const exercise_id = slugToId.get(l.exercise_slug);
    if (!exercise_id) continue;
    const key = `${exercise_id}:${l.muscle_group_id}`;
    const existing = muscleRowMap.get(key);
    if (existing && existing.role === 'primary') continue;
    muscleRowMap.set(key, {
      exercise_id,
      muscle_group_id: l.muscle_group_id,
      role: l.role,
      volume_factor: l.volume_factor,
    });
  }
  const muscleRows = [...muscleRowMap.values()];
  for (const batch of chunk(muscleRows, 500)) {
    const { error } = await supabase.from('exercise_muscles').insert(batch);
    if (error) throw new Error(`exercise_muscles insert hatası: ${error.message}`);
  }
  console.log(`[supabase] ${muscleRows.length} exercise_muscles satırı eklendi.`);

  console.log(`[supabase] exercise_media ekleniyor (${mediaItems.length} medya satırı: GIF ve görseller)...`);
  const mediaRows = mediaItems
    .map((m) => {
      const exercise_id = slugToId.get(m.exercise_slug);
      if (!exercise_id) return null;
      return {
        exercise_id,
        media_type: m.media_type,
        url: m.url,
        display_order: m.display_order,
        attribution: m.attribution,
        is_active: true,
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  for (const batch of chunk(mediaRows, 500)) {
    const { error } = await supabase.from('exercise_media').insert(batch);
    if (error) throw new Error(`exercise_media insert hatası: ${error.message}`);
  }
  console.log(`[supabase] ${mediaRows.length} exercise_media satırı eklendi.`);

  console.log(`\n✅ TAMAMLANDI!`);
  console.log(`- Toplam Egzersiz: ${slugToId.size}`);
  console.log(`- Kas Grubu Bağlantısı: ${muscleRows.length}`);
  console.log(`- Medya (Görsel + GIF): ${mediaRows.length}`);
  console.log(`- Yerel Seed Dosyası: ${LOCAL_SEED_FILE} güncellendi.`);
}

main().catch((err) => {
  console.error('❌ Hata oluştu:', err);
  process.exit(1);
});
