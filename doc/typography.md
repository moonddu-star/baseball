# POC typography

Restored the all-Barlow configuration from before the Teko experiment, per user request.

- Barlow Regular 400: body and supporting copy.
- Barlow SemiBold 600: secondary labels.
- Barlow Bold 700: headings, buttons and amounts.
- Barlow ExtraBold 800: hit/out callouts and hit badges.
- --font-ui and --font-emphasis both resolve to Barlow. Restore Barlow sizes/line heights, including its compact header treatment.
- Build includes four Barlow files and their OFL license; Teko and Bebas Neue are excluded from runtime loading and the deployment manifest.
- Preserve the shared left/right HUD alignment and intro shown once per page load, reappearing on refresh.
