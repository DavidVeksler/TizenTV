import { useEffect, useRef, useState } from 'react';
import { Diag, startDiagnostics } from './diagnostics';
import { Key } from './keys';

const DETAIL_TIMEOUT_S = 60;

const TILES = [
  { id: 'weather', title: 'Weather', summary: '72°F', body: 'Placeholder: forecast, hourly, radar.' },
  { id: 'calendar', title: 'Calendar', summary: '3 events', body: 'Placeholder: today and tomorrow schedule.' },
  { id: 'tasks', title: 'Tasks', summary: '5 open', body: 'Placeholder: household task list.' },
];

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

export function App() {
  const [now, setNow] = useState(() => Date.now());
  const [focus, setFocus] = useState(0);
  const [detail, setDetail] = useState<number | null>(null);
  const [lastInput, setLastInput] = useState(() => Date.now());
  const [diag, setDiag] = useState<Diag | null>(null);
  const [showDiag, setShowDiag] = useState(false);

  // Mutable mirror so one stable keydown listener sees current state.
  const state = useRef({ focus, detail });
  state.current = { focus, detail };

  useEffect(() => startDiagnostics(setDiag), []);

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
      const { focus: f, detail: d } = state.current;
      setLastInput(Date.now());

      if (e.keyCode === Key.Red || e.keyCode === Key.RedDesktop) {
        setShowDiag((v) => !v);
        return;
      }
      if (d !== null) {
        if (e.keyCode === Key.Back || e.keyCode === Key.BackDesktop) {
          e.preventDefault();
          setDetail(null);
        }
        return;
      }
      switch (e.keyCode) {
        case Key.Left:
          setFocus(Math.max(0, f - 1));
          break;
        case Key.Right:
          setFocus(Math.min(TILES.length - 1, f + 1));
          break;
        case Key.Enter:
          setDetail(f);
          break;
        // Back on the dashboard is not intercepted: the platform exits to the TV home.
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  // Detail view idles back to the dashboard; `now` ticks drive the check.
  const idleS = Math.max(0, Math.floor((now - lastInput) / 1000));
  useEffect(() => {
    if (detail !== null && idleS >= DETAIL_TIMEOUT_S) setDetail(null);
  }, [detail, idleS]);

  const d = new Date(now);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  const date = d.toLocaleDateString([], { weekday: 'long', month: 'long', day: 'numeric' });

  if (detail !== null) {
    const t = TILES[detail];
    return (
      <main className="screen">
        <h1 className="detail-title">{t.title}</h1>
        <p className="detail-body">{t.body}</p>
        <p className="hint">Back to return · auto-return in {Math.max(0, DETAIL_TIMEOUT_S - idleS)}s</p>
        {showDiag && diag && <DiagOverlay d={diag} now={now} />}
      </main>
    );
  }

  return (
    <main className="screen">
      <header>
        <div className="clock">{time}</div>
        <div className="date">{date}</div>
      </header>
      <section className="tiles">
        {TILES.map((t, i) => (
          <div key={t.id} className={`tile${i === focus ? ' focused' : ''}`}>
            <div className="tile-title">{t.title}</div>
            <div className="tile-summary">{t.summary}</div>
          </div>
        ))}
      </section>
      {showDiag && diag && <DiagOverlay d={diag} now={now} />}
    </main>
  );
}
