function createGameView({ $, game, surface, isBusy, onSwing }) {
  const board = $('board'), tiles = [], symbols = MinesEngine.symbolById;
  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.addEventListener('click', () => onSwing(i).catch(error => message(error.message, 'error')));
    tiles.push(tile); board.append(tile);
  }
  function message(text, type = '') {
    $('message').textContent = text;
    $('message').className = 'round-message ' + type;
  }
  function readBet() {
    const text = $('bet').value.trim();
    if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('Enter a bet with up to two decimal places.');
    const [whole, fraction = ''] = text.split('.');
    return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
  }
  function fitNumber(el, max, available) {
    const preferred = Math.min(max, available / Math.max(el.textContent.length, 1));
    el.style.fontSize = `clamp(18px, ${preferred}cqw, ${max * 5.4}px)`;
  }
  function render() {
    const s = game.snapshot(), active = s.status === 'playing';
    const finished = ['out', 'cashed', 'cleared'].includes(s.status), k = s.hits.length;
    $('balance').innerHTML = money(s.balance) + ' <small>CR</small>';
    $('multiplier').innerHTML = multiple(s.displayMultiplier).replace('×', '<span>×</span>');
    $('next').textContent = Math.round(s.successProbability * 100) + '%';
    $('hit-count').textContent = k + (k === 1 ? ' HIT' : ' HITS');
    fitNumber($('multiplier'), 12, 60); fitNumber($('next'), 12, 60);
    $('bet').disabled = active || isBusy(); $('difficulty').disabled = active || isBusy();
    $('difficulty-value').textContent = s.difficulty.toUpperCase();
    $('difficulty').dataset.difficulty = s.difficulty;
    surface.dataset.difficulty = s.difficulty;
    $('pitcher').dataset.difficulty = s.difficulty;
    const nextDifficulty = MinesEngine.balance.difficulties[(MinesEngine.balance.difficulties.indexOf(s.difficulty) + 1) % 3];
    $('difficulty').setAttribute('aria-label', `Difficulty: ${s.difficulty}. ${active ? 'Locked during this round.' : `Change to ${nextDifficulty}.`}`);
    $('reset').disabled = active || isBusy();
    $('round-tag').textContent = isBusy() ? 'PITCH INCOMING' : s.status.toUpperCase();
    board.classList.toggle('inactive', !active); surface.dataset.state = s.status;
    tiles.forEach((tile, i) => {
      const symbol = s.board[i], played = game.hits.has(i), out = symbol === 'out';
      tile.className = 'tile' + (symbol ? out ? ' out' : ' hit' : '') + (finished && !played && i !== game.triggered ? ' revealed-preview' : '') + (game.triggered === i ? ' triggered' : '');
      tile.dataset.symbol = symbol || '';
      tile.disabled = !active || isBusy() || symbol !== null;
      const content = symbol ? out ? '<span class="out-mark" aria-hidden="true">×</span><b>OUT</b>' : `<img class="hit-ball-sprite" src="assets/baseball-hit-icon.png" width="128" height="128" alt="" aria-hidden="true" draggable="false"><span class="hit-type" aria-hidden="true">${symbols[symbol].short}</span>` : '<span class="diamond" aria-hidden="true"></span>';
      // Avoid reloading/redecoding the same sprite on every animation-state render.
      if (tile.dataset.content !== content) { tile.innerHTML = content; tile.dataset.content = content; }
      const description = symbol ? `${symbols[symbol].label}${out ? '' : `, bonus ${symbols[symbol].factor / 100} times`}${finished && !played && i !== game.triggered ? ', unplayed' : ''}` : 'hidden';
      tile.setAttribute('aria-label', `Row ${Math.floor(i / 5) + 1}, column ${i % 5 + 1}: ${description}`);
    });
    document.querySelector('.settings').hidden = active; $('comparison').hidden = !active;
    if (active) {
      $('now-payout').textContent = k ? money(s.cashout) : '—';
      $('next-payout').textContent = '1.05–5×';
      $('round-difficulty-value').textContent = s.difficulty.toUpperCase();
      fitNumber($('now-payout'), 6, 40); fitNumber($('next-payout'), 6, 40);
    }
    $('action').disabled = isBusy() || (active && k === 0);
    $('action').setAttribute('aria-busy', String(isBusy())); board.setAttribute('aria-busy', String(isBusy()));
    $('action-label').textContent = active ? isBusy() ? 'SWINGING' : 'CASH OUT' : finished ? 'PLAY AGAIN' : 'STEP UP TO THE PLATE';
    let amount;
    if (active) amount = k ? money(s.cashout) + ' CR' : 'PICK A ZONE';
    else { try { amount = money(readBet()) + ' CR'; } catch { amount = 'ENTER BET'; } }
    $('action-amount').textContent = amount;
    $('probability').textContent = `${s.difficulty.toUpperCase()} · ${active ? `Bet ${money(s.bet)} CR` : finished ? 'Round complete' : `Hit chance ${Math.round(s.successProbability * 100)}%`}`;
    $('remaining').textContent = finished ? `Played ${s.playedCells}/25` : `Hidden zones ${s.remainingCells}`;
    $('target-rtp').textContent = `RTP ${Math.round(s.rtp * 100)}%`;
    $('odds-caption').textContent = `${s.difficulty.toUpperCase()} · RTP ${Math.round(s.rtp * 100)}%`;
    const first = MinesEngine.balance.initial[s.rtpVersion][s.difficulty], later = MinesEngine.balance.secondary[s.difficulty];
    $('symbol-odds').innerHTML = MinesEngine.balance.symbols.map((symbol, index) => `<tr><th scope="row">${symbol.label}</th><td>×${(symbol.factor / 100).toFixed(2)}</td><td>${(first[index] / 100).toFixed(2)}%</td><td>${(later[index] / 100).toFixed(2)}%</td></tr>`).join('');
  }
  return { board, tiles, message, readBet, render };
}
