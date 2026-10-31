// Bundles src/ into build/www, the folder `tizen package` signs into a .wgt.
// Single IIFE script (no ES modules) so it loads from file:// on older Tizen runtimes.
import { build, context } from 'esbuild';
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync } from 'node:fs';

const out = 'build/www';
const watch = process.argv.includes('--watch');

// CoinGecko demo key: COINGECKO_API_KEY env var, else the gitignored .env.local. Baked into the
// local build only; never committed. Without it the app falls back to the keyless public tier.
function coingeckoKey() {
  if (process.env.COINGECKO_API_KEY) return process.env.COINGECKO_API_KEY;
  if (!existsSync('.env.local')) return '';
  const m = readFileSync('.env.local', 'utf8').match(/^COINGECKO_API_KEY=(.*)$/m);
  return m ? m[1].trim() : '';
}

rmSync('build', { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync('public', out, { recursive: true });
cpSync('src/app.css', `${out}/app.css`);

const options = {
  entryPoints: ['src/main.tsx'],
  outfile: `${out}/app.js`,
  bundle: true,
  format: 'iife',
  target: 'chrome76', // Tizen 5.5 floor; the 2024 Frame (Tizen 8.0) is Chromium ~108
  jsx: 'automatic',
  minify: !watch,
  sourcemap: watch,
  define: {
    'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production'),
    __CG_KEY__: JSON.stringify(coingeckoKey()),
  },
  logLevel: 'info',
};

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}
