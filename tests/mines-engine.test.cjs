'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MinesGame, choose, multiplier, payout } = require('../poc/src/domain/mines-engine.js');
test('all hit counts retain 99% mathematical return before currency truncation', () => {
  for (let mines = 1; mines <= 24; mines++) {
    for (let hits = 1; hits <= 25 - mines; hits++) {
      const probability = Number(choose(25 - mines, hits)) / Number(choose(25, hits));
      assert.ok(Math.abs(probability * multiplier(mines, hits) - .99) < 1e-12);
    }
  }
  assert.equal(payout(10000, 3, 1), 11250);
});
test('HIT, cashout, replay, OUT and reset preserve credit settlement', () => {
  const game = new MinesGame(() => 0);
  game.start(10000, 3);
  assert.equal(game.balance, 90000);
  assert.throws(() => game.cashout());
  assert.equal(game.reveal(0), 'hit');
  assert.throws(() => game.reveal(0));
  assert.equal(game.cashout(), 11250);
  assert.equal(game.balance, 101250);
  assert.throws(() => game.cashout());
  game.start(10000, 3);
  assert.equal(game.reveal(1), 'out');
  assert.equal(game.balance, 91250);
  assert.equal(game.lastPayout, 0);
  game.reset();
  assert.equal(game.balance, 100000);
  assert.equal(game.status, 'ready');
});
test('last safe tile automatically settles once', () => {
  const game = new MinesGame(() => 0);
  game.start(10000, 24);
  assert.equal(game.reveal(0), 'cleared');
  assert.equal(game.lastPayout, 247500);
  assert.equal(game.balance, 337500);
  assert.throws(() => game.cashout());
});
