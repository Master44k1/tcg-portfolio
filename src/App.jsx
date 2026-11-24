import { useCallback, useEffect, useMemo, useState } from 'react';
import Scanner from './Scanner.jsx';
import { load, save, uid, today, validateImport } from './store.js';
import { loadIndex, loadGame, priceOf, search, cardmarketUrl, eur, pct, change, fmtDate, setLocale, PRICE_FIELDS } from './data.js';
import { LANGS, defaultLang, makeT } from './i18n.js';
import { ACCENTS, applyTheme } from './theme.js';
import { getAllPhotos, setPhoto, deletePhoto, fileToDataUrl } from './photos.js';
import PriceChart from './PriceChart.jsx';
import ProductIcon from './ProductIcon.jsx';
import { loadHistories, priceAt, clearHistoryCache } from './history.js';

const photoKey = (game, productId) => `${game}-${productId}`;

export default function App() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState('portfolio');
  const [addMode, setAddMode] = useState('search');
  const [catalogs, setCatalogs] = useState(null);
  const [index, setIndex] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [photos, setPhotos] = useState({});
  const [folder, setFolder] = useState('all');

  const update = useCallback((fn) => setState((s) => {
    const next = fn(s);
    save(next);
    return next;
  }), []);

  const { game, priceField: field, theme, accent, bg } = state.settings;
  const lang = state.settings.lang || defaultLang();
  const t = useMemo(() => makeT(lang), [lang]);
  setLocale(LANGS[lang]?.locale || 'de-DE');

  useEffect(() => {
    document.documentElement.lang = lang;
  }, [lang]);

  useEffect(() => {
    applyTheme({ theme, accent, bg });
    const mq = matchMedia('(prefers-color-scheme: dark)');
    const on = () => applyTheme({ theme, accent, bg });
    mq.addEventListener?.('change', on);
    return () => mq.removeEventListener?.('change', on);
  }, [theme, accent, bg]);

  useEffect(() => {
    getAllPhotos().then(setPhotos);
  }, []);

  const savePhoto = useCallback(async (key, file) => {
    const url = await fileToDataUrl(file);
    setPhotos((p) => ({ ...p, [key]: url }));
    try { await setPhoto(key, url); } catch { /* nur für diese Sitzung */ }
  }, []);
  const removePhoto = useCallback(async (key) => {
    setPhotos((p) => { const n = { ...p }; delete n[key]; return n; });
    try { await deletePhoto(key); } catch { /* egal */ }
  }, []);

  useEffect(() => {
    let alive = true;
    let stamp = null;
    const loadAll = async () => {
      const idx = await loadIndex();
      if (!alive || idx.updatedAt === stamp) return;
      const cats = await Promise.all(idx.games.map((g) => loadGame(g.game).catch(() => null)));
      if (!alive) return;
      const map = {};
      idx.games.forEach((g, i) => { if (cats[i]) map[g.game] = cats[i]; });
      if (stamp) clearHistoryCache();
      stamp = idx.updatedAt;
      setIndex(idx);
      setCatalogs(map);
      setLoadError('');
    };
    loadAll().catch((e) => alive && setLoadError(e.message));

    // Neue Preise automatisch nachladen: beim Zurückkehren in die App und alle 30 Minuten
    const refresh = () => { if (document.visibilityState === 'visible') loadAll().catch(() => {}); };
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 30 * 60 * 1000);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(timer);
    };
  }, []);

  const catalog = catalogs?.[game] || (catalogs && Object.values(catalogs)[0]) || null;
  const nm = useCallback((p, fallback) => (p ? (lang === 'de' ? p.nameDe : p.name) : fallback), [lang]);

  const rows = useMemo(() => state.holdings.map((h) => {
    const product = catalogs?.[h.game]?.byId.get(h.productId) || null;
    const unit = priceOf(product, field);
    const value = unit == null ? null : unit * h.qty;
    const cost = (h.buyPrice || 0) * h.qty;
    return { ...h, product, unit, value, cost, display: nm(product, h.name) };
  }), [state.holdings, catalogs, field, nm]);

  const totals = useMemo(() => {
    const value = rows.reduce((a, r) => a + (r.value ?? 0), 0);
    const cost = rows.reduce((a, r) => a + r.cost, 0);
    const items = rows.reduce((a, r) => a + r.qty, 0);
    return { value, cost, items, pl: value - cost, plPct: cost ? ((value - cost) / cost) * 100 : null };
  }, [rows]);

  // Preisverlauf der eigenen Produkte laden
  const [histories, setHistories] = useState({});
  const holdingKeys = useMemo(() => [...new Set(state.holdings.map((h) => `${h.game}-${h.productId}`))].sort().join(','), [state.holdings]);
  useEffect(() => {
    if (!index || !holdingKeys) return;
    let alive = true;
    const items = holdingKeys.split(',').map((k) => { const [g, id] = k.split('-').map(Number); return { game: g, id }; });
    loadHistories(items).then((h) => alive && setHistories(h));
    return () => { alive = false; };
  }, [index, holdingKeys]);

  const chartRange = state.settings.chartRange || '1M';
  const setChartRange = (r) => update((s) => ({ ...s, settings: { ...s.settings, chartRange: r } }));

  // Portfoliowert je Tag = Summe (Menge × Trendpreis des Tages), Produkte erst ab Kaufdatum
  const portfolioSeries = useCallback((holdings) => {
    const hs = holdings.map((h) => ({ h, hist: histories[`${h.game}-${h.productId}`] })).filter((x) => x.hist);
    if (!hs.length) return { series: [], estUntil: null };
    const dates = [...new Set(hs.flatMap((x) => x.hist.dates))].sort();
    const est = new Set(hs.flatMap((x) => x.hist.est));
    const estUntil = dates.find((d) => !est.has(d)) || null;
    const series = dates.map((date) => {
      let value = 0, cost = 0;
      for (const { h, hist } of hs) {
        if (h.buyDate && h.buyDate > date) continue;
        value += (priceAt(hist, date) ?? 0) * h.qty;
        cost += (h.buyPrice || 0) * h.qty;
      }
      return { date, value: Math.round(value * 100) / 100, cost: cost || null };
    });
    return { series, estUntil };
  }, [histories]);

  // Tageswert für den Verlauf speichern (ein Eintrag pro Tag)
  useEffect(() => {
    if (!catalogs || !state.holdings.length) return;
    const d = today();
    const v = Math.round(totals.value * 100) / 100;
    const c = Math.round(totals.cost * 100) / 100;
    const last = state.history[state.history.length - 1];
    if (last && last.date === d && last.value === v && last.cost === c) return;
    update((s) => ({ ...s, history: [...s.history.filter((x) => x.date !== d), { date: d, value: v, cost: c }].slice(-730) }));
  }, [catalogs, totals.value, totals.cost, state.holdings.length, state.history, update]);

  const gameInfo = index?.games.find((g) => g.game === catalog?.game) || index?.games[0];
  const games = index?.games || [];
  const urlNameOf = (g) => games.find((x) => x.game === g)?.urlName || 'Pokemon';
  const go = (next, mode) => { setAddMode(mode || 'search'); setTab(next); window.scrollTo(0, 0); };
  const ctx = { t, update, histories, portfolioSeries, chartRange, setChartRange, catalog, catalogs, field, photos, savePhoto, removePhoto, game: catalog?.game ?? game, games, nm, urlNameOf, folders: state.folders || [], folder, setFolder, setGame: (g) => update((s) => ({ ...s, settings: { ...s.settings, game: g } })) };

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="label">{t('portfolioValue')}</div>
          <div className="big">{eur(totals.value)}</div>
          <div className={!totals.cost ? 'sub' : totals.pl >= 0 ? 'up' : 'down'}>
            {totals.cost ? `${eur(totals.pl)} ${pct(totals.plPct)}` : t('noBuyPrices')}
          </div>
        </div>
        <div className="meta">
          <div>{t('products', { n: totals.items })}</div>
          <div>{t('cost', { v: eur(totals.cost) })}</div>
          {gameInfo && <div>{t('pricesFrom', { d: fmtDate(gameInfo.createdAt) })}</div>}
          <button className="primary scan-top" onClick={() => go('add', 'scan')}>{t('scan')}</button>
        </div>
      </header>
      {gameInfo?.sample && <div className="banner">{t('sampleData')}</div>}
      {loadError && <div className="banner bad">{t('loadFailed', { e: loadError })}</div>}

      <main>
        {tab === 'portfolio' && <Portfolio {...ctx} rows={rows} history={state.history} onAdd={() => go('add')} />}
        {tab === 'market' && <Market {...ctx} rows={rows} />}
        {tab === 'add' && <AddProduct key={addMode + tab} {...ctx} state={state} startScan={addMode === 'scan'} onDone={() => go('portfolio')} />}
        {tab === 'settings' && <Settings {...ctx} state={state} index={index} lang={lang} setPhotos={setPhotos} />}
      </main>

      <nav className="tabs">
        {[['portfolio', 'tabPortfolio'], ['market', 'tabMarket'], ['add', 'tabAdd'], ['settings', 'tabSettings']].map(([k, label]) => (
          <button key={k} className={tab === k ? 'on' : ''} onClick={() => go(k)}>{t(label)}</button>
        ))}
      </nav>
    </div>
  );
}

