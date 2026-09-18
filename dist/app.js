'use strict';
(function () {
// Source: poc/src/game/shared/format.js
const money = cents => (cents / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const multiple = value => value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '×';

// Source: poc/src/game/audio/game-audio.js
function createGameAudio({ celebrationFiles = {} } = {}) {
  const preferenceKey = 'strike-zone-sound-enabled';
  const musicTracks = { intro: { url: 'assets/intro-bg.mp3', level: .15 }, game: { url: 'assets/baseball-bg.mp3', level: .16 } };
  let musicMode = 'intro', musicLevel = musicTracks.intro.level;
  const effectFiles = { click: 'assets/sfx-click.mp3', hit: 'assets/sfx-hit.mp3', 'hit-single': 'assets/sfx-hit-single.mp3', 'hit-strong': 'assets/sfx-hit-strong.mp3', out: 'assets/sfx-out.mp3' };
  // Optional supplied recordings only: no missing-file requests or synthetic crowd placeholder.
  for (const kind of ['extra-base', 'home-run', 'win']) if (celebrationFiles[kind]) effectFiles[kind] = celebrationFiles[kind];
  const effectBuffers = new Map();
  // Fetch ahead of the first gesture, but only create the audio context on interaction.
  const effectBytes = Object.entries(effectFiles).map(([kind, url]) =>
    fetch(url).then(response => { if (!response.ok) throw Error('Audio asset unavailable'); return response.arrayBuffer(); }).then(bytes => ({ kind, bytes })).catch(() => null));
  function decodeEffects() {
    const engine = context;
    for (const pending of effectBytes) void pending.then(async entry => {
      if (!entry) return;
      const buffer = await engine.decodeAudioData(entry.bytes.slice(0));
      if (context === engine) effectBuffers.set(entry.kind, buffer);
    }).catch(() => {});
  }
  let enabled = true, unlocked = false, context = null, master = null, musicGain = null, effectsGain = null, hitInput = null;
  let music = null, noiseBuffer = null, pageActive = true, celebrationVoice = null;
  const voices = new Set(), lastPlayed = new Map();
  try { enabled = localStorage.getItem(preferenceKey) !== 'false'; } catch {}

  function initialize() {
    if (context) return true;
    const AudioEngine = window.AudioContext || window.webkitAudioContext;
    if (!AudioEngine) return false;
    try {
      context = new AudioEngine();
      master = context.createGain(); master.gain.value = .8; master.connect(context.destination);
      musicGain = context.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
      effectsGain = context.createGain(); effectsGain.gain.value = .7; effectsGain.connect(master);
      // HIT has a separate mix: keep its transient below clipping and give small speakers an audible body.
      hitInput = context.createGain();
      const hitHighpass = context.createBiquadFilter(); hitHighpass.type = 'highpass'; hitHighpass.frequency.value = 120;
      const hitPresence = context.createBiquadFilter(); hitPresence.type = 'peaking'; hitPresence.frequency.value = 1800; hitPresence.Q.value = .8; hitPresence.gain.value = 3;
      const hitCompressor = context.createDynamicsCompressor();
      hitCompressor.threshold.value = -23; hitCompressor.knee.value = 18; hitCompressor.ratio.value = 5;
      hitCompressor.attack.value = .002; hitCompressor.release.value = .09;
      const hitMakeup = context.createGain(); hitMakeup.gain.value = 1.7;
      const hitLimiter = context.createWaveShaper(), curve = new Float32Array(2049);
      for (let i = 0; i < curve.length; i++) { const x = i * 2 / (curve.length - 1) - 1; curve[i] = .9 * Math.tanh(x / .9); }
      hitLimiter.curve = curve; hitLimiter.oversample = '2x';
      hitInput.connect(hitHighpass).connect(hitPresence).connect(hitCompressor).connect(hitMakeup).connect(hitLimiter).connect(effectsGain);
      music = new Audio(musicTracks[musicMode].url); music.loop = true; music.preload = 'none';
      context.createMediaElementSource(music).connect(musicGain);
      noiseBuffer = context.createBuffer(1, Math.ceil(context.sampleRate * .4), context.sampleRate);
      const samples = noiseBuffer.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
      decodeEffects();
      return true;
    } catch {
      if (music) music.pause();
      if (context) void context.close().catch(() => {});
      context = null; master = null; musicGain = null; effectsGain = null; hitInput = null; music = null; noiseBuffer = null;
      return false;
    }
  }
  function stopEffects() {
    for (const voice of voices) { try { voice.stop(); } catch {} }
    voices.clear(); lastPlayed.clear(); celebrationVoice = null;
  }
  function pauseAudio() {
    stopEffects();
    if (music) music.pause();
    if (context) {
      master.gain.cancelScheduledValues(context.currentTime); master.gain.setValueAtTime(0, context.currentTime);
      void context.suspend().catch(() => {});
    }
  }
  function activate() {
    if (!enabled || document.hidden || !pageActive) return;
    unlocked = true;
    if (!initialize()) return;
    master.gain.setValueAtTime(.8, context.currentTime);
    void context.resume().catch(() => {});
    if (music.paused) {
      const now = context.currentTime;
      musicGain.gain.cancelScheduledValues(now); musicGain.gain.setValueAtTime(0, now);
      musicGain.gain.linearRampToValueAtTime(musicLevel, now + .8);
      const started = music.play();
      if (started) void started.then(() => { if (!enabled || document.hidden || !pageActive) music.pause(); }).catch(() => {});
    }
  }
  function setRoundActive(active) {
    const next = active ? 'game' : 'intro';
    if (next === musicMode) return;
    stopCelebration();
    musicMode = next; musicLevel = musicTracks[next].level;
    if (!music) return;
    // A single media element ensures menu and round music never overlap.
    music.pause(); music.src = musicTracks[next].url; music.load();
    if (unlocked && enabled) activate();
  }
  function sample(kind, volume, offset = 0) {
    const buffer = effectBuffers.get(kind);
    if (!buffer) return false;
    const source = context.createBufferSource(), gain = context.createGain();
    source.buffer = buffer; gain.gain.value = volume;
    source.connect(gain); gain.connect(['hit', 'hit-single', 'hit-strong'].includes(kind) ? hitInput : effectsGain); track(source, [gain]);
    source.effectGain = gain;
    source.start(context.currentTime, offset);
    return source;
  }
  function stopCelebration(fade = 0) {
    if (!celebrationVoice) return;
    const source = celebrationVoice; celebrationVoice = null;
    try {
      if (fade && context && source.effectGain) {
        const now = context.currentTime, gain = source.effectGain.gain;
        gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now);
        gain.linearRampToValueAtTime(0, now + fade); source.stop(now + fade);
      } else source.stop();
    } catch {}
  }
  function celebrate(kind, streak = 1, symbol) {
    if (!effectBuffers.has(kind)) return; // Do not queue a cheer for a late-loading file.
    if (celebrationVoice && voices.has(celebrationVoice)) {
      // Cash-out preserves the hit cheer; a new hit takes over with a short fade.
      if (kind === 'win') return;
      stopCelebration(.08);
    }
    const tier = Math.max(0, Math.min(3, Math.floor(Number.isFinite(streak) ? streak : 1) - 1));
    const levels = kind === 'extra-base' && symbol === 'triple' ? [1, 1.05, 1.10, 1.15] : [.55, .60, .65, .70];
    const volume = kind === 'win' ? .55 : levels[tier];
    const source = sample(kind, volume);
    if (!source) return;
    celebrationVoice = source;
    duck(.4, Math.min(source.buffer.duration, 4));
  }
  function duck(ratio, hold) {
    const now = context.currentTime, gain = musicGain.gain;
    gain.cancelScheduledValues(now); gain.setValueAtTime(gain.value, now);
    gain.linearRampToValueAtTime(musicLevel * ratio, now + .035);
    gain.setValueAtTime(musicLevel * ratio, now + hold);
    gain.linearRampToValueAtTime(musicLevel, now + hold + .35);
  }
  function track(source, nodes) {
    if (voices.size >= 24) { try { voices.values().next().value.stop(); } catch {} }
    voices.add(source);
    source.onended = () => { voices.delete(source); source.disconnect(); nodes.forEach(node => node.disconnect()); };
  }
  function note(frequency, endFrequency, duration, volume, delay = 0, type = 'sine', output = effectsGain) {
    const start = context.currentTime + delay, source = context.createOscillator(), gain = context.createGain();
    source.type = type; source.frequency.setValueAtTime(frequency, start); source.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(volume, start + .004); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(gain); gain.connect(output); track(source, [gain]); source.start(start); source.stop(start + duration + .015);
  }
  function noise(duration, volume, frequency, endFrequency, delay = 0, attack = .006, output = effectsGain) {
    const start = context.currentTime + delay, source = context.createBufferSource(), filter = context.createBiquadFilter(), gain = context.createGain();
    source.buffer = noiseBuffer; filter.type = 'bandpass'; filter.Q.value = .65;
    filter.frequency.setValueAtTime(frequency, start); filter.frequency.exponentialRampToValueAtTime(endFrequency, start + duration);
    gain.gain.setValueAtTime(.0001, start); gain.gain.linearRampToValueAtTime(volume, start + attack); gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
    source.connect(filter); filter.connect(gain); gain.connect(output); track(source, [filter, gain]); source.start(start); source.stop(start + duration + .015);
  }
  function outCue(delay = 0) {
    note(310, 250, .14, .085, delay, 'triangle'); note(230, 170, .20, .075, delay + .11, 'triangle');
  }
  function tone(kind, detail) {
    if (!enabled || !unlocked || !context || document.hidden || context.state === 'closed' || !pageActive) return;
    const now = context.currentTime, gap = kind === 'click' ? .04 : .08;
    if (now - (lastPlayed.get(kind) ?? -Infinity) < gap) return;
    lastPlayed.set(kind, now);
    if (kind === 'miss' || kind === 'out' || kind === 'glance') stopCelebration(.08);
    if (kind === 'click') {
      if (!sample('click', .35)) note(760, 440, .055, .055, 0, 'triangle');
    } else if (kind === 'pitch') {
      noise(.14, .075, 800, 1700, 0, .035);
    } else if (kind === 'hit') {
      const hitSample = detail === 'single' ? 'hit-single' : detail === 'double' ? 'hit-strong' : 'hit';
      // Home runs use the strongest impact gain; the shared compressor/limiter remains active.
      const impactGain = detail === 'home-run' ? 2 : 1;
      const recordedHit = sample(hitSample, impactGain, .07);
      // Keep a short contact body audible even on small speakers or when the sample is unavailable.
      noise(.065, recordedHit ? .12 : .20, 2600, 1600, 0, .003, hitInput);
      note(660, 520, .16, recordedHit ? .14 : .18, 0, 'triangle', hitInput);
      note(1550, 1100, .085, .09, 0, 'triangle', hitInput);
      duck(.45, .5);
    } else if (kind === 'glance') {
      noise(.025, .09, 1900, 1300); note(520, 380, .06, .07); if (!sample('out', .35, .015)) outCue(.12); duck(.65, 1.1);
    } else if (kind === 'miss') {
      noise(.13, .08, 1700, 600, 0, .035); if (!sample('out', .35, .015)) outCue(.10); duck(.65, 1.1);
    } else if (kind === 'out') {
      if (!sample('out', .35, .015)) outCue(); duck(.65, 1.1);
    } else if (kind === 'extra-base' || kind === 'home-run' || kind === 'win') {
      celebrate(kind, detail?.streak, detail?.symbol);
    } else if (kind === 'cash') {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, i) => note(frequency, frequency, .23, .075, i * .075, 'triangle'));
      duck(.7, .4);
    }
  }
  function setEnabled(value) {
    enabled = Boolean(value);
    try { localStorage.setItem(preferenceKey, String(enabled)); } catch {}
    if (enabled) activate(); else pauseAudio();
    return enabled;
  }
  document.addEventListener('visibilitychange', () => { if (document.hidden) pauseAudio(); else if (unlocked && enabled) activate(); });
  window.addEventListener('pagehide', () => { pageActive = false; pauseAudio(); });
  window.addEventListener('pageshow', () => { pageActive = true; if (unlocked && enabled) activate(); });
  return { tone, activate, stopEffects, setRoundActive, setEnabled, toggle: () => setEnabled(!enabled), get enabled() { return enabled; } };
}

