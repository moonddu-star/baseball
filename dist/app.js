'use strict';
const $ = id => document.getElementById(id);
const game = new MinesEngine.MinesGame();
const surface = document.querySelector('.game');
let busy = false, sound = false, audioContext = null, roundNumber = 0;
const money = cents => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const multiple = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '×';
const batRig = new BaseballSwing($('bat'), surface);
const board = $('board'), tiles = [];
for (let i = 0; i < 25; i++) {
  const tile = document.createElement('button');
  tile.className = 'tile';
  tile.addEventListener('click', () => swing(i).catch(error => message(error.message, 'error')));
  tiles.push(tile); board.append(tile);
}
for (let i = 1; i <= 24; i++) $('mines').add(new Option(i, i, i === 3, i === 3));
function message(text, type = '') {
  $('message').textContent = text;
  $('message').className = 'round-message ' + type;
}
function readBet() {
  const text = $('bet').value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(text)) throw Error('베팅 금액은 소수 둘째 자리까지 입력하세요.');
  const [whole, fraction = ''] = text.split('.');
  return Number(whole) * 100 + Number(fraction.padEnd(2, '0'));
}
function fitNumber(el, max, available) {
  el.style.fontSize = Math.min(max, available / Math.max(el.textContent.length, 1)) + 'cqw';
}
function render() {
  const s = game.snapshot(), active = s.status === 'playing';
  const finished = ['out', 'cashed', 'cleared'].includes(s.status), k = s.hits.length;
  const m = active || finished ? s.mines : Number($('mines').value);
  $('balance').innerHTML = money(s.balance) + ' <small>CR</small>';
  $('multiplier').innerHTML = (active || finished ? multiple(s.status === 'out' ? 0 : s.multiplier) : '1.00×').replace('×', '<span>×</span>');
  $('next').textContent = finished ? '—' : s.status === 'ready' ? multiple(MinesEngine.multiplier(m, 1)) : s.nextMultiplier !== null ? multiple(s.nextMultiplier) : '—';
  $('hit-count').textContent = k + ' HITS';
  fitNumber($('multiplier'), 8.8, 42); fitNumber($('next'), 8.1, 42);
  $('bet').disabled = active || busy; $('mines').disabled = active || busy;
  $('reset').disabled = active || busy; $('lock').textContent = active ? '· 잠김' : '';
  $('round-tag').textContent = busy ? 'PITCH INCOMING' : s.status.toUpperCase();
  board.classList.toggle('inactive', !active);
  surface.dataset.state = s.status;
  tiles.forEach((tile, i) => {
    const hit = game.hits.has(i), hazard = finished && game.hazards.has(i);
    tile.className = 'tile' + (hit ? ' hit' : hazard ? ' out' : finished ? ' revealed-safe' : '') + (game.triggered === i ? ' triggered' : '');
    tile.disabled = !active || busy || hit;
    tile.innerHTML = hit ? '<span class="ball" aria-hidden="true">⚾</span><b>HIT</b>' : hazard ? '<span class="out-mark" aria-hidden="true">×</span><b>OUT</b>' : finished ? '<span aria-hidden="true">✓</span>' : '<span class="diamond" aria-hidden="true"></span>';
    tile.setAttribute('aria-label', `${Math.floor(i / 5) + 1}행 ${i % 5 + 1}열 ${hit ? '타격 성공' : hazard ? '위험 코스' : finished ? '안전 코스' : '미공개'}`);
  });
  document.querySelector('.settings').hidden = active;
  $('comparison').hidden = !active;
  if (active) {
    $('now-payout').textContent = k ? money(s.cashout) : '—';
    $('next-payout').textContent = s.nextMultiplier !== null ? money(MinesEngine.payout(s.bet, m, k + 1)) : '—';
    $('next-chance').textContent = (100 * s.successProbability).toFixed(2) + '%';
    fitNumber($('now-payout'), 4.5, 33); fitNumber($('next-payout'), 4.5, 33); fitNumber($('next-chance'), 4.4, 34);
  }
  $('action').disabled = busy || (active && k === 0);
  $('action-label').textContent = active ? busy ? '타격 중' : '상금 확정' : finished ? '다시 타석에 들어서기' : '타석에 들어서기';
  let amount;
  if (active) amount = k ? money(s.cashout) + ' CR' : '코스를 선택하세요';
  else { try { amount = money(readBet()) + ' CR'; } catch { amount = '베팅 금액 입력'; } }
  $('action-amount').textContent = amount;
  const p = s.status === 'ready' ? (25 - m) / 25 : s.successProbability;
  $('probability').textContent = active ? `베팅 ${money(s.bet)} CR · 위험 ${m}개` : finished ? '지급액은 원금을 포함합니다' : `첫 성공 확률 ${(100 * p).toFixed(2)}%`;
  $('remaining').textContent = '안전 코스 ' + (s.status === 'ready' ? 25 - m : s.remainingSafe);
}
function tone(kind) {
  if (!sound) return;
  try {
    audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
    void audioContext.resume();
    const t = audioContext.currentTime;
    if (kind === 'hit' || kind === 'out' || kind === 'pitch') {
      const length = kind === 'pitch' ? .14 : .10;
      const buffer = audioContext.createBuffer(1, audioContext.sampleRate * length, audioContext.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
      const source = audioContext.createBufferSource(), filter = audioContext.createBiquadFilter(), gain = audioContext.createGain();
      source.buffer = buffer; filter.type = kind === 'hit' ? 'highpass' : 'lowpass';
      filter.frequency.value = kind === 'hit' ? 1500 : kind === 'out' ? 320 : 1100;
      gain.gain.setValueAtTime(kind === 'hit' ? .25 : .12, t); gain.gain.exponentialRampToValueAtTime(.001, t + length);
      source.connect(filter); filter.connect(gain); gain.connect(audioContext.destination); source.start(t);
    } else {
      const osc = audioContext.createOscillator(), gain = audioContext.createGain();
      osc.connect(gain); gain.connect(audioContext.destination); osc.frequency.setValueAtTime(660, t);
      osc.frequency.exponentialRampToValueAtTime(990, t + .15); gain.gain.setValueAtTime(.04, t);
      gain.gain.exponentialRampToValueAtTime(.001, t + .25); osc.start(t); osc.stop(t + .26);
    }
  } catch {}
}
function flash(text, red = false) {
  const el = $('feedback'); el.textContent = text; el.className = 'feedback' + (red ? ' red' : '');
  void el.offsetWidth; el.classList.add('show');
}
function clearEffects() {
  batRig.cancel();
  [$('pitch'), $('contact'), $('pitcher-ghost')].forEach(el => { el.getAnimations().forEach(animation => animation.cancel()); el.style.opacity = '0'; });
  $('feedback').classList.remove('show'); surface.dataset.phase = 'idle'; pitcherFrame(0, false); $('pitcher-ghost').getAnimations().forEach(a => a.cancel()); $('pitcher-ghost').style.opacity = '0';
}
function pitcherFrame(frame, blend = true) {
  const actor = $('pitcher'), ghost = $('pitcher-ghost');
  const previous = Number(actor.dataset.frame || 0);
  actor.dataset.frame = String(frame);
  ghost.getAnimations().forEach(a => a.cancel());
  ghost.style.opacity = '0';
  if (blend && previous !== frame && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
    ghost.style.backgroundPosition = (previous / 3 * 100) + '% center';
    ghost.animate([{ opacity: .8 }, { opacity: 0 }], { duration: 65, easing: 'ease-out' });
  }
  actor.style.backgroundPosition = (frame / 3 * 100) + '% center';
}
function releasePoint() {
  const anchor = $('release-point').getBoundingClientRect();
  const stage = surface.getBoundingClientRect();
  return { x: anchor.left - stage.left, y: anchor.top - stage.top };
}
function swingBat(target, lead, follow, miss, row) {
  return batRig.play(target, lead, follow, miss, row);
}
function syncBatClock(animation, startTime) {
  if (animation) animation.startTime = startTime;
}
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
function showResult() {
  const s = game.snapshot(), lost = s.status === 'out', profit = s.cashout - s.bet;
  $('result').classList.toggle('loss', lost);
  $('result-round').textContent = String(roundNumber).padStart(2, '0');
  $('result-kind').textContent = lost ? 'OUT · ROUND OVER' : s.status === 'cleared' ? 'ALL ZONES CLEARED' : 'CASHED OUT';
  $('result-title').textContent = lost ? '라운드 종료' : s.status === 'cleared' ? '전 코스 타격 성공' : '상금 확정';
  $('result-hits').textContent = s.hits.length + ' HITS';
  $('result-multiplier').textContent = multiple(lost ? 0 : s.multiplier);
  $('result-bet').textContent = money(s.bet) + ' CR';
  $('result-payout').innerHTML = money(s.cashout) + ' <small>CR</small>';
  $('result-profit').textContent = (profit > 0 ? '+' : profit < 0 ? '−' : '') + money(Math.abs(profit)) + ' CR';
  $('result-balance').textContent = money(s.balance) + ' CR';
  if (!$('result').open) $('result').showModal();
}
function cashOut() {
  if (busy) throw Error('타격 중입니다. 잠시 기다려주세요.');
  const value = game.cashout(); render(); clearEffects();
  message(`${money(value)} CR 상금 확정`, 'win'); tone('cash'); showResult(); return game.snapshot();
}
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
async function animateBall(from, to, duration, hitBack = false, batClock = null) {
  if (!duration) return;
  const transform = (p, scale, rotation) => `translate3d(${p.x}px,${p.y}px,0) translate(-50%,-50%) scale(${scale}) rotate(${rotation}deg)`;
  const mid = { x: from.x + (to.x - from.x) * .6, y: from.y + (to.y - from.y) * .45 - (hitBack ? 30 : 5) };
  const animation = $('pitch').animate([
    { transform: transform(from, hitBack ? 1 : .2, 0), opacity: 1, filter: 'blur(0px)' },
    { transform: transform(mid, hitBack ? .65 : .65, 150), opacity: 1, offset: .6 },
    { transform: transform(to, hitBack ? .06 : 1, 330), opacity: hitBack ? 0 : 1, filter: 'blur(.3px)' }
  ], { duration, easing: hitBack ? 'ease-out' : 'cubic-bezier(.55,.05,.8,.55)', fill: 'forwards' });
  if (batClock) {
    if (hitBack) animation.startTime = batClock.startTime + batClock.contactTime;
    else {
      const startTime = document.timeline.currentTime;
      animation.startTime = startTime;
      syncBatClock(batClock, startTime - (batClock.contactTime - duration));
    }
  }
  try { await animation.finished; } finally { animation.cancel(); }
}
async function swing(i) {
  if (busy) throw Error('타격 중입니다. 잠시 기다려주세요.');
  if (game.status !== 'playing' || !Number.isInteger(i) || i < 0 || i >= 25 || game.hits.has(i)) throw Error('선택할 수 없는 코스입니다.');
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quick = $('motion-mode').value === 'quick';
  const timing = reduce ? { wind: 0, release: 0, flight: 0, follow: 0 } : quick
    ? { wind: 85, release: 25, flight: 180, follow: 180 }
    : { wind: 190, release: 55, flight: 360, follow: 340 };
  busy = true; render(); tiles[i].classList.add('targeted');
  surface.dataset.phase = 'windup'; message('선택한 코스로 공이 들어옵니다…');
  const rect = tiles[i].getBoundingClientRect(), parent = surface.getBoundingClientRect();
  const target = { x: rect.left + rect.width / 2 - parent.left, y: rect.top + rect.height / 2 - parent.top };
  let batAnimation = null;
  try {
    batAnimation = swingBat(target, timing.wind + timing.release + timing.flight, timing.follow, game.hazards.has(i), Math.floor(i / 5));
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
$('action').addEventListener('click', () => { try { if (game.status === 'playing') cashOut(); else startRound(); } catch (error) { message(error.message, 'error'); } });
$('bet').addEventListener('input', () => { if (game.status !== 'playing') render(); });
$('mines').addEventListener('change', () => { if (game.status !== 'playing') { if (game.status !== 'ready') prepareRound(); else render(); } });
$('reset').addEventListener('click', () => { try { game.reset(); roundNumber = 0; if ($('result').open) $('result').close(); clearEffects(); render(); message('크레딧을 1,000 CR로 초기화했습니다'); } catch (error) { message(error.message, 'error'); } });
$('prepare-next').addEventListener('click', prepareRound);
$('close-result').addEventListener('click', () => $('result').close());
$('view-board').addEventListener('click', () => $('result').close());
$('help').addEventListener('click', () => $('rules').showModal());
$('close-help').addEventListener('click', () => $('rules').close());
$('rules').addEventListener('click', event => { if (event.target === $('rules')) { const rect = $('rules').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('rules').close(); } });
$('sound').addEventListener('click', () => { sound = !sound; $('sound').setAttribute('aria-pressed', String(sound)); $('sound').setAttribute('aria-label', sound ? '소리 끄기' : '소리 켜기'); tone('hit'); });
render();
const context=document.modelContext;if(context?.registerTool){const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});const definitions=[{name:'read_game_state',description:'Read visible demo game state. Does not expose hidden danger zones.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true},execute:()=>({...game.snapshot(),busy})},{name:'start_demo_round',description:'Set a bet and danger count, then start a new demo round using virtual credits.',inputSchema:{type:'object',properties:{betCredits:{type:'number',minimum:1,maximum:1000},dangerZones:{type:'integer',minimum:1,maximum:24}},required:['betCredits','dangerZones'],additionalProperties:false},execute:input=>{if(!input||typeof input.betCredits!=='number'||!Number.isFinite(input.betCredits)||input.betCredits<1||input.betCredits>1000||Math.abs(Math.round(input.betCredits*100)-input.betCredits*100)>1e-7||!Number.isInteger(input.dangerZones)||input.dangerZones<1||input.dangerZones>24||game.status==='playing'||busy)throw Error('Invalid round settings or round already active');$('bet').value=String(input.betCredits);$('mines').value=String(input.dangerZones);return startRound();}},{name:'select_pitch_zone',description:'Select one unrevealed zone, trigger its pitch animation, then return HIT or OUT game state.',inputSchema:{type:'object',properties:{row:{type:'integer',minimum:1,maximum:5},column:{type:'integer',minimum:1,maximum:5}},required:['row','column'],additionalProperties:false},execute:async input=>{if(!input||!Number.isInteger(input.row)||input.row<1||input.row>5||!Number.isInteger(input.column)||input.column<1||input.column>5)throw Error('Invalid zone');return swing((input.row-1)*5+input.column-1);}},{name:'cash_out_demo_round',description:'Finish the current round and credit the displayed payout after at least one HIT.',inputSchema:{type:'object',properties:{},additionalProperties:false},execute:()=>cashOut()}];for(const tool of definitions){try{Promise.resolve(context.registerTool({...tool,annotations:{readOnlyHint:false,untrustedContentHint:false,...tool.annotations}},{signal:lifecycle.signal})).catch(()=>{});}catch{}}}



