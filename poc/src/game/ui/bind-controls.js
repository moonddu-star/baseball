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
