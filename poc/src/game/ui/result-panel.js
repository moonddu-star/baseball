function createResultPanel({ $, game, getRoundNumber }) {
  function showResult() {
    const s = game.snapshot(), lost = s.status === 'out', profit = s.cashout - s.bet;
    $('result').classList.toggle('loss', lost);
    $('result-round').textContent = String(getRoundNumber()).padStart(2, '0');
    const clearedTitle = s.completionReason === 'threshold' ? 'AUTO CASH OUT' : 'ALL ZONES CLEARED';
    $('result-kind').textContent = lost ? 'STRIKE THREE · STREAK ENDED' : s.status === 'cleared' ? clearedTitle : 'CASHED OUT';
    $('result-title').textContent = lost ? 'ROUND OVER' : s.status === 'cleared' ? clearedTitle : 'CASHED OUT';
    $('result-hits').textContent = s.hits.length + (s.hits.length === 1 ? ' HIT' : ' HITS');
    $('result-multiplier').textContent = multiple(s.displayMultiplier);
    $('result-bet').textContent = money(s.bet) + ' CR';
    $('result-payout').innerHTML = money(s.cashout) + ' <small>CR</small>';
    $('result-profit').textContent = (profit > 0 ? '+' : profit < 0 ? '−' : '') + money(Math.abs(profit)) + ' CR';
    $('result-balance').textContent = money(s.balance) + ' CR';
    if (!$('result').open) $('result').showModal();
  }
  return { showResult };
}
