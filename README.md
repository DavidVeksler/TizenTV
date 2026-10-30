# TizenTV: Frame dashboard POC

Minimal React + TypeScript dashboard (clock, date, three placeholder tiles, detail views, 60 s idle return) packaged as a Tizen web app for a Samsung The Frame 43" (QN43LS03DAFXZA, 2024).

- Build, sign, install, update: [docs/RUNBOOK.md](docs/RUNBOOK.md)
- Persistence and stability tests (to be filled in on the physical TV): [docs/TEST-RESULTS.md](docs/TEST-RESULTS.md)
- Recommendation: [docs/RECOMMENDATION.md](docs/RECOMMENDATION.md)

Quick start (desktop preview): `npm ci && npm run build`, then open `build/www/index.html` in Chrome. Arrows/Enter/Escape work as the remote; `d` toggles the diagnostics overlay (Red key on the remote).

**Status:** app built and desktop-verified. Nothing has been signed, installed or tested on the TV yet; see the test results doc.
