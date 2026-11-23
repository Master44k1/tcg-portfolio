// Farben: Modus (auto/hell/dunkel), Akzentfarbe und Hintergrund.
export const ACCENTS = {
  gold: { light: '#a87c00', dark: '#f2c14e', name: 'Gold' },
  blue: { light: '#2563eb', dark: '#6ea8ff', name: 'Blau / Blue' },
  green: { light: '#15803d', dark: '#4cc283', name: 'Grün / Green' },
  purple: { light: '#7c3aed', dark: '#b18cff', name: 'Lila / Purple' },
  red: { light: '#dc2626', dark: '#ff7a7a', name: 'Rot / Red' },
  pink: { light: '#db2777', dark: '#ff85c0', name: 'Pink' },
  teal: { light: '#0f766e', dark: '#3fd0c0', name: 'Türkis / Teal' },
};

export function applyTheme({ theme = 'auto', accent = 'gold', bg = 'glow' }) {
  const root = document.documentElement;
  const dark = theme === 'dark' || (theme === 'auto' && matchMedia('(prefers-color-scheme: dark)').matches);
  if (theme === 'auto') root.removeAttribute('data-theme');
  else root.setAttribute('data-theme', theme);
  const a = ACCENTS[accent] || ACCENTS.gold;
  root.style.setProperty('--accent', dark ? a.dark : a.light);
  root.style.setProperty('--accent-text', dark ? '#14161c' : '#ffffff');
  root.setAttribute('data-bg', bg);
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#14161c' : '#f4f5f7');
}
