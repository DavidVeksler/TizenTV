// CoinGecko market data. One request per refresh keeps the demo plan (10k calls/month) in budget:
// 5-minute refresh is ~8.6k calls/month.
declare const __CG_KEY__: string;

export const REFRESH_MS = 5 * 60_000;
const RETRY_MS = 60_000;
const CACHE_KEY = 'dash.market.v1';
const COUNT = 100;

export interface Coin {
  id: string;
  symbol: string;
  name: string;
  image: string;
  rank: number;
  price: number;
  marketCap: number;
  volume: number;
  ath: number;
  athChange: number;
  pct: { h1: number; h24: number; d7: number; d30: number };
  spark: number[];
}

export interface Snapshot {
  at: number;
  coins: Coin[];
}

function num(v: unknown): number {
  return typeof v === 'number' && isFinite(v) ? v : 0;
}

function parse(rows: any[]): Coin[] {
  return rows
    .filter((r) => num(r.market_cap) > 0)
    .map((r) => ({
      id: r.id,
      symbol: String(r.symbol).toUpperCase(),
      name: r.name,
      image: r.image,
      rank: num(r.market_cap_rank),
      price: num(r.current_price),
      marketCap: num(r.market_cap),
      volume: num(r.total_volume),
      ath: num(r.ath),
      athChange: num(r.ath_change_percentage),
      pct: {
        h1: num(r.price_change_percentage_1h_in_currency),
        h24: num(r.price_change_percentage_24h_in_currency ?? r.price_change_percentage_24h),
        d7: num(r.price_change_percentage_7d_in_currency),
        d30: num(r.price_change_percentage_30d_in_currency),
      },
      spark: Array.isArray(r.sparkline_in_7d?.price) ? r.sparkline_in_7d.price.filter((_: number, i: number) => i % 4 === 0) : [],
    }));
}

export function loadCache(): Snapshot | null {
  try {
    const s = JSON.parse(localStorage.getItem(CACHE_KEY) ?? 'null');
    return s && Array.isArray(s.coins) ? s : null;
  } catch {
    return null;
  }
}

async function fetchSnapshot(): Promise<Snapshot> {
  const ctl = new AbortController();
  const timer = window.setTimeout(() => ctl.abort(), 20_000);
  try {
    const url =
      'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc' +
      `&per_page=${COUNT}&page=1&sparkline=true&price_change_percentage=1h,24h,7d,30d` +
      (__CG_KEY__ ? `&x_cg_demo_api_key=${__CG_KEY__}` : '');
    const res = await fetch(url, { signal: ctl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const snap = { at: Date.now(), coins: parse(await res.json()) };
    if (snap.coins.length < 10) throw new Error('short response');
    return snap;
  } finally {
    window.clearTimeout(timer);
  }
}

// Calls onData on every successful refresh and onError on failures; returns a stop function.
export function startMarket(onData: (s: Snapshot) => void, onError: (e: string) => void): () => void {
  let timer: number;
  let stopped = false;
  const run = async () => {
    let next = REFRESH_MS;
    try {
      const snap = await fetchSnapshot();
      try {
        localStorage.setItem(CACHE_KEY, JSON.stringify(snap));
      } catch {
        // cache is best-effort
      }
      if (!stopped) onData(snap);
    } catch (e) {
      next = RETRY_MS;
      if (!stopped) onError(String((e as Error).message ?? e));
    }
    if (!stopped) timer = window.setTimeout(run, next);
  };
  run();
  return () => {
    stopped = true;
    window.clearTimeout(timer);
  };
}

export function fmtUsd(v: number): string {
  if (v >= 1000) return Math.round(v).toLocaleString('en-US');
  if (v >= 1) return v.toFixed(2);
  if (v >= 0.01) return v.toFixed(4);
  return v.toPrecision(3);
}

export function fmtBig(v: number): string {
  if (v >= 1e12) return `${(v / 1e12).toFixed(2)}T`;
  if (v >= 1e9) return `${(v / 1e9).toFixed(1)}B`;
  if (v >= 1e6) return `${(v / 1e6).toFixed(0)}M`;
  return Math.round(v).toLocaleString('en-US');
}

export function fmtPct(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(Math.abs(v) >= 10 ? 1 : 2)}%`;
}
