# Third-party libraries and assets

## Three.js 0.180.0 (r180)

- License: MIT; full text: poc/vendor/three-license.txt
- Package: https://www.npmjs.com/package/three/v/0.180.0
- Original build: package/build/three.cjs from the official npm registry package.
- Local distribution: poc/vendor/three.js wraps the unchanged CommonJS build to expose window.THREE for offline classic-script loading.

## WebXR Input Profiles Assets 1.0.20 — retained v6 source assets

- Package: @webxr-input-profiles/assets
- Source: https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets
- Version: https://www.npmjs.com/package/@webxr-input-profiles/assets/v/1.0.20
- License: MIT; full text: poc/vendor/hand-models-license.txt
- Original files: package/dist/profiles/generic-hand/left.glb and right.glb.
- Originals are included in source-assets/hands. The hand skeletons were posed to grip a bat, converted into bat-local coordinates, and baked into static geometry with recomputed normals by tools/bake-batting-hands.cjs.
- Historical v6 distribution: poc/assets/legacy/batting-hands.js exposes window.BattingHands, with separate left/right geometry. The v7 page does not load this file or use these meshes; the files and license are retained for the v6 source history.

The current bat geometry, swing timing, and ascending path in poc/src/game/fx/baseball-swing.js were authored for this POC. The historical v6 anatomical hand geometry derives from the WebXR assets above.

## Project-provided background music

- Original project file: source-assets/sounds/baseball_bg.mp3 (preserved unchanged).
- Runtime copy: poc/assets/sounds/baseball-bg.mp3, distributed as dist/assets/baseball-bg.mp3.
- No external music download was used. Authorship/license metadata was not supplied with this file; this entry records its project provenance without asserting a license.
- Gameplay sound effects are synthesized by this POC's Web Audio code and contain no third-party sound samples.
## Google Fonts — Barlow Condensed and Anton

- Downloaded from the official Google Fonts repository on 2026-09-16.
- Barlow Condensed: https://github.com/google/fonts/tree/main/ofl/barlowcondensed — Jeremy Tribby / The Barlow Project Authors.
- Anton: https://github.com/google/fonts/tree/main/ofl/anton — Vernon Adams / The Anton Project Authors.
- License: SIL Open Font License 1.1. Full unmodified texts: poc/assets/fonts/barlow-condensed-license.txt and poc/assets/fonts/anton-license.txt.
- Historical font files remain in poc/assets/fonts. Barlow Condensed and Anton are excluded from the current runtime declarations and ZIP manifest. Only filenames were normalized to kebab-case.
- Barlow Condensed: Regular 400, SemiBold 600, Bold 700, Black 900, Black Italic 900. Anton: Regular 400.
- Local hosting requires no runtime third-party font service. These are stylistic alternatives, not identified fonts from MLB The Show 26.

## Google Fonts — Oswald

- Source: https://github.com/google/fonts/tree/main/ofl/oswald (downloaded 2026-09-16).
- Designers: Vernon Adams, Kalapi Gajjar, Cyreal. Copyright: The Oswald Project Authors.
- License: SIL Open Font License 1.1; full text in poc/assets/fonts/oswald-license.txt.
- Unmodified variable TTF (weights 200–700), renamed oswald-variable.ttf, stored in poc/assets/fonts as a historical source asset.
- Historical title font only. Oswald is currently excluded from the runtime font declarations and ZIP manifest.

## Additional project-provided sounds

- Original user-supplied files: source-assets/sounds/click.mp3, hit.mp3, out.mp3, intro_bg.mp3.
- Unmodified runtime copies: poc/assets/sounds/sfx-click.mp3, sfx-hit.mp3, sfx-out.mp3, intro-bg.mp3; distributed in dist/assets.
- Origin is the supplied project folder; no authorship or license is asserted. Original bytes are preserved. Playback gain and sample start offsets are runtime settings only.

## Day stadium background

- AI-edited with the built-in image_gen tool at the user’s explicit request, using the existing poc/assets/images/stadium-clean.png as the visual reference. No third-party asset download was used.
- Master: source-assets/images/stadium-day.png. Runtime copy: poc/assets/images/stadium-day.png; distributed as dist/assets/stadium-day.png.
- Prompt and edit scope: doc/stadium-day-prompt.md. The reference night background remains unchanged.

## Google Fonts — Barlow (current UI family)

- Source: https://github.com/google/fonts/tree/main/ofl/barlow (downloaded 2026-09-16). Designer: Jeremy Tribby / The Barlow Project Authors.
- SIL Open Font License 1.1; full text: poc/assets/fonts/barlow-license.txt.
- Unmodified Barlow-Bold.ttf renamed barlow-bold.ttf, locally distributed with its license.
- Regular 400 and SemiBold 600 were added from the same official Google Fonts repository on 2026-09-17; filenames barlow-regular.ttf and barlow-semibold.ttf.
- Current UI uses Barlow Regular / SemiBold / Bold / ExtraBold throughout, covered by the included barlow-license.txt. Teko and Bebas Neue were visual trials and are excluded from runtime loading and the release manifest.

- Barlow ExtraBold 800: unmodified Barlow-ExtraBold.ttf from https://github.com/google/fonts/tree/main/ofl/barlow, saved as poc/assets/fonts/barlow-extrabold.ttf. Covered by the same SIL OFL in barlow-license.txt. Used for SINGLE / DOUBLE / TRIPLE / HOME RUN! and OUT! callouts.

## Baseball hit tile sprite

`poc/assets/images/baseball-hit-icon.png` was generated for this project with the built-in OpenAI image generation tool at the user’s request. The transparent master is in `source-assets/images/baseball-hit-icon.png`; prompt and integration notes are in `doc/baseball-hit-icon.md`.

## Difficulty pitcher characters

`poc/assets/images/pitcher-medium.png` and `pitcher-hard.png` were generated for this project with the built-in OpenAI image generation tool at the user’s request. Transparent masters are retained under `source-assets/images/`. Full prompts and integration details are recorded in `doc/difficulty-pitchers.md`. Easy uses the existing pitcher sprite sheet.

## Project-provided hit variations (2026-09-17)

- User-supplied source-assets/sounds/hit_single.mp3 and hit_strong.mp3.
- Unmodified copies: poc/assets/sounds/sfx-hit-single.mp3 and sfx-hit-strong.mp3; distributed in dist/assets.
- Single uses hit_single; Double uses hit_strong; Triple and Home Run keep the original hit recording. Origin is the supplied project folder; no additional authorship or license is asserted.

## Project-provided crowd cheers (2026-09-17)

- User-supplied source-assets/sounds/cheer_normal.mp3 and cheer_strong.mp3.
- Unmodified runtime copies: poc/assets/sounds/sfx-cheer-normal.mp3 and sfx-cheer-strong.mp3; distributed in dist/assets.
- Normal cheer accompanies doubles and triples; strong cheer accompanies home runs. Source is the provided project folder; no additional authorship or license is asserted. Editing WAV/PKF files are not distributed.

- HARD pitcher update (2026-09-17): the user supplied a red-uniform replacement at source-assets/images/pitcher-hard.png. Runtime and distribution copies preserve the provided 887 x 444 PNG bytes without further image processing.

- Medium / Hard motion update (2026-09-17): the user supplied replacement sprite sheets with submarine / torso-coil deliveries. The current runtime copies preserve the supplied PNG bytes; integration performed no generation, resizing or recoloring.