// Source: poc/src/game/ui/game-view.js
function createGameView({ $, game, surface, isBusy, onSwing }) {
  const board = $('board'), tiles = [], symbols = MinesEngine.symbolById;
  // Show onboarding once per page load, including after refresh.
  let goalSeen = false;
  let rewardDisplay = null, rewardFrame = 0, finishReward = null;

  for (let i = 0; i < 25; i++) {
    const tile = document.createElement('button');
    tile.className = 'tile';
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
    // Consume the entire onboarding, including its bat, after the first valid round starts.
    if (active && !goalSeen) {
      goalSeen = true;
    }
    $('start-guide').hidden = goalSeen || s.status !== 'ready';
    $('start-goal').hidden = goalSeen || s.status !== 'ready';
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
    $('action-label').textContent = active ? isBusy() ? 'SWINGING' : 'CASH OUT' : finished ? 'PLAY AGAIN' : 'STEP UP TO THE PLATE';
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

// Source: poc/src/game/ui/difficulty-panel.js
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

// Source: poc/src/game/ui/play-history.js
// Session-only history. Revealed, unplayed board cells never enter this store.
function createPlayHistory() {
  let sequence = 0, current = null;
  const rounds = [];
  function begin() { current = { id: ++sequence }; }
  function sync(snapshot, triggered) {
    if (!current || snapshot.status === 'ready') return;
    const indexes = [...snapshot.hits];
    if (Number.isInteger(triggered)) indexes.push(triggered);
    if (!indexes.length) return;
    Object.assign(current, {
      difficulty: snapshot.difficulty, status: snapshot.status, bet: snapshot.bet,
      multiplier: snapshot.displayMultiplier, payout: snapshot.cashout,
      plays: indexes.map(index => ({ index, symbol: snapshot.board[index] }))
    });
    if (!rounds.includes(current)) rounds.push(current);
    const matching = rounds.filter(round => round.difficulty === current.difficulty);
    for (const expired of matching.slice(0, -30)) rounds.splice(rounds.indexOf(expired), 1);
  }
  function read(difficulty) {
    const selected = rounds.filter(round => round.difficulty === difficulty);
    const cells = Array.from({ length: 25 }, () => ({ total: 0, counts: { single: 0, double: 0, triple: 0, 'home-run': 0, out: 0 } }));
    for (const round of selected) for (const play of round.plays) {
      cells[play.index].total++;
      cells[play.index].counts[play.symbol]++;
    }
    const last = selected.at(-1)?.plays.at(-1)?.index ?? null;
    return { cells, latest: last, rounds: selected.slice().reverse().map(round => ({ ...round, plays: round.plays.map(play => ({ ...play })) })) };
  }
  return { begin, sync, read };
}
if (typeof module === 'object' && module.exports) module.exports = { createPlayHistory };

// Source: poc/src/game/ui/history-panel.js
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

// Source: poc/src/game/ui/result-panel.js
function createResultPanel({ $, game, getRoundNumber }) {
  function showResult() {
    const s = game.snapshot(), lost = s.status === 'out', profit = s.cashout - s.bet;
    $('result').classList.toggle('loss', lost);
    $('result-round').textContent = String(getRoundNumber()).padStart(2, '0');
    const clearedTitle = s.completionReason === 'threshold' ? 'AUTO CASH OUT' : 'ALL ZONES CLEARED';
    $('result-kind').textContent = lost ? 'STRIKE THREE · STREAK ENDED' : s.status === 'cleared' ? clearedTitle : 'CASHED OUT';
    $('result-title').textContent = lost ? 'ROUND OVER' : s.status === 'cleared' ? clearedTitle : 'CASHED OUT';
    $('result-hits').textContent = s.hits.length + (s.hits.length === 1 ? ' HIT' : ' HITS');
    $('result-multiplier').textContent = multiple(s.displayMultiplier);
    $('result-bet').textContent = money(s.bet) + ' CR';
    $('result-payout').innerHTML = money(s.cashout) + ' <small>CR</small>';
    $('result-profit').textContent = (profit > 0 ? '+' : profit < 0 ? '−' : '') + money(Math.abs(profit)) + ' CR';
    $('result-balance').textContent = money(s.balance) + ' CR';
    if (!$('result').open) $('result').showModal();
  }
  return { showResult };
}

// Source: poc/src/game/ui/bind-controls.js
function bindControls({ $, game, audio, render, message, prepareRound, startRound, cashOut, resetRound }) {
  function syncSoundButton() {
    $('sound').setAttribute('aria-pressed', String(audio.enabled));
    $('sound').setAttribute('aria-label', audio.enabled ? 'Mute sound' : 'Enable sound');
  }
  syncSoundButton();
  const timeKey = 'strike-zone-time-of-day';
  function setTimeOfDay(value, persist = false) {
    const mode = value === 'day' ? 'day' : 'night';
    document.querySelector('.game').dataset.timeOfDay = mode;
    $('time-of-day').value = mode;
    if (persist) { try { localStorage.setItem(timeKey, mode); } catch {} }
  }
  let savedTime = 'night';
  try { savedTime = localStorage.getItem(timeKey); } catch {}
  setTimeOfDay(savedTime);
  $('time-of-day').addEventListener('change', () => setTimeOfDay($('time-of-day').value, true));
  // Capture the user gesture before an action can disable its own button.
  document.querySelector('.game').addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button || button.disabled || button.id === 'sound') return;
    audio.activate(); audio.tone('click');
  }, true);
  document.querySelector('.game').addEventListener('change', event => {
    if (event.target.matches('select')) { audio.activate(); audio.tone('click'); }
  });
  $('action').addEventListener('click', () => { try { if (game.status === 'playing') cashOut(); else startRound(); } catch (error) { message(error.message, 'error'); } });
  $('bet').addEventListener('input', () => { if (game.status !== 'playing') render(); });
  $('reset').addEventListener('click', resetRound);
  $('prepare-next').addEventListener('click', prepareRound);
  $('close-result').addEventListener('click', () => $('result').close());
  $('view-board').addEventListener('click', () => $('result').close());
  $('help').addEventListener('click', () => $('rules').showModal());
  $('close-help').addEventListener('click', () => $('rules').close());
  $('rules').addEventListener('click', event => { if (event.target === $('rules')) { const rect = $('rules').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('rules').close(); } });
  $('sound').addEventListener('click', () => { audio.toggle(); syncSoundButton(); audio.tone('click'); });
}