function Thumb({ src, name, category, size = 48 }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [src]);
  if (src && !broken) return <img className="thumb" src={src} alt="" loading="lazy" referrerPolicy="no-referrer" onError={() => setBroken(true)} style={{ width: size, height: size }} />;
  return <ProductIcon name={name} category={category} size={size} />;
}

// Preisverlauf eines einzelnen Produkts
function ProductHistory({ t, game, id, range, setRange, buyPrice }) {
  const [hist, setHist] = useState(undefined);
  useEffect(() => {
    let alive = true;
    loadHistories([{ game, id }]).then((h) => alive && setHist(h[`${game}-${id}`] || null));
    return () => { alive = false; };
  }, [game, id]);
  if (hist === undefined) return <p className="sub">…</p>;
  if (!hist) return <p className="sub">{t('noHistory')}</p>;
  const series = hist.dates.map((date, i) => ({ date, value: hist.prices[i], cost: buyPrice || null }));
  const estUntil = hist.dates.find((d) => !hist.est.includes(d)) || null;
  return <PriceChart t={t} series={series} range={range} setRange={setRange} estUntil={estUntil} compact />;
}

function GamePicker({ games, game, setGame }) {
  if (games.length < 2) return null;
  return (
    <div className="seg">
      {games.map((g) => <button key={g.game} className={g.game === game ? 'on' : ''} onClick={() => setGame(g.game)}>{g.gameName}</button>)}
    </div>
  );
}

