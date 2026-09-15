function createResultPanel({ $, game, getRoundNumber }) {
  function showResult() {
    const s = game.snapshot(), lost = s.status === 'out', profit = s.cashout - s.bet;
    $('result').classList.toggle('loss', lost);
    $('result-round').textContent = String(getRoundNumber()).padStart(2, '0');
    $('result-kind').textContent = lost ? 'OUT · ROUND OVER' : s.status === 'cleared' ? 'ALL ZONES CLEARED' : 'CASHED OUT';
    $('result-title').textContent = lost ? '라운드 종료' : s.status === 'cleared' ? '전 코스 타격 성공' : '상금 확정';
    $('result-hits').textContent = s.hits.length + ' HITS';
    $('result-multiplier').textContent = multiple(lost ? 0 : s.multiplier);
    $('result-bet').textContent = money(s.bet) + ' CR';
    $('result-payout').innerHTML = money(s.cashout) + ' <small>CR</small>';
    $('result-profit').textContent = (profit > 0 ? '+' : profit < 0 ? '−' : '') + money(Math.abs(profit)) + ' CR';
    $('result-balance').textContent = money(s.balance) + ' CR';
    if (!$('result').open) $('result').showModal();
  }
  return { showResult };
}