// Source: poc/src/game/fx/pitch-effects.js
function createPitchEffects({ $, surface, batRig, phaseSurface = surface }) {
  let pitcherRun = 0;
  function flash(text, red = false, hold = false) {
    const el = $('feedback'); el.textContent = text; el.className = 'feedback' + (red ? ' red' : '') + (hold ? ' hold' : '');
    void el.offsetWidth; el.classList.add('show');
  }
  function clearEffects() {
    pitcherRun++;
    $('pitcher').getAnimations().forEach(animation => animation.cancel());
    $('pitcher').style.transform = 'none'; $('pitcher').dataset.phase = 'ready';
    batRig.cancel();
    [$('pitch'), $('contact'), $('pitcher-ghost')].forEach(el => { el.getAnimations().forEach(animation => animation.cancel()); el.style.opacity = '0'; });
    $('feedback').classList.remove('show', 'hold'); phaseSurface.dataset.phase = 'idle'; pitcherFrame(0, false); $('pitcher-ghost').getAnimations().forEach(a => a.cancel()); $('pitcher-ghost').style.opacity = '0';
  }
  function pitcherFrame(frame, blend = true, blendDuration = 65) {
    const actor = $('pitcher'), ghost = $('pitcher-ghost');
    const previous = Number(actor.dataset.frame || 0);
    actor.dataset.frame = String(frame);
    ghost.getAnimations().forEach(a => a.cancel());
    ghost.style.opacity = '0';
    if (blend && previous !== frame && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      ghost.style.backgroundPosition = (previous / 3 * 100) + '% center';
      ghost.animate([{ opacity: .8 }, { opacity: 0 }], { duration: blendDuration, easing: 'ease-out' });
    }
    actor.style.backgroundPosition = (frame / 3 * 100) + '% center';
  }
  async function pitcherStep(frame, phase, transform, duration, run) {
    if (run !== pitcherRun) return false;
    const actor = $('pitcher'), previous = getComputedStyle(actor).transform;
    actor.getAnimations().forEach(animation => animation.cancel());
    actor.dataset.phase = phase;
    pitcherFrame(frame, duration > 0, Math.min(75, duration * .5));
    actor.style.transform = transform;
    if (!duration) return run === pitcherRun;
    const animation = actor.animate([{ transform: previous }, { transform }], {
      duration, easing: 'cubic-bezier(.22,.61,.36,1)'
    });
    try { await animation.finished; } catch { return false; }
    return run === pitcherRun;
  }
  async function windPitch(wind, release) {
    const run = ++pitcherRun;
    if (!wind && !release) { pitcherFrame(0, false); return; }
    const stages = [
      [0, 'set', 'translate(0, .3%) rotate(0deg)', wind * .22],
      [1, 'leg-lift', 'translate(-.6%, -.5%) rotate(-.4deg)', wind * .45],
      [1, 'load', 'translate(-1.2%, 0) rotate(-.8deg)', wind * .33],
      [2, 'release', 'translate(.8%, .4%) rotate(.5deg)', release]
    ];
    // Use one deadline so frame waits between stages do not lengthen the delivery.
    let deadline = performance.now();
    for (const [frame, phase, transform, duration] of stages) {
      deadline += duration;
      if (!await pitcherStep(frame, phase, transform, Math.max(0, deadline - performance.now()), run)) return;
    }
  }
  async function followPitch(flight) {
    if (!flight) return;
    const run = pitcherRun;
    const stages = [
      [2, 'extension', 'translate(1.2%, .6%) rotate(.8deg)', flight * .12],
      [3, 'follow-through', 'translate(.8%, .3%) rotate(.4deg)', flight * .68],
      [0, 'recovery', 'translate(0, 0) rotate(0deg)', flight * .55]
    ];
    for (const stage of stages) if (!await pitcherStep(...stage, run)) return;
    if (run === pitcherRun) $('pitcher').dataset.phase = 'ready';
  }
  function releasePoint() {
    const anchor = $('release-point').getBoundingClientRect();
    const stage = surface.getBoundingClientRect();
    return { x: anchor.left - stage.left, y: anchor.top - stage.top };
  }
  function hitDestination(symbol) {
    const stage = surface.getBoundingClientRect(), pitcher = $('pitcher').getBoundingClientRect();
    const center = pitcher.left + pitcher.width / 2 - stage.left;
    // Choose once after contact; triple hits favor the deep left/right gaps.
    const flight = batRig.hitProfile(symbol);
    const side = Math.random() < .5 ? -1 : 1;
    const spread = side * (flight.spread + Math.random() * flight.spreadRange);
    return { x: center + stage.width * spread, y: stage.height * flight.endY, flight };
  }
  function swingBat(target, lead, follow, miss, row, column, failureStyle) {
    return batRig.play(target, lead, follow, miss, row, column, failureStyle);
  }
  async function animateBall(from, to, duration, hitBack = false, batClock = null) {
    $('pitch').style.opacity = '0';
    await batRig.animateBall(from, to, duration, hitBack, batClock);
  }
  return { flash, clearEffects, pitcherFrame, windPitch, followPitch, releasePoint, hitDestination, swingBat, animateBall };
}

