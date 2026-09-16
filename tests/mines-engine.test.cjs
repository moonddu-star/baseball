'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { MinesGame, balance, drawSymbol, shouldAutoCashOut } = require('../poc/src/domain/mines-engine.js');
const tickets = (values, fallback = 1200) => { const queue = [...values]; return () => queue.length ? queue.shift() : fallback; };

test('GDD first-cell tables for all 4 versions and 3 difficulties retain exact probabilities', () => {
  const expected = {
    1: [[1200,7180,1252,309,59],[2000,4850,2100,875,175],[3200,3171,2002,1162,465]],
    2: [[1200,7761,802,199,38],[2000,5300,1800,750,150],[3200,3444,1851,1075,430]],
    3: [[1200,8340,355,88,17],[2000,5750,1500,625,125],[3200,3716,1701,988,395]],
    4: [[1200,8646,113,34,7],[2000,5971,1350,567,112],[3200,3843,1634,946,377]]
  };
  for (const [version, rows] of Object.entries(expected)) {
    balance.difficulties.forEach((difficulty, i) => {
      const weights = balance.initial[version][difficulty];
      assert.deepEqual(weights, rows[i]); assert.equal(weights.reduce((a,b)=>a+b), 10000);
      const counts = Object.fromEntries(balance.symbols.map(s => [s.id,0]));
      for(let ticket=0;ticket<10000;ticket++) counts[drawSymbol(weights,()=>ticket)]++;
      assert.deepEqual(Object.values(counts), rows[i]);
      const expectedReturn = weights.reduce((sum,p,j)=>sum+p*balance.symbols[j].factor/1000000,0);
      assert.ok(Math.abs(expectedReturn-balance.rtp[version])<.0001);
    });
  }
  assert.equal(balance.activeVersion,1);
});
test('later cells preserve the GDD tables, fixed OUT chance and unit expected multiplier',()=>{
  const rows = [[1200,6600,1700,420,80],[2000,4400,2400,1000,200],[3200,2900,2150,1250,500]];
  balance.difficulties.forEach((difficulty,i)=>{
    assert.deepEqual(balance.secondary[difficulty],rows[i]);
    assert.equal(rows[i].reduce((a,b)=>a+b),10000);
    assert.ok(Math.abs(rows[i].reduce((sum,p,j)=>sum+p*balance.symbols[j].factor/1000000,0)-1)<1e-12);
  });
});
test('round start draws no hidden board; selected outcome is reserved once and hidden until contact',()=>{
  let calls=0;const game=new MinesGame(()=>{calls++;return 8000});
  game.start(10000,'easy');assert.equal(calls,0);assert.ok(game.snapshot().board.every(x=>x===null));
  assert.equal(game.reserve(4),'single');assert.equal(game.reserve(4),'single');assert.equal(calls,1);
  assert.equal(game.snapshot().board[4],null);assert.deepEqual(game.snapshot().hits,[]);
  assert.throws(()=>game.reserve(5));assert.throws(()=>game.cashout());assert.throws(()=>game.setDifficulty('hard'));
  assert.equal(game.reveal(4),'hit');assert.equal(calls,1);assert.equal(game.snapshot().board[4],'single');
  assert.equal(game.reveal(5),'hit');assert.equal(game.snapshot().board[5],'double'); // ticket 8000 changes type in the later table
  assert.equal(game.snapshot().successProbability,.88);
  assert.throws(()=>game.reveal(4));assert.equal(calls,2);
});
test('single, double, triple, home run multiply exactly and settlement credits only once',()=>{
  const game=new MinesGame(tickets([1200,8500,9600,9999]));game.start(10000,'easy');
  for(let i=0;i<4;i++)assert.equal(game.reveal(i),'hit');
  assert.deepEqual(game.snapshot().board.slice(0,4),['single','double','triple','home-run']);
  assert.equal(game.snapshot().multiplier,9.45);assert.equal(game.snapshot().cashout,94500);
  assert.equal(game.cashout(),94500);assert.equal(game.balance,184500);assert.throws(()=>game.cashout());
  assert.equal(game.snapshot().board.filter(Boolean).length,25);assert.equal(game.hits.size,4);
});
test('rounding is applied to final cents, not each symbol or cumulative multiplier',()=>{
  const game=new MinesGame(()=>1200);game.start(100,'easy');
  for(let i=0;i<3;i++)game.reveal(i);
  assert.equal(game.snapshot().multiplier,1.157625);assert.equal(game.snapshot().displayMultiplier,1.15);
  assert.equal(game.snapshot().cashout,115);assert.equal(game.cashout(),115);
});
test('OUT after success loses the full bet; revealed remaining cells never add bonuses',()=>{
  const game=new MinesGame(tickets([9999,0],9999));game.start(10000,'hard');game.reveal(0);
  assert.equal(game.reveal(1),'out');assert.equal(game.balance,90000);assert.equal(game.lastPayout,0);
  assert.equal(game.snapshot().multiplier,0);assert.equal(game.hits.size,1);
  assert.equal(game.snapshot().board[24],'home-run');assert.throws(()=>game.cashout());
  game.prepare();assert.ok(game.snapshot().board.every(x=>x===null));assert.equal(game.snapshot().multiplier,1);
  game.setDifficulty('medium');game.start(10000);assert.equal(game.difficulty,'medium');
});
test('zero-OUT and all-OUT boards are possible, without a fixed danger count',()=>{
  const out=new MinesGame(()=>0);out.start(10000,'easy');out.reveal(0);
  assert.ok(out.snapshot().board.every(x=>x==='out'));
  const safe=new MinesGame(()=>1200);safe.start(10000,'easy');safe.reveal(0);safe.cashout();
  assert.ok(safe.snapshot().board.every(x=>x==='single'));assert.equal(safe.lastPayout,10500);
});
test('all 25 successful cells auto-settle once',()=>{
  const game=new MinesGame(()=>1200);game.start(10000,'easy');
  for(let i=0;i<24;i++)assert.equal(game.reveal(i),'hit');
  assert.equal(game.reveal(24),'cleared');assert.equal(game.completionReason,'board');
  assert.equal(game.lastPayout,Number(10000n*105n**25n/100n**25n));assert.throws(()=>game.cashout());
});
test('threshold is strictly greater than 10000 and pays the entire overshoot',()=>{
  assert.equal(shouldAutoCashOut(10000n,1n,24),false);
  assert.equal(shouldAutoCashOut(1000001n,100n,24),true);
  const game=new MinesGame(()=>9999);game.start(10000,'hard');
  for(let i=0;i<5;i++)assert.equal(game.reveal(i),'hit');
  assert.equal(game.reveal(5),'cleared');assert.equal(game.completionReason,'threshold');
  assert.equal(game.snapshot().multiplier,15625);assert.equal(game.lastPayout,156250000);
  assert.equal(game.hits.size,6);assert.equal(game.balance,156340000);assert.throws(()=>game.reveal(6));
});
test('invalid settings and RNG leave credits intact, and active rounds cannot reset',()=>{
  const game=new MinesGame(()=>10000);assert.equal(game.difficulty,'easy');
  for(const bet of [0,99,100001,NaN,Infinity,100.5])assert.throws(()=>game.start(bet,'easy'));
  assert.throws(()=>game.start(100,'extreme'));assert.equal(game.balance,100000);
  game.start(10000,'easy');assert.throws(()=>game.reveal(0));assert.equal(game.balance,90000);
  assert.ok(game.snapshot().board.every(x=>x===null));assert.throws(()=>game.reset());assert.throws(()=>game.prepare());
  game.random=()=>0;game.reveal(0);game.reset();assert.equal(game.balance,100000);assert.equal(game.status,'ready');
});
