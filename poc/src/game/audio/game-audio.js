function createGameAudio() {
  let sound = false, audioContext = null;
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
  function toggle() { sound = !sound; return sound; }
  return { tone, toggle };
}
