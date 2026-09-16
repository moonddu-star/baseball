'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const context = vm.createContext({
  window: {}, devicePixelRatio: 1, AbortController,
  console: { log() {}, warn() {}, error() {} },
  ResizeObserver: class { observe() {} }
});
for (const file of ['poc/vendor/three.js', 'poc/src/game/fx/baseball-swing.js']) {
  vm.runInContext(fs.readFileSync(path.join(__dirname, '..', file), 'utf8'), context);
}
function rig(width = 540) {
  // Real model construction, with only the browser canvas/observer stubbed.
  const canvas = { style: {}, addEventListener() {}, replaceWith() {}, getContext() { return null; } };
  canvas.cloneNode = () => ({ ...canvas, getContext: () => ({}) });
  return new context.window.BaseballSwing(canvas, {
    getBoundingClientRect: () => ({ width, height: width * 16 / 9 })
  });
}
function target(r, row, col) {
  // Current board bounds as fractions of the 540 x 960 reference surface.
  return { x: r.width * (99.8203125 + col * 85.087890625) / 540,
    y: r.width * (333.8203125 + row * 85.087890625) / 540 };
}
test('one perspective camera maps every zone to exact barrel-side contact', () => {
  for(const width of [320,390,540]){
    const r=rig(width);
    assert.equal(r.camera.isPerspectiveCamera,true);
    for(const lead of [290,605])for(let row=0;row<5;row++)for(let col=0;col<5;col++){
      const goal=target(r,row,col),g=r.configure(goal,lead,180,false,row,col),p=r.sample(g,lead);
      const screen=r.project(p.contact);
      assert.ok(Math.hypot(screen.x-goal.x,screen.y-goal.y)<.001,'contact misses selected zone');
      assert.ok(p.contact.distanceTo(g.point)<1e-10);
      assert.ok(Math.abs(p.barrel.distanceTo(g.point)-(r.barrelRadius+r.ballRadius))<1e-10);
      assert.ok(p.tip.distanceTo(g.point)>.10,'contact must be on the barrel, not the end cap');
      const miss=r.configure(goal,lead,180,true,row,col),m=r.sample(miss,lead);
      const along=miss.point.clone().sub(m.grip).dot(m.direction);
      const closest=m.grip.clone().addScaledVector(m.direction,Math.max(-.08,Math.min(r.tipX,along)));
      assert.ok(closest.distanceTo(miss.point)>r.barrelRadius+r.ballRadius,'miss hits the bat');
    }
  }
});
test('all zones keep the same physical bat and arm lengths for the full 300ms', () => {
  const r=rig();
  for(const miss of [false,true])for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const g=r.configure(target(r,row,col),605,180,miss,row,col);
    assert.equal(g.lead+g.follow-g.revealTime,300);
    assert.equal(r.sample(g,g.revealTime-1).alpha,0);
    assert.equal(r.sample(g,g.lead+g.follow).alpha,0);
    for(let t=g.revealTime;t<g.lead+g.follow;t+=2){
      const p=r.sample(g,t),j=p.joints;
      assert.equal(p.alpha,1);
      assert.ok(!j.clamped,'arm cannot reach its planned path: '+row+','+col+' @ '+t);
      assert.ok(Math.abs(p.grip.distanceTo(p.tip)-.78)<1e-10,'bat stretches');
      assert.ok(Math.abs(j.shoulder.distanceTo(j.elbow)-.34)<1e-10,'upper arm stretches');
      assert.ok(Math.abs(j.elbow.distanceTo(j.wrist)-.33)<1e-10,'forearm stretches');
      assert.ok(Math.abs(p.direction.dot(p.normal))<1e-10);
      assert.ok(Math.abs(p.direction.length()-1)<1e-10);
    }
  }
});
test('rendered rig keeps scale one, clears the viewport at endpoints and never crosses the camera', () => {
  const r=rig();r.drawSoftware=()=>{};r.canvas.dataset={};
  for(const miss of [false,true])for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const g=r.configure(target(r,row,col),605,180,miss,row,col);
    for(const t of [g.revealTime,575,605,645,685,785]){
      r.draw(g,t);
      assert.equal(r.root.scale.x,1);assert.equal(r.root.scale.y,1);assert.equal(r.root.scale.z,1);
      let maxX=-Infinity,minDistance=Infinity;
      r.root.traverse(mesh=>{
        if(!mesh.isMesh)return;
        const positions=mesh.geometry.attributes.position;
        for(let i=0;i<positions.count;i++){
          const v=new context.window.THREE.Vector3().fromBufferAttribute(positions,i).applyMatrix4(mesh.matrixWorld);
          maxX=Math.max(maxX,r.project(v).x);
          minDistance=Math.min(minDistance,-v.applyMatrix4(r.camera.matrixWorldInverse).z);
        }
      });
      assert.ok(minDistance>r.camera.near+.2,'bat crosses the camera');
      if(t===g.revealTime||t===785)assert.ok(maxX<0,'bat pops at endpoint: '+row+','+col+' @ '+t+' maxX='+maxX);
    }
  }
});
test('impact velocity is continuous and ball flight ends at the same 3D contact point', () => {
  const r=rig();
  for(const lead of [290,605])for(let row=0;row<5;row++)for(let col=0;col<5;col++){
    const g=r.configure(target(r,row,col),lead,180,false,row,col),dt=.001;
    const a=r.sample(g,lead-dt).contact,b=r.sample(g,lead).contact,c=r.sample(g,lead+dt).contact;
    const before=b.clone().sub(a).divideScalar(dt),after=c.clone().sub(b).divideScalar(dt);
    assert.ok(before.distanceTo(after)<1e-5,'velocity snaps at impact');
    assert.ok(after.z<0,'barrel does not drive toward the field');
    const flight={fromUV:{x:.51,y:.23},start:lead-180,duration:180,hitBack:false};
    const ball=r.sampleBall(g,lead,flight);
    assert.ok(ball.position.distanceTo(b)<1e-10,'ball and bat use different contact points');
    const back={toUV:{x:.5,y:.13},start:lead,duration:120,hitBack:true};
    assert.ok(r.sampleBall(g,lead,back).position.distanceTo(ball.position)<1e-10,'ball jumps at reversal');
  }
});

