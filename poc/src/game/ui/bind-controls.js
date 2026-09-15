function bindControls({ $, game, audio, render, message, prepareRound, startRound, cashOut, resetRound }) {
  $('action').addEventListener('click', () => { try { if (game.status === 'playing') cashOut(); else startRound(); } catch (error) { message(error.message, 'error'); } });
  $('bet').addEventListener('input', () => { if (game.status !== 'playing') render(); });
  $('mines').addEventListener('change', () => { if (game.status !== 'playing') { if (game.status !== 'ready') prepareRound(); else render(); } });
  $('reset').addEventListener('click', resetRound);
  $('prepare-next').addEventListener('click', prepareRound);
  $('close-result').addEventListener('click', () => $('result').close());
  $('view-board').addEventListener('click', () => $('result').close());
  $('help').addEventListener('click', () => $('rules').showModal());
  $('close-help').addEventListener('click', () => $('rules').close());
  $('rules').addEventListener('click', event => { if (event.target === $('rules')) { const rect = $('rules').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('rules').close(); } });
  $('sound').addEventListener('click', () => { const sound = audio.toggle(); $('sound').setAttribute('aria-pressed', String(sound)); $('sound').setAttribute('aria-label', sound ? '소리 끄기' : '소리 켜기'); audio.tone('hit'); });
}
