# Recent plays / heatmap POC

- Open with the history icon beside Help in the top bar.
- English UI; default filter is the current difficulty. Easy / Medium / Hard filters only change the history view, never the active game difficulty.
- Keep the last 30 rounds with at least one committed selection per difficulty, including the active round. Memory only: reload clears history; balance RESET keeps session history.
- Green intensity represents selection frequency relative to the most selected zone in this view. Numbers give exact counts. A white dot marks the latest selection; the white border marks the cell being inspected.
- A cell shows counts for 1B / 2B / 3B / HR / OUT. Only selected cells count; reserved results and unplayed cells revealed at settlement are excluded.
- Round rows show selected results in order, final multiplier and payout (including bet). Active rounds show available cash out instead of settled payout.
- Past results do not predict the next hit. Game probabilities, balance tables and outcome generation are unchanged.
- Separate session store and popup modules: `poc/src/game/ui/play-history.js` and `history-panel.js`. Integrate through the build manifest and game render/start lifecycle.
- Implementation status: active HTML POC. Latest user decision on 2026-09-17 resumes POC UI development and ZIP distribution until template prerequisites are available, superseding the earlier same-day migration-only instruction. Future migration must use the actual template’s common BetHistory popup and supported extension points.