// Source: poc/src/integration/model-context.js
function registerModelContext({ $, game, isBusy, startRound, swing, cashOut }) {
  const context = document.modelContext;
  if (!context?.registerTool) return;
  const lifecycle = new AbortController();
  window.addEventListener('pagehide', () => lifecycle.abort(), { once: true });
  const definitions = [
    {
      name: 'read_game_state', description: 'Read visible demo state, difficulty and revealed baseball symbols. Pending outcomes are not exposed.',
      inputSchema: { type: 'object', properties: {}, additionalProperties: false }, annotations: { readOnlyHint: true },
      execute: () => ({ ...game.snapshot(), busy: isBusy() })
    },
    {
      name: 'start_demo_round', description: 'Set bet and Easy/Medium/Hard difficulty, then start a virtual-credit round.',
      inputSchema: { type: 'object', properties: { betCredits: { type: 'number', minimum: 1, maximum: 1000 }, difficulty: { type: 'string', enum: ['easy', 'medium', 'hard'] } }, required: ['betCredits', 'difficulty'], additionalProperties: false },
      execute: input => {
        if (!input || typeof input.betCredits !== 'number' || !Number.isFinite(input.betCredits) || input.betCredits < 1 || input.betCredits > 1000 || Math.abs(Math.round(input.betCredits * 100) - input.betCredits * 100) > 1e-7 || !MinesEngine.balance.difficulties.includes(input.difficulty) || game.status === 'playing' || isBusy()) throw Error('Invalid round settings or round already active');
        game.setDifficulty(input.difficulty); $('bet').value = String(input.betCredits); return startRound();
      }
    },
    {
      name: 'select_pitch_zone', description: 'Select an unrevealed zone and return its baseball symbol result after the pitch.',
      inputSchema: { type: 'object', properties: { row: { type: 'integer', minimum: 1, maximum: 5 }, column: { type: 'integer', minimum: 1, maximum: 5 } }, required: ['row', 'column'], additionalProperties: false },
      execute: async input => {
        if (!input || !Number.isInteger(input.row) || input.row < 1 || input.row > 5 || !Number.isInteger(input.column) || input.column < 1 || input.column > 5) throw Error('Invalid zone');
        return swing((input.row - 1) * 5 + input.column - 1);
      }
    },
    { name: 'cash_out_demo_round', description: 'Credit the current payout after at least one successful hit.', inputSchema: { type: 'object', properties: {}, additionalProperties: false }, execute: () => cashOut() }
  ];
  for (const tool of definitions) {
    try { Promise.resolve(context.registerTool({ ...tool, annotations: { readOnlyHint: false, untrustedContentHint: false, ...tool.annotations } }, { signal: lifecycle.signal })).catch(() => {}); } catch {}
  }
}

