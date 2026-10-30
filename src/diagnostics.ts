// Persistence/stability evidence, stored in localStorage and shown by the Red-key overlay.
// Launch gap = time since the previous heartbeat, i.e. how long the app was not running.
const STORE_KEY = 'dash.diag.v1';
const HEARTBEAT_MS = 30_000;
const STALL_MS = HEARTBEAT_MS * 2; // a heartbeat arriving this late means JS was suspended

declare const webapis: any;

export interface Diag {
  firstLaunch: number;
  launches: number;
  launchLog: { at: number; gapMs: number }[];
  lastHeartbeat: number;
  maxStallMs: number;
  stalls: number;
  heapMb: number | null;
  screenSaver: string;
  sessionStart: number;
}

function load(): Partial<Diag> {
  try {
    return JSON.parse(localStorage.getItem(STORE_KEY) ?? '{}');
  } catch {
    return {};
  }
}

function save(d: Diag): void {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(d));
  } catch {
    // Storage unavailable; diagnostics are best-effort.
  }
}

function heapMb(): number | null {
  const m = (performance as any).memory;
  return m ? Math.round(m.usedJSHeapSize / 1048576) : null;
}

// Experimental: ask the platform not to start the screen saver while we are foreground.
function disableScreenSaver(): string {
  try {
    webapis.appcommon.setScreenSaver(webapis.appcommon.AppCommonScreenSaverState.SCREEN_SAVER_OFF, {
      onsuccess: () => {},
      onerror: () => {},
    });
    return 'requested off';
  } catch (e) {
    return `unavailable (${(e as Error)?.message ?? e})`;
  }
}

export function startDiagnostics(onUpdate: (d: Diag) => void): () => void {
  const prev = load();
  const now = Date.now();
  const gapMs = prev.lastHeartbeat ? now - prev.lastHeartbeat : 0;

  const diag: Diag = {
    firstLaunch: prev.firstLaunch ?? now,
    launches: (prev.launches ?? 0) + 1,
    launchLog: [...(prev.launchLog ?? []), { at: now, gapMs }].slice(-20),
    lastHeartbeat: now,
    maxStallMs: prev.maxStallMs ?? 0,
    stalls: prev.stalls ?? 0,
    heapMb: heapMb(),
    screenSaver: disableScreenSaver(),
    sessionStart: now,
  };
  save(diag);
  onUpdate({ ...diag });

  let last = now;
  const id = window.setInterval(() => {
    const t = Date.now();
    const delta = t - last;
    last = t;
    if (delta > STALL_MS) {
      diag.stalls += 1;
      diag.maxStallMs = Math.max(diag.maxStallMs, delta);
    }
    diag.lastHeartbeat = t;
    diag.heapMb = heapMb();
    save(diag);
    onUpdate({ ...diag });
  }, HEARTBEAT_MS);

  return () => window.clearInterval(id);
}
