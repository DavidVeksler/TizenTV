# Recommendation

**Provisional: proceed with native Tizen sideloading, conditional on tests 3-6 in docs/TEST-RESULTS.md.** This is a prior, not a result; no scenario has been run on the TV.

Why the prior leans toward proceed: the app is a static bundle with no backend, the free path (Samsung account, Tizen Studio, TV extensions, Developer Mode, Samsung-signed certificate for the TV's DUID) is the documented route and community sideloading tools use it, and the use case tolerates manual relaunch.

Risks the tests must settle (each could flip the call):
1. Developer Mode state after a cold power cycle or firmware update. Community sources disagree on whether turning it off removes sideloaded apps and whether it expires; test 5 decides.
2. Certificate lifetime. If the Samsung distributor certificate expires, the app may stop launching until redeployed. Record the expiry and plan a calendar reminder.
3. Frame-specific power behavior: power-on goes to Art Mode, and Autorun Last App may not apply (test 6). Manual launch is acceptable per the brief.
4. Screen saver / auto power-off interrupting the dashboard during the 2 h run.

Decision rule after testing:
- Tests 1-5 pass and cert lifetime is acceptable: proceed with native Tizen; accept manual launch (or autorun if test 6 passes).
- Apps survive but Developer Mode or the certificate needs periodic renewal: still viable if renewal is a 5 minute `scripts/deploy.sh` run; set a reminder.
- Apps are removed on power cycle or the TV rejects the signature: do not build a workaround in this POC. Use the simplest alternative: host the same bundle as a normal web page and open it in the TV's built-in browser, or use an HDMI stick/mini-PC in kiosk mode (Chromecast with Google TV, Fire TV, or a small PC), which also removes the Samsung certificate dependency.
