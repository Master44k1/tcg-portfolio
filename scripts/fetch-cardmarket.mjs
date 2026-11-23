// Lädt den öffentlichen Cardmarket-Produktkatalog (Sealed / "non-singles") und den
// täglichen Preis-Guide und schreibt eine kompakte Datei pro Spiel nach public/data/.
//
//   node scripts/fetch-cardmarket.mjs           -> echte Daten von Cardmarket
//   node scripts/fetch-cardmarket.mjs --sample  -> Beispieldaten zum lokalen Testen
//
// Spiele über die Umgebungsvariable GAMES (Cardmarket idGame, kommagetrennt).
// 6 = Pokémon, 1 = Magic, 3 = Yu-Gi-Oh!  (weitere IDs siehe README)
import { mkdir, writeFile } from 'node:fs/promises';

const BASE = 'https://downloads.s3.cardmarket.com/productCatalog';
const GAMES = (process.env.GAMES || '6').split(',').map((s) => s.trim()).filter(Boolean);
const OUT = new URL('../public/data/', import.meta.url);
const sample = process.argv.includes('--sample');

const GAME_NAMES = { 1: 'Magic', 3: 'YuGiOh', 6: 'Pokemon' };

async function getJson(url) {
  const res = await fetch(url, { headers: { 'User-Agent': 'tcg-sealed-portfolio' } });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null);

async function buildGame(game) {
  const [catalog, guide] = await Promise.all([
    getJson(`${BASE}/productList/products_nonsingles_${game}.json`),
    getJson(`${BASE}/priceGuide/price_guide_${game}.json`),
  ]);
  const prices = new Map();
  for (const p of guide.priceGuides || []) prices.set(p.idProduct, p);

  // Kompaktes Zeilenformat: [id, name, kategorie, idExpansion, trend, avg, low, avg7, avg30, dateAdded]
  const rows = [];
  for (const p of catalog.products || []) {
    const g = prices.get(p.idProduct) || {};
    rows.push([
      p.idProduct,
      p.name,
      p.categoryName || '',
      p.idExpansion ?? null,
      num(g.trend),
      num(g.avg),
      num(g.low),
      num(g.avg7),
      num(g.avg30),
      p.dateAdded || null,
    ]);
  }
  return { game: Number(game), gameName: GAME_NAMES[game] || `Game ${game}`, createdAt: guide.createdAt || new Date().toISOString(), sample: false, rows };
}

function sampleGame(game) {
  const names = [
    ['Scarlet & Violet Booster Display', 'Pokémon Display'],
    ['Prismatic Evolutions Elite Trainer Box', 'Elite Trainer Box'],
    ['Surging Sparks Booster Display', 'Pokémon Display'],
    ['Stellar Crown Booster Bundle', 'Booster Bundle'],
    ['151 Ultra Premium Collection', 'Pokémon Box Set'],
    ['Paldean Fates Elite Trainer Box', 'Elite Trainer Box'],
    ['Journey Together Booster Display', 'Pokémon Display'],
    ['Destined Rivals Booster', 'Booster'],
  ];
  const rows = names.map(([n, c], i) => {
    const t = Math.round((40 + i * 37.5) * 100) / 100;
    return [100000 + i, n, c, 5000 + i, t, t * 1.03, t * 0.9, t * 1.01, t * 0.97, '2025-01-01'];
  });
  return { game: Number(game), gameName: GAME_NAMES[game] || `Game ${game}`, createdAt: new Date().toISOString(), sample: true, rows };
}

await mkdir(OUT, { recursive: true });
const index = [];
for (const game of GAMES) {
  const data = sample ? sampleGame(game) : await buildGame(game);
  await writeFile(new URL(`sealed-${game}.json`, OUT), JSON.stringify(data));
  index.push({ game: data.game, gameName: data.gameName, createdAt: data.createdAt, count: data.rows.length, sample: data.sample });
  console.log(`Spiel ${game}: ${data.rows.length} Sealed-Produkte${sample ? ' (Beispieldaten)' : ''}`);
}
await writeFile(new URL('index.json', OUT), JSON.stringify({ updatedAt: new Date().toISOString(), games: index }));
