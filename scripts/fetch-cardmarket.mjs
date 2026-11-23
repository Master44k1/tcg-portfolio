// Lädt den öffentlichen Cardmarket-Produktkatalog (Sealed / "non-singles") und den
// täglichen Preis-Guide und schreibt eine kompakte Datei pro Spiel nach public/data/.
// Produktbilder werden über den öffentlichen TCGplayer-Katalog (tcgcsv.com) per Namensvergleich zugeordnet.
//
//   node scripts/fetch-cardmarket.mjs           -> echte Daten
//   node scripts/fetch-cardmarket.mjs --sample  -> Beispieldaten zum lokalen Testen
import { mkdir, writeFile } from 'node:fs/promises';
import { matchImages } from './match-images.mjs';

const BASE = 'https://downloads.s3.cardmarket.com/productCatalog';
const OUT = new URL('../public/data/', import.meta.url);
const sample = process.argv.includes('--sample');
const UA = { 'User-Agent': 'tcg-sealed-portfolio (personal price tracker)' };

// Spiele: feste Cardmarket-ID oder Erkennung über typische Produktnamen
const GAMES = [
  { key: 'pokemon', name: 'Pokémon', id: 6, url: 'Pokemon', tcgplayer: /^pokemon$/i },
  { key: 'cyberpunk', name: 'Cyberpunk TCG', detect: /night city|cyberpunk/i, url: 'Cyberpunk', tcgplayer: /cyberpunk/i },
];

async function getJson(url) {
  const res = await fetch(url, { headers: UA });
  if (!res.ok) throw new Error(`${url} -> HTTP ${res.status}`);
  return res.json();
}

const num = (v) => (typeof v === 'number' && Number.isFinite(v) && v > 0 ? Math.round(v * 100) / 100 : null);

async function detectGameId(pattern, skip) {
  for (let id = 1; id <= 80; id++) {
    if (skip.has(id)) continue;
    try {
      const res = await fetch(`${BASE}/productList/products_nonsingles_${id}.json`, { headers: UA });
      if (!res.ok) continue;
      const j = await res.json();
      const names = (j.products || []).map((p) => p.name);
      const hits = names.filter((n) => pattern.test(n)).length;
      if (hits >= 2 && hits >= names.length * 0.2) return id;
    } catch {
      /* nächste ID */
    }
  }
  return null;
}

async function tcgplayerSealed(pattern) {
  try {
    const cats = await getJson('https://tcgcsv.com/tcgplayer/categories');
    const cat = cats.results.find((c) => pattern.test(c.name) || pattern.test(c.displayName || ''));
    if (!cat) return [];
    const groups = await getJson(`https://tcgcsv.com/tcgplayer/${cat.categoryId}/groups`);
    const out = [];
    for (const g of groups.results) {
      try {
        const prods = await getJson(`https://tcgcsv.com/tcgplayer/${cat.categoryId}/${g.groupId}/products`);
        for (const p of prods.results) {
          const ext = (p.extendedData || []).map((e) => e.name);
          // Sealed-Produkte haben keine Kartennummer/Seltenheit
          if (!ext.includes('Number') && !ext.includes('Rarity') && p.imageUrl) out.push({ name: p.name, group: g.name, image: p.imageUrl });
        }
      } catch {
        /* Gruppe überspringen */
      }
    }
    return out;
  } catch (e) {
    console.warn('TCGplayer-Katalog nicht verfügbar:', e.message);
    return [];
  }
}

async function buildGame(game, id) {
  const [catalog, guide] = await Promise.all([
    getJson(`${BASE}/productList/products_nonsingles_${id}.json`),
    getJson(`${BASE}/priceGuide/price_guide_${id}.json`),
  ]);
  const prices = new Map();
  for (const p of guide.priceGuides || []) prices.set(p.idProduct, p);
  const products = catalog.products || [];
  const images = matchImages(products.map((p) => p.name), await tcgplayerSealed(game.tcgplayer));

  // Kompaktes Zeilenformat: [id, name, kategorie, idExpansion, trend, avg, low, avg7, avg30, dateAdded, bild]
  const rows = products.map((p, i) => {
    const g = prices.get(p.idProduct) || {};
    return [p.idProduct, p.name, p.categoryName || '', p.idExpansion ?? null, num(g.trend), num(g.avg), num(g.low), num(g.avg7), num(g.avg30), p.dateAdded || null, images[i]];
  });
  const withImg = images.filter(Boolean).length;
  console.log(`${game.name} (Cardmarket-ID ${id}): ${rows.length} Sealed-Produkte, ${withImg} mit Bild`);
  return { game: id, key: game.key, gameName: game.name, urlName: game.url, createdAt: guide.createdAt || new Date().toISOString(), sample: false, rows };
}

function sampleGame(game, id) {
  const names = game.key === 'pokemon'
    ? [['Scarlet & Violet Booster Box', 'Pokémon Display'], ['Prismatic Evolutions Elite Trainer Box', 'Elite Trainer Box'], ['Surging Sparks Booster Box', 'Pokémon Display'], ['Stellar Crown Booster Bundle', 'Booster Bundle'], ['151 Ultra Premium Collection', 'Pokémon Box Set'], ['Paldean Fates Elite Trainer Box', 'Elite Trainer Box'], ['Journey Together Booster Box', 'Pokémon Display'], ['Destined Rivals Booster', 'Booster']]
    : [['Welcome to Night City Booster Box', 'Display'], ['Welcome to Night City Booster', 'Booster'], ['Welcome to Night City Starter Deck', 'Starter Deck']];
  const rows = names.map(([n, c], i) => {
    const t = Math.round((40 + i * 37.5) * 100) / 100;
    return [id * 1000 + i, n, c, 5000 + i, t, t * 1.03, t * 0.9, t * 1.01, t * 0.97, '2025-01-01', i % 2 ? 'icon-192.png' : null];
  });
  return { game: id, key: game.key, gameName: game.name, urlName: game.url, createdAt: new Date().toISOString(), sample: true, rows };
}

await mkdir(OUT, { recursive: true });
const index = [];
const used = new Set(GAMES.filter((g) => g.id).map((g) => g.id));
for (const game of GAMES) {
  let id = game.id;
  if (!id) id = sample ? 99 : await detectGameId(game.detect, used);
  if (!id) {
    console.warn(`${game.name}: im Cardmarket-Katalog nicht gefunden, übersprungen`);
    continue;
  }
  used.add(id);
  try {
    const data = sample ? sampleGame(game, id) : await buildGame(game, id);
    await writeFile(new URL(`sealed-${data.game}.json`, OUT), JSON.stringify(data));
    index.push({ game: data.game, key: data.key, gameName: data.gameName, urlName: data.urlName, createdAt: data.createdAt, count: data.rows.length, sample: data.sample });
  } catch (e) {
    console.warn(`${game.name}: Fehler beim Laden (${e.message}), übersprungen`);
  }
}
if (!index.length) throw new Error('Keine Preisdaten geladen');
await writeFile(new URL('index.json', OUT), JSON.stringify({ updatedAt: new Date().toISOString(), games: index }));
