// Deutsche Produktnamen für Pokémon: Cardmarket liefert nur englische Namen.
// Setnamen (Quelle: PokéWiki-Erweiterungsliste), Pokémon-Namen (PokeAPI) und Produktarten werden übersetzt.
import POKEMON from './pokemon-names-de.json' with { type: 'json' };

const SETS = [
  // Mega-Entwicklung
  ['Mega Evolution', 'Mega-Entwicklung'], ['Phantasmal Flames', 'Fatale Flammen'], ['Ascended Heroes', 'Erhabene Helden'],
  ['Perfect Order', 'Optimale Ordnung'], ['Chaos Rising', 'Wachsendes Chaos'], ['Pitch Black', 'Dunkelnacht'],
  ['Delta Reign', 'Delta-Herrschaft'], ['30th Celebration', '30 Jahre'],
  // Karmesin & Purpur
  ['Scarlet & Violet', 'Karmesin & Purpur'], ['Paldea Evolved', 'Entwicklungen in Paldea'], ['Obsidian Flames', 'Obsidianflammen'],
  ['Paradox Rift', 'Paradoxrift'], ['Paldean Fates', 'Paldeas Schicksale'], ['Temporal Forces', 'Gewalten der Zeit'],
  ['Twilight Masquerade', 'Maskerade im Zwielicht'], ['Shrouded Fable', 'Nebel der Sagen'], ['Stellar Crown', 'Stellarkrone'],
  ['Surging Sparks', 'Stürmische Funken'], ['Prismatic Evolutions', 'Prismatische Entwicklungen'], ['Journey Together', 'Reisegefährten'],
  ['Destined Rivals', 'Ewige Rivalen'], ['Black Bolt', 'Schwarze Blitze'], ['White Flare', 'Weiße Flammen'],
  // Schwert & Schild
  ['Sword & Shield', 'Schwert & Schild'], ['Rebel Clash', 'Clash der Rebellen'], ['Darkness Ablaze', 'Flammende Finsternis'],
  ["Champion's Path", 'Weg des Champs'], ['Champion’s Path', 'Weg des Champs'], ['Vivid Voltage', 'Farbenschock'],
  ['Shining Fates', 'Glänzendes Schicksal'], ['Battle Styles', 'Kampfstile'], ['Chilling Reign', 'Schaurige Herrschaft'],
  ['Evolving Skies', 'Drachenwandel'], ['Fusion Strike', 'Fusionsangriff'], ['Brilliant Stars', 'Strahlende Sterne'],
  ['Astral Radiance', 'Astralglanz'], ['Lost Origin', 'Verlorener Ursprung'], ['Silver Tempest', 'Silberne Sturmwinde'],
  ['Crown Zenith', 'Zenit der Könige'],
  // Sonne & Mond
  ['Sun & Moon', 'Sonne & Mond'], ['Guardians Rising', 'Stunde der Wächter'], ['Burning Shadows', 'Nacht in Flammen'],
  ['Shining Legends', 'Schimmernde Legenden'], ['Crimson Invasion', 'Aufziehen der Sturmröte'], ['Ultra Prism', 'Ultra-Prisma'],
  ['Forbidden Light', 'Grauen der Lichtfinsternis'], ['Celestial Storm', 'Sturm am Firmament'], ['Dragon Majesty', 'Majestät der Drachen'],
  ['Lost Thunder', 'Echo des Donners'], ['Team Up', 'Teams sind Trumpf'], ['Detective Pikachu', 'Meisterdetektiv Pikachu'],
  ['Unbroken Bonds', 'Kräfte im Einklang'], ['Unified Minds', 'Bund der Gleichgesinnten'], ['Hidden Fates', 'Verborgenes Schicksal'],
  ['Cosmic Eclipse', 'Welten im Wandel'],
  // XY
  ['Flashfire', 'Flammenmeer'], ['Furious Fists', 'Fliegende Fäuste'], ['Phantom Forces', 'Phantomkräfte'], ['Primal Clash', 'Protoschock'],
  ['Double Crisis', 'Doppeltes Dilemma'], ['Roaring Skies', 'Drachenleuchten'], ['Ancient Origins', 'Ewiger Anfang'],
  ['BREAKthrough', 'TURBOstart'], ['BREAKpoint', 'TURBOfieber'], ['Generations', 'Generationen'], ['Fates Collide', 'Schicksalsschmiede'],
  ['Steam Siege', 'Dampfkessel'], ['Evolutions', 'Evolution'],
  // Schwarz & Weiß
  ['Black & White', 'Schwarz & Weiß'], ['Emerging Powers', 'Aufstreben der Mächtigen'], ['Noble Victories', 'Königliche Siege'],
  ['Next Destinies', 'Kommende Schicksale'], ['Dark Explorers', 'Erforscher der Finsternis'], ['Dragon Vault', 'Drachengruft'],
  ['Dragons Exalted', 'Hoheit der Drachen'], ['Boundaries Crossed', 'Überschrittene Schwellen'], ['Plasma Storm', 'Plasma-Sturm'],
  ['Plasma Freeze', 'Plasma-Frost'], ['Plasma Blast', 'Plasma-Blaster'], ['Legendary Treasures', 'Legendäre Schätze'],
  // HeartGold & SoulSilver, Platin, Diamant & Perl
  ['Unleashed', 'Entfesselt'], ['Undaunted', 'Unerschrocken'], ['Triumphant', 'Triumph'], ['Call of Legends', 'Ruf der Legenden'],
  ['Diamond & Pearl', 'Diamant & Perl'], ['Mysterious Treasures', 'Geheimnisvolle Schätze'], ['Secret Wonders', 'Rätselhafte Wunder'],
  ['Great Encounters', 'Epische Begegnungen'], ['Majestic Dawn', 'Majestätischer Morgen'], ['Legends Awakened', 'Erwachte Legenden'],
  ['Stormfront', 'Sturmtief'], ['Platinum', 'Platin'], ['Rising Rivals', 'Aufstieg der Rivalen'], ['Supreme Victors', 'Ultimative Sieger'],
  // EX
  ['EX Ruby & Sapphire', 'EX Rubin & Saphir'], ['EX Sandstorm', 'EX Sandsturm'], ['EX Dragon Frontiers', 'EX Dragon Frontiers'],
  ['EX Dragon', 'EX Drache'], ['EX FireRed & LeafGreen', 'EX Feuerrot & Blattgrün'], ['EX Emerald', 'EX Smaragd'],
  ['EX Unseen Forces', 'EX Verborgene Mächte'],
  // Klassik
  ['Base Set 2', 'Base Set 2'], ['Base Set', 'Grundset'], ['Jungle', 'Dschungel'], ['Neo Discovery', 'Neo Entdeckung'],
].sort((a, b) => b[0].length - a[0].length);

