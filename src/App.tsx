import { useEffect, useMemo, useRef, useState } from 'react';
import { Diag, startDiagnostics } from './diagnostics';
import { Key } from './keys';
import { Coin, Snapshot, fmtBig, fmtPct, fmtUsd, loadCache, startMarket } from './market';
import { Dir, Placed, neighbour, squarify } from './treemap';

const DETAIL_TIMEOUT_S = 60;

// Layout is computed in rem; 1rem = 1/96 of the viewport width, so the screen is 96 x 54.
const MAP_X = 2;
const MAP_Y = 7.4;
const MAP_W = 92;
const MAP_H = 44.4;
const GAP = 0.1;

type TfKey = 'h1' | 'h24' | 'd7' | 'd30';
const TIMEFRAMES: { key: TfKey; label: string; full: number }[] = [
  { key: 'h1', label: '1H', full: 1.5 },
  { key: 'h24', label: '24H', full: 6 },
  { key: 'd7', label: '7D', full: 15 },
  { key: 'd30', label: '30D', full: 30 },
];
type SizeBy = 'marketCap' | 'volume';
const SIZE_LABEL: Record<SizeBy, string> = { marketCap: 'Market cap', volume: '24h volume' };

const SIZE_POWER = 0.6;

function isStable(c: Coin): boolean {
  return c.price > 0.97 && c.price < 1.03 && Math.abs(c.pct.d30) < 1.5 && Math.abs(c.pct.h24) < 0.5;
}

function mix(a: number[], b: number[], t: number): string {
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * t)).join(',')})`;
}

// Diverging scale: grey at 0, saturated green/red at +-full.
function tileColor(pct: number, full: number): string {
  const t = Math.min(1, Math.abs(pct) / full);
  return mix([52, 58, 70], pct >= 0 ? [18, 168, 84] : [214, 52, 56], Math.pow(t, 0.8));
}

function fmtDur(ms: number): string {
  const s = Math.round(ms / 1000);
  if (s < 120) return `${s}s`;
  if (s < 7200) return `${Math.round(s / 60)}m`;
  return `${(s / 3600).toFixed(1)}h`;
}

function DiagOverlay({ d, now }: { d: Diag; now: number }) {
  return (
    <div className="diag">
      <div>launches: {d.launches} (first {new Date(d.firstLaunch).toLocaleString()})</div>
      <div>this session up: {fmtDur(now - d.sessionStart)}</div>
      <div>stalls &gt;60s: {d.stalls} (max {fmtDur(d.maxStallMs)})</div>
      <div>js heap: {d.heapMb ?? 'n/a'} MB</div>
      <div>screensaver: {d.screenSaver}</div>
      <div>UA: {navigator.userAgent}</div>
      <div>recent launches (gap since previous heartbeat):</div>
      {d.launchLog.slice(-6).map((l) => (
        <div key={l.at}>&nbsp;&nbsp;{new Date(l.at).toLocaleString()} gap {l.gapMs ? fmtDur(l.gapMs) : '-'}</div>
      ))}
    </div>
  );
}

function Tile({ p, tf, full, focused }: { p: Placed<Coin>; tf: TfKey; full: number; focused: boolean }) {
  const c = p.item;
  const pct = c.pct[tf];
  const w = p.w - GAP * 2;
  const h = p.h - GAP * 2;
  const style = {
    left: `${MAP_X + p.x + GAP}rem`,
    top: `${MAP_Y + p.y + GAP}rem`,
    width: `${w}rem`,
    height: `${h}rem`,
    background: tileColor(pct, full),
  };
  const f = Math.max(0.5, Math.min((w * 0.86) / (c.symbol.length * 0.64), h * 0.34, 5.2));
  const showText = w > 1.2 && h > 0.9;
  const showPct = h > f * 1.9 && w > 2.6;
  const showPrice = h > f * 2.9 && w > 5;
  const showLogo = Math.min(w, h) > 5.5;
  return (
    <div className={`coin${focused ? ' focused' : ''}`} style={style}>
      {showText && (
        <div className="coin-text">
          {showLogo && <img className="coin-logo" src={c.image} alt="" style={{ width: `${f * 0.9}rem`, height: `${f * 0.9}rem` }} />}
          <div className="coin-sym" style={{ fontSize: `${f}rem` }}>{c.symbol}</div>
          {showPct && <div className="coin-sub" style={{ fontSize: `${Math.max(0.55, f * 0.5)}rem` }}>{fmtPct(pct)}</div>}
          {showPrice && <div className="coin-sub dim" style={{ fontSize: `${Math.max(0.55, f * 0.4)}rem` }}>${fmtUsd(c.price)}</div>}
        </div>
      )}
    </div>
  );
}

function Spark({ data, up }: { data: number[]; up: boolean }) {
  if (data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * 100},${100 - ((v - min) / (max - min || 1)) * 100}`).join(' ');
  return (
    <svg className="spark" viewBox="0 0 100 100" preserveAspectRatio="none">
      <polyline points={pts} fill="none" stroke={up ? '#2fd37a' : '#ff5d62'} strokeWidth="1.2" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}

