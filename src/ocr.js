// Produkt anhand eines Fotos der Vorderseite erkennen: Texterkennung (Tesseract, läuft im Gerät)
// und Abgleich der erkannten Wörter mit den Produktnamen (englisch und deutsch).
let workerPromise;

function base() {
  return new URL('ocr/', location.href).href;
}

async function getWorker() {
  workerPromise ||= (async () => {
    const { createWorker } = await import('tesseract.js');
    return createWorker(['eng', 'deu'], 1, {
      workerPath: `${base()}worker.min.js`,
      corePath: base(),
      langPath: base(),
      gzip: true,
    });
  })();
  return workerPromise;
}

async function prepare(file) {
  const bmp = await createImageBitmap(file);
  const scale = Math.min(1, 1600 / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas');
  c.width = Math.round(bmp.width * scale);
  c.height = Math.round(bmp.height * scale);
  const ctx = c.getContext('2d');
  ctx.filter = 'grayscale(1) contrast(1.4)';
  ctx.drawImage(bmp, 0, 0, c.width, c.height);
  bmp.close?.();
  return c;
}

export async function readText(file) {
  const worker = await getWorker();
  const { data } = await worker.recognize(await prepare(file));
  return data.text || '';
}

const STOP = new Set(['the', 'and', 'und', 'der', 'die', 'das', 'pokemon', 'pokémon', 'tcg', 'card', 'cards', 'game', 'karten', 'sammelkartenspiel', 'trading', 'with', 'mit', 'ages', 'contains', 'enthält']);
const norm = (s) => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss');
const words = (s) => norm(s).split(/[^a-z0-9]+/).filter((w) => w.length >= 3 && !STOP.has(w));

const idfCache = new WeakMap();
function idf(list) {
  if (idfCache.has(list)) return idfCache.get(list);
  const df = new Map();
  for (const p of list) for (const w of new Set(words(`${p.name} ${p.nameDe}`))) df.set(w, (df.get(w) || 0) + 1);
  const out = new Map();
  for (const [w, n] of df) out.set(w, Math.log(1 + list.length / n));
  idfCache.set(list, out);
  return out;
}

// Liefert die wahrscheinlichsten Produkte zum erkannten Text
export function matchProducts(list, text, limit = 6) {
  const seen = new Set(words(text));
  if (!seen.size) return [];
  const w = idf(list);
  const scored = [];
  for (const p of list) {
    const variants = [p.name, p.nameDe];
    let best = 0;
    for (const v of variants) {
      const toks = [...new Set(words(v))];
      if (!toks.length) continue;
      let hit = 0, total = 0;
      for (const t of toks) {
        const weight = w.get(t) || 1;
        total += weight;
        if (seen.has(t)) hit += weight;
      }
      if (hit) best = Math.max(best, hit - 0.35 * (total - hit));
    }
    if (best > 0) scored.push({ p, score: best + (p.prices.trend ? 0.01 : 0) });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, limit).map((x) => x.p);
}
