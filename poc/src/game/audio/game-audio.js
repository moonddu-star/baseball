function createGameAudio() {
  const preferenceKey = 'strike-zone-sound-enabled';
  const musicTracks = { intro: { url: 'assets/intro-bg.mp3', level: .15 }, game: { url: 'assets/baseball-bg.mp3', level: .16 } };
  let musicMode = 'intro', musicLevel = musicTracks.intro.level;
  const effectFiles = { click: 'assets/sfx-click.mp3', hit: 'assets/sfx-hit.mp3', out: 'assets/sfx-out.mp3' };
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
  let music = null, noiseBuffer = null, pageActive = true;
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
    voices.clear(); lastPlayed.clear();
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
    source.connect(gain); gain.connect(kind === 'hit' ? hitInput : effectsGain); track(source, [gain]);
    source.start(context.currentTime, offset);
    return true;
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
  function tone(kind) {
    if (!enabled || !unlocked || !context || document.hidden || context.state === 'closed' || !pageActive) return;
    const now = context.currentTime, gap = kind === 'click' ? .04 : .08;
    if (now - (lastPlayed.get(kind) ?? -Infinity) < gap) return;
    lastPlayed.set(kind, now);
    if (kind === 'click') {
      if (!sample('click', .35)) note(760, 440, .055, .055, 0, 'triangle');
    } else if (kind === 'pitch') {
      noise(.14, .075, 800, 1700, 0, .035);
    } else if (kind === 'hit') {
      const recordedHit = sample('hit', 1, .07);
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