function PhotoButtons({ t, pkey, photos, savePhoto, removePhoto }) {
  return (
    <div className="row gap wrap">
      <label className="button">
        {photos[pkey] ? t('changePhoto') : t('addPhoto')}
        <input type="file" accept="image/*" capture="environment" hidden onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) savePhoto(pkey, f); }} />
      </label>
      {photos[pkey] && <button className="ghost" onClick={() => removePhoto(pkey)}>{t('removePhoto')}</button>}
    </div>
  );
}

function PortfolioChart({ t, visible, history, portfolioSeries, range, setRange }) {
  const { series, estUntil } = useMemo(() => portfolioSeries(visible), [portfolioSeries, visible]);
  // Ohne Server-Verlauf: lokal gespeicherte Tageswerte verwenden
  const data = series.length >= 2 ? series : history;
  if (data.length < 2) return null;
  return <PriceChart t={t} series={data} range={range} setRange={setRange} title={t('portfolioChart')} estUntil={series.length >= 2 ? estUntil : null} />;
}

function FolderBar({ t, folders, folder, setFolder, update, rows }) {
  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [editing, setEditing] = useState(false);
  const count = (id) => rows.filter((r) => (id === 'all' ? true : r.folderId === id)).reduce((a, r) => a + r.qty, 0);
  const create = (e) => {
    e.preventDefault();
    const n = name.trim();
    if (!n) return;
    const id = uid();
    update((s) => ({ ...s, folders: [...(s.folders || []), { id, name: n }] }));
    setName('');
    setCreating(false);
    setFolder(id);
  };
  const current = folders.find((f) => f.id === folder);
  return (
    <div className="stack tight">
      <div className="chips">
        <button className={`chip ${folder === 'all' ? 'on' : ''}`} onClick={() => setFolder('all')}>{t('allItems')} · {count('all')}</button>
        {folders.map((f) => (
          <button key={f.id} className={`chip ${folder === f.id ? 'on' : ''}`} onClick={() => { setFolder(f.id); setEditing(false); }}>📁 {f.name} · {count(f.id)}</button>
        ))}
        <button className="chip ghost" onClick={() => setCreating(!creating)}>{t('newFolder')}</button>
      </div>
      {creating && (
        <form className="row gap" onSubmit={create}>
          <input autoFocus placeholder={t('folderName')} value={name} onChange={(e) => setName(e.target.value)} />
          <button className="primary" type="submit">{t('create')}</button>
        </form>
      )}
      {current && !creating && (
        editing ? (
          <div className="card stack">
            <form className="row gap" onSubmit={(e) => { e.preventDefault(); const n = name.trim(); if (n) update((s) => ({ ...s, folders: s.folders.map((f) => (f.id === current.id ? { ...f, name: n } : f)) })); setEditing(false); }}>
              <input autoFocus value={name} onChange={(e) => setName(e.target.value)} />
              <button className="primary" type="submit">{t('save')}</button>
            </form>
            <button className="danger" onClick={() => { update((s) => ({ ...s, folders: s.folders.filter((f) => f.id !== current.id), holdings: s.holdings.map((h) => (h.folderId === current.id ? { ...h, folderId: null } : h)) })); setFolder('all'); setEditing(false); }}>{t('deleteFolder')}</button>
            <p className="sub">{t('deleteFolderHint')}</p>
          </div>
        ) : (
          <button className="link left" onClick={() => { setName(current.name); setEditing(true); }}>{t('rename')} / {t('deleteFolder')}</button>
        )
      )}
    </div>
  );
}