function Detail({ c }: { c: Coin }) {
  const rows: [string, string, number | null][] = [
    ['1H', fmtPct(c.pct.h1), c.pct.h1],
    ['24H', fmtPct(c.pct.h24), c.pct.h24],
    ['7D', fmtPct(c.pct.d7), c.pct.d7],
    ['30D', fmtPct(c.pct.d30), c.pct.d30],
  ];
  return (
    <div className="detail">
      <div className="detail-head">
        <img src={c.image} alt="" className="detail-logo" />
        <div>
          <div className="detail-name">{c.name}{c.name.toUpperCase() !== c.symbol && <span className="dim"> {c.symbol}</span>}</div>
          <div className="dim">Rank #{c.rank}</div>
        </div>
        <div className="detail-price">${fmtUsd(c.price)}</div>
      </div>
      <Spark data={c.spark} up={c.pct.d7 >= 0} />
      <div className="detail-stats">
        {rows.map(([l, v, n]) => (
          <div key={l}>
            <div className="dim">{l}</div>
            <div className={(n ?? 0) >= 0 ? 'up' : 'down'}>{v}</div>
          </div>
        ))}
        <div><div className="dim">Market cap</div><div>${fmtBig(c.marketCap)}</div></div>
        <div><div className="dim">24h volume</div><div>${fmtBig(c.volume)}</div></div>
        <div><div className="dim">From ATH</div><div className="down">{fmtPct(c.athChange)}</div></div>
      </div>
    </div>
  );
}

