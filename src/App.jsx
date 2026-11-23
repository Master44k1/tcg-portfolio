import { useCallback, useEffect, useMemo, useState } from 'react';
import Scanner from './Scanner.jsx';
import { load, save, uid, today, validateImport } from './store.js';
import { loadIndex, loadGame, priceOf, search, cardmarketUrl, eur, pct, PRICE_FIELDS } from './data.js';

export default function App() {
  const [state, setState] = useState(load);
  const [tab, setTab] = useState('portfolio');
  const [catalog, setCatalog] = useState(null);
  const [index, setIndex] = useState(null);
  const [loadError, setLoadError] = useState('');

  const update = useCallback((fn) => setState((s) => {
    const next = fn(s);
    save(next);
    return next;
  }), []);

  const game = state.settings.game;
  const field = state.settings.priceField;

  useEffect(() => {
    let alive = true;
    let stamp = null;
    setCatalog(null);
    Promise.all([loadIndex(), loadGame(game)])
      .then(([idx, cat]) => { if (alive) { stamp = idx.updatedAt; setIndex(idx); setCatalog(cat); setLoadError(''); } })
      .catch((e) => alive && setLoadError(e.message));

    // Neue Tagespreise automatisch nachladen: beim Zurückkehren in die App und alle 30 Minuten
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const idx = await loadIndex();
        if (!alive || idx.updatedAt === stamp) return;
        const cat = await loadGame(game);
        if (!alive) return;
        stamp = idx.updatedAt;
        setIndex(idx);
        setCatalog(cat);
        setLoadError('');
      } catch {
        /* offline: alte Preise behalten */
      }
    };
    document.addEventListener('visibilitychange', refresh);
    const timer = setInterval(refresh, 30 * 60 * 1000);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', refresh);
      clearInterval(timer);
    };
  }, [game]);

  const rows = useMemo(() => state.holdings.map((h) => {
    const product = catalog?.byId.get(h.productId);
    const unit = h.game === game ? priceOf(product, field) : null;
    const value = unit == null ? null : unit * h.qty;
    const cost = (h.buyPrice || 0) * h.qty;
    return { ...h, unit, value, cost };
  }), [state.holdings, catalog, field, game]);

  const totals = useMemo(() => {
    const value = rows.reduce((a, r) => a + (r.value ?? 0), 0);
    const cost = rows.reduce((a, r) => a + r.cost, 0);
    const items = rows.reduce((a, r) => a + r.qty, 0);
    return { value, cost, items, pl: value - cost, plPct: cost ? ((value - cost) / cost) * 100 : null };
  }, [rows]);

  // Tageswert für den Verlauf speichern (ein Eintrag pro Tag)
  useEffect(() => {
    if (!catalog || !state.holdings.length) return;
    const d = today();
    const v = Math.round(totals.value * 100) / 100;
    const c = Math.round(totals.cost * 100) / 100;
    const last = state.history[state.history.length - 1];
    if (last && last.date === d && last.value === v && last.cost === c) return;
    update((s) => ({ ...s, history: [...s.history.filter((x) => x.date !== d), { date: d, value: v, cost: c }].slice(-730) }));
  }, [catalog, totals.value, totals.cost, state.holdings.length, state.history, update]);

  const gameInfo = index?.games.find((g) => g.game === game);

  return (
    <div className="app">
      <header className="top">
        <div>
          <div className="label">Portfoliowert</div>
          <div className="big">{eur(totals.value)}</div>
          <div className={!totals.cost ? 'sub' : totals.pl >= 0 ? 'up' : 'down'}>
            {totals.cost ? `${eur(totals.pl)} ${pct(totals.plPct)}` : 'Noch keine Kaufpreise'}
          </div>
        </div>
        <div className="meta">
          <div>{totals.items} Produkte</div>
          <div>Einstand {eur(totals.cost)}</div>
          {gameInfo && <div>Preise vom {new Date(gameInfo.createdAt).toLocaleDateString('de-DE')}</div>}
        </div>
      </header>
      {gameInfo?.sample && <div className="banner">Beispieldaten: echte Cardmarket-Preise kommen nach dem ersten täglichen Abruf.</div>}
      {loadError && <div className="banner bad">Preisdaten konnten nicht geladen werden ({loadError}).</div>}

      <main>
        {tab === 'portfolio' && <Portfolio rows={rows} history={state.history} update={update} catalog={catalog} field={field} onAdd={() => setTab('add')} />}
        {tab === 'add' && <AddProduct catalog={catalog} state={state} update={update} field={field} onDone={() => setTab('portfolio')} />}
        {tab === 'settings' && <Settings state={state} update={update} index={index} />}
      </main>

      <nav className="tabs">
        <button className={tab === 'portfolio' ? 'on' : ''} onClick={() => setTab('portfolio')}>Portfolio</button>
        <button className={tab === 'add' ? 'on' : ''} onClick={() => setTab('add')}>Hinzufügen</button>
        <button className={tab === 'settings' ? 'on' : ''} onClick={() => setTab('settings')}>Einstellungen</button>
      </nav>
    </div>
  );
}

