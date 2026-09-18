function createDifficultyPanel({ $, game, render: renderGame, prepareRound }) {
  const panel = $('difficulty-panel'), balance = MinesEngine.balance;
  let phase = 'first';
  const sheets = { easy: 'pitcher-sprites.png', medium: 'pitcher-medium.png', hard: 'pitcher-hard.png' };
  const forms = { easy: 'OVERHAND', medium: 'SUBMARINE', hard: 'TWIST DELIVERY' };
  const cards = balance.difficulties.map(level => {
    const button = document.createElement('button'); button.type = 'button'; button.className = 'pitcher-choice';
    button.dataset.difficulty = level;
    button.innerHTML = '<span class="choice-portrait" aria-hidden="true"></span><strong>' + level.toUpperCase() + '</strong><span class="choice-form">' + forms[level] + '</span><span class="choice-chance"></span><small>HIT CHANCE</small>';
    button.querySelector('.choice-portrait').style.backgroundImage = 'url(assets/' + sheets[level] + ')';
    button.addEventListener('click', () => {
      if (game.status === 'playing') return;
      game.setDifficulty(level); renderGame(); refresh();
    });
    $('pitcher-choices').append(button); return button;
  });
  function refresh() {
    const snapshot = game.snapshot(), first = balance.initial[snapshot.rtpVersion];
    const table = phase === 'first' ? first : balance.secondary;
    cards.forEach(button => {
      const level = button.dataset.difficulty;
      button.setAttribute('aria-pressed', String(level === snapshot.difficulty));
      button.querySelector('.choice-chance').textContent = ((10000 - table[level][0]) / 100).toFixed(0) + '%';
    });
    panel.querySelectorAll('[data-odds-phase]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.oddsPhase === phase)));
    $('difficulty-odds-caption').textContent = (phase === 'first' ? 'FIRST PITCH' : 'LATER PITCHES') + ' · RESULT CHANCE';
    $('difficulty-odds').innerHTML = balance.symbols.map((symbol, index) => '<tr><th scope="row">' + symbol.label + (symbol.factor ? '<small>×' + (symbol.factor / 100).toFixed(2) + '</small>' : '') + '</th>' + balance.difficulties.map(level => '<td' + (level === snapshot.difficulty ? ' class="selected-odds"' : '') + '>' + (table[level][index] / 100).toFixed(2) + '%</td>').join('') + '</tr>').join('');
    $('choose-pitcher').textContent = 'USE ' + snapshot.difficulty.toUpperCase() + ' PITCHER';
  }
  $('difficulty').addEventListener('click', () => {
    if ($('difficulty').disabled || game.status === 'playing') return;
    if (game.status !== 'ready') prepareRound();
    phase = 'first'; refresh(); panel.showModal(); panel.scrollTop = 0;
  });
  panel.querySelectorAll('[data-odds-phase]').forEach(button => button.addEventListener('click', () => { phase = button.dataset.oddsPhase; refresh(); }));
  $('close-difficulty').addEventListener('click', () => panel.close());
  $('choose-pitcher').addEventListener('click', () => panel.close());
  panel.addEventListener('click', event => {
    if (event.target !== panel) return;
    const rect = panel.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) panel.close();
  });
}
