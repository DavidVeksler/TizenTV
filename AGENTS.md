# TizenTV

POC: persistent full-screen React+TS crypto heatmap (Coin360-style treemap of the top 100 coins from CoinGecko) on a Samsung Frame (QN43LS03DAFXZA, 2024, Tizen 9.0 per sdb capability).

| Task | Doc |
|---|---|
| Build, sign, install, update on the TV | docs/RUNBOOK.md |
| Run and record the persistence tests | docs/TEST-RESULTS.md |
| Go / no-go recommendation | docs/RECOMMENDATION.md |

Layout: `src/` app (esbuild IIFE bundle, no framework tooling), `public/` config.xml + index.html + icon, `scripts/` build and deploy twins (bash + PowerShell).

Data: CoinGecko `/coins/markets`, one call per 5 min (demo plan budget). The demo key comes from `COINGECKO_API_KEY` or the gitignored `.env.local` (copied from `Crypto-Portfolio-Tracker`'s appsettings) and is baked into the local build by `scripts/build.mjs`. Remote: arrows select, OK details, Green (desktop `t`) timeframe, Yellow (`s`) size metric, Red (`d`) diagnostics.

Rules: no new runtime deps; do not deploy to the TV without the user's go-ahead; never commit certificates (`*.p12`) or passwords.

Gates: `.githooks/pre-push` (enable with `git config core.hooksPath .githooks`) and `.github/workflows/ci.yml` both run typecheck + build.