function Portfolio({ t, rows, history, update, catalogs, portfolioSeries, chartRange, setChartRange, onAdd, photos, savePhoto, removePhoto, folders, folder, setFolder, field, urlNameOf }) {
  const [editing, setEditing] = useState(null);
  const [openChart, setOpenChart] = useState(null);
  const [sort, setSort] = useState('value');
  const visible = useMemo(() => (folder === 'all' ? rows : rows.filter((r) => r.folderId === folder)), [rows, folder]);
  const sorted = useMemo(() => {
    const r = [...visible];
    if (sort === 'value') r.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (sort === 'pl') r.sort((a, b) => (b.value ?? 0) - b.cost - ((a.value ?? 0) - a.cost));
    if (sort === 'name') r.sort((a, b) => a.display.localeCompare(b.display));
    return r;
  }, [visible, sort]);
  const sub = useMemo(() => {
    const value = visible.reduce((a, r) => a + (r.value ?? 0), 0);
    const cost = visible.reduce((a, r) => a + r.cost, 0);
    return { value, cost, pl: value - cost };
  }, [visible]);

  if (!rows.length) {
    return (
      <div className="empty">
        <p>{t('emptyPortfolio')}</p>
        <button className="primary" onClick={onAdd}>{t('firstProduct')}</button>
      </div>
    );
  }
  return (
    <>
      <PortfolioChart t={t} visible={visible} history={folder === 'all' ? history : []} portfolioSeries={portfolioSeries} range={chartRange} setRange={setChartRange} />
      <FolderBar t={t} folders={folders} folder={folder} setFolder={setFolder} update={update} rows={rows} />
      {folder !== 'all' && (
        <div className="card row between folder-total">
          <span className="label">{t('folderTotal')}</span>
          <span className="right">
            <span className="name">{eur(sub.value)}</span>{' '}
            {sub.cost > 0 && <span className={sub.pl >= 0 ? 'up' : 'down'}>{eur(sub.pl)} {pct((sub.pl / sub.cost) * 100)}</span>}
          </span>
        </div>
      )}
      <div className="row between">
        <span className="label">{t(PRICE_FIELDS[field])} · Cardmarket</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label={t('sort')}>
          <option value="value">{t('byValue')}</option>
          <option value="pl">{t('byProfit')}</option>
          <option value="name">{t('byName')}</option>
        </select>
      </div>
      {!sorted.length && <p className="sub">{t('folderEmpty')}</p>}
      <ul className="list">
        {sorted.map((r) => {
          const pl = r.value == null ? null : r.value - r.cost;
          const pkey = photoKey(r.game, r.productId);
          return (
            <li key={r.id} className="card">
              <div className="row top-align">
                <Thumb src={photos[pkey] || r.product?.image} name={r.display} category={r.category} size={56} />
                <div className="grow">
                  <div className="name">{r.display}</div>
                  <div className="sub">{r.category}{r.buyDate ? ` · ${t('bought', { d: fmtDate(r.buyDate) })}` : ''}</div>
                </div>
                <div className="right">
                  <div className="name">{eur(r.value)}</div>
                  {pl != null && r.cost > 0 && <div className={pl >= 0 ? 'up' : 'down'}>{eur(pl)} {pct((pl / r.cost) * 100)}</div>}
                </div>
              </div>
              <div className="row between sub">
                <span>{r.qty} × {eur(r.unit)} {r.buyPrice ? `(${t('buyShort', { v: eur(r.buyPrice) })})` : ''}</span>
                <span className="row gap">
                  <a href={cardmarketUrl(urlNameOf(r.game), r.name)} target="_blank" rel="noreferrer">Cardmarket</a>
                  <button className="link" onClick={() => setOpenChart(openChart === r.id ? null : r.id)}>{t('showHistory')}</button>
                  <button className="link" onClick={() => setEditing(editing === r.id ? null : r.id)}>{t('edit')}</button>
                </span>
              </div>
              {openChart === r.id && <ProductHistory t={t} game={r.game} id={r.productId} range={chartRange} setRange={setChartRange} buyPrice={r.buyPrice} />}
              {editing === r.id && (
                <EditHolding t={t} holding={r} update={update} folders={folders} onClose={() => setEditing(null)}>
                  <PhotoButtons t={t} pkey={pkey} photos={photos} savePhoto={savePhoto} removePhoto={removePhoto} />
                </EditHolding>
              )}
            </li>
          );
        })}
      </ul>
      {!catalogs && <p className="sub center">{t('loadingPrices')}</p>}
    </>
  );
}

