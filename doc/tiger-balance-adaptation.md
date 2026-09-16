# CLUTCH HIT — Tiger Mines balance adaptation

## Scope and source

User request: bring the Tiger Mines difficulty button and symbol balance into the existing baseball POC. The user explicitly selected **RTP Ver 1 (98%)**. Source: [supplied Tiger Mines GDD](tiger-mines-reference.md), sections 1.1–1.8, 2.1 and Config probability tables. The existing POC remains authorized while the PixiBrown template is unavailable.

| Tiger symbol | Baseball result | Tile badge | Multiplicative bonus |
| --- | --- | --- | --- |
| Mouse / type 1 | Single | 1B | ×1.05 |
| Rabbit / type 2 | Double | 2B | ×1.20 |
| Ox / type 3 | Triple | 3B | ×1.50 |
| Tiger / type 4 | Home run | HR | ×5.00 |
| Failure | OUT | OUT | ×0, round ends |

Existing baseball artwork, 300ms swing, pitch timing, sound, day/night settings, result-dialog close behavior and mobile full-width field are retained. The existing baseball sprite has a small result badge for each new type; no new artwork was generated. The former fixed hazard-count setting and combination-based 99% math are replaced.

## Exact Ver 1 probability tables

Percentages include OUT; successful result weights are not conditional percentages.

| Difficulty / selection | OUT | Single | Double | Triple | Home run |
| --- | ---: | ---: | ---: | ---: | ---: |
| Easy / first | 12.00% | 71.80% | 12.52% | 3.09% | 0.59% |
| Easy / later | 12.00% | 66.00% | 17.00% | 4.20% | 0.80% |
| Medium / first | 20.00% | 48.50% | 21.00% | 8.75% | 1.75% |
| Medium / later | 20.00% | 44.00% | 24.00% | 10.00% | 2.00% |
| Hard / first | 32.00% | 31.71% | 20.02% | 11.62% | 4.65% |
| Hard / later | 32.00% | 29.00% | 21.50% | 12.50% | 5.00% |

All four supplied RTP versions are retained as immutable integer basis-point tables in `poc/src/domain/tiger-balance.js`. Only `activeVersion: 1` is used. There is no player-facing RTP selector. Tables are not normalized or modified to force a mathematically exact target. The supplied rounded first-cell tables have expected multipliers 0.979990 (Easy), 0.980000 (Medium), 0.979995 (Hard), before currency truncation. Every later-cell table has expected multiplier 1.0. These are source-table arithmetic checks, not a certification claim.

## Round behavior

- Initial difficulty is Easy. Tap the button to cycle Easy → Medium → Hard → Easy. The selected difficulty remains for subsequent rounds in the same session. It resets to Easy on page reload.
- Starting a round does not draw a hidden board. Each selected cell independently draws one symbol using the appropriate first/later probability table.
- Selection reserves exactly one private result for the pitch animation. At contact it is committed and shown. Pending results are absent from public snapshots, and all other round actions remain locked during the swing.
- There is no fixed OUT count, and no known safe-zone count. The HUD shows hit chance (88%, 80%, 68%), played/hidden zones and random bonus range instead of a guaranteed next multiplier.
- On any successful result, multiply the accumulated value by the symbol bonus. Exact integer fractions (BigInt) avoid cumulative rounding. Final payout is truncated once to 0.01 credit; displayed multipliers are truncated to two decimals, as specified in GDD 2.1.
- OUT pays zero. Cashout is unavailable until the first success.
- Successful selection 25, or an accumulated multiplier strictly above 10,000, triggers automatic cashout. The full multiplier is paid; there is no clamp at the threshold. The popup distinguishes threshold auto-cashout from clearing the board.
- At round end, remaining cells are drawn from the later-cell table and shown dimmed as unplayed results. They neither change the multiplier nor trigger additional sound, rewards or hit counts.
- The help dialog displays the current difficulty's exact first/later probabilities and four baseball bonuses. UI remains English.

## Deliberately outside this change

The imported scope is difficulty, symbols and their mathematical/settlement dependencies. Existing virtual-credit bet limits (1–1,000 CR), default bet (100 CR) and initial balance (1,000 CR) remain. The GDD's separate bet presets (0.1–100), default bet 2, operator exposure limits, autoplay, random-select button, histories, new tutorial flow, win-tier popups and server/disconnection policies are not imported. Current POC results and RNG remain client-side; the attachment does not supply a production server integration.

## Validation

- Unit checks enumerate all 10,000 tickets in every first-cell probability table; verify all later tables and expected multipliers.
- Cover no pre-drawn board, one reserved draw, pending-state privacy, difficulty lock, all four types, exact 9.45× combined multiplier, final-only rounding, OUT, end-of-round reveal, no double settlement, 25 successes and threshold overshoot.
- Existing fixed-size bat, 300ms swing, barrel contact, hit/miss trajectory and aura tests also pass.
- Browser checks cover 320px and 390px mobile layouts plus desktop: difficulty cycling, help table, typed sprites, cashout, OUT, replay and a normal animated home run.

Old scratch verification scripts that pass `dangerZones` or assume a fixed safe-cell count refer to the previous rules. The current model-context start tool accepts `{betCredits, difficulty}`. Updated checks: `.work/verify-tiger-browser.cjs` and `.work/verify-deploy-package.cjs`.
