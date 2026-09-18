# Round feedback and difficulty comparison

Implemented in the current HTML POC. Game probabilities, bonuses and settlement remain in the existing domain engine.

## Failure

Finish the swing-and-miss and ball pass-through, then render the third strike. Pulse the final dot for 320 ms, show STRIKEOUT! and STRIKE THREE / STREAK ENDED, hold for 1200 ms, then open the round result dialog. The result is committed once by the engine; delaying the visual reveal does not draw a new result. Motion reduction disables the pulse and swing motion while preserving reading time.

## Success

After the hit callout, wait 120 ms and interpolate only displayed multiplier/cash-out amounts over 480 ms. Start the first-hit amount from the bet, and later hits from the preceding payout. The final number is the exact engine snapshot value. Controls stay locked until presentation finishes; automatic cash-out keeps the comparison visible until its animation ends. Reduced motion applies final values immediately.

## Decision hint

KEEP SWINGING OR CASH OUT replaces the existing message after the first successful hit once per page load. It adds no panel or layout shift, disappears on the next action and is not repeated across subsequent rounds. Refresh resets the hint.

## Difficulty

DIFFICULTY opens a three-pitcher comparison. Choosing a card immediately updates the selected difficulty and pitcher; USE [LEVEL] PITCHER closes the dialog. First and later pitch tabs read the exact active RTP tables, with unconditional outcome probabilities including OUT. Bonuses are shared across difficulties. Difficulty remains locked during a round.
