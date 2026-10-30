# TizenTV

POC: persistent full-screen React+TS dashboard on a Samsung Frame (QN43LS03DAFXZA, 2024, Tizen 8.0).

| Task | Doc |
|---|---|
| Build, sign, install, update on the TV | docs/RUNBOOK.md |
| Run and record the persistence tests | docs/TEST-RESULTS.md |
| Go / no-go recommendation | docs/RECOMMENDATION.md |

Layout: `src/` app (esbuild IIFE bundle, no framework tooling), `public/` config.xml + index.html + icon, `scripts/` build and deploy twins (bash + PowerShell).

Rules: no new runtime deps; do not deploy to the TV without the user's go-ahead; never commit certificates (`*.p12`) or passwords.