test('hits travel above the pitcher into the outfield and remain visible after the bat finishes', () => {
  vm.runInContext(fs.readFileSync(path.join(__dirname,'../poc/src/game/fx/pitch-effects.js'),'utf8'),context);
  for(const width of [320,390,540]){
    const r=rig(width);r.drawSoftware=()=>{};r.canvas.dataset={};
    const stage={left:0,top:0,width:r.width,height:r.height};
    const pitcher={left:r.width*.445,top:r.height*.17,width:r.width*.11};
    const fx=context.createPitchEffects({$:()=>({getBoundingClientRect:()=>pitcher}),surface:{getBoundingClientRect:()=>stage},batRig:r});
    for(let row=0;row<5;row++)for(let col=0;col<5;col++){
      const g=r.configure(target(r,row,col),605,180,false,row,col),destination=fx.hitDestination();
      const track={toUV:{x:destination.x/r.width,y:destination.y/r.height},start:g.lead,duration:420,hitBack:true,resolve:()=>{}};
      assert.ok(destination.y<pitcher.top,'hit must finish above the pitcher');
      assert.ok(destination.y<0,'hit endpoint must be beyond the upper screen edge');
      assert.ok(Math.abs(destination.x-r.width*.5)>r.width*.03,'hit must go to a side of center field');
      let previous;
      for(let time=0;time<=420;time+=10){
        const ball=r.sampleBall(g,g.lead+time,track),screen=r.project(ball.position);
        assert.equal(ball.opacity,1,'hit must not fade before leaving the screen');
        if(screen.y>=0)assert.equal(ball.visible,true,'hit disappears while still on screen');
        if(previous){assert.ok(screen.y<previous.y,'hit rises then drops back into view');assert.ok(ball.position.z<previous.z,'hit reverses toward the batter');}
        previous={...screen,z:ball.position.z};
      }
      assert.ok(Math.hypot(previous.x-destination.x,previous.y-destination.y)<1e-8);
      assert.ok(previous.z < -16,'hit must pass beyond the pitcher');
      const endBall=r.sampleBall(g,g.lead+420,track).position;
      const lowerEdge=r.project(endBall.clone().add(new context.window.THREE.Vector3(0,-r.ballRadius,0)));
      assert.ok(lowerEdge.y<0,'the entire ball must clear the screen before being hidden');
      r.ballTrack=track;r.draw(g,g.lead+250);
      assert.equal(r.root.visible,false);assert.equal(r.ball.visible,true);
      assert.equal(r.ball.children[0].material.opacity,1,'ball fades before reaching the field');
      r.draw(g,g.lead+420);assert.equal(r.ball.visible,false);
    }
  }
});

test('failed swings distinguish an upper-barrel glance from a clean miss in every zone', () => {
  for(const width of [320,540]){
    const r=rig(width);
    for(let row=0;row<5;row++)for(let col=0;col<5;col++){
      const goal=target(r,row,col);
      const glance=r.configure(goal,605,180,true,row,col,'glance'),pose=r.sample(glance,605);
      assert.ok(pose.contact.distanceTo(glance.point)<1e-10,'glance must touch the ball');
      assert.ok(pose.normal.y>.7,'glance must touch the top edge of the barrel');
      for(let t=485;t<785;t+=5){const p=r.sample(glance,t);assert.ok(!p.joints.clamped,'glance cannot reach this zone');assert.ok(Math.abs(p.grip.distanceTo(p.tip)-.78)<1e-10);}
      const bounce={hitBack:true,start:605,duration:360};
      const first=r.sampleBall(glance,605,bounce),apex=r.sampleBall(glance,745,bounce),last=r.sampleBall(glance,965,bounce);
      assert.ok(first.position.distanceTo(glance.point)<1e-10,'glance jumps at contact');
      assert.ok(apex.position.y>first.position.y+.08&&apex.position.y<first.position.y+.11,'glance must only pop up slightly');
      assert.ok(r.project(apex.position).y<goal.y,'glance must visibly rise');
      assert.ok(last.position.y<first.position.y,'glance must fall after the small pop');
      const miss=r.configure(goal,605,180,true,row,col,'miss'),pass={hitBack:true,start:605,duration:180,pitchFromUV:{x:.47,y:.21}};
      assert.ok(r.sample(miss,605).contact.distanceTo(miss.point)>.1,'clean miss touches the ball');
      let previous=miss.point;
      for(let t=10;t<=180;t+=10){const ball=r.sampleBall(miss,605+t,pass);assert.ok(ball.position.z>previous.z,'miss must continue toward the catcher');assert.ok(ball.position.y<previous.y,'miss must not bounce up');previous=ball.position;}
    }
  }
});
