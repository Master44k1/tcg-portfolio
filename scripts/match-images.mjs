// Ordnet Cardmarket-Produktnamen einem Bild aus dem TCGplayer-Katalog zu (Namensvergleich).
// Nur eindeutige, ausreichend ähnliche Treffer werden übernommen.

const SYNONYMS = [
  [/\bbooster (box|display)\b/g, 'boosterbox'],
  [/\bdisplay\b/g, 'boosterbox'],
  [/\belite trainer box\b/g, 'etb'],
  [/\bpokemon center\b/g, 'pc'],
  [/\bultra[- ]premium collection\b/g, 'upc'],
  [/\bbooster bundle\b/g, 'bundle'],
  [/\bbuild (&|and) battle\b/g, 'buildbattle'],
  [/\b(3|three)[- ]pack blister\b/g, 'blister3'],
  [/\bcollection box\b/g, 'collection'],
  [/\bmini tins?\b/g, 'minitin'],
  [/\btins\b/g, 'tin'],
  [/\b(sleeved|blister)\b/g, ''],
  [/\band\b/g, '&'],
  [/\bscarlet & violet (?=151)/g, ''],
];
const STOP = new Set(['pokemon', 'tcg', 'the', 'of', 'a', 'trading', 'card', 'game', 'pack', 'packs', 'english', 'en', 'set', 'box', 'expansion']);

export function tokens(name) {
  let s = name
    .toLowerCase()
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/^[a-z]{1,4}\d{0,3}[a-z]?\s*:\s*/, '') // Setcode-Präfix wie "SV08: "
    .replace(/[()[\],.:'’!]/g, ' ');
  for (const [re, to] of SYNONYMS) s = s.replace(re, to);
  return new Set(s.split(/[\s\-–/]+/).filter((w) => w && !STOP.has(w)));
}

function score(a, b) {
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  const jaccard = inter / (a.size + b.size - inter || 1);
  // Alle Wörter des Cardmarket-Namens enthalten, nur wenige Zusatzwörter (z. B. Setname aus der Gruppe)
  const contained = inter === a.size && a.size >= 2 ? 0.9 - 0.08 * (b.size - inter) : 0;
  return Math.max(jaccard, contained);
}

export function matchImages(cmNames, tcgProducts, threshold = 0.66) {
  const seen = new Set();
  const tp = [];
  for (const p of tcgProducts) {
    const tok = tokens(p.name);
    // Setname der Gruppe ergänzen, falls er im Produktnamen fehlt
    if (p.group) for (const t of tokens(p.group)) tok.add(t);
    const key = [...tok].sort().join(' ');
    if (seen.has(key)) continue; // doppelte Einträge (gleicher Name) nur einmal
    seen.add(key);
    tp.push({ ...p, tok });
  }
  // Index: Token -> Produkte, damit nicht jeder mit jedem verglichen wird
  const byToken = new Map();
  tp.forEach((p, i) => p.tok.forEach((t) => (byToken.get(t) || byToken.set(t, []).get(t)).push(i)));
  return cmNames.map((name) => {
    const a = tokens(name);
    const cand = new Set();
    a.forEach((t) => (byToken.get(t) || []).forEach((i) => cand.add(i)));
    let best = null, bestScore = 0, second = 0;
    for (const i of cand) {
      const s = score(a, tp[i].tok);
      if (s > bestScore) { second = bestScore; bestScore = s; best = tp[i]; } else if (s > second) second = s;
    }
    if (!best || bestScore < threshold || bestScore - second < 0.04) return null;
    return best.image.replace(/_\d+w\.jpg$/, '_200w.jpg');
  });
}