// Source: poc/src/game/fx/pitcher-aura.js
// Cosmetic only: tiers follow the current earned multiplier, never the next payout.
function pitcherAuraTier(multiplier) {
  if (!Number.isFinite(multiplier)) return 0;
  return multiplier >= 10 ? 10 : multiplier >= 8 ? 8 : multiplier >= 4 ? 4 : multiplier >= 2 ? 2 : 0;
}

function createPitcherAura({ canvas, surface }) {
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const profiles = {
    2: { height: .49, spread: .20, flames: 9, sparks: 5, outer: '239,106,23', inner: '255,189,65', core: '255,222,143', glow: .16 },
    4: { height: .67, spread: .25, flames: 14, sparks: 10, outer: '242,66,13', inner: '255,153,34', core: '255,217,107', glow: .21 },
    8: { height: .82, spread: .30, flames: 20, sparks: 18, outer: '224,35,17', inner: '255,105,22', core: '255,202,92', glow: .26 },
    10: { height: .91, spread: .34, flames: 25, sparks: 26, outer: '235,48,16', inner: '255,174,38', core: '255,241,177', glow: .30 }
  };
  let tier = 0, frame = 0, lastDraw = -Infinity, changedAt = 0, width = 0, height = 0, dpr = 1, disposed = false;
  const fraction = value => value - Math.floor(value);
  const seed = index => fraction(Math.sin(index * 127.1 + 41.7) * 43758.5453);
  const rgba = (color, alpha) => `rgba(${color},${alpha})`;

  function clear() {
    if (ctx) ctx.clearRect(0, 0, width, height);
  }
  function stop() {
    cancelAnimationFrame(frame); frame = 0;
  }
  function draw(now) {
    if (!ctx || !tier || !width || !height) return;
    const p = profiles[tier], time = motion.matches ? 2.6 : now / 1000;
    const reveal = motion.matches ? 1 : Math.min(1, .65 + (now - changedAt) / 750);
    const cx = width / 2, base = height * .94, spread = width * p.spread;
    clear(); ctx.globalCompositeOperation = 'source-over';
    const glow = ctx.createRadialGradient(cx, base - height * .22, 0, cx, base - height * .22, height * .65);
    glow.addColorStop(0, rgba(p.inner, p.glow * reveal));
    glow.addColorStop(.5, rgba(p.outer, p.glow * .35 * reveal));
    glow.addColorStop(1, rgba(p.outer, 0));
    ctx.fillStyle = glow; ctx.fillRect(0, 0, width, height);

    // Two layers of tapered, curling flames rise from behind the planted feet.
    for (let layer = 0; layer < 2; layer++) {
      for (let i = 0; i < p.flames; i++) {
        const n = i + layer * 37, side = (i / Math.max(1, p.flames - 1) - .5) * 2;
        const x = cx + side * spread * (layer ? .82 : 1);
        const wave = Math.sin(time * (2.1 + seed(n) * 1.5) + n * 2.4);
        const length = height * p.height * (.56 + seed(n + 9) * .36) * (1 - Math.abs(side) * .45) * (1 + wave * .07) * (layer ? .76 : 1);
        const half = width * (.023 + seed(n + 4) * .022) * (layer ? .7 : 1);
        const curl = Math.sin(time * 2.7 + n * 1.9) * width * .045 + side * width * .025;
        const tipX = x + curl, tipY = base - length;
        const bend = Math.sin(time * 3.1 + n * 1.3) * width * .028;
        const flame = ctx.createLinearGradient(0, base, 0, tipY);
        flame.addColorStop(0, rgba(layer ? p.core : p.inner, 0));
        flame.addColorStop(.12, rgba(layer ? p.core : p.inner, .36 * reveal));
        flame.addColorStop(.3, rgba(layer ? p.inner : p.outer, .58 * reveal));
        flame.addColorStop(.72, rgba(layer ? p.core : p.inner, .48 * reveal));
        flame.addColorStop(1, rgba(p.inner, 0));
        ctx.fillStyle = flame;
        ctx.beginPath(); ctx.moveTo(x - half, base);
        ctx.bezierCurveTo(x - half * 1.6, base - length * .16, x + bend - half, base - length * .32, x + bend - half * .55, base - length * .50);
        ctx.bezierCurveTo(x + bend - half * .3, base - length * .66, tipX - half * .3, tipY + length * .12, tipX, tipY);
        ctx.bezierCurveTo(tipX + half * .4, tipY + length * .20, x + bend + half * .7, base - length * .36, x + bend + half, base - length * .30);
        ctx.bezierCurveTo(x + half * 1.8, base - length * .20, x + half, base - length * .06, x + half, base);
        ctx.closePath(); ctx.fill();
      }
    }
    if (!motion.matches) {
      for (let i = 0; i < p.sparks; i++) {
        const progress = fraction(time * (.32 + seed(i + 80) * .26) + seed(i + 71));
        const x = cx + (seed(i + 32) - .5) * spread * 2 + Math.sin(time * 2 + i) * width * .018;
        const y = base - height * (.12 + progress * p.height);
        const alpha = Math.sin(progress * Math.PI) * .8 * reveal;
        ctx.fillStyle = rgba(p.core, alpha);
        ctx.beginPath(); ctx.ellipse(x, y, width * .0035, height * (.005 + seed(i) * .006), .2, 0, Math.PI * 2); ctx.fill();
      }
    }
  }
  function tick(now) {
    frame = 0;
    if (disposed || !tier || motion.matches || document.hidden) return;
    if (now - lastDraw >= 1000 / 30) { draw(now); lastDraw = now; }
    frame = requestAnimationFrame(tick);
  }
  function refresh() {
    stop();
    if (disposed || !ctx || !tier) { clear(); return; }
    draw(performance.now());
    if (!motion.matches && !document.hidden) frame = requestAnimationFrame(tick);
  }
  function resize() {
    const rect = canvas.getBoundingClientRect();
    width = rect.width; height = rect.height; dpr = Math.min(devicePixelRatio || 1, 2);
    canvas.width = Math.round(width * dpr); canvas.height = Math.round(height * dpr);
    if (ctx) ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    refresh();
  }
  function setMultiplier(multiplier) {
    const next = pitcherAuraTier(multiplier);
    if (disposed || tier === next) return;
    tier = next; changedAt = performance.now(); lastDraw = -Infinity;
    canvas.dataset.tier = String(tier); canvas.style.opacity = tier ? '1' : '0';
    refresh();
  }
  const observer = new ResizeObserver(resize);
  observer.observe(surface);
  motion.addEventListener('change', refresh);
  document.addEventListener('visibilitychange', refresh);
  canvas.dataset.tier = '0'; canvas.style.opacity = '0'; resize();
  return {
    setMultiplier,
    destroy() {
      disposed = true; stop(); clear(); observer.disconnect();
      motion.removeEventListener('change', refresh); document.removeEventListener('visibilitychange', refresh);
      canvas.style.opacity = '0'; canvas.dataset.tier = '0';
    }
  };
}

