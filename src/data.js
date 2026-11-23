import { germanName } from './names-de.js';
// Lädt die täglich erzeugten Cardmarket-Preisdaten (siehe scripts/fetch-cardmarket.mjs).
// Wert = i18n-Schlüssel
export const PRICE_FIELDS = {
  trend: 'priceTrend',
  avg30: 'priceAvg30',
  avg7: 'priceAvg7',
  avg: 'priceAvg',
  low: 'priceLow',
};

let LOCALE = 'de-DE';
export const setLocale = (l) => { LOCALE = l; };
export const fmtDate = (d) => new Date(d).toLocaleDateString(LOCALE);

export async function loadIndex() {
  const res = await fetch('data/index.json', { cache: 'no-cache' });
  if (!res.ok) throw new Error('Preisdaten nicht gefunden');
  return res.json();
}

export async function loadGame(game) {
  const res = await fetch(`data/sealed-${game}.json`, { cache: 'no-cache' });
  if (!res.ok) throw new Error('Preisdaten nicht gefunden');
  const data = await res.json();
  const de = data.key === 'pokemon' || data.game === 6;
  const byId = new Map();
  const list = data.rows.map((r) => {
    const nameDe = de ? germanName(r[1]) : r[1];
    const p = {
      id: r[0],
      game: data.game,
      name: r[1],
      nameDe,
      category: r[2],
      image: r[10] || null,
      prices: { trend: r[4], avg: r[5], low: r[6], avg7: r[7], avg30: r[8] },
      search: `${r[1]} ${nameDe} ${r[2]}`.toLowerCase(),
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

export function cardmarketUrl(urlName, name) {
  return `https://www.cardmarket.com/de/${urlName || 'Pokemon'}/Products/Search?searchString=${encodeURIComponent(name)}`;
}

export const eur = (v) =>
  v == null ? '–' : v.toLocaleString(LOCALE, { style: 'currency', currency: 'EUR' });
export const pct = (v) =>
  v == null || !Number.isFinite(v) ? '' : `${v >= 0 ? '+' : ''}${v.toLocaleString(LOCALE, { maximumFractionDigits: 1 })} %`;

// Veränderung des Trendpreises gegenüber einem Durchschnitt, in Prozent
export const change = (now, base) => (now && base ? (now / base - 1) * 100 : null);