function Sparkline({ history }) {
  if (history.length < 2) return null;
  const w = 600, h = 90, pad = 4;
  const vals = history.flatMap((x) => [x.value, x.cost]);
  const min = Math.min(...vals), max = Math.max(...vals);
  const span = max - min || 1;
  const pt = (v, i) => `${pad + (i / (history.length - 1)) * (w - 2 * pad)},${h - pad - ((v - min) / span) * (h - 2 * pad)}`;
  const line = (k) => history.map((x, i) => pt(x[k], i)).join(' ');
  return (
    <div className="card chart">
      <div className="label">Verlauf seit {new Date(history[0].date).toLocaleDateString('de-DE')}</div>
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" role="img" aria-label="Portfoliowert im Zeitverlauf">
        <polyline points={line('cost')} className="line-cost" />
        <polyline points={line('value')} className="line-value" />
      </svg>
      <div className="legend"><span className="k-value">Wert</span><span className="k-cost">Einstand</span></div>
    </div>
  );
}

function Portfolio({ rows, history, update, catalog, field, onAdd }) {
  const [editing, setEditing] = useState(null);
  const [sort, setSort] = useState('value');
  const sorted = useMemo(() => {
    const r = [...rows];
    if (sort === 'value') r.sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
    if (sort === 'pl') r.sort((a, b) => (b.value ?? 0) - b.cost - ((a.value ?? 0) - a.cost));
    if (sort === 'name') r.sort((a, b) => a.name.localeCompare(b.name));
    return r;
  }, [rows, sort]);

  if (!rows.length) {
    return (
      <div className="empty">
        <p>Dein Portfolio ist noch leer.</p>
        <button onClick={onAdd}>Erstes Produkt scannen oder suchen</button>
      </div>
    );
  }
  return (
    <>
      <Sparkline history={history} />
      <div className="row between">
        <span className="label">{PRICE_FIELDS[field]} · Cardmarket</span>
        <select value={sort} onChange={(e) => setSort(e.target.value)} aria-label="Sortierung">
          <option value="value">Nach Wert</option>
          <option value="pl">Nach Gewinn</option>
          <option value="name">Nach Name</option>
        </select>
      </div>
      <ul className="list">
        {sorted.map((r) => {
          const pl = r.value == null ? null : r.value - r.cost;
          return (
            <li key={r.id} className="card">
              <div className="row between top-align">
                <div className="grow">
                  <div className="name">{r.name}</div>
                  <div className="sub">{r.category}{r.buyDate ? ` · gekauft ${new Date(r.buyDate).toLocaleDateString('de-DE')}` : ''}</div>
                </div>
                <div className="right">
                  <div className="name">{eur(r.value)}</div>
                  {pl != null && r.cost > 0 && <div className={pl >= 0 ? 'up' : 'down'}>{eur(pl)} {pct((pl / r.cost) * 100)}</div>}
                </div>
              </div>
              <div className="row between sub">
                <span>{r.qty} × {eur(r.unit)} {r.buyPrice ? `(Kauf ${eur(r.buyPrice)})` : ''}</span>
                <span className="row gap">
                  <a href={cardmarketUrl(r.game, r.name)} target="_blank" rel="noreferrer">Cardmarket</a>
                  <button className="link" onClick={() => setEditing(editing === r.id ? null : r.id)}>Bearbeiten</button>
                </span>
              </div>
              {editing === r.id && <EditHolding holding={r} update={update} onClose={() => setEditing(null)} />}
            </li>
          );
        })}
      </ul>
      {!catalog && <p className="sub center">Lade Preise …</p>}
    </>
  );
}

function EditHolding({ holding, update, onClose }) {
  const [qty, setQty] = useState(holding.qty);
  const [buy, setBuy] = useState(holding.buyPrice ?? '');
  const [date, setDate] = useState(holding.buyDate || '');
  const saveIt = () => {
    update((s) => ({ ...s, holdings: s.holdings.map((h) => h.id === holding.id ? { ...h, qty: Math.max(1, Number(qty) || 1), buyPrice: buy === '' ? null : Number(String(buy).replace(',', '.')), buyDate: date || null } : h) }));
    onClose();
  };
  const remove = () => {
    update((s) => ({ ...s, holdings: s.holdings.filter((h) => h.id !== holding.id) }));
  };
  return (
    <div className="edit">
      <label>Menge<input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
      <label>Kaufpreis/Stück €<input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} /></label>
      <label>Kaufdatum<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
      <div className="row gap">
        <button onClick={saveIt}>Speichern</button>
        <button className="danger" onClick={remove}>Entfernen</button>
      </div>
    </div>
  );
}

