function createGameView({ $, game, surface, isBusy, onSwing }) {
  const board = $('board'), tiles = [];
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.addEventListener('click', () => onSwing(i).catch(error => message(error.message, 'error')));
    tiles.push(tile); board.append(tile);
  }
  for (let i = 1; i <= 24; i++) $('mines').add(new Option(i, i, i === 3, i === 3));
  function message(text, type = '') {
    $('message').textContent = text;
    $('message').className = 'round-message ' + type;
  }
  function readBet() {
    const text = $('bet').value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('베팅 금액은 소수 둘째 자리까지 입력하세요.');
    const [whole, fraction = ''] = text.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }
  function fitNumber(el, max, available) {
    el.style.fontSize = Math.min(max, available / Math.max(el.textContent.length, 1)) + 'cqw';
  }
  function render() {
    const s = game.snapshot(), active = s.status === 'playing';
    const finished = ['out', 'cashed', 'cleared'].includes(s.status), k = s.hits.length;
    const m = active || finished ? s.mines : Number($('mines').value);
    $('balance').innerHTML = money(s.balance) + ' <small>CR</small>';
    $('multiplier').innerHTML = (active || finished ? multiple(s.status === 'out' ? 0 : s.multiplier) : '1.00×').replace('×', '<span>×</span>');
    $('next').textContent = finished ? '—' : s.status === 'ready' ? multiple(MinesEngine.multiplier(m, 1)) : s.nextMultiplier !== null ? multiple(s.nextMultiplier) : '—';
    $('hit-count').textContent = k + ' HITS';
    fitNumber($('multiplier'), 8.8, 42); fitNumber($('next'), 8.1, 42);
    $('bet').disabled = active || isBusy(); $('mines').disabled = active || isBusy();
    $('reset').disabled = active || isBusy(); $('lock').textContent = active ? '· 잠김' : '';
    $('round-tag').textContent = isBusy() ? 'PITCH INCOMING' : s.status.toUpperCase();
    board.classList.toggle('inactive', !active);
    surface.dataset.state = s.status;
    tiles.forEach((tile, i) => {
      const hit = game.hits.has(i), hazard = finished && game.hazards.has(i);
      tile.className = 'tile' + (hit ? ' hit' : hazard ? ' out' : finished ? ' revealed-safe' : '') + (game.triggered === i ? ' triggered' : '');
      tile.disabled = !active || isBusy() || hit;
      tile.innerHTML = hit ? '<span class="ball" aria-hidden="true">⚾</span><b>HIT</b>' : hazard ? '<span class="out-mark" aria-hidden="true">×</span><b>OUT</b>' : finished ? '<span aria-hidden="true">✓</span>' : '<span class="diamond" aria-hidden="true"></span>';
      tile.setAttribute('aria-label', `${Math.floor(i / 5) + 1}행 ${i % 5 + 1}열 ${hit ? '타격 성공' : hazard ? '위험 코스' : finished ? '안전 코스' : '미공개'}`);
    });
    document.querySelector('.settings').hidden = active;
    $('comparison').hidden = !active;
    if (active) {
      $('now-payout').textContent = k ? money(s.cashout) : '—';
      $('next-payout').textContent = s.nextMultiplier !== null ? money(MinesEngine.payout(s.bet, m, k + 1)) : '—';
      $('next-chance').textContent = (100 * s.successProbability).toFixed(2) + '%';
      fitNumber($('now-payout'), 4.5, 33); fitNumber($('next-payout'), 4.5, 33); fitNumber($('next-chance'), 4.4, 34);
    }
    $('action').disabled = isBusy() || (active && k === 0);
    $('action-label').textContent = active ? isBusy() ? '타격 중' : '상금 확정' : finished ? '다시 타석에 들어서기' : '타석에 들어서기';
    let amount;
    if (active) amount = k ? money(s.cashout) + ' CR' : '코스를 선택하세요';
    else { try { amount = money(readBet()) + ' CR'; } catch { amount = '베팅 금액 입력'; } }
    $('action-amount').textContent = amount;
    const p = s.status === 'ready' ? (25 - m) / 25 : s.successProbability;
    $('probability').textContent = active ? `베팅 ${money(s.bet)} CR · 위험 ${m}개` : finished ? '지급액은 원금을 포함합니다' : `첫 성공 확률 ${(100 * p).toFixed(2)}%`;
    $('remaining').textContent = '안전 코스 ' + (s.status === 'ready' ? 25 - m : s.remainingSafe);
  }
  return { board, tiles, message, readBet, render };
}
