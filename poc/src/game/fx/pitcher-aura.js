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
