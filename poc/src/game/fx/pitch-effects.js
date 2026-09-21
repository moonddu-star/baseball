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
    if (blend && previous !== frame) {
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
