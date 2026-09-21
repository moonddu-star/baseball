const $ = id => document.getElementById(id);
const game = new MinesEngine.MinesGame();
const surface = document.querySelector('.game');
// Keep the calibrated 9:16 field separate from the responsive controls below it.
const stage = document.querySelector('.game-stage');
let busy = false, roundNumber = 0, decisionHintSeen = false;
const batRig = new BaseballSwing($('bat'), stage);
const pitcherAura = createPitcherAura({ canvas: $('pitcher-aura'), surface: stage });
// Supplied extra-base / home-run cheers; a separate cash-out cheer remains optional.
const audio = createGameAudio({ celebrationFiles: { 'extra-base': 'assets/sfx-cheer-normal.mp3', 'home-run': 'assets/sfx-cheer-strong.mp3', win: null } });
const { tone } = audio;
const { tiles, message, readBet, render: renderView, holdRewards, animateRewards, cancelRewards } = createGameView({ $, game, surface, isBusy: () => busy, onSwing: i => swing(i) });
const history = createPlayHistory();
createHistoryPanel({ $, history, getDifficulty: () => game.difficulty });
createDifficultyPanel({ $, game, render, prepareRound });
const { showResult } = createResultPanel({ $, game, getRoundNumber: () => roundNumber });
const { flash, clearEffects, windPitch, followPitch, releasePoint, hitDestination, swingBat, animateBall } = createPitchEffects({ $, surface: stage, batRig, phaseSurface: surface });
function render() {
  renderView();
  history.sync(game.snapshot(), game.triggered);
  $('history').disabled = busy;
  audio.setRoundActive(game.status !== 'ready');
  const earned = ['playing', 'cashed', 'cleared'].includes(game.status) ? game.snapshot().multiplier : 0;
  pitcherAura.setMultiplier(earned);
}
function extraBaseHitStreak(snapshot) {
  // Count committed selections in play order, not slot order or audible events.
  // A single breaks the chain; each new round has an empty hit history.
  let streak = 0;
  for (let i = snapshot.hits.length - 1; i >= 0; i--) {
    if (!['double', 'triple', 'home-run'].includes(snapshot.board[snapshot.hits[i]])) break;
    streak++;
  }
  return streak;
}
function prepareRound() {
  if (busy || game.status === 'playing') throw Error('Finish the current round first.');
  if ($('result').open) $('result').close();
  game.prepare();
  clearEffects(); render(); message('SET YOUR BET'); $('bet').focus({ preventScroll: true });
}
function startRound() {
  if (busy) throw Error('A swing is in progress. Please wait.');
  game.start(readBet(), game.difficulty);
  if ($('result').open) $('result').close();
  history.begin();
  roundNumber++; clearEffects(); message('PICK A ZONE'); render(); return game.snapshot();
}
function cashOut() {
  if (busy) throw Error('A swing is in progress. Please wait.');
  const value = game.cashout(); render(); clearEffects();
  message(`Cashed out ${money(value)} CR`, 'win'); tone('cash'); if (value > game.bet) tone('win'); showResult(); return game.snapshot();
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const OUT_RESULT_HOLD_MS = 1200;
async function swing(i) {
  if (busy) throw Error('A swing is in progress. Please wait.');
  if (game.status !== 'playing' || !Number.isInteger(i) || i < 0 || i >= 25 || game.hits.has(i)) throw Error('This zone is unavailable.');
  // Core gameplay motion always runs; only the in-game speed selector changes timing.
  const quick = $('motion-mode').value === 'quick';
  const timing = quick
    ? { wind: 320, release: 80, flight: 180, follow: 120, swingFollow: 180 }
    : { wind: 320, release: 80, flight: 360, follow: 120, swingFollow: 180 };
  busy = true; render(); tiles[i].classList.add('targeted');
  surface.dataset.phase = 'windup'; message('');
  const rect = tiles[i].getBoundingClientRect(), parent = stage.getBoundingClientRect();
  const target = { x: rect.left + rect.width / 2 - parent.left, y: rect.top + rect.height / 2 - parent.top };
  let batAnimation = null, rewardAnimation = Promise.resolve();
  try {
    const selectedSymbol = game.reserve(i);
    const failed = selectedSymbol === 'out';
    await windPitch(timing.wind, timing.release);
    batAnimation = swingBat(target, timing.flight, timing.swingFollow, failed, Math.floor(i / 5), i % 5, 'miss');
    const origin = releasePoint();
    $('pitch').dataset.fromX = origin.x; $('pitch').dataset.fromY = origin.y;
    $('pitch').dataset.toX = target.x; $('pitch').dataset.toY = target.y;
    surface.dataset.phase = 'flight'; tone('pitch');
    const flight = animateBall(origin, target, timing.flight, false, batAnimation);
    const pitcherFinish = followPitch(timing.flight);
    await flight;
    const beforeHit = game.snapshot();
    const outcome = game.reveal(i);
    if (outcome !== 'out') { holdRewards(beforeHit); render(); }
    surface.dataset.phase = 'contact';
    $('contact').style.left = target.x + 'px'; $('contact').style.top = target.y + 'px';
    if (outcome !== 'out') {
      const hitCallouts = { single: 'SINGLE', double: 'DOUBLE', triple: 'TRIPLE', 'home-run': 'HOME RUN!' };
      tiles[i].classList.add('new-hit'); tone('hit', selectedSymbol);
      const cheer = { streak: extraBaseHitStreak(game.snapshot()), symbol: selectedSymbol };
      if (selectedSymbol === 'home-run') tone('home-run', cheer);
      else if (selectedSymbol === 'double' || selectedSymbol === 'triple') tone('extra-base', cheer);
      const symbol = MinesEngine.symbolById[game.snapshot().board[i]];
      flash(hitCallouts[game.snapshot().board[i]]);
      rewardAnimation = animateRewards(game.snapshot());
      $('contact').animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(.35)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.65)' }], { duration: timing.follow, fill: 'none' });
      message(`${symbol.label} · ×${(symbol.factor / 100).toFixed(2)}`, 'win');
      const destination = hitDestination(selectedSymbol);
      await animateBall(target, destination, destination.flight.duration, true, batAnimation);
    } else {
      tone('miss'); message('', 'error');
      // Every OUT is a clean swing-and-miss: no contact flash or upward deflection.
      await animateBall(target, target, 180, true, batAnimation);
    }
    await Promise.all([pitcherFinish, batAnimation?.finished.catch(() => {}), rewardAnimation]);
    if (outcome === 'out') {
      surface.dataset.phase = 'strike-three'; render();
      message('STRIKE THREE', 'error');
      await pause(320);
      surface.dataset.phase = 'strikeout';
      flash('STRIKEOUT!', true, true);
      message('STREAK ENDED', 'error');
      await pause(OUT_RESULT_HOLD_MS);
    }
    busy = false; render(); surface.dataset.phase = 'idle';
    if (game.status === 'playing' && game.snapshot().hits.length === 1 && !decisionHintSeen) {
      decisionHintSeen = true; message('KEEP GOING OR CASH OUT', 'win decision-hint');
    }
    if (outcome === 'cleared') { message(money(game.lastPayout) + ' CR automatically cashed out', 'win'); tone('cash'); tone('win'); showResult(); }
    else if (outcome === 'out') showResult();
    return game.snapshot();
  } catch (error) {
    // Finish an already-selected result even if its presentation fails; never reroll it.
    if (game.status === 'playing' && game.snapshot().board[i] === null) game.reveal(i);
    if (game.status === 'out' || game.status === 'cleared') showResult();
    throw error;
  } finally { cancelRewards(); busy = false; clearEffects(); render(); }
}
function resetRound() { try { game.reset(); roundNumber = 0; if ($('result').open) $('result').close(); clearEffects(); render(); message('BALANCE RESET'); } catch (error) { message(error.message, 'error'); } }
bindControls({ $, game, audio, render, message, prepareRound, startRound, cashOut, resetRound });
render();
registerModelContext({ $, game, isBusy: () => busy, startRound, swing, cashOut });

window.dispatchEvent(new CustomEvent('clutch-hit:ready', { detail: { audioReady: audio.ready } }));
// If the loader script itself was unavailable, keep a visible recovery action.
if (!$('loading-screen').dataset.controller) {
  $('loading-status').textContent = 'LOAD FAILED. TRY AGAIN.';
  $('loading-screen').setAttribute('aria-busy', 'false');
  const retry = document.createElement('button');
  retry.id = 'loading-retry'; retry.type = 'button'; retry.textContent = 'TRY AGAIN';
  retry.onclick = () => location.reload();
  $('loading-recovery').replaceChildren(retry);
}
