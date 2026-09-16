# Day / night game setting

The HOW TO PLAY dialog includes GAME SETTINGS → GAME TIME → NIGHT GAME / DAY GAME. NIGHT GAME is the initial default. The choice persists under localStorage key strike-zone-time-of-day; invalid or unavailable storage falls back to night. Changing the setting applies immediately, including during a round, without changing game state or audio.

NIGHT GAME uses the original stadium-clean.png. DAY GAME now uses stadium-day.png, generated with the built-in image tool at the user’s explicit request using the night stadium as reference. It preserves the composition, mound and home plate placement, with a blue daytime sky, sunlight and unlit floodlights. The prior screen-blend/brightness simulation is removed. The original night image remains unchanged. The master is saved in source-assets/images and the runtime copy in poc/assets/images. See [generation prompt](stadium-day-prompt.md).

The strike zone, calibrated camera, bat scale, pitching timing, payout rules, dark controls, result palette and audio mappings are shared between both modes.

Daytime BALANCE and RESET use text shadows for contrast; the wallet background bar is removed. The row uses the same padding as night mode.

## Pitcher lighting

Day uses a mild warm RGB grade (1.06 / 1.03 / 0.97), near-neutral saturation, and a warm ground/contact shadow. Night uses cooler channel levels (0.79 / 0.84 / 0.92), reduced saturation and a blue-black shadow. Inline SVG component-transfer filters preserve alpha and tint the whole pitcher including pose crossfades only once. The source sprite, dimensions, animation, release point and aura are unchanged.
