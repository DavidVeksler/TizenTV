# Runbook: build, sign, install, update

Host: Windows (PowerShell) or Linux/macOS (bash). Free Samsung account required; no paid developer program.

## 1. One-time setup

1. **Tizen version.** TV: Settings > Support > About This TV, note the software version. The QN43LS03DAFXZA reported Tizen 9.0 (sdb capability, 2026-10-30), not the 8.0 first assumed; confirm, don't assume. After connecting (step 3), `sdb -s <ip>:26101 capability` prints `platform_version`.
2. **Tizen Studio** (current release) from developer.samsung.com/smarttv/develop/getting-started/setting-up-sdk. In Package Manager install *Tizen Studio > Main SDK + CLI* and, under *Extension SDK*, **TV Extensions** (matching or newest) and **Samsung Certificate Extension**. Needs Java 11+ (bundled in recent installers).
3. **PATH:** add `<TizenStudio>/tools/ide/bin` (`tizen`) and `<TizenStudio>/tools` (`sdb`).
4. **Node 18+**.

## 2. Enable Developer Mode on the TV

1. Smart Hub > Apps. With the remote, enter **1 2 3 4 5**.
2. Developer mode: **On**; Host PC IP: the IP of your computer on the same LAN/VLAN. OK, then **power-cycle the TV** (hold power until it turns off fully; on the Frame a short press only toggles Art Mode).
3. Re-open the Apps panel to confirm it shows "Developer mode".

## 3. Certificate (once per TV)

1. Tizen Studio > Device Manager (Tools > Device Manager) > Remote Device Manager > Scan / add TV by IP; connection must show **On**. The TV's **DUID** is read from this connection.
2. Tools > Certificate Manager > **+** > **Samsung** certificate > **TV** > create new author certificate (name + password) > sign in with the Samsung account > distributor certificate **Privilege: Public**, select the DUID of the TV. Name the profile (e.g. `FrameDash`).
3. Keep the `.p12` files outside the repo (they are gitignored). Record the certificate's expiry date in docs/TEST-RESULTS.md; expiry is a persistence risk to test.

## 4. Build, sign, install, launch

```
# bash
scripts/deploy.sh <tv-ip> <profile-name> [--yes]
# PowerShell
scripts\deploy.ps1 -TvIp <tv-ip> -Profile <profile-name> [-Force]
```

The script: preflight, `npm ci`, typecheck, esbuild bundle to `build/www`, confirm prompt, `tizen package -t wgt -s <profile>` (signed `.wgt` in `dist/`), `sdb connect`, `tizen install`, `tizen run -p FrameDash1.Dashboard`. Live verification is visual (the app must appear full screen with the clock); there is no public URL to curl.

Manual equivalent:
```
npm ci && npm run build
tizen package -t wgt -s <profile> -o <abs-path>/dist -- <abs-path>/build/www   # absolute paths: tizen.bat resolves relative ones against its own bin dir
mv "dist/Frame Dashboard.wgt" dist/FrameDash.wgt                                # `tizen install` fails on file names with spaces
sdb connect <tv-ip>
tizen install -n FrameDash.wgt -s <tv-ip>:26101 -- dist
tizen run -p FrameDash1.Dashboard -s <tv-ip>:26101
```

## 5. Update

Re-run the deploy script. Same app id and same certificate overwrites in place. If install fails with a signature/certificate mismatch: `tizen uninstall -p FrameDash1 -s <tv-ip>:26101`, then redeploy (this clears localStorage diagnostics; note it in the test log).

## 6. Remote controls

Left/Right move focus; Enter opens a tile; Back returns to the dashboard; Back on the dashboard exits to the TV (platform default, not intercepted); **Red** toggles the hidden diagnostics overlay (launch count, gap since the app last ran, JS stalls, heap).

## 7. Troubleshooting

- Windows tooling (learned 2026-10-30): the Tizen Studio web-cli installer asks for admin; run it with `__COMPAT_LAYER=RunAsInvoker` and `--accept-license <dir>` to install into the user profile. `package-manager-cli` then failed to update the *Web CLI* package (it rolls back and deletes `tools/ide`), so the CLI packages (`new-web-cli`, `new-common-cli`, `embedded-java`) and `certificate-manager-product` were unzipped by hand from `download.tizen.org/sdk/tizenstudio/official/binary` into the SDK folder (verify SHA256 against `pkg_list_windows-64`). The Samsung cert plugin (`cert-add-on` jar) was copied into `tools/certificate-manager/plugins` and appended to its `bundles.info`. Package manager itself needs JDK 8 on PATH; `tizen` uses the bundled `jdk`.
- Find the TV: scan the LAN for TCP 26101 (sdb); `sdb -s <ip>:26101 shell 0 getduid` prints the DUID.
- `tizen install` prints only "Failed to install Tizen application." when the `.wgt` name contains a space; use `FrameDash.wgt` (the deploy scripts do). `sdb push` + `sdb shell 0 vd_appinstall FrameDash1 <path>` prints real progress/errors.

- `sdb connect` fails: Developer Mode off, Host PC IP wrong (TV only accepts the IP configured in step 2), different VLAN, or TV rebooted into a state where Developer Mode was reset. Re-enter 12345.
- Install error about certificate/DUID: distributor certificate was created for a different DUID; recreate it with the TV connected.
- Install error naming a privilege: `public/config.xml` declares `http://developer.samsung.com/privilege/screensaver` for the experimental screen-saver request. This privilege name is unverified on hardware; if the TV rejects it, delete that line (the overlay will then show `unavailable`) and note it in docs/TEST-RESULTS.md.
- Blank/black app: check `sdb dlog` or Web Inspector (`tizen run` with `-d`, or Tizen Studio's debug action) for script errors.
