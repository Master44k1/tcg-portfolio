// Täglicher Preisverlauf pro Produkt (Trendpreis), gespeichert im Branch "history".
// Aufteilung in 50 Dateien pro Spiel, damit die App nur die Teile lädt, die sie braucht.
// Format pro Datei: { dates: ["YYYY-MM-DD", ...], est: [geschätzte Tage], p: { idProduct: [Cent|null, ...] } }
import { mkdir, readFile, writeFile, cp } from 'node:fs/promises';

export const BUCKETS = 50;
const HIST = new URL('../history/', import.meta.url);
const PUB = new URL('../public/data/history/', import.meta.url);

const day = (d) => d.toISOString().slice(0, 10);
const cents = (v) => (v ? Math.round(v * 100) : null);

export async function updateHistory(game, rows, createdAt, sample = false) {
  const today = new Date(createdAt || Date.now());
  const d0 = day(today);
  const minus = (n) => day(new Date(today.getTime() - n * 864e5));
  const dir = new URL(`${game}/`, HIST);
  await mkdir(dir, { recursive: true });

  const buckets = new Map();
  for (const r of rows) {
    const b = r[0] % BUCKETS;
    if (!buckets.has(b)) buckets.set(b, []);
    buckets.get(b).push(r);
  }
  for (let b = 0; b < BUCKETS; b++) {
    const file = new URL(`${b}.json`, dir);
    let h;
    try {
      h = JSON.parse(await readFile(file, 'utf8'));
    } catch {
      // Neu: mit Cardmarket-Durchschnitten der letzten 30 und 7 Tage als Startpunkte (geschätzt)
      h = { dates: [minus(30), minus(7)], est: [minus(30), minus(7)], p: {} };
      for (const r of buckets.get(b) || []) h.p[r[0]] = [cents(r[8]), cents(r[7])];
    }
    let col = h.dates.indexOf(d0);
    if (col === -1) {
      h.dates.push(d0);
      col = h.dates.length - 1;
    }
    for (const r of buckets.get(b) || []) {
      const arr = h.p[r[0]] || (h.p[r[0]] = []);
      while (arr.length < h.dates.length) arr.push(null);
      arr[col] = cents(r[4]);
    }
    for (const arr of Object.values(h.p)) while (arr.length < h.dates.length) arr.push(null);
    if (sample) {
      // Beispieldaten: ein Jahr zufälligen Verlauf erzeugen
      h.dates = Array.from({ length: 365 }, (_, i) => minus(364 - i));
      h.est = [];
      for (const r of buckets.get(b) || []) {
        let v = (r[4] || 50) * 0.7;
        h.p[r[0]] = h.dates.map((_, i) => (i === 364 ? cents(r[4]) : cents((v *= 1 + (Math.sin(i / 9 + r[0]) * 0.012 + 0.001)))));
      }
    }
    await writeFile(file, JSON.stringify(h));
  }
  await mkdir(new URL(`${game}/`, PUB), { recursive: true });
  await cp(dir, new URL(`${game}/`, PUB), { recursive: true });
  console.log(`Preisverlauf ${game}: Stand ${d0}`);
}
