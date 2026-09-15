const $ = id => document.getElementById(id);
const game = new MinesEngine.MinesGame();
const surface = document.querySelector('.game');
let busy = false, roundNumber = 0;
const batRig = new BaseballSwing($('bat'), surface);
const audio = createGameAudio();
const { tone } = audio;
const { tiles, message, readBet, render } = createGameView({ $, game, surface, isBusy: () => busy, onSwing: i => swing(i) });
const { showResult } = createResultPanel({ $, game, getRoundNumber: () => roundNumber });
const { flash, clearEffects, pitcherFrame, releasePoint, swingBat, animateBall } = createPitchEffects({ $, surface, batRig });
function prepareRound() {
  if (busy || game.status === 'playing') throw Error('진행 중인 라운드를 먼저 마쳐주세요.');
  if ($('result').open) $('result').close();
  game.status = 'ready'; game.hits.clear(); game.hazards.clear(); game.lastPayout = 0; game.triggered = null;
  clearEffects(); render(); message('베팅을 설정하고 타석에 들어서세요'); $('bet').focus({ preventScroll: true });
}
function startRound() {
  if (busy) throw Error('타격 중입니다. 잠시 기다려주세요.');
  game.start(readBet(), Number($('mines').value));
  if ($('result').open) $('result').close();
  roundNumber++; clearEffects(); message('타격할 코스를 선택하세요'); render(); return game.snapshot();
}
function cashOut() {
  if (busy) throw Error('타격 중입니다. 잠시 기다려주세요.');
  const value = game.cashout(); render(); clearEffects();
  message(`${money(value)} CR 상금 확정`, 'win'); tone('cash'); showResult(); return game.snapshot();
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function swing(i) {
  if (busy) throw Error('타격 중입니다. 잠시 기다려주세요.');
  if (game.status !== 'playing' || !Number.isInteger(i) || i < 0 || i >= 25 || game.hits.has(i)) throw Error('선택할 수 없는 코스입니다.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quick = $('motion-mode').value === 'quick';
  const timing = reduce ? { wind: 0, release: 0, flight: 0, follow: 0 } : quick
    ? { wind: 85, release: 25, flight: 180, follow: 120 }
    : { wind: 190, release: 55, flight: 360, follow: 120 };
  busy = true; render(); tiles[i].classList.add('targeted');
  surface.dataset.phase = 'windup'; message('선택한 코스로 공이 들어옵니다…');
  const rect = tiles[i].getBoundingClientRect(), parent = surface.getBoundingClientRect();
  const target = { x: rect.left + rect.width / 2 - parent.left, y: rect.top + rect.height / 2 - parent.top };
  let batAnimation = null;
  try {
    batAnimation = swingBat(target, timing.wind + timing.release + timing.flight, timing.follow, game.hazards.has(i), Math.floor(i / 5), i % 5);
    pitcherFrame(reduce ? 0 : 1); await pause(timing.wind);
    pitcherFrame(reduce ? 0 : 2); await pause(timing.release);
    const origin = releasePoint();
    $('pitch').dataset.fromX = origin.x; $('pitch').dataset.fromY = origin.y;
    $('pitch').dataset.toX = target.x; $('pitch').dataset.toY = target.y;
    surface.dataset.phase = 'flight'; tone('pitch');
    const flight = animateBall(origin, target, timing.flight, false, batAnimation);
    await pause(timing.flight * .35); pitcherFrame(reduce ? 0 : 3);
    await flight;
    const outcome = game.reveal(i); render(); surface.dataset.phase = 'contact';
    $('contact').style.left = target.x + 'px'; $('contact').style.top = target.y + 'px';
    if (outcome !== 'out') {
      tiles[i].classList.add('new-hit'); tone('hit'); flash('HIT!');
      if (!reduce) $('contact').animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(.35)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.65)' }], { duration: timing.follow, fill: 'none' });
      message('타격 성공 · 계속 공략하거나 상금을 확정하세요', 'win');
      const destination = { x: parent.width * (.24 + i % 5 * .12), y: parent.height * .13 };
      await animateBall(target, destination, timing.follow, true, batAnimation);
    } else {
      tone('out'); flash('OUT', true); message('OUT · 이번 라운드 −' + money(game.bet) + ' CR', 'error');
      await animateBall(target, { x: parent.width * .45, y: parent.height * .755 }, timing.follow, true, batAnimation);
    }
    if (batAnimation) await batAnimation.finished.catch(() => {});
    busy = false; render(); surface.dataset.phase = 'idle';
    if (outcome === 'cleared') { message(money(game.lastPayout) + ' CR 자동 확정', 'win'); tone('cash'); showResult(); }
    else if (outcome === 'out') showResult();
    return game.snapshot();
  } finally { busy = false; clearEffects(); render(); }
}
function resetRound() { try { game.reset(); roundNumber = 0; if ($('result').open) $('result').close(); clearEffects(); render(); message('크레딧을 1,000 CR로 초기화했습니다'); } catch (error) { message(error.message, 'error'); } }
bindControls({ $, game, audio, render, message, prepareRound, startRound, cashOut, resetRound });
render();
registerModelContext({ $, game, isBusy: () => busy, startRound, swing, cashOut });
