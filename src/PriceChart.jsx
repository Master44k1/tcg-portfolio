import { useMemo, useRef, useState } from 'react';
import { eur, pct, fmtDate } from './data.js';
import { cutoff } from './history.js';

const W = 600, H = 160, PAD_T = 10, PAD_B = 22;

export function RangePicker({ t, range, setRange }) {
  return (
    <div className="seg small">
      {['1W', '1M', '1Y', 'ALL'].map((r) => (
        <button key={r} className={range === r ? 'on' : ''} onClick={() => setRange(r)}>{t(`r${r}`)}</button>
      ))}
    </div>
  );
}

// series: [{ date, value, cost? }] aufsteigend nach Datum
export default function PriceChart({ t, series, range, setRange, title, estUntil, compact }) {
  const [hover, setHover] = useState(null);
  const svg = useRef(null);
  const data = useMemo(() => {
    const from = cutoff(range);
    return series.filter((p) => p.value != null && p.date >= from);
  }, [series, range]);

  const body = (() => {
    if (data.length < 2) return <p className="sub chart-empty">{t('noHistory')}</p>;
    const vals = data.flatMap((p) => (p.cost != null ? [p.value, p.cost] : [p.value]));
    let min = Math.min(...vals), max = Math.max(...vals);
    if (max - min < max * 0.02) { min *= 0.99; max *= 1.01; }
    const span = max - min || 1;
    const x = (i) => (i / (data.length - 1)) * W;
    const y = (v) => PAD_T + (1 - (v - min) / span) * (H - PAD_T - PAD_B);
    const line = data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
    const area = `${line}L${W},${H - PAD_B}L0,${H - PAD_B}Z`;
    const costLine = data.some((p) => p.cost != null)
      ? data.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(p.cost ?? p.value).toFixed(1)}`).join('')
      : null;
    const first = data[0].value, last = data[data.length - 1].value;
    const ch = first ? ((last - first) / first) * 100 : null;
    const hp = hover != null ? data[hover] : null;
    const onMove = (e) => {
      const r = svg.current.getBoundingClientRect();
      const px = ((e.touches?.[0]?.clientX ?? e.clientX) - r.left) / r.width;
      setHover(Math.max(0, Math.min(data.length - 1, Math.round(px * (data.length - 1)))));
    };
    return (
      <>
        <div className="row between chart-head">
          <span>
            <span className="name">{eur(hp ? hp.value : last)}</span>{' '}
            <span className="sub">{fmtDate(hp ? hp.date : data[data.length - 1].date)}</span>
          </span>
          {ch != null && !hp && <span className={ch >= 0 ? 'up' : 'down'}>{pct(ch)}</span>}
        </div>
        <svg
          ref={svg}
          className="pchart"
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          role="img"
          aria-label={title}
          onMouseMove={onMove}
          onTouchStart={onMove}
          onTouchMove={onMove}
          onMouseLeave={() => setHover(null)}
          onTouchEnd={() => setHover(null)}
        >
          <path d={area} className={`area ${ch != null && ch < 0 ? 'neg' : ''}`} />
          {costLine && <path d={costLine} className="line-cost" />}
          <path d={line} className={`line-value ${ch != null && ch < 0 ? 'neg' : ''}`} />
          {hp && <line x1={x(hover)} x2={x(hover)} y1={PAD_T} y2={H - PAD_B} className="cursor" />}
        </svg>
        <div className="row between axis">
          <span>{fmtDate(data[0].date)}</span>
          <span>{eur(min)} – {eur(max)}</span>
          <span>{fmtDate(data[data.length - 1].date)}</span>
        </div>
        {estUntil && data[0].date < estUntil && <p className="sub note">{t('estNote', { d: fmtDate(estUntil) })}</p>}
      </>
    );
  })();

  return (
    <div className={compact ? 'chart-inline' : 'card chart'}>
      {!compact && <div className="label">{title}</div>}
      <RangePicker t={t} range={range} setRange={setRange} />
      {body}
    </div>
  );
}
