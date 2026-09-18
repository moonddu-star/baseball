// Session-only history. Revealed, unplayed board cells never enter this store.
function createPlayHistory() {
  let sequence = 0, current = null;
  const rounds = [];
  function begin() { current = { id: ++sequence }; }
  function sync(snapshot, triggered) {
    if (!current || snapshot.status === 'ready') return;
    const indexes = [...snapshot.hits];
    if (Number.isInteger(triggered)) indexes.push(triggered);
    if (!indexes.length) return;
    Object.assign(current, {
      difficulty: snapshot.difficulty, status: snapshot.status, bet: snapshot.bet,
      multiplier: snapshot.displayMultiplier, payout: snapshot.cashout,
      plays: indexes.map(index => ({ index, symbol: snapshot.board[index] }))
    });
    if (!rounds.includes(current)) rounds.push(current);
    const matching = rounds.filter(round => round.difficulty === current.difficulty);
    for (const expired of matching.slice(0, -30)) rounds.splice(rounds.indexOf(expired), 1);
  }
  function read(difficulty) {
    const selected = rounds.filter(round => round.difficulty === difficulty);
    const cells = Array.from({ length: 25 }, () => ({ total: 0, counts: { single: 0, double: 0, triple: 0, 'home-run': 0, out: 0 } }));
    for (const round of selected) for (const play of round.plays) {
      cells[play.index].total++;
      cells[play.index].counts[play.symbol]++;
    }
    const last = selected.at(-1)?.plays.at(-1)?.index ?? null;
    return { cells, latest: last, rounds: selected.slice().reverse().map(round => ({ ...round, plays: round.plays.map(play => ({ ...play })) })) };
  }
  return { begin, sync, read };
}
if (typeof module === 'object' && module.exports) module.exports = { createPlayHistory };
