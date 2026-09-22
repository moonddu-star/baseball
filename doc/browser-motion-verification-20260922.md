# Pitching and batting compatibility audit

Date: 2026-09-22
Build: 7df8155 (local build at http://127.0.0.1:4173/)

## Result

All 16 tested scenarios passed. No application runtime or HTTP resource errors were observed. No game source changes were needed.

| Browser / test engine | Version | Scenarios |
|---|---|---|
| chrome | 153.0.8010.53 | 4/4 passed |
| edge | 153.0.4234.48 | 4/4 passed |
| firefox | 153.0 | 4/4 passed |
| webkit | 26.5 | 4/4 passed |

## Conditions

- Windows, headless automated browsers. Installed Chrome and Edge; Playwright Firefox and WebKit engines.
- Desktop 1280x900 / Normal / system motion reduction off / Easy / single.
- Mobile viewport 390x844 / Normal / motion reduction on / Medium / double.
- Mobile viewport 320x568 / Quick / motion reduction on / Hard / swing-and-miss.
- Mobile viewport 390x844 / Normal / motion reduction on / Hard / home run / WebGL deliberately unavailable.
- Checked pitcher release and follow-through stages, bat swing and follow-through, multiple rendered frames, nontransparent canvas pixels, visible ball frames, visible effects layer, and settlement.
- All four engines successfully used the software renderer when WebGL was unavailable.
- Initial Chrome/Edge Quick pixel checks captured the first thin edge of the entering bat. The measurement was corrected to inspect multiple swing frames; both scenarios then passed. Game code was unchanged.

## Limits

- WebKit on Windows is a test engine, not real Safari on iOS or macOS.
- Mobile viewports and touch input emulation do not reproduce actual phone GPUs, memory limits, or embedded app browsers.
- Real iOS Safari, Android Chrome, Samsung Internet and app WebViews remain unverified.
- Historical browser versions, live GPU context loss, background/resume and low-memory interruptions were not tested.
- These results confirm the tested configurations; they do not guarantee every browser/device.

## Follow-up: hover guide and mobile input

- New contact-preview guide verified across all 25 zones in Chromium and WebKit; hovering leaves game state unchanged.
- Mobile emulation matrix: Chromium / WebKit x 320x568 / 390x844, DPR 2, touch enabled, mobile viewport enabled, reduced motion enabled: all four passed.
- Verified one-tap hit and OUT, visible swing phases, hidden hover guide for touch, CASH OUT and NEXT ROUND, no automatic bet-input focus, explicit amount editing, and landscape resize without horizontal overflow.
- No runtime or HTTP errors observed in these checks. Physical mobile devices remain untested.
