const test = require('node:test');
const assert = require('node:assert/strict');
const { createPlayHistory } = require('../poc/src/game/ui/play-history.js');
const { MinesGame } = require('../poc/src/domain/mines-engine.js');

test('history counts only committed selections, never reservations or end-of-round reveals', () => {
  let ticket = 1200;
  const game = new MinesGame(() => ticket), history = createPlayHistory();
  game.start(10000, 'easy'); history.begin();
  game.reserve(12); history.sync(game.snapshot(), game.triggered);
  assert.equal(history.read('easy').rounds.length, 0);
  game.reveal(12); history.sync(game.snapshot(), game.triggered);
  history.sync(game.snapshot(), game.triggered);
  ticket = 0; game.reserve(4); game.reveal(4);
  assert.equal(game.snapshot().board.filter(Boolean).length, 25);
  history.sync(game.snapshot(), game.triggered);
  const view = history.read('easy');
  assert.equal(view.rounds.length, 1);
  assert.equal(view.cells.reduce((sum, cell) => sum + cell.total, 0), 2);
  assert.equal(view.cells[12].counts.single, 1);
  assert.equal(view.cells[4].counts.out, 1);
  assert.equal(view.latest, 4);
  assert.equal(view.rounds[0].payout, 0);
});

test('cashout, new rounds, and balance resets preserve distinct session records and actual payout', () => {
  const game = new MinesGame(() => 1200), history = createPlayHistory();
  game.start(10000, 'easy'); history.begin(); game.reveal(0);
  history.sync(game.snapshot(), game.triggered);
  game.cashout(); history.sync(game.snapshot(), game.triggered);
  game.reset(); history.sync(game.snapshot(), game.triggered);
  game.start(10000, 'easy'); history.begin(); game.reveal(1);
  history.sync(game.snapshot(), game.triggered);
  const records = history.read('easy').rounds;
  assert.deepEqual(records.map(record => record.id), [2, 1]);
  assert.equal(records[1].status, 'cashed');
  assert.equal(records[1].payout, 10500);
});

test('last 30 rounds are retained per difficulty and oldest selections leave the heatmap', () => {
  const history = createPlayHistory();
  for (const difficulty of ['easy', 'medium', 'hard']) for (let n = 0; n < 32; n++) {
    history.begin();
    history.sync({ difficulty, status: 'cashed', bet: 100, displayMultiplier: 1.05, cashout: 105, hits: [n < 2 ? 0 : 12], board: Array(25).fill('single') }, null);
  }
  for (const difficulty of ['easy', 'medium', 'hard']) {
    const view = history.read(difficulty);
    assert.equal(view.rounds.length, 30);
    assert.equal(view.cells[0].total, 0);
    assert.equal(view.cells[12].total, 30);
  }
});
