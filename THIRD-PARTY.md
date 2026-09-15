# Third-party libraries and assets

## Three.js 0.180.0 (r180)

- License: MIT; full text: dist/vendor/THREE-LICENSE.txt
- Package: https://www.npmjs.com/package/three/v/0.180.0
- Original build: package/build/three.cjs from the official npm registry package.
- Local distribution: dist/vendor/three.js wraps the unchanged CommonJS build to expose window.THREE for offline classic-script loading.

## WebXR Input Profiles Assets 1.0.20

- Package: @webxr-input-profiles/assets
- Source: https://github.com/immersive-web/webxr-input-profiles/tree/main/packages/assets
- Version: https://www.npmjs.com/package/@webxr-input-profiles/assets/v/1.0.20
- License: MIT; full text: dist/vendor/HAND-MODELS-LICENSE.txt
- Original files: package/dist/profiles/generic-hand/left.glb and right.glb.
- Originals are included in source-assets/hands. The hand skeletons were posed to grip a bat, converted into bat-local coordinates, and baked into static geometry with recomputed normals by tools/bake-batting-hands.cjs.
- Runtime distribution: dist/assets/batting-hands.js exposes window.BattingHands, with separate left/right geometry. No external service or runtime model download is used.

The bat geometry, glove cuffs, articulated arm geometry, swing timing, wrist rotation, and two-bone arm solver in dist/swing3d.js were authored for this POC. The anatomical hand geometry derives from the WebXR assets above.
