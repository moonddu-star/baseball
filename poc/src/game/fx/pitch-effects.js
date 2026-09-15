function createPitchEffects({ $, surface, batRig }) {
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
  function swingBat(target, lead, follow, miss, row, column) {
    return batRig.play(target, lead, follow, miss, row, column);
  }
  function syncBatClock(animation, startTime) {
    if (animation) animation.startTime = startTime;
  }
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
  return { flash, clearEffects, pitcherFrame, releasePoint, swingBat, animateBall };
}
