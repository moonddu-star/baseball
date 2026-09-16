# Game typography and language

User-approved POC update (2026-09-16): apply the proposed sports fonts and make all player-facing text English. This replaces the earlier Korean UI and takes precedence over generic font examples in the design guide. The PixiBrown template is still unavailable; these changes apply to the existing POC.

| Role | Font |
| --- | --- |
| Brand | Oswald Bold, 700; upright with slightly open letter spacing |
| UI and instructions | Barlow Condensed, 400 / 600 / 700 |
| Multipliers and amounts | Barlow Condensed Bold, 700; tabular numerals |
| HIT! / OUT! | Barlow ExtraBold, 800; same normal-width face, size and 0.015em letter spacing |

Fonts are stored in `poc/assets/fonts` and copied by `poc/build-manifest.json` to `dist/assets/fonts`. No runtime Google Fonts request is required. All three families use the SIL Open Font License; full license files ship beside the fonts. See `THIRD-PARTY.md` for sources.

HTML language, metadata, static labels, help, result dialogs, status messages, error messages and accessibility labels are English. Money continues to use the existing en-US format. Gameplay, probabilities and animation timing are unchanged.

These fonts are stylistic alternatives inspired by sports presentation, not a claim about MLB The Show 26's actual font identity. Noto Sans KR is not loaded because the requested UI is English-only; Teko was an alternative, not part of the selected combination.

## Mobile readability update

Labels now use 14px or larger, status text 16px or larger, help copy 18px, input values 24px, and action amounts 28–36px. Oswald titles use 27–40px. Comparison values have an 18px minimum and wrap exceptionally long values instead of shrinking below that floor. Secondary unit notes use 13px; the decorative brand subtitle/demo badge use 11–12px.

The field is wrapped in a calibrated 9:16 game-stage; bat, ball and aura calculations use that stage. The board and pitcher retain their stage-relative coordinates. Controls, status and footer use document flow and may extend below the viewport on small phones; the page scrolls instead of scaling text down.

## Stable round controls

The action button reserves 92px in all ready, playing, busy, cash-out and finished states. Settings and comparison panels both reserve 120px, the status message 64px, and the summary line at least 44px so switching content does not move the button or recenter the entire screen.

Popup headings (ROUND OVER, CASHED OUT, ALL ZONES CLEARED, HOW TO PLAY) and NEXT ROUND explicitly use Barlow Condensed Bold 700. Avoid 750 on static fonts: it can select the heavier available Black 900 face.

## Result dialog palette

Clarified user request: dialog surfaces now match the lower game background (#061523), with subtle navy dividers and inset panels. Restore original typography and button colors: gold for successful results and payout, muted red for OUT headings/net result, and the original success/OUT button palettes. Bold 700 typography and fixed layout sizes remain in place.

## Mobile action placement

The DOM and visual order is now status → primary action → bet/danger settings (or in-round payout comparison) → summary. Moving the action before the 120px panel plus 12px gap raises it by 132px, preserves keyboard reading order and keeps the action height at 92px. On phone viewports up to 680px tall the status slot is 48px so the button fits earlier. The remaining settings/footer stay scrollable.

## Compact phone viewport update

On portrait phones (up to 540px wide), settings and comparison panels now reserve 64px instead of 120px, with 6px control gaps and a compact summary/footer. The action remains 92px and the status 48px. The field retains its calibrated 9:16 geometry and now always fills the game width. The earlier dynamic-height sizing was removed because mobile browser toolbars narrowed the field and introduced side gutters. Its own inline-size container keeps pitcher, board and effect sizing proportional. Safe-area top/bottom insets are reserved. Compact controls remain; when available height is insufficient, the page scrolls instead of shrinking or clipping the field. Phone content aligns to the top so toolbar height changes do not recenter it.

## CLUTCH HIT branding

The player-facing title, page metadata, accessible game name and result header now use CLUTCH HIT. The main logo keeps Oswald Bold with white CLUTCH and gold HIT. Remove the STADIUM LIVE / DEMO subtitle. Balance/reset sits directly below the single-line header; the scoreboard moves to 16% of the calibrated field height and both multiplier values use up to 12cqw (with length-aware fitting for large values) for greater prominence. Header sizing no longer changes at viewport-height breakpoints, so browser toolbar changes preserve the same composition.