function AddProduct({ catalog, state, update, field, onDone }) {
  const [scanning, setScanning] = useState(false);
  const [ean, setEan] = useState('');
  const [q, setQ] = useState('');
  const [picked, setPicked] = useState(null);
  const [qty, setQty] = useState(1);
  const [buy, setBuy] = useState('');
  const [date, setDate] = useState(today());
  const [note, setNote] = useState('');
  const game = state.settings.game;

  const results = useMemo(() => (catalog ? search(catalog.list, q) : []), [catalog, q]);

  const onScan = useCallback((code) => {
    setScanning(false);
    setEan(code);
    const known = state.barcodes[code];
    if (known && catalog?.byId.has(known.productId)) {
      setPicked(catalog.byId.get(known.productId));
      setNote('');
    } else {
      setPicked(null);
      setNote('Barcode noch unbekannt. Such das Produkt einmal heraus, danach erkennt die App ihn automatisch.');
    }
  }, [state.barcodes, catalog]);

  const add = () => {
    const price = buy === '' ? null : Number(String(buy).replace(',', '.'));
    update((s) => ({
      ...s,
      holdings: [...s.holdings, { id: uid(), game, productId: picked.id, name: picked.name, category: picked.category, qty: Math.max(1, Number(qty) || 1), buyPrice: Number.isFinite(price) ? price : null, buyDate: date || null }],
      barcodes: ean ? { ...s.barcodes, [ean]: { game, productId: picked.id } } : s.barcodes,
    }));
    onDone();
  };

  if (scanning) return <Scanner onResult={onScan} onClose={() => setScanning(false)} />;

  return (
    <div className="stack">
      <button className="primary big-btn" onClick={() => setScanning(true)}>Barcode scannen</button>
      {ean && <div className="sub">Gescannt: <b>{ean}</b></div>}
      {note && <div className="banner">{note}</div>}

      {!picked && (
        <>
          <input type="search" placeholder="Produkt suchen, z. B. „151 ETB“ oder „Surging Sparks Display“" value={q} onChange={(e) => setQ(e.target.value)} autoFocus={!ean} />
          {!catalog && <p className="sub">Lade Produktkatalog …</p>}
          <ul className="list">
            {results.map((p) => (
              <li key={p.id}>
                <button className="result" onClick={() => setPicked(p)}>
                  <span className="grow"><span className="name">{p.name}</span><span className="sub">{p.category}</span></span>
                  <span>{eur(priceOf(p, field))}</span>
                </button>
              </li>
            ))}
          </ul>
          {q && catalog && !results.length && <p className="sub">Nichts gefunden. Versuch weniger oder englische Begriffe (Cardmarket nutzt englische Namen).</p>}
        </>
      )}

      {picked && (
        <div className="card stack">
          <div>
            <div className="name">{picked.name}</div>
            <div className="sub">{picked.category} · aktuell {eur(priceOf(picked, field))}</div>
          </div>
          <label>Menge<input type="number" min="1" value={qty} onChange={(e) => setQty(e.target.value)} /></label>
          <label>Kaufpreis pro Stück (€, optional)<input inputMode="decimal" value={buy} onChange={(e) => setBuy(e.target.value)} /></label>
          <label>Kaufdatum<input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></label>
          {ean && <div className="sub">Barcode {ean} wird diesem Produkt zugeordnet.</div>}
          <div className="row gap">
            <button className="primary" onClick={add}>Zum Portfolio hinzufügen</button>
            <button className="ghost" onClick={() => setPicked(null)}>Anderes Produkt</button>
          </div>
        </div>
      )}
    </div>
  );
}

function Settings({ state, update, index }) {
  const [msg, setMsg] = useState('');
  const exportFile = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
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
      const next = validateImport(JSON.parse(await file.text()));
      update(() => next);
      setMsg(`${next.holdings.length} Positionen importiert.`);
    } catch (err) {
      setMsg(err.message);
    }
    e.target.value = '';
  };
  return (
    <div className="stack">
      <label>Preis für die Bewertung
        <select value={state.settings.priceField} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, priceField: e.target.value } }))}>
          {Object.entries(PRICE_FIELDS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </label>
      {index && index.games.length > 1 && (
        <label>Spiel
          <select value={state.settings.game} onChange={(e) => update((s) => ({ ...s, settings: { ...s.settings, game: Number(e.target.value) } }))}>
            {index.games.map((g) => <option key={g.game} value={g.game}>{g.gameName}</option>)}
          </select>
        </label>
      )}
      <div className="card stack">
        <div className="name">Zwischen PC und Handy übertragen</div>
        <p className="sub">Das Portfolio liegt nur auf diesem Gerät. Exportiere es hier und importiere die Datei auf dem anderen Gerät.</p>
        <div className="row gap wrap">
          <button onClick={exportFile}>Exportieren</button>
          <label className="button">Importieren<input type="file" accept="application/json,.json" onChange={importFile} hidden /></label>
        </div>
        {msg && <div className="sub">{msg}</div>}
      </div>
      <div className="card stack">
        <div className="name">Gespeicherte Barcodes: {Object.keys(state.barcodes).length}</div>
        <button className="danger" onClick={() => update((s) => ({ ...s, barcodes: {} }))}>Barcode-Zuordnungen löschen</button>
      </div>
      <p className="sub">Preise: Cardmarket Preis-Guide, einmal täglich aktualisiert. Keine Verbindung zu Cardmarket-Konten.</p>
    </div>
  );
}
