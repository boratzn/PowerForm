import Anthropic from '@anthropic-ai/sdk';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { TransformedExercise } from './types';

const CACHE_DIR = path.join(import.meta.dirname, '.cache');
const CACHE_FILE = path.join(CACHE_DIR, 'translations.json');

const BATCH_SIZE = 20; // §15 Paket 2: "batch halinde, 20 egzersiz/istek, rate limit'e dikkat"
const DELAY_BETWEEN_BATCHES_MS = 1500;
const MAX_RETRIES = 4;

// §4.4: "Güncel model isimleri ... bu doküman hazırlanırken doğrulayamadım" — env ile geçilebilir.
const MODEL = process.env.ANTHROPIC_TRANSLATE_MODEL ?? 'claude-haiku-4-5-20251001';

type Translation = {
  instructions_tr: string[];
  cues_tr: string[];
  common_mistakes_tr: string[];
};

type TranslationCache = Record<string, Translation>; // key = slug

const TRANSLATE_TOOL: Anthropic.Tool = {
  name: 'submit_translations',
  description: 'Verilen egzersiz listesinin her biri için Türkçe çeviri/özet döner.',
  input_schema: {
    type: 'object',
    properties: {
      translations: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            slug: { type: 'string', description: 'Girdideki egzersizin slug değeri, aynen geri döndür' },
            instructions_tr: {
              type: 'array',
              items: { type: 'string' },
              description: 'instructions_en alanının adım adım Türkçe çevirisi, aynı sayıda madde',
            },
            cues_tr: {
              type: 'array',
              items: { type: 'string' },
              description: '2-4 maddelik kısa teknik ipucu listesi (Türkçe, talimatların tekrarı değil, özet pratik ipucu)',
            },
            common_mistakes_tr: {
              type: 'array',
              items: { type: 'string' },
              description: '1-3 maddelik yaygın hata listesi (Türkçe)',
            },
          },
          required: ['slug', 'instructions_tr', 'cues_tr', 'common_mistakes_tr'],
        },
      },
    },
    required: ['translations'],
  },
};

const SYSTEM_PROMPT = `Sen bir fitness çevirmenisin. Sana İngilizce egzersiz talimatları verilecek.
Görevin: her egzersiz için (1) talimatları Türkçeye çevirmek, (2) kısa teknik ipuçları çıkarmak,
(3) yaygın hataları listelemek.

KURALLAR:
- Egzersiz ADINI çevirme — bu prompt'ta ad zaten yok, sadece slug'ı referans için kullan.
- Çeviri gym ortamında kullanılan doğal Türkçe olsun, birebir kelime çevirisi değil.
- cues_tr talimatların tekrarı olmasın; "dirsekleri sabit tut", "nefesini kontrollü ver" gibi
  pratik, akılda kalıcı ipuçları olsun.
- common_mistakes_tr'de sağlık tavsiyesi değil, teknik hata belirt (örn. "belin kavis kaybetmesi").
- submit_translations tool'unu MUTLAKA çağır, serbest metin yanıt verme.`;

async function loadCache(): Promise<TranslationCache> {
  try {
    return JSON.parse(await readFile(CACHE_FILE, 'utf-8'));
  } catch {
    return {};
  }
}

async function saveCache(cache: TranslationCache): Promise<void> {
  await mkdir(CACHE_DIR, { recursive: true });
  await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

async function translateBatch(
  client: Anthropic,
  batch: TransformedExercise[]
): Promise<Translation[]> {
  const payload = batch.map((e) => ({ slug: e.slug, instructions_en: e.instructions_en }));

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await client.messages.create({
        model: MODEL,
        max_tokens: 4096,
        system: SYSTEM_PROMPT,
        tools: [TRANSLATE_TOOL],
        tool_choice: { type: 'tool', name: 'submit_translations' },
        messages: [{ role: 'user', content: JSON.stringify(payload) }],
      });

      const toolUse = res.content.find((b): b is Anthropic.ToolUseBlock => b.type === 'tool_use');
      if (!toolUse) throw new Error('Model tool_use bloğu döndürmedi');

      const input = toolUse.input as { translations: (Translation & { slug: string })[] };
      // batch sırasıyla eşle — model slug'ı yanlış sırada dönerse de kaybolmasın
      return batch.map((e) => {
        const match = input.translations.find((t) => t.slug === e.slug);
        if (!match) throw new Error(`Çeviri sonucunda eksik slug: ${e.slug}`);
        return {
          instructions_tr: match.instructions_tr,
          cues_tr: match.cues_tr,
          common_mistakes_tr: match.common_mistakes_tr,
        };
      });
    } catch (err) {
      const isLast = attempt === MAX_RETRIES;
      const backoff = 2 ** attempt * 1000;
      console.warn(
        `[translate] Batch başarısız (deneme ${attempt}/${MAX_RETRIES}): ${(err as Error).message}` +
          (isLast ? '' : ` — ${backoff}ms sonra tekrar denenecek`)
      );
      if (isLast) throw err;
      await sleep(backoff);
    }
  }
  throw new Error('unreachable');
}

// §15 Paket 2 madde 4: instructions_tr / cues_tr (+ common_mistakes_tr) alanlarını
// Claude API ile 20'li batch'ler halinde doldurur. Zaten çevrilmiş slug'lar
// translations.json önbelleğinden okunur — yarıda kesilen bir koşu kaldığı yerden devam eder.
export async function translateExercises(
  exercises: TransformedExercise[],
  opts: { apiKey?: string } = {}
): Promise<TransformedExercise[]> {
  const apiKey = opts.apiKey ?? process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.log('[translate] ANTHROPIC_API_KEY yok — çeviri adımı atlanıyor (instructions_tr/cues_tr null kalacak).');
    return exercises;
  }

  const cache = await loadCache();
  const pending = exercises.filter((e) => !cache[e.slug]);
  console.log(
    `[translate] ${exercises.length} egzersizden ${exercises.length - pending.length} zaten önbellekte, ` +
      `${pending.length} tanesi çevrilecek (model: ${MODEL})`
  );

  if (pending.length > 0) {
    const client = new Anthropic({ apiKey });
    const batches = chunk(pending, BATCH_SIZE);

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[translate] Batch ${i + 1}/${batches.length} (${batch.length} egzersiz)`);
      const results = await translateBatch(client, batch);
      batch.forEach((e, idx) => {
        cache[e.slug] = results[idx];
      });
      await saveCache(cache); // her batch sonrası kaydet — kesinti olursa iş kaybolmasın
      if (i < batches.length - 1) await sleep(DELAY_BETWEEN_BATCHES_MS);
    }
  }

  return exercises.map((e) => {
    const t = cache[e.slug];
    if (!t) return e;
    return { ...e, instructions_tr: t.instructions_tr, cues_tr: t.cues_tr, common_mistakes_tr: t.common_mistakes_tr };
  });
}
