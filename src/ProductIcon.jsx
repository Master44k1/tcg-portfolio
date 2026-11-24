// Symbolbild nach Produktart, wenn es kein Foto gibt.
function kind(name, category) {
  const s = `${name} ${category}`.toLowerCase();
  if (/\bcase\b/.test(s)) return 'case';
  if (/elite trainer|top-trainer|\betb\b/.test(s)) return 'etb';
  if (/display|booster box/.test(s)) return 'display';
  if (/bundle/.test(s)) return 'bundle';
  if (/\btin\b|tin-box/.test(s)) return 'tin';
  if (/blister/.test(s)) return 'blister';
  if (/deck/.test(s)) return 'deck';
  if (/collection|kollektion|box set|premium|box/.test(s)) return 'collection';
  if (/booster|pack/.test(s)) return 'booster';
  return 'other';
}

const SHAPES = {
  display: (
    <>
      <rect x="10" y="22" width="44" height="30" rx="3" />
      {[0, 1, 2, 3, 4].map((i) => <rect key={i} x={14 + i * 8} y="12" width="6" height="16" rx="1.5" className="fill2" />)}
    </>
  ),
  etb: (
    <>
      <rect x="12" y="24" width="40" height="28" rx="3" />
      <rect x="10" y="14" width="44" height="12" rx="3" className="fill2" />
    </>
  ),
  booster: (
    <>
      <path d="M22 10h20l-2 4 2 4v30l-2 4 2 4H22l2-4-2-4V18l2-4z" />
      <circle cx="32" cy="33" r="6" className="fill2" />
    </>
  ),
  bundle: (
    <>
      <rect x="14" y="36" width="36" height="14" rx="2" />
      <rect x="16" y="24" width="32" height="14" rx="2" className="fill2" />
      <rect x="18" y="12" width="28" height="14" rx="2" />
    </>
  ),
  tin: (
    <>
      <rect x="14" y="18" width="36" height="32" rx="4" />
      <ellipse cx="32" cy="18" rx="18" ry="6" className="fill2" />
    </>
  ),
  blister: (
    <>
      <rect x="12" y="10" width="40" height="44" rx="3" className="fill2" />
      <rect x="18" y="18" width="12" height="28" rx="2" />
      <rect x="34" y="18" width="12" height="28" rx="2" />
    </>
  ),
  deck: (
    <>
      <rect x="20" y="14" width="26" height="36" rx="3" className="fill2" />
      <rect x="16" y="18" width="26" height="36" rx="3" />
    </>
  ),
  collection: (
    <>
      <rect x="8" y="16" width="48" height="34" rx="3" />
      <rect x="14" y="22" width="20" height="22" rx="2" className="fill2" />
      <rect x="38" y="22" width="12" height="9" rx="2" className="fill2" />
      <rect x="38" y="35" width="12" height="9" rx="2" className="fill2" />
    </>
  ),
  case: (
    <>
      <rect x="8" y="14" width="48" height="38" rx="3" />
      <path d="M8 26h48M32 14v38" className="stroke2" />
    </>
  ),
  other: <rect x="14" y="14" width="36" height="36" rx="6" />,
};

export default function ProductIcon({ name, category, size }) {
  return (
    <svg className="thumb icon" width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
      {SHAPES[kind(name, category || '')]}
    </svg>
  );
}