export function App() {
  const [now, setNow] = useState(() => Date.now());
  const [snap, setSnap] = useState<Snapshot | null>(() => loadCache());
  const [err, setErr] = useState<string | null>(null);
  const [tfIdx, setTfIdx] = useState(1);
  const [sizeBy, setSizeBy] = useState<SizeBy>('marketCap');
  const [focusId, setFocusId] = useState<string | null>(null);
  const [detail, setDetail] = useState(false);
  const [lastInput, setLastInput] = useState(() => Date.now());
  const [diag, setDiag] = useState<Diag | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  const tf = TIMEFRAMES[tfIdx];

  const tiles = useMemo(() => {
    if (!snap) return [];
    // Stablecoins carry no signal and eat area; sizes are compressed (power 0.6) so mid-caps stay readable at TV distance.
    const items = snap.coins
      .filter((c) => !isStable(c))
      .map((c) => ({ item: c, value: Math.pow(c[sizeBy], SIZE_POWER) }))
      .filter((i) => i.value > 0)
      .sort((a, b) => b.value - a.value);
    return squarify(items, MAP_W, MAP_H);
  }, [snap, sizeBy]);

  // Mutable mirror so one stable keydown listener sees current state.
  const state = useRef({ tiles, focusId, detail });
  state.current = { tiles, focusId, detail };

  useEffect(() => startDiagnostics(setDiag), []);
  useEffect(
    () =>
      startMarket(
        (s) => {
          setSnap(s);
          setErr(null);
        },
        (e) => setErr(e),
      ),
    [],
  );

  // Clock: a 1s tick re-aligned to the wall clock each second so it never drifts or reloads.
  useEffect(() => {
    let id: number;
    const tick = () => {
      setNow(Date.now());
      id = window.setTimeout(tick, 1000 - (Date.now() % 1000) + 5);
    };
    tick();
    return () => window.clearTimeout(id);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const { tiles: ts, focusId: fid, detail: d } = state.current;
      setLastInput(Date.now());
      const k = e.keyCode;

      if (k === Key.Red || k === Key.RedDesktop) {
        setShowDiag((v) => !v);
        return;
      }
      if (k === Key.Green || k === Key.GreenDesktop) {
        setTfIdx((i) => (i + 1) % TIMEFRAMES.length);
        return;
      }
      if (k === Key.Yellow || k === Key.YellowDesktop) {
        setSizeBy((s) => (s === 'marketCap' ? 'volume' : 'marketCap'));
        return;
      }
      if (d) {
        if (k === Key.Back || k === Key.BackDesktop) {
          e.preventDefault();
          setDetail(false);
        }
        return;
      }
      const dirs: Record<number, Dir> = { [Key.Left]: 'left', [Key.Right]: 'right', [Key.Up]: 'up', [Key.Down]: 'down' };
      if (dirs[k] && ts.length) {
        e.preventDefault();
        const cur = ts.findIndex((t) => t.item.id === fid);
        const next = cur < 0 ? 0 : neighbour(ts, cur, dirs[k]);
        setFocusId(ts[next].item.id);
      } else if (k === Key.Enter && fid) {
        setDetail(true);
      } else if ((k === Key.Back || k === Key.BackDesktop) && fid) {
        // First Back clears focus; Back with nothing focused is left to the platform (exit to TV home).
        e.preventDefault();
        setFocusId(null);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Focus and detail view idle back to the plain map; `now` ticks drive the check.
  const idleS = Math.max(0, Math.floor((now - lastInput) / 1000));
  useEffect(() => {
    if (idleS >= DETAIL_TIMEOUT_S) {
      setDetail(false);
      setFocusId(null);
    }
  }, [idleS]);

  const d = new Date(now);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' });

  const totalCap = snap ? snap.coins.reduce((s, c) => s + c.marketCap, 0) : 0;
  const btc = snap?.coins.find((c) => c.id === 'bitcoin');
  const weighted = snap && totalCap ? snap.coins.reduce((s, c) => s + c.pct[tf.key] * c.marketCap, 0) / totalCap : 0;
  const focusCoin = snap?.coins.find((c) => c.id === focusId) ?? null;
  const ageMs = snap ? now - snap.at : 0;
  const stale = !!snap && ageMs > 12 * 60_000;

  return (
    <main className="screen">
      <header className="bar">
        <div className="bar-left">
          <div className="title">Crypto Market</div>
          <div className="tabs">
            {TIMEFRAMES.map((t, i) => (
              <span key={t.key} className={`tab${i === tfIdx ? ' on' : ''}`}>{t.label}</span>
            ))}
          </div>
        </div>
        {snap && (
          <div className="stats">
            <div><span className="dim">Top {snap.coins.length} cap</span> ${fmtBig(totalCap)}</div>
            <div><span className="dim">{tf.label}</span> <span className={weighted >= 0 ? 'up' : 'down'}>{fmtPct(weighted)}</span></div>
            {btc && <div><span className="dim">BTC dom.</span> {((btc.marketCap / totalCap) * 100).toFixed(1)}%</div>}
            <div><span className="dim">Size</span> {SIZE_LABEL[sizeBy]}</div>
          </div>
        )}
        <div className="bar-right">
          <div className="clock">{time}</div>
          <div className="date">{date}</div>
        </div>
      </header>

      {!snap && <div className="empty">{err ? `Can't reach CoinGecko (${err}). Retrying...` : 'Loading market data...'}</div>}
      {snap && tiles.map((p) => <Tile key={p.item.id} p={p} tf={tf.key} full={tf.full} focused={p.item.id === focusId} />)}

      <footer className="foot">
        <span className={stale || err ? 'warn' : 'dim'}>
          {snap ? `Updated ${fmtDur(ageMs)} ago${err ? ` · refresh failing (${err})` : ''}` : ''}
        </span>
        <span className="dim">
          {focusCoin && !detail ? `${focusCoin.name}  ${fmtPct(focusCoin.pct[tf.key])}  $${fmtUsd(focusCoin.price)}  ·  ` : ''}
          Arrows select · OK details · Green timeframe · Yellow size
        </span>
      </footer>

      {detail && focusCoin && <Detail c={focusCoin} />}
      {showDiag && diag && <DiagOverlay d={diag} now={now} />}
    </main>
  );
}
