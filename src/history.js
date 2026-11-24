// Lädt den täglichen Preisverlauf (Trendpreis in Cent) aus public/data/history/.
const BUCKETS = 50;
const cache = new Map();

function bucket(game, b) {
  const key = `${game}/${b}`;
  if (!cache.has(key)) {
    cache.set(key, fetch(`data/history/${game}/${b}.json`, { cache: 'no-cache' })
      .then((r) => (r.ok ? r.json() : null))
      .catch(() => null));
  }
  return cache.get(key);
}

export function clearHistoryCache() {
  cache.clear();
}

// Liefert { "game-id": { dates, prices (in €), est } } für die gewünschten Produkte
export async function loadHistories(items) {
  const out = {};
  await Promise.all(items.map(async ({ game, id }) => {
    const h = await bucket(game, id % BUCKETS);
    const arr = h?.p?.[id];
    if (!arr) return;
    out[`${game}-${id}`] = { dates: h.dates, prices: arr.map((c) => (c == null ? null : c / 100)), est: h.est || [] };
  }));
  return out;
}

export const RANGES = { '1W': 7, '1M': 31, '1Y': 366, ALL: Infinity };

export function cutoff(range) {
  const days = RANGES[range] ?? Infinity;
  if (!Number.isFinite(days)) return '';
  return new Date(Date.now() - days * 864e5).toISOString().slice(0, 10);
}

// Wert einer Reihe an einem Datum: letzter bekannter Preis, sonst erster bekannter
export function priceAt(h, date) {
  let last = null;
  for (let i = 0; i < h.dates.length; i++) {
    if (h.dates[i] > date) break;
    if (h.prices[i] != null) last = h.prices[i];
  }
  return last ?? h.prices.find((v) => v != null) ?? null;
}
