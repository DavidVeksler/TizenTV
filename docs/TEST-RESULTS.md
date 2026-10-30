# Test results (physical TV)

**Not yet run.** The app has been verified on a desktop browser only (layout at 1920x1080, key navigation, detail view, 60 s idle return, clock tick, no runtime errors). Every row below needs the real TV. Do not mark a row passed from documentation; record what you saw.

## Environment (fill in)

| Item | Value |
|---|---|
| TV firmware / Tizen version | Tizen 9.0 (`sdb capability`, sdbd 3.8.11_TV_REL), QN43LS03DAFXZA, IP 192.168.0.82 |
| Tizen Studio + TV extension versions | Tizen Studio 6.1 CLI, Tizen CLI 2.5.25, sdb 4.2.36; TV extension not installed (not needed to package/install) |
| Certificate profile + expiry date | `veksler` (Samsung, Public, DUID ZPCDAJCBFOHQU); expires 2027-10-30 |
| Install date/time | 2026-10-30 (installed with `scripts/deploy.ps1`; app seen full screen on the TV by David) |
| Developer Mode IP setting | sdb connects from this PC (192.168.0.44) |

## Persistence scenarios (run each independently, starting from a confirmed working install)

For each: do the action, then open Smart Hub > Apps (Downloaded/Developer apps), confirm the app is present, launch it, press Red and note **launches** and the **gap** for the newest launch line (gap = time since the app last ran).

| # | Scenario | How | Result (pass/fail) | Observed | Date |
|---|---|---|---|---|---|
| 1 | Disconnect dev computer | `sdb disconnect`, shut down / unplug laptop from LAN, wait 5 min, launch from TV | | | |
| 2 | Exit and reopen | Back on the dashboard, relaunch; also leave via Home and return | | | |
| 3 | TV off/on via remote | Hold power until off, power on | | | |
| 4 | TV off/on after 10 min | Off 10+ min via remote, power on | | | |
| 5 | Full reboot / cold power cycle | Unplug 60 s (or power button + wall), power on. Check whether Developer Mode is still On | | | |
| 6 | Autorun Last App | Settings > General > Smart Features > Autorun Last App ON; leave the app running, power off, power on. Record whether it launches. Repeat with Art Mode/Ambient behavior noted (Frame powers on into Art Mode by default) | | | |
| 7 | Streaming app then return | Open Netflix/YouTube, exit, relaunch dashboard from Apps | | | |

Additional checks worth recording: after an overnight idle; after a firmware update if one occurs (Developer Mode and sideloaded apps may be cleared); the day the certificate nears expiry.

## Stability (acceptance: >= 2 hours)

| Item | Value |
|---|---|
| Start / end time | |
| Stalls >60 s (overlay) | |
| Max stall | |
| JS heap at start / end | |
| Did the TV screen saver, dimming or auto power-off interrupt? (Settings > General > System Manager; Eco Solution; Auto Power Off) | |
| Clock still correct at end | |
| Screensaver API line in overlay (`requested off` vs `unavailable`) | |

## UI acceptance

| Check | Result |
|---|---|
| Fills screen, no browser chrome/cursor/dev overlay | |
| Readable from 8-12 ft (clock ~14rem, tile text >= 3.4rem; confirm at distance) | |
| Remote nav, detail view, Back, 60 s auto-return | |
| 4K panel renders sharply (layout is vw-based; Tizen reports 1920x1080 CSS px) | |