const TERMS = [
  [/\bPok[eé]mon Center Elite Trainer Box\b/g, 'Pokémon Center Top-Trainer-Box'],
  [/\bElite Trainer Box(es)?\b/g, 'Top-Trainer-Box'],
  [/\bBooster (Box|Display)(?![\w-])/g, 'Booster-Display'],
  [/\bBooster Bundle\b/g, 'Booster-Bundle'],
  [/\bSleeved Booster\b/g, 'Booster (Sleeve)'],
  [/\b(\d+)[- ]Pack Blister\b/g, '$1er-Blister'],
  [/\((\d+) Boosters\)/g, '($1 Booster)'],
  [/\bUltra[- ]Premium Collection\b/g, 'Ultra-Premium-Kollektion'],
  [/\bSuper[- ]Premium Collection\b/g, 'Super-Premium-Kollektion'],
  [/\bPremium Figure Collection\b/g, 'Premium-Figuren-Kollektion'],
  [/\bPremium Collection\b/g, 'Premium-Kollektion'],
  [/\bSpecial Collection\b/g, 'Spezial-Kollektion'],
  [/\bPoster Collection\b/g, 'Poster-Kollektion'],
  [/\bBinder Collection\b/g, 'Sammelalbum-Kollektion'],
  [/\bPin Collection\b/g, 'Anstecker-Kollektion'],
  [/\bFigure Collection\b/g, 'Figuren-Kollektion'],
  [/\bCollection Box\b/g, 'Kollektion'],
  [/\bCollection\b/g, 'Kollektion'],
  [/\bHoliday Calendar\b/g, 'Adventskalender'],
  [/\bBattle Academy\b/g, 'Kampfakademie'],
  [/\bTrainer Kit\b/g, 'Trainer-Kit'],
  [/\bGift Set\b/g, 'Geschenkset'],
  [/\bEmpty\b/g, 'Leere'],
  [/(?<![\w-])Mini Tins(?![\w-])/g, 'Mini-Tin-Boxen'],
  [/(?<![\w-])Mini Tin(?![\w-])/g, 'Mini-Tin-Box'],
  [/(?<![\w-])Tins(?![\w-])/g, 'Tin-Boxen'],
  [/(?<![\w-])Tin(?![\w-])/g, 'Tin-Box'],
  [/\bCoins\b/g, 'Münzen'],
  [/\bCoin\b/g, 'Münze'],
  [/\((\d+) Cards?\)/g, '($1 Karten)'],
  [/\bTheme Decks?\b/g, 'Themendeck'],
  [/\bBattle Decks?\b/g, 'Kampfdeck'],
  [/\bStarter Decks?\b/g, 'Starterdeck'],
  [/\bJapanese\b/g, 'Japanisch'],
  [/\bChinese\b/g, 'Chinesisch'],
  [/\bKorean\b/g, 'Koreanisch'],
];

// Pokémon-Namen: längste zuerst, nur ganze Wörter
const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const POKE_RE = new RegExp(`(?<![\\w-])(${Object.keys(POKEMON).sort((a, b) => b.length - a.length).map(escape).join('|')})(?![\\w-])`, 'g');

const cache = new Map();
export function germanName(name) {
  if (cache.has(name)) return cache.get(name);
  let s = name;
  for (const [en, de] of SETS) if (s.includes(en)) { s = s.replace(en, de); break; }
  for (const [re, de] of TERMS) s = s.replace(re, de);
  s = s.replace(POKE_RE, (m) => POKEMON[m] || m);
  cache.set(name, s);
  return s;
}

const CATEGORIES = {
  'Pokémon Box Set': 'Box-Set', 'Pokémon Booster': 'Booster', 'Pokémon Coins': 'Münzen', 'Pokémon Display': 'Display',
  'Pokémon Tins': 'Tin-Boxen', 'Pokémon Theme Decks': 'Themendecks', 'Pokémon Blisters': 'Blister',
  'Pokémon Elite Trainer Boxes': 'Top-Trainer-Boxen', 'Pokémon Lot': 'Paket', 'Pokémon Trainer Kits': 'Trainer-Kits', 'PCG Set': 'PCG-Set',
};
export const germanCategory = (c) => CATEGORIES[c] || c;

// Kategorie-Anzeige je nach eingestellter Sprache
let catLang = 'de';
export const setCategoryLang = (l) => { catLang = l; };
export const catLabel = (c) => (catLang === 'de' ? germanCategory(c) : c);
