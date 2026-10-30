// Bundles src/ into build/www, the folder `tizen package` signs into a .wgt.
// Single IIFE script (no ES modules) so it loads from file:// on older Tizen runtimes.
import { build, context } from 'esbuild';
import { cpSync, mkdirSync, rmSync } from 'node:fs';

const out = 'build/www';
const watch = process.argv.includes('--watch');

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
  define: { 'process.env.NODE_ENV': JSON.stringify(watch ? 'development' : 'production') },
  logLevel: 'info',
};

if (watch) {
  await (await context(options)).watch();
} else {
  await build(options);
}
