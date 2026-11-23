// Lokale Speicherung im Browser (pro Gerät). Export/Import überträgt das Portfolio
// zwischen PC und Handy.
const KEY = 'sealed-portfolio-v1';

const empty = () => ({
  holdings: [], // {id, game, productId, name, category, qty, buyPrice, buyDate, note}
  barcodes: {}, // ean -> {game, productId}
  history: [], // {date, value, cost}
  settings: { priceField: 'trend', game: 6 },
});

export function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return empty();
    const s = JSON.parse(raw);
    return { ...empty(), ...s, settings: { ...empty().settings, ...(s.settings || {}) } };
  } catch {
    return empty();
  }
}

export function save(state) {
  try {
    localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    /* Speicher voll oder gesperrt: Daten bleiben bis zum Neuladen im Speicher */
  }
}

export function validateImport(obj) {
  if (!obj || !Array.isArray(obj.holdings)) throw new Error('Keine gültige Portfolio-Datei');
  return { ...empty(), ...obj, settings: { ...empty().settings, ...(obj.settings || {}) } };
}

export const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
export const today = () => new Date().toISOString().slice(0, 10);
