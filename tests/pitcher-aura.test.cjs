const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync(require('node:path').join(__dirname, '../poc/src/game/fx/pitcher-aura.js'), 'utf8');

test('pitcher aura changes at earned 2x, 4x, 8x and 10x boundaries', () => {
  const context = vm.createContext({}); vm.runInContext(source, context);
  for (const [value, tier] of [[0,0],[1.999,0],[2,2],[3.999,2],[4,4],[7.999,4],[8,8],[9.999,8],[10,10],[100,10],[NaN,0],[Infinity,0]]) {
    assert.equal(context.pitcherAuraTier(value), tier);
  }
});

test('aura stops animation at reset, hidden tabs, reduced motion and disposal', () => {
  const queued=new Map(),listeners={},motionListeners={};let counter=0,clears=0;
  const gradient={addColorStop(){}};
  const ctx=new Proxy({clearRect(){clears++;},createRadialGradient(){return gradient;},createLinearGradient(){return gradient;}},{get:(obj,key)=>obj[key]||(()=>{})});
  const canvas={style:{},dataset:{},getContext:()=>ctx,getBoundingClientRect:()=>({width:216,height:163})};
  const motion={matches:false,addEventListener:(name,fn)=>motionListeners[name]=fn,removeEventListener:name=>delete motionListeners[name]};
  const document={hidden:false,addEventListener:(name,fn)=>listeners[name]=fn,removeEventListener:name=>delete listeners[name]};
  const context=vm.createContext({document,performance:{now:()=>100},devicePixelRatio:1,matchMedia:()=>motion,
    ResizeObserver:class{observe(){}disconnect(){}},requestAnimationFrame:fn=>{queued.set(++counter,fn);return counter;},cancelAnimationFrame:id=>queued.delete(id)});
  vm.runInContext(source,context);
  const aura=context.createPitcherAura({canvas,surface:{}});
  assert.equal(queued.size,0);
  aura.setMultiplier(4);assert.equal(queued.size,1);assert.equal(canvas.dataset.tier,'4');
  aura.setMultiplier(5);assert.equal(queued.size,1,'same tier must not duplicate animation loops');
  document.hidden=true;listeners.visibilitychange();assert.equal(queued.size,0);
  document.hidden=false;listeners.visibilitychange();assert.equal(queued.size,1);
  motion.matches=true;motionListeners.change();assert.equal(queued.size,0);assert.equal(canvas.style.opacity,'1');
  motion.matches=false;motionListeners.change();assert.equal(queued.size,1);
  aura.setMultiplier(0);assert.equal(queued.size,0);assert.equal(canvas.style.opacity,'0');assert.ok(clears>0);
  aura.setMultiplier(10);aura.destroy();assert.equal(queued.size,0);assert.equal(canvas.dataset.tier,'0');
  assert.deepEqual(Object.keys(listeners),[]);assert.deepEqual(Object.keys(motionListeners),[]);
});
