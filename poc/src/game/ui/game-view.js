function createGameView({ $, game, surface, isBusy, onSwing }) {
  const board = $('board'), tiles = [], symbols = MinesEngine.symbolById;
  // Show onboarding once per page load, including after refresh.
  let goalSeen = false;
  let rewardDisplay = null, rewardFrame = 0, finishReward = null;

  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.style.setProperty('--zone-light-delay', ((Math.floor(i / 5) + i % 5) * 70) + 'ms');
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
  function paintRewards(multiplier, cashout) {
    $('multiplier').innerHTML = multiple(multiplier).replace('×', '<span>×</span>');
    $('now-payout').textContent = money(cashout);
    $('action-amount').textContent = money(cashout) + ' CR';
    fitNumber($('multiplier'), 12, 60); fitNumber($('now-payout'), 6, 40);
  }
  function cancelRewards() {
    cancelAnimationFrame(rewardFrame); rewardFrame = 0; rewardDisplay = null;
    ['multiplier', 'now-payout', 'action-amount'].forEach(id => $(id).classList.remove('reward-counting'));
    if (finishReward) { const done = finishReward; finishReward = null; done(); }
  }
  function holdRewards(before) {
    cancelRewards();
    rewardDisplay = { multiplier: before.displayMultiplier, cashout: before.hits.length ? before.cashout : before.bet };
  }
  function animateRewards(after) {
    const from = rewardDisplay || { multiplier: after.displayMultiplier, cashout: after.cashout };
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      cancelRewards(); paintRewards(after.displayMultiplier, after.cashout); return Promise.resolve();
    }
    ['multiplier', 'now-payout', 'action-amount'].forEach(id => $(id).classList.add('reward-counting'));
    const start = performance.now() + 120;
    return new Promise(resolve => {
      finishReward = resolve;
      function tick(now) {
        const progress = Math.min(1, Math.max(0, (now - start) / 480));
        const eased = 1 - Math.pow(1 - progress, 3);
        rewardDisplay = {
          multiplier: progress === 1 ? after.displayMultiplier : Math.floor((from.multiplier + (after.displayMultiplier - from.multiplier) * eased) * 100) / 100,
          cashout: progress === 1 ? after.cashout : Math.floor(from.cashout + (after.cashout - from.cashout) * eased)
        };
        paintRewards(rewardDisplay.multiplier, rewardDisplay.cashout);
        if (progress === 1) { cancelRewards(); return; }
        rewardFrame = requestAnimationFrame(tick);
      }
      rewardFrame = requestAnimationFrame(tick);
    });
  }
  function render() {
    const s = game.snapshot(), active = s.status === 'playing' || (s.status === 'cleared' && isBusy());
    const finished = ['out', 'cashed', 'cleared'].includes(s.status), k = s.hits.length;
    $('balance').innerHTML = money(s.balance) + ' <small>CR</small>';
    $('multiplier').innerHTML = multiple(rewardDisplay ? rewardDisplay.multiplier : s.displayMultiplier).replace('×', '<span>×</span>');
    $('next').textContent = Math.round(s.successProbability * 100) + '%';
    $('streak-value').textContent = k;
    $('streak-unit').textContent = k === 1 ? 'HIT' : 'HITS';
    $('hit-count').setAttribute('aria-label', k + ' consecutive ' + (k === 1 ? 'hit' : 'hits'));
    fitNumber($('multiplier'), 12, 60);
    $('bet').disabled = active || isBusy(); $('difficulty').disabled = active || isBusy();
    $('difficulty-value').textContent = s.difficulty.toUpperCase();
    $('difficulty').dataset.difficulty = s.difficulty;
    surface.dataset.difficulty = s.difficulty;
    $('pitcher').dataset.difficulty = s.difficulty;
    $('difficulty').setAttribute('aria-label', `Difficulty: ${s.difficulty}. ${active ? 'Locked during this round.' : 'Compare pitchers and probabilities.'}`);
    $('reset').disabled = active || isBusy();
    $('round-tag').textContent = isBusy() ? 'PITCH INCOMING' : s.status.toUpperCase();
    board.classList.toggle('inactive', !active); surface.dataset.state = s.status;
    // Hide both onboarding cues once the first valid round starts.
    if (active && !goalSeen) {
      goalSeen = true;
    }
    $('start-guide').hidden = goalSeen || s.status !== 'ready';
    $('start-goal').hidden = goalSeen || s.status !== 'ready';
    board.classList.toggle('zone-guide', !goalSeen && s.status === 'ready');
    const struckOut = s.status === 'out';
    $('strike-label').textContent = struckOut ? '3 STRIKES' : '2 STRIKES';
    $('strike-count').classList.toggle('struck-out', struckOut);
    $('strike-count').setAttribute('aria-label', struckOut ? 'Three strikes. Round over.' : 'Two strikes. A miss ends the round.');
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
      $('now-payout').textContent = k ? money(rewardDisplay ? rewardDisplay.cashout : s.cashout) : '—';
      $('next-payout').textContent = '1.05–5×';
      $('round-difficulty-value').textContent = s.difficulty.toUpperCase();
      fitNumber($('now-payout'), 6, 40); fitNumber($('next-payout'), 6, 40);
    }
    $('action').disabled = isBusy() || (active && k === 0);
    $('action').setAttribute('aria-busy', String(isBusy())); board.setAttribute('aria-busy', String(isBusy()));
    $('action-label').textContent = active ? isBusy() ? 'SWINGING' : 'CASH OUT' : finished ? 'PLAY AGAIN' : 'START ROUND';
    let amount;
    if (active) amount = k ? money(rewardDisplay ? rewardDisplay.cashout : s.cashout) + ' CR' : 'PICK A ZONE';
    else { try { amount = money(readBet()) + ' CR'; } catch { amount = 'ENTER BET'; } }
    $('action-amount').textContent = amount;
    $('probability').textContent = `${s.difficulty.toUpperCase()} · ${active ? `Bet ${money(s.bet)} CR` : finished ? 'Round complete' : `Hit chance ${Math.round(s.successProbability * 100)}%`}`;
    $('odds-caption').textContent = `${s.difficulty.toUpperCase()} · RTP ${Math.round(s.rtp * 100)}%`;
    const first = MinesEngine.balance.initial[s.rtpVersion][s.difficulty], later = MinesEngine.balance.secondary[s.difficulty];
    $('symbol-odds').innerHTML = MinesEngine.balance.symbols.map((symbol, index) => `<tr><th scope="row">${symbol.label}</th><td>×${(symbol.factor / 100).toFixed(2)}</td><td>${(first[index] / 100).toFixed(2)}%</td><td>${(later[index] / 100).toFixed(2)}%</td></tr>`).join('');
  }
  return { board, tiles, message, readBet, render, holdRewards, animateRewards, cancelRewards };
}