function FolderSelect({ t, folders, value, onChange }) {
  if (!folders.length) return null;
  return (
    <label>{t('folder')}
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">{t('noFolder')}</option>
        {folders.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
      </select>
    </label>
  );
}

function EditHolding({ t, holding, update, folders, onClose, children }) {
  const [qty, setQty] = useState(holding.qty);
  const [buy, setBuy] = useState(holding.buyPrice ?? '');
  const [date, setDate] = useState(holding.buyDate || '');
  const [folderId, setFolderId] = useState(holding.folderId || null);
  const saveIt = () => {
    update((s) => ({ ...s, holdings: s.holdings.map((h) => h.id === holding.id ? { ...h, qty: Math.max(1, Number(qty) || 1), buyPrice: buy === '' ? null : Number(String(buy).replace(',', '.')), buyDate: date || null, folderId } : h) }));
    onClose();
  };
  const remove = () => update((s) => ({ ...s, holdings: s.holdings.filter((h) => h.id !== holding.id) }));
  return (
    <div className="edit">
      <label>{t('quantity')}<input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
      <label>{t('buyPriceUnit')}<input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} /></label>
      <label>{t('buyDate')}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <FolderSelect t={t} folders={folders} value={folderId} onChange={setFolderId} />
      {children}
      <div className="row gap">
        <button className="primary" onClick={saveIt}>{t('save')}</button>
        <button className="danger" onClick={remove}>{t('remove')}</button>
      </div>
    </div>
  );
}

const MIN_PRICES = [0, 10, 25, 50, 100, 250];

