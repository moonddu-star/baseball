'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const code = fs.readFileSync(path.join(__dirname, '../poc/src/game/audio/game-audio.js'), 'utf8');

async function harness(files = {}) {
  const requests = [], sources = [], handlers = {};
  const param = () => ({ value: 0, setValueAtTime() {}, cancelScheduledValues() {}, linearRampToValueAtTime() {}, exponentialRampToValueAtTime() {} });
  const node = () => ({ connect(next) { return next; }, disconnect() {}, gain: param(), frequency: param(), Q: param(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() });
  let engine;
  class AudioContext {
    constructor() { engine = this; this.currentTime = 1; this.sampleRate = 100; this.state = 'running'; this.destination = node(); }
    createGain() { return node(); }
    createOscillator() { return { ...node(), start() {}, stop() {} }; }
    createBiquadFilter() { return node(); }
    createDynamicsCompressor() { return node(); }
    createWaveShaper() { return node(); }
    createMediaElementSource() { return node(); }
    createBuffer() { return { getChannelData: () => new Float32Array(40) }; }
    decodeAudioData(bytes) { return Promise.resolve({ duration: 2, url: Buffer.from(bytes).toString() }); }
    createBufferSource() { const s = { ...node(), start(...args) { this.started = true; this.startArgs = args; }, stop() { this.stopped = true; this.onended?.(); } }; sources.push(s); return s; }
    resume() { this.state = 'running'; return Promise.resolve(); }
    suspend() { this.state = 'suspended'; return Promise.resolve(); }
  }
  class Audio {
    constructor() { this.paused = true; }
    pause() { this.paused = true; }
    play() { this.paused = false; return Promise.resolve(); }
    load() {}
  }
  const document = { hidden: false, addEventListener: (name, fn) => { handlers[name] = fn; } };
  const context = vm.createContext({ window: { AudioContext, addEventListener: (name, fn) => { handlers[name] = fn; } }, document, Audio, localStorage: { getItem() { return null; }, setItem() {} }, fetch: async url => { requests.push(url); return { ok: true, arrayBuffer: async () => Uint8Array.from(Buffer.from(url)).buffer }; } });
  vm.runInContext(code, context);
  const audio = context.createGameAudio({ celebrationFiles: files });
  audio.activate();
  await new Promise(resolve => setImmediate(resolve));
  return { audio, requests, sources, handlers, document, engine };
}

test('absent celebration recordings make no requests and no placeholder sounds', async () => {
  const h = await harness();
  h.audio.tone('home-run'); h.audio.tone('win');
  assert.deepEqual(h.requests.sort(), ['assets/sfx-click.mp3', 'assets/sfx-hit-single.mp3', 'assets/sfx-hit-strong.mp3', 'assets/sfx-hit.mp3', 'assets/sfx-out.mp3']);
  assert.equal(h.sources.length, 0);
});

test('home run and win share one cheer at a time; mute stops it and prevents playback', async () => {
  const h = await harness({ 'home-run': 'assets/sfx-home-run-cheer.mp3', win: 'assets/sfx-win-cheer.mp3' });
  h.audio.tone('home-run'); h.audio.tone('win');
  assert.equal(h.sources.length, 1);
  assert.equal(h.sources[0].buffer.url, 'assets/sfx-home-run-cheer.mp3');
  assert.equal(h.sources[0].started, true);
  h.sources[0].onended(); h.engine.currentTime += 3;
  h.audio.tone('win');
  assert.equal(h.sources.length, 2);
  assert.equal(h.sources[1].buffer.url, 'assets/sfx-win-cheer.mp3');
  h.audio.setEnabled(false);
  assert.equal(h.sources[1].stopped, true);
  h.audio.tone('home-run'); assert.equal(h.sources.length, 2);
});

test('hidden pages stop cheers; changing round music does not carry a cheer into the next round', async () => {
  const h = await harness({ 'home-run': 'assets/sfx-home-run-cheer.mp3', win: 'assets/sfx-win-cheer.mp3' });
  h.audio.setRoundActive(true); h.audio.tone('home-run');
  h.document.hidden = true; h.handlers.visibilitychange();
  assert.equal(h.sources[0].stopped, true);
  h.document.hidden = false; h.handlers.visibilitychange(); h.engine.currentTime += 3;
  h.audio.tone('win'); h.audio.setRoundActive(false);
  assert.equal(h.sources[1].stopped, true);
});


test('single and double select their supplied recordings; triple and home run keep original HIT', async () => {
  const h = await harness();
  const expected = ['assets/sfx-hit-single.mp3', 'assets/sfx-hit-strong.mp3', 'assets/sfx-hit.mp3', 'assets/sfx-hit.mp3'];
  for (const [i, symbol] of ['single', 'double', 'triple', 'home-run'].entries()) {
    h.engine.currentTime += 1;
    h.audio.tone('hit', symbol);
    const samples = h.sources.filter(s => s.buffer?.url);
    assert.equal(samples.length, i + 1, 'one recorded impact per hit');
    assert.equal(samples[i].buffer.url, expected[i]);
    assert.equal(samples[i].effectGain.gain.value, symbol === 'home-run' ? 2 : 1, 'home run alone has the strongest impact gain');
    assert.equal(samples[i].startArgs[1], .07, 'preserve the leading impact');
  }
  h.audio.setEnabled(false);
  h.audio.tone('hit', 'single');
  assert.equal(h.sources.filter(s => s.buffer?.url).length, 4);
});


test('consecutive extra-base hits switch cheers without stacking and OUT stops the crowd', async () => {
  const h = await harness({ 'extra-base': 'assets/sfx-cheer-normal.mp3', 'home-run': 'assets/sfx-cheer-strong.mp3' });
  h.audio.tone('extra-base');
  const first = h.sources.at(-1);
  assert.equal(first.buffer.url, 'assets/sfx-cheer-normal.mp3');
  h.engine.currentTime += 1;
  h.audio.tone('extra-base');
  const second = h.sources.at(-1);
  assert.equal(first.stopped, true);
  assert.equal(second.buffer.url, 'assets/sfx-cheer-normal.mp3');
  h.engine.currentTime += 1;
  h.audio.tone('home-run');
  const strong = h.sources.at(-1);
  assert.equal(second.stopped, true);
  assert.equal(strong.buffer.url, 'assets/sfx-cheer-strong.mp3');
  h.engine.currentTime += 1;
  h.audio.tone('miss');
  assert.equal(strong.stopped, true);
  const crowd = h.sources.filter(s => s.buffer?.url?.includes('cheer'));
  assert.equal(crowd.filter(s => !s.stopped).length, 0);
});


test('cheer gains rise gently with extra-base streaks, cap at four, and keep cash-out at baseline', async () => {
  const h = await harness({ 'extra-base': 'normal.mp3', 'home-run': 'strong.mp3', win: 'win.mp3' });
  for (const kind of ['extra-base', 'home-run']) {
    for (const [streak, volume] of [[1,.55],[2,.60],[3,.65],[4,.70],[25,.70],[0,.55],[NaN,.55],[1,.55]]) {
      h.engine.currentTime += 1;
      h.audio.tone(kind, { streak });
      assert.equal(h.sources.at(-1).effectGain.gain.value, volume);
      assert.equal(h.sources.filter(s => !s.stopped).length, 1);
    }
  }
  h.audio.stopEffects(); h.engine.currentTime += 1;
  h.audio.tone('win', { streak: 25 });
  assert.equal(h.sources.at(-1).effectGain.gain.value, .55);
});


test('triples have a louder crowd tier without changing doubles or home runs', async () => {
  const h = await harness({ 'extra-base': 'normal.mp3', 'home-run': 'strong.mp3' });
  for (const [streak, volume] of [[1,1],[2,1.05],[3,1.10],[4,1.15],[25,1.15]]) {
    h.engine.currentTime += 1;
    h.audio.tone('extra-base', { streak, symbol: 'triple' });
    assert.equal(h.sources.at(-1).buffer.url, 'normal.mp3');
    assert.equal(h.sources.at(-1).effectGain.gain.value, volume);
  }
  for (const [kind, symbol] of [['extra-base','double'],['home-run','home-run']]) {
    h.engine.currentTime += 1;
    h.audio.tone(kind, { streak: 1, symbol });
    assert.equal(h.sources.at(-1).effectGain.gain.value, .55);
  }
});