// Source: poc/src/game/game-main.js
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
  clearEffects(); render(); message('Set your bet and step up to the plate.'); $('bet').focus({ preventScroll: true });
}
function startRound() {
  if (busy) throw Error('A swing is in progress. Please wait.');
  game.start(readBet(), game.difficulty);
  if ($('result').open) $('result').close();
  history.begin();
  roundNumber++; clearEffects(); message('Pick a zone to swing.'); render(); return game.snapshot();
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
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const quick = $('motion-mode').value === 'quick';
  const timing = reduce ? { wind: 0, release: 0, flight: 0, follow: 0, swingFollow: 0 } : quick
    ? { wind: 320, release: 80, flight: 180, follow: 120, swingFollow: 180 }
    : { wind: 320, release: 80, flight: 360, follow: 120, swingFollow: 180 };
  busy = true; render(); tiles[i].classList.add('targeted');
  surface.dataset.phase = 'windup'; message('Here comes the pitch…');
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
      if (!reduce) $('contact').animate([{ opacity: 1, transform: 'translate(-50%,-50%) scale(.35)' }, { opacity: 0, transform: 'translate(-50%,-50%) scale(1.65)' }], { duration: timing.follow, fill: 'none' });
      message(`${symbol.label} · ×${(symbol.factor / 100).toFixed(2)}`, 'win');
      const destination = hitDestination(selectedSymbol);
      await animateBall(target, destination, reduce ? 0 : destination.flight.duration, true, batAnimation);
    } else {
      tone('miss'); message('SWING AND MISS', 'error');
      // Every OUT is a clean swing-and-miss: no contact flash or upward deflection.
      await animateBall(target, target, reduce ? 0 : 180, true, batAnimation);
    }
    await Promise.all([pitcherFinish, batAnimation?.finished.catch(() => {}), rewardAnimation]);
    if (outcome === 'out') {
      surface.dataset.phase = 'strike-three'; render();
      message('STRIKE THREE', 'error');
      await pause(320);
      surface.dataset.phase = 'strikeout';
      flash('STRIKEOUT!', true, true);
      message('STRIKE THREE · STREAK ENDED', 'error');
      await pause(OUT_RESULT_HOLD_MS);
    }
    busy = false; render(); surface.dataset.phase = 'idle';
    if (game.status === 'playing' && game.snapshot().hits.length === 1 && !decisionHintSeen) {
      decisionHintSeen = true; message('KEEP SWINGING OR CASH OUT', 'win decision-hint');
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
function resetRound() { try { game.reset(); roundNumber = 0; if ($('result').open) $('result').close(); clearEffects(); render(); message('Balance reset to 1,000 CR.'); } catch (error) { message(error.message, 'error'); } }
bindControls({ $, game, audio, render, message, prepareRound, startRound, cashOut, resetRound });
render();
registerModelContext({ $, game, isBusy: () => busy, startRound, swing, cashOut });

})();