function Market({ t, rows, catalog, photos, game, games, setGame, nm, urlNameOf, chartRange, setChartRange }) {
  const [open, setOpen] = useState(null);
  const [scope, setScope] = useState(rows.length ? 'mine' : 'all');
  const [min, setMin] = useState(25);
  const [q, setQ] = useState('');
  const [sortKey, setSortKey] = useState('c30');
  const [dir, setDir] = useState(-1);

  const data = useMemo(() => {
    if (!catalog) return [];
    let list;
    if (scope === 'mine') {
      const byProduct = new Map();
      for (const r of rows) {
        if (!r.product) continue;
        const k = `${r.game}-${r.productId}`;
        const e = byProduct.get(k) || { p: r.product, cost: 0, costQty: 0 };
        if (r.buyPrice) { e.cost += r.buyPrice * r.qty; e.costQty += r.qty; }
        byProduct.set(k, e);
      }
      list = [...byProduct.values()].map(({ p, cost, costQty }) => ({ p, buy: costQty ? cost / costQty : null }));
    } else {
      list = catalog.list.filter((p) => p.prices.trend >= min && p.prices.avg30).map((p) => ({ p, buy: null }));
    }
    const terms = q.toLowerCase().split(/\s+/).filter(Boolean);
    if (terms.length) list = list.filter(({ p }) => terms.every((w) => p.search.includes(w)));
    const out = list.map(({ p, buy }) => {
      const now = p.prices.trend;
      return { p, now, c7: change(now, p.prices.avg7), c30: change(now, p.prices.avg30), cb: change(now, buy) };
    });
    out.sort((a, b) => {
      if (sortKey === 'name') return dir * nm(a.p).localeCompare(nm(b.p));
      const av = a[sortKey], bv = b[sortKey];
      if (av == null || bv == null) return (av == null) - (bv == null); // leere Werte ans Ende
      return dir * (av - bv);
    });
    return out.slice(0, 150);
  }, [catalog, rows, scope, min, q, sortKey, dir, nm]);

  const head = (key, label) => (
    <th className={key === 'name' ? '' : 'num'}>
      <button className={`th ${sortKey === key ? 'on' : ''}`} onClick={() => { if (sortKey === key) setDir(-dir); else { setSortKey(key); setDir(-1); } }}>
        {label}{sortKey === key ? (dir < 0 ? ' ↓' : ' ↑') : ''}
      </button>
    </th>
  );
  const cell = (v) => <td className={`num ${v == null ? '' : v >= 0 ? 'up' : 'down'}`}>{v == null ? '–' : pct(v)}</td>;

  return (
    <div className="stack">
      <div>
        <h2>{t('marketTitle')}</h2>
        <p className="sub">{t('marketHint')}</p>
      </div>
      <div className="seg">
        <button className={scope === 'mine' ? 'on' : ''} onClick={() => setScope('mine')}>{t('onlyMine')}</button>
        <button className={scope === 'all' ? 'on' : ''} onClick={() => setScope('all')}>{t('allSealed')}</button>
      </div>
      {scope === 'all' && <GamePicker games={games} game={game} setGame={setGame} />}
      <div className="row gap">
        <input type="search" placeholder={t('filter')} value={q} onChange={(e) => setQ(e.target.value)} />
        {scope === 'all' && (
          <select value={min} onChange={(e) => setMin(Number(e.target.value))} className="auto">
            {MIN_PRICES.map((m) => <option key={m} value={m}>{t('minPrice', { v: eur(m) })}</option>)}
          </select>
        )}
      </div>
      <div className="row gap wrap">
        <button className={`chip ${sortKey === 'c30' && dir < 0 ? 'on' : ''}`} onClick={() => { setSortKey('c30'); setDir(-1); }}>{t('topRisers')}</button>
        <button className={`chip ${sortKey === 'c30' && dir > 0 ? 'on' : ''}`} onClick={() => { setSortKey('c30'); setDir(1); }}>{t('topFallers')}</button>
      </div>
      {!catalog ? <p className="sub">{t('loadingPrices')}</p> : !data.length ? <p className="sub">{t('noRows')}</p> : (
        <div className="table-wrap card">
          <table>
            <thead>
              <tr>
                {head('name', t('colProduct'))}
                {head('now', t('colPrice'))}
                {head('c7', t('col7'))}
                {head('c30', t('col30'))}
                {scope === 'mine' && head('cb', t('colSinceBuy'))}
              </tr>
            </thead>
            <tbody>
              {data.map((r) => {
                const key = `${r.p.game}-${r.p.id}`;
                return [
                  <tr key={key} className={`clickable ${open === key ? 'open' : ''}`} onClick={() => setOpen(open === key ? null : key)}>
                    <td>
                      <span className="prod">
                        <Thumb src={photos[photoKey(r.p.game, r.p.id)] || r.p.image} name={nm(r.p)} category={r.p.category} size={36} />
                        <span><span className="pname">{nm(r.p)}</span><span className="sub">{r.p.category}</span></span>
                      </span>
                    </td>
                    <td className="num">{eur(r.now)}</td>
                    {cell(r.c7)}
                    {cell(r.c30)}
                    {scope === 'mine' && cell(r.cb)}
                  </tr>,
                  open === key && (
                    <tr key={`${key}-chart`} className="chart-row">
                      <td colSpan={scope === 'mine' ? 5 : 4}>
                        <ProductHistory t={t} game={r.p.game} id={r.p.id} range={chartRange} setRange={setChartRange} />
                        <a href={cardmarketUrl(urlNameOf(r.p.game), r.p.name)} target="_blank" rel="noreferrer">Cardmarket ↗</a>
                      </td>
                    </tr>
                  ),
                ];
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function AddProduct({ t, catalog, catalogs, state, update, field, onDone, startScan, photos, savePhoto, removePhoto, games, game, setGame, nm, folders, folder }) {
  const [scanning, setScanning] = useState(startScan);
  const [ean, setEan] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState(1);
  const [buy, setBuy] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const [folderId, setFolderId] = useState(folder !== 'all' ? folder : null);

  const results = useMemo(() => (catalog ? search(catalog.list, q) : []), [catalog, q]);

  const onScan = useCallback((code) => {
    setScanning(false);
    setEan(code);
    const known = state.barcodes[code];
    const p = known && catalogs?.[known.game]?.byId.get(known.productId);
    if (p) {
      setPicked(p);
      setNote('');
    } else {
      setPicked(null);
      setNote(t('unknownBarcode'));
    }
  }, [state.barcodes, catalogs, t]);

  const add = () => {
    const price = buy === '' ? null : Number(String(buy).replace(',', '.'));
    update((s) => ({
      ...s,
      holdings: [...s.holdings, { id: uid(), game: picked.game, productId: picked.id, name: picked.name, category: picked.category, qty: Math.max(1, Number(qty) || 1), buyPrice: Number.isFinite(price) ? price : null, buyDate: date || null, folderId }],
      barcodes: ean ? { ...s.barcodes, [ean]: { game: picked.game, productId: picked.id } } : s.barcodes,
    }));
    onDone();
  };

  if (scanning) return <Scanner t={t} onResult={onScan} onClose={() => setScanning(false)} />;

  const pkey = picked && photoKey(picked.game, picked.id);
  return (
    <div className="stack">
      <button className="primary big-btn" onClick={() => setScanning(true)}>{t('scanBarcode')}</button>
      {ean && <div className="sub">{t('scanned', { c: ean })}</div>}
      {note && <div className="banner">{note}</div>}

      {!picked && (
        <>
          <GamePicker games={games} game={game} setGame={setGame} />
          <input type="search" placeholder={t('searchPlaceholder')} value={q} onChange={(e) => setQ(e.target.value)} />
          {!catalog && <p className="sub">{t('loadingCatalog')}</p>}
          <ul className="list">
            {results.map((p) => (
              <li key={p.id}>
                <button className="result" onClick={() => setPicked(p)}>
                  <Thumb src={photos[photoKey(p.game, p.id)] || p.image} name={nm(p)} category={p.category} size={44} />
                  <span className="grow"><span className="name">{nm(p)}</span><span className="sub">{p.category}</span></span>
                  <span>{eur(priceOf(p, field))}</span>
                </button>
              </li>
            ))}
          </ul>
          {q && catalog && !results.length && <p className="sub">{t('nothingFound')}</p>}
        </>
      )}

      {picked && (
        <div className="card stack">
          <div className="row">
            <Thumb src={photos[pkey] || picked.image} name={nm(picked)} category={picked.category} size={72} />
            <div className="grow">
              <div className="name">{nm(picked)}</div>
              <div className="sub">{picked.category} · {t('currently', { v: eur(priceOf(picked, field)) })}</div>
            </div>
          </div>
          <PhotoButtons t={t} pkey={pkey} photos={photos} savePhoto={savePhoto} removePhoto={removePhoto} />
          <label>{t('quantity')}<input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <label>{t('buyPriceOptional')}<input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} /></label>
          <label>{t('buyDate')}<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          <FolderSelect t={t} folders={folders} value={folderId} onChange={setFolderId} />
          {ean && <div className="sub">{t('barcodeAssign', { c: ean })}</div>}
          <div className="row gap wrap">
            <button className="primary" onClick={add}>{t('addToPortfolio')}</button>
            <button className="ghost" onClick={() => setPicked(null)}>{t('otherProduct')}</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings({ t, state, update, index, lang, photos, setPhotos }) {
  const [msg, setMsg] = useState('');
  const set = (patch) => update((s) => ({ ...s, settings: { ...s.settings, ...patch } }));
  const exportFile = () => {
    const blob = new Blob([JSON.stringify({ ...state, photos }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `sealed-portfolio-${today()}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
  };
  const importFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const raw = JSON.parse(await file.text());
      const next = validateImport(raw);
      const { photos: imported = {} } = raw;
      delete next.photos;
      update(() => next);
      for (const [k, v] of Object.entries(imported)) { try { await setPhoto(k, v); } catch { /* egal */ } }
      setPhotos((p) => ({ ...p, ...imported }));
      setMsg(t('imported', { n: next.holdings.length }));
    } catch (err) {
      setMsg(t('invalidFile'));
    }
    e.target.value = '';
  };
  const s = state.settings;
  return (
    <div className="stack">
      <div className="card stack">
        <div className="name">{t('appearance')}</div>
        <div>
          <div className="label">{t('theme')}</div>
          <div className="seg">
            {[['auto', 'themeAuto'], ['light', 'themeLight'], ['dark', 'themeDark']].map(([k, l]) => (
              <button key={k} className={s.theme === k ? 'on' : ''} onClick={() => set({ theme: k })}>{t(l)}</button>
            ))}
          </div>
        </div>
        <div>
          <div className="label">{t('accent')}</div>
          <div className="swatches">
            {Object.entries(ACCENTS).map(([k, a]) => (
              <button key={k} className={`swatch ${s.accent === k ? 'on' : ''}`} style={{ '--sw-l': a.light, '--sw-d': a.dark }} onClick={() => set({ accent: k })} aria-label={a.name} title={a.name} />
            ))}
          </div>
        </div>
        <div>
          <div className="label">{t('background')}</div>
          <div className="seg">
            {[['glow', 'bgGlow'], ['cards', 'bgCards'], ['plain', 'bgPlain']].map(([k, l]) => (
              <button key={k} className={s.bg === k ? 'on' : ''} onClick={() => set({ bg: k })}>{t(l)}</button>
            ))}
          </div>
        </div>
      </div>

      <label>{t('language')}
        <select value={lang} onChange={(e) => set({ lang: e.target.value })}>
          {Object.entries(LANGS).map(([k, l]) => <option key={k} value={k}>{l.name}</option>)}
        </select>
      </label>
      <label>{t('priceForValue')}
        <select value={s.priceField} onChange={(e) => set({ priceField: e.target.value })}>
          {Object.entries(PRICE_FIELDS).map(([k, v]) => <option key={k} value={k}>{t(v)}</option>)}
        </select>
      </label>
      <div className="card stack">
        <div className="name">{t('transferTitle')}</div>
        <p className="sub">{t('transferText')}</p>
        <div className="row gap wrap">
          <button onClick={exportFile}>{t('export')}</button>
          <label className="button">{t('import')}<input type="file" accept="application/json,.json" onChange={importFile} hidden /></label>
        </div>
        {msg && <div className="sub">{msg}</div>}
      </div>
      <div className="card stack">
        <div className="name">{t('savedBarcodes', { n: Object.keys(state.barcodes).length })}</div>
        <button className="danger" onClick={() => update((st) => ({ ...st, barcodes: {} }))}>{t('clearBarcodes')}</button>
      </div>
      <p className="sub">{t('footer')}</p>
    </div>
  );
}
