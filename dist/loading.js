(function () {
  'use strict';
  const screen = document.getElementById('loading-screen');
  screen.dataset.controller = 'ready';
  const game = document.querySelector('.game');
  const status = document.getElementById('loading-status');
  const bar = document.getElementById('loading-progress');
  const percent = document.getElementById('loading-percent');
  const started = performance.now();
  const minimumMs = 2500;
  let failed = false, finished = false, completed = 0, total = 0;
  let deadline, slowNotice;
  document.getElementById('loading-title').focus({ preventScroll: true });

  function fail() {
    if (failed || finished) return;
    failed = true;
    clearTimeout(deadline); clearTimeout(slowNotice);
    status.textContent = 'LOAD FAILED. TRY AGAIN.';
    screen.setAttribute('aria-busy', 'false');
    // Only create the recovery control after loading has actually failed.
    const retry = document.createElement('button');
    retry.id = 'loading-retry'; retry.type = 'button'; retry.textContent = 'TRY AGAIN';
    retry.addEventListener('click', () => location.reload());
    document.getElementById('loading-recovery').replaceChildren(retry);
    retry.focus({ preventScroll: true });
  }
  function paint() {
    if (failed || finished) return;
    const value = Math.floor(completed / total * 100);
    bar.value = value; bar.textContent = value + '%'; percent.textContent = value + '%';
    if (completed === total) status.textContent = 'READY';
  }
  function imageReady(url) {
    return new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => image.decode ? image.decode().then(resolve, reject) : resolve();
      image.onerror = reject;
      image.src = url;
    });
  }
  // Audio downloads already run in GameAudio. Do not fetch twice or unlock playback here.
  function optionalAudio(promise) {
    return new Promise(resolve => {
      const timeout = setTimeout(resolve, 8000);
      Promise.resolve(promise).then(() => { clearTimeout(timeout); resolve(); }, () => { clearTimeout(timeout); resolve(); });
    });
  }
  let resolveApp;
  const appReady = new Promise(resolve => { resolveApp = resolve; });
  function ready(event) { resolveApp(optionalAudio(event.detail?.audioReady)); }
  window.addEventListener('clutch-hit:ready', ready, { once: true });
  function scriptError(event) {
    if (event.target instanceof HTMLScriptElement || event.error) fail();
  }
  window.addEventListener('error', scriptError, true);
  const images = [
    'assets/stadium-clean.png', 'assets/stadium-day.png',
    'assets/pitcher-sprites.png', 'assets/pitcher-medium.png', 'assets/pitcher-hard.png',
    'assets/baseball-hit-icon.png'
  ];
  // The same stadium now backs the loading screen on phones and desktops.
  images.push('assets/stadium-night-backdrop.webp');
  const fontsReady = Promise.all([400, 600, 700, 800].map(weight => document.fonts.load(weight + ' 16px Barlow')));
  const tasks = [...images.map(imageReady), fontsReady, appReady];
  total = tasks.length;
  deadline = setTimeout(fail, 25000);
  slowNotice = setTimeout(() => { if (!failed && !finished && completed < total) status.textContent = 'STILL LOADING…'; }, 10000);
  Promise.all(tasks.map(task => task.then(() => { completed++; paint(); }))).then(async () => {
    await new Promise(resolve => setTimeout(resolve, Math.max(0, minimumMs - (performance.now() - started))));
    if (failed) return;
    finished = true;
    clearTimeout(deadline); clearTimeout(slowNotice);
    window.removeEventListener('error', scriptError, true);
    window.removeEventListener('clutch-hit:ready', ready);
    screen.setAttribute('aria-busy', 'false');
    screen.hidden = true;
    game.inert = false; game.removeAttribute('aria-hidden');
    document.body.classList.remove('boot-loading');
    document.getElementById('action').focus({ preventScroll: true });
    window.dispatchEvent(new Event('clutch-hit:loaded'));
  }).catch(fail);
})();
