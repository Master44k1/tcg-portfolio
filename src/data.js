// Lädt die täglich erzeugten Cardmarket-Preisdaten (siehe scripts/fetch-cardmarket.mjs).
export const PRICE_FIELDS = {
  trend: 'Trendpreis',
  avg30: 'Ø 30 Tage',
  avg7: 'Ø 7 Tage',
  avg: 'Ø Verkaufspreis',
  low: 'Ab-Preis',
};

export async function loadIndex() {
  const res = await fetch('data/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Preisdaten nicht gefunden');
  return res.json();
}

export async function loadGame(game) {
  const res = await fetch(`data/sealed-${game}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Preisdaten nicht gefunden');
  const data = await res.json();
  const byId = new Map();
  const list = data.rows.map((r) => {
    const p = {
      id: r[0],
      name: r[1],
      category: r[2],
      prices: { trend: r[4], avg: r[5], low: r[6], avg7: r[7], avg30: r[8] },
      search: `${r[1]} ${r[2]}`.toLowerCase(),
    };
    byId.set(p.id, p);
    return p;
  });
  return { ...data, list, byId };
}

export function priceOf(product, field) {
  if (!product) return null;
  const p = product.prices;
  // Fallback, falls das gewählte Feld für das Produkt leer ist
  return p[field] ?? p.trend ?? p.avg30 ?? p.avg ?? p.low ?? null;
}

// Gängige Abkürzungen aus der Community auf die Cardmarket-Namen abbilden
const ALIASES = {
  etb: ['elite trainer box'],
  upc: ['ultra premium collection'],
  bb: ['booster bundle'],
  display: ['display', 'booster box'],
  sv: ['scarlet & violet', 'scarlet and violet'],
  sp: ['special collection'],
};

export function search(list, q, limit = 40) {
  const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
  if (!terms.length) return [];
  const out = [];
  const match = (text, t) => text.includes(t) || (ALIASES[t] || []).some((a) => text.includes(a));
  for (const p of list) {
    if (terms.every((t) => match(p.search, t))) {
      out.push(p);
      if (out.length >= limit) break;
    }
  }
  return out;
}

const URL_GAME = { 1: 'Magic', 3: 'YuGiOh', 6: 'Pokemon' };
export function cardmarketUrl(game, name) {
  return `https://www.cardmarket.com/de/${URL_GAME[game] || 'Pokemon'}/Products/Search?searchString=${encodeURIComponent(name)}`;
}

export const eur = (v) =>
  v == null ? '–' : v.toLocaleString('de-DE', { style: 'currency', currency: 'EUR' });
export const pct = (v) =>
  v == null || !Number.isFinite(v) ? '' : `${v >= 0 ? '+' : ''}${v.toLocaleString('de-DE', { maximumFractionDigits: 1 })} %`;

