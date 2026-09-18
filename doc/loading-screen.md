# Game loading screen

## Player-facing behavior

- On every page load, show a full-screen English introduction in the existing Barlow family.
- Explain zone selection, hit rewards, and keep swinging versus cashing out. State that two strikes means one miss ends the round.
- Show real task completion progress; keep the explanation visible for at least 2.5 seconds, then enter the existing start guide automatically once ready.
- The game is visually hidden and inert during loading. Release the input gate and move focus to the start action on completion.
- Loading does not repeat on round changes. Refresh starts it again.
- Keep sound behind the existing user-interaction unlock; the loader never autoplays music.

## Readiness and recovery

- Standalone loading.js starts before the engine and game scripts. game-main sends clutch-hit:ready only after initialization and control registration.
- Wait for stadiums, pitcher sheets, bat, hit icon, four Barlow weights, and the already-running effect-audio downloads. Desktop also waits for the surrounding night stadium backdrop.
- The percentage counts finished preparation tasks, not downloaded bytes. Music streaming and audio decoding remain managed by the existing audio engine on user interaction.
- Audio failures or an eight-second audio wait may complete without recorded effects, preserving the existing audio fallback behavior.
- Essential image/font/script failures keep the game gated and expose TRY AGAIN. Twenty-five seconds without readiness also exposes retry.
- If loading.js itself fails to load, successfully initialized game-main exposes the retry action.
- Scrolling is confined to the overlay when the browser is too short for the instructions. Focus is moved to retry on failure.

## Validation

- Existing 29 automated tests pass.
- Browser checks at 1920×1080, 390×844, and 320×568: no horizontal overflow, instructions fit, progress reaches 100%, game starts, loading reappears on refresh.
- Delayed required image keeps the game gated beyond the minimum display time.
- Missing required image, app.js, or loading.js shows retry; restoring the resource and retrying succeeds.
- Missing effect recordings do not leave the game stuck loading.
