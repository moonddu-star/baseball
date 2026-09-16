const $ = id => document.getElementById(id);
const game = new MinesEngine.MinesGame();
const surface = document.querySelector('.game');
// Keep the calibrated 9:16 field separate from the responsive controls below it.
const stage = document.querySelector('.game-stage');
let busy = false, roundNumber = 0;
const batRig = new BaseballSwing($('bat'), stage);
const pitcherAura = createPitcherAura({ canvas: $('pitcher-aura'), surface: stage });
const audio = createGameAudio();
const { tone } = audio;
const { tiles, message, readBet, render: renderView } = createGameView({ $, game, surface, isBusy: () => busy, onSwing: i => swing(i) });
const { showResult } = createResultPanel({ $, game, getRoundNumber: () => roundNumber });
const { flash, clearEffects, windPitch, followPitch, releasePoint, hitDestination, swingBat, animateBall } = createPitchEffects({ $, surface: stage, batRig, phaseSurface: surface });
function render() {
  renderView();
  audio.setRoundActive(game.status !== 'ready');
  const earned = ['playing', 'cashed', 'cleared'].includes(game.status) ? game.snapshot().multiplier : 0;
  pitcherAura.setMultiplier(earned);
}
function prepareRound() {
  if (busy || game.status === 'playing') throw Error('Finish the current round first.');
  if ($('result').open) $('result').close();
  game.prepare();
  clearEffects(); render(); message('Set your bet and step up to the plate.'); $('bet').focus({ preventScroll: true });
}
function startRound() {
  if (busy) throw Error('A swing is in progress. Please wait.');
  game.start(readBet(), game.difficulty);
  if ($('result').open) $('result').close();
  roundNumber++; clearEffects(); message('Pick a zone to swing.'); render(); return game.snapshot();
}
function cashOut() {
  if (busy) throw Error('A swing is in progress. Please wait.');
  const value = game.cashout(); render(); clearEffects();
  message(`Cashed out ${money(value)} CR`, 'win'); tone('cash'); showResult(); return game.snapshot();
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const OUT_RESULT_HOLD_MS = 1200;
async function swing(i) {
  if (busy) throw Error('A swing is in progress. Please wait.');
  if (game.status !== 'playing' || !Number.isInteger(i) || i < 0 || i >= 25 || game.hits.has(i)) throw Error('This zone is unavailable.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quick = $('motion-mode').value === 'quick';
  const timing = reduce ? { wind: 0, release: 0, flight: 0, follow: 0, hitFlight: 0, swingFollow: 0 } : quick
    ? { wind: 320, release: 80, flight: 180, follow: 120, hitFlight: 420, swingFollow: 180 }
    : { wind: 320, release: 80, flight: 360, follow: 120, hitFlight: 420, swingFollow: 180 };
  busy = true; render(); tiles[i].classList.add('targeted');
  surface.dataset.phase = 'windup'; message('Here comes the pitch…');
  const rect = tiles[i].getBoundingClientRect(), parent = stage.getBoundingClientRect();
  const target = { x: rect.left + rect.width / 2 - parent.left, y: rect.top + rect.height / 2 - parent.top };
  let batAnimation = null;
  try {
    const selectedSymbol = game.reserve(i);
    const failed = selectedSymbol === 'out';
    const failureStyle = failed && Math.random() < .5 ? 'glance' : 'miss';
    await windPitch(timing.wind, timing.release);
    batAnimation = swingBat(target, timing.flight, timing.swingFollow, failed, Math.floor(i / 5), i % 5, failureStyle);
    const origin = releasePoint();
    $('pitch').dataset.fromX = origin.x; $('pitch').dataset.fromY = origin.y;
    $('pitch').dataset.toX = target.x; $('pitch').dataset.toY = target.y;
    surface.dataset.phase = 'flight'; tone('pitch');
    const flight = animateBall(origin, target, timing.flight, false, batAnimation);
    const pitcherFinish = followPitch(timing.flight);
    await flight;
    const outcome = game.reveal(i); render(); surface.dataset.phase = 'contact';
    $('contact').style.left = target.x + 'px'; $('contact').style.top = target.y + 'px';
    if (outcome !== 'out') {
      const hitCallouts = { single: 'Single', double: 'Double', triple: 'Triple', 'home-run': 'Home Run!' };
      tiles[i].classList.add('new-hit'); tone('hit'); flash(hitCallouts[game.snapshot().board[i]]);
      if (!reduce) $('contact').animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(.35)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.65)' }], { duration: timing.follow, fill: 'none' });
      const symbol = MinesEngine.symbolById[game.snapshot().board[i]];
      message(`${symbol.label} · ×${(symbol.factor / 100).toFixed(2)} · Keep swinging or cash out.`, 'win');
      const destination = hitDestination();
      await animateBall(target, destination, timing.hitFlight, true, batAnimation);
    } else {
      const glanced = failureStyle === 'glance';
      tone(glanced ? 'glance' : 'miss'); flash('OUT!', true, true); message('OUT! · Lost ' + money(game.bet) + ' CR', 'error');
      if (glanced && !reduce) $('contact').animate([{ opacity: .65, transform: 'translate(-50%,-50%) scale(.2)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(.65)' }], { duration: 100, fill: 'none' });
      await animateBall(target, target, reduce ? 0 : glanced ? 360 : 180, true, batAnimation);
    }
    await Promise.all([pitcherFinish, batAnimation?.finished.catch(() => {})]);
    if (outcome === 'out') {
      surface.dataset.phase = 'out-hold';
      await pause(OUT_RESULT_HOLD_MS);
    }
    busy = false; render(); surface.dataset.phase = 'idle';
    if (outcome === 'cleared') { message(money(game.lastPayout) + ' CR automatically cashed out', 'win'); tone('cash'); showResult(); }
    else if (outcome === 'out') showResult();
    return game.snapshot();
  } catch (error) {
    // Finish an already-selected result even if its presentation fails; never reroll it.
    if (game.status === 'playing' && game.snapshot().board[i] === null) game.reveal(i);
    if (game.status === 'out' || game.status === 'cleared') showResult();
    throw error;
  } finally { busy = false; clearEffects(); render(); }
}
function resetRound() { try { game.reset(); roundNumber = 0; if ($('result').open) $('result').close(); clearEffects(); render(); message('Balance reset to 1,000 CR.'); } catch (error) { message(error.message, 'error'); } }
bindControls({ $, game, audio, render, message, prepareRound, startRound, cashOut, resetRound });
render();
registerModelContext({ $, game, isBusy: () => busy, startRound, swing, cashOut });
