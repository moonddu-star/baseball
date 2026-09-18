function createHistoryPanel({ $, history, getDifficulty }) {
  const dialog = $('history-panel'), grid = $('history-grid');
  let difficulty = getDifficulty(), selected = null;
  const labels = { single: '1B', double: '2B', triple: '3B', 'home-run': 'HR', out: 'OUT' };
  const buttons = Array.from({ length: 25 }, (_, index) => {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'heat-cell';
    button.addEventListener('click', () => { selected = index; render(); });
    grid.append(button); return button;
  });
  function render() {
    const data = history.read(difficulty), max = Math.max(1, ...data.cells.map(cell => cell.total));
    const plays = data.cells.reduce((sum, cell) => sum + cell.total, 0);
    $('history-scope').textContent = `${difficulty.toUpperCase()} · ${data.rounds.length} / 30 RECENT ROUNDS`;
    $('history-total').textContent = `${plays} ${plays === 1 ? 'SELECTION' : 'SELECTIONS'}`;
    document.querySelectorAll('[data-history-difficulty]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.historyDifficulty === difficulty)));
    buttons.forEach((button, index) => {
      const cell = data.cells[index], strength = cell.total / max;
      button.style.setProperty('--heat', cell.total ? .16 + strength * .68 : 0);
      button.classList.toggle('has-plays', cell.total > 0);
      button.classList.toggle('latest', data.latest === index);
      button.textContent = cell.total || '·';
      button.setAttribute('aria-pressed', String(selected === index));
      button.setAttribute('aria-label', `Row ${Math.floor(index / 5) + 1}, column ${index % 5 + 1}: ${cell.total} selections${data.latest === index ? ', latest selection' : ''}`);
    });
    const cell = selected === null ? null : data.cells[selected];
    $('history-zone').textContent = cell ? `ROW ${Math.floor(selected / 5) + 1} · COL ${selected % 5 + 1}` : 'TAP A ZONE';
    $('history-zone-total').textContent = cell ? `${cell.total} ${cell.total === 1 ? 'selection' : 'selections'}` : 'View result counts';
    $('history-counts').replaceChildren(...Object.entries(labels).map(([symbol, label]) => {
      const item = document.createElement('div'); item.dataset.symbol = symbol;
      const name = document.createElement('span'); name.textContent = label;
      const count = document.createElement('strong'); count.textContent = cell ? cell.counts[symbol] : '—';
      item.append(name, count); return item;
    }));
    $('history-empty').hidden = plays > 0;
    $('history-rounds').replaceChildren(...data.rounds.map(round => {
      const row = document.createElement('li'); row.className = 'history-round';
      const heading = document.createElement('div'); heading.className = 'history-round-heading';
      const title = document.createElement('strong'); title.textContent = `ROUND ${String(round.id).padStart(2, '0')}`;
      const state = document.createElement('span'); state.textContent = { playing: 'IN PLAY', out: 'OUT', cashed: 'CASHED OUT', cleared: 'AUTO CASH OUT' }[round.status];
      heading.append(title, state);
      const results = document.createElement('div'); results.className = 'history-symbols';
      for (const play of round.plays) {
        const badge = document.createElement('span'); badge.dataset.symbol = play.symbol; badge.textContent = labels[play.symbol];
        badge.title = `Row ${Math.floor(play.index / 5) + 1}, column ${play.index % 5 + 1}`; results.append(badge);
      }
      const detail = document.createElement('div'); detail.className = 'history-round-detail';
      const multiplier = document.createElement('span'); multiplier.textContent = multiple(round.multiplier);
      const payout = document.createElement('span'); payout.textContent = `${round.status === 'playing' ? 'CASH OUT NOW' : 'PAYOUT'} ${money(round.payout)} CR`;
      detail.append(multiplier, payout); row.append(heading, results, detail); return row;
    }));
  }
  $('history').addEventListener('click', () => {
    difficulty = getDifficulty(); selected = history.read(difficulty).latest;
    render(); dialog.showModal(); dialog.scrollTop = 0;
  });
  $('close-history').addEventListener('click', () => dialog.close());
  document.querySelectorAll('[data-history-difficulty]').forEach(button => button.addEventListener('click', () => {
    difficulty = button.dataset.historyDifficulty; selected = history.read(difficulty).latest; render();
  }));
  dialog.addEventListener('click', event => {
    if (event.target !== dialog) return;
    const r = dialog.getBoundingClientRect();
    if (event.clientX < r.left || event.clientX > r.right || event.clientY < r.top || event.clientY > r.bottom) dialog.close();
  });
}
