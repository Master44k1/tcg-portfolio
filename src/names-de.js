// Deutsche Produktnamen für Pokémon: Cardmarket liefert nur englische Namen.
// Setnamen und Produktarten werden übersetzt; unbekannte Teile bleiben englisch.
const SETS = [
  ['Scarlet & Violet', 'Karmesin & Purpur'],
  ['Paldea Evolved', 'Entwicklungen in Paldea'],
  ['Obsidian Flames', 'Obsidianflammen'],
  ['Paradox Rift', 'Paradoxrift'],
  ['Paldean Fates', 'Paldeas Schicksale'],
  ['Temporal Forces', 'Gewalten der Zeit'],
  ['Twilight Masquerade', 'Maskerade im Zwielicht'],
  ['Shrouded Fable', 'Nebel der Sagen'],
  ['Stellar Crown', 'Stellarkrone'],
  ['Surging Sparks', 'Stürmische Funken'],
  ['Prismatic Evolutions', 'Prismatische Entwicklungen'],
  ['Journey Together', 'Reisegefährten'],
  ['Destined Rivals', 'Ewige Rivalen'],
  ['Black Bolt', 'Schwarze Blitze'],
  ['White Flare', 'Weiße Flamme'],
  ['Mega Evolution', 'Mega-Entwicklung'],
  ['Sword & Shield', 'Schwert & Schild'],
  ['Rebel Clash', 'Clash der Rebellen'],
  ['Darkness Ablaze', 'Flammende Finsternis'],
  ["Champion's Path", 'Weg des Champs'],
  ['Vivid Voltage', 'Farbenschock'],
  ['Shining Fates', 'Glänzendes Schicksal'],
  ['Battle Styles', 'Kampfstile'],
  ['Chilling Reign', 'Schaurige Herrschaft'],
  ['Evolving Skies', 'Drachenwandel'],
  ['Fusion Strike', 'Fusionsangriff'],
  ['Brilliant Stars', 'Strahlende Sterne'],
  ['Astral Radiance', 'Astralglanz'],
  ['Lost Origin', 'Verlorener Ursprung'],
  ['Silver Tempest', 'Silberne Sturmwinde'],
  ['Crown Zenith', 'Zenit der Könige'],
  ['Hidden Fates', 'Verborgenes Schicksal'],
  ['Cosmic Eclipse', 'Welten im Wandel'],
  ['Unified Minds', 'Bund der Gleichgesinnten'],
  ['Team Up', 'Teams sind Trumpf'],
  ['Lost Thunder', 'Echo des Donners'],
];
const TERMS = [
  [/\bPok[eé]mon Center Elite Trainer Box\b/g, 'Pokémon Center Top-Trainer-Box'],
  [/\bElite Trainer Box\b/g, 'Top-Trainer-Box'],
  [/\bBooster (Box|Display)\b/g, 'Booster-Display'],
  [/\bBooster Bundle\b/g, 'Booster-Bundle'],
  [/\bSleeved Booster\b/g, 'Booster (Sleeve)'],
  [/\b3[- ]Pack Blister\b/g, '3er-Blister'],
  [/\bUltra[- ]Premium Collection\b/g, 'Ultra-Premium-Kollektion'],
  [/\bSuper[- ]Premium Collection\b/g, 'Super-Premium-Kollektion'],
  [/\bPremium Collection\b/g, 'Premium-Kollektion'],
  [/\bSpecial Collection\b/g, 'Spezial-Kollektion'],
  [/\bPoster Collection\b/g, 'Poster-Kollektion'],
  [/\bBinder Collection\b/g, 'Sammelalbum-Kollektion'],
  [/\bCollection Box\b/g, 'Kollektion'],
  [/\bCollection\b/g, 'Kollektion'],
  [/\bMini Tin\b/g, 'Mini-Tin'],
  [/\bTin\b/g, 'Tin-Box'],
  [/\bBuild & Battle Box\b/g, 'Build & Battle Box'],
  [/\bTheme Deck\b/g, 'Themendeck'],
  [/\bBattle Deck\b/g, 'Kampfdeck'],
  [/\bStarter Deck\b/g, 'Starterdeck'],
];

const cache = new Map();
export function germanName(name) {
  if (cache.has(name)) return cache.get(name);
  let s = name;
  for (const [en, de] of SETS) if (s.includes(en)) { s = s.replace(en, de); break; }
  for (const [re, de] of TERMS) s = s.replace(re, de);
  cache.set(name, s);
  return s;
}
