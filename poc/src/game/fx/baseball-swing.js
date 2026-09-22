/* Metre-scale perspective batting rig. The ball, bat and hidden arm share one camera and clock. */
(function () {
  'use strict';
  const T = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const radians = degrees => degrees*Math.PI/180;
  // Presentation distances and heights are calibrated to the fixed stadium camera.
  // They describe the awarded symbol, not a physics simulation of baseball scoring.
  const HIT_FLIGHTS = Object.freeze({
    single: Object.freeze({ duration: 500, depth: 26, arc: .40, endY: .295, spread: .24, spreadRange: .12, exitsTop: false }),
    double: Object.freeze({ duration: 420, linear: true, depth: 38, arc: 0, endY: -.01, spread: .27, spreadRange: .12, exitsTop: true }),
    triple: Object.freeze({ duration: 420, linear: true, depth: 52, arc: 0, endY: -.01, spread: .27, spreadRange: .12, exitsTop: true }),
    'home-run': Object.freeze({ duration: 420, linear: true, depth: 64, arc: 0, endY: -.01, spread: .27, spreadRange: .12, exitsTop: true })
  });
  class BaseballSwing {
    hitProfile(symbol = 'single') { return HIT_FLIGHTS[symbol] || HIT_FLIGHTS.single; }
    constructor(canvas, surface) {
      this.canvas = canvas; this.surface = surface; this.active = null;
      this.tipX = .78; this.sweetX = .67; this.modelScale = 1;
      this.barrelRadius = .0335; this.ballRadius = .0365;
      this.upperArm = .34; this.forearm = .33;
      this.length = this.tipX*this.modelScale; this.available = false;
      if (!T) return;
      this.scene = new T.Scene();
      this.camera = new T.PerspectiveCamera(38,9/16,.08,80);
      this.camera.position.set(0,1.55,2.05);
      this.camera.lookAt(0,1.55-10*Math.tan(radians(9.4)),-7.95);
      this.camera.updateMatrixWorld(true);
      try {
        this.renderer = new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:false});
        this.renderer.setClearColor(0x000000,0);
        this.renderer.outputColorSpace = T.SRGBColorSpace;
        this.renderer.toneMapping = T.ACESFilmicToneMapping;
        this.renderer.toneMappingExposure = .95;
        this.available = true; this.mode = 'webgl';
      } catch (_) {
        // The same 3D meshes can also be projected by the small software renderer.
        const replacement = canvas.cloneNode(false); canvas.replaceWith(replacement);
        this.canvas = replacement; this.context = replacement.getContext('2d');
        this.available = !!this.context; this.mode = 'software';
      }
      // Neutral illumination preserves the pale maple reference instead of adding an amber cast.
      this.scene.add(new T.HemisphereLight(0xe8eef5,0x393a3b,2.1));
      const key=new T.DirectionalLight(0xffffff,2.5);key.position.set(2,4,5);this.scene.add(key);
      const rim=new T.DirectionalLight(0xc7d8ec,1.2);rim.position.set(-3,1,-2);this.scene.add(rim);
      this.materials = {
        wood:new T.MeshPhysicalMaterial({color:0xcdb79b,roughness:.34,metalness:0,clearcoat:.48,clearcoatRoughness:.20})
      };
      // Volumetric maple grain: long fibres follow the bat, including its rounded ends.
      // Model coordinates keep the grain fixed to the surface throughout the swing.
      this.materials.wood.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vWood;\n' + shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWood = position;');
        shader.fragmentShader = `varying vec3 vWood;
          float woodHash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
          float woodNoise(vec2 p){
            vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);
            return mix(mix(woodHash(i),woodHash(i+vec2(1,0)),f.x),mix(woodHash(i+vec2(0,1)),woodHash(i+vec2(1,1)),f.x),f.y);
          }
        ` + shader.fragmentShader
          .replace('#include <color_fragment>', `#include <color_fragment>
            float warp = .0015*sin(vWood.x*14.0) + .00040*sin(vWood.x*37.0 + vWood.z*60.0);
            vec2 section = vec2(vWood.y + .052 + warp, vWood.z*.90 + .018);
            float rings = length(section)*580.0;
            float growth = rings + 1.7*(woodNoise(vec2(vWood.x*10.0,rings*.22))-.5) + .45*sin(rings*.27);
            float latewood = pow(.5 + .5*sin(growth), 4.0);
            latewood = mix(latewood, .27, smoothstep(1.2, 3.5, fwidth(growth)));
            float fibrePhase = (vWood.y*.74 + vWood.z*.65)*17000.0 + .28*sin(vWood.x*55.0);
            float fibres = pow(.5 + .5*sin(fibrePhase), 16.0) * (1.0-smoothstep(.6,2.0,fwidth(fibrePhase)));
            latewood *= .45 + .55*woodNoise(vec2(vWood.x*23.0,rings*.70));
            float tone = .98 + .07*woodNoise(vec2(vWood.x*5.0,rings*.12));
            diffuseColor.rgb *= tone * (1.0 - .045*fibres);
            diffuseColor.rgb = mix(diffuseColor.rgb, diffuseColor.rgb*vec3(.62,.53,.43), latewood*.32);
          `)
          .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor + latewood*.10 + fibres*.025, .28, .52);');
      };
      this.root = new T.Group();this.root.name='bat-only-swing-rig';this.scene.add(this.root);
      this.makeBat();
      this.mergeRigMeshes();
      this.root.scale.setScalar(1);
      this.shoulder=new T.Bone();this.shoulder.name='Shoulder';
      this.elbow=new T.Bone();this.elbow.name='Elbow';
      this.wrist=new T.Bone();this.wrist.name='Wrist';
      this.scene.add(this.shoulder);this.shoulder.add(this.elbow);this.elbow.add(this.wrist);this.wrist.add(this.root);
      this.makeBall();
      this.root.visible=false;
      this.resize();
      if(this.renderer){this.renderer.compile(this.scene,this.camera);this.renderer.render(this.scene,this.camera);}
      this.observer=new ResizeObserver(()=>{this.resize();if(this.active)this.draw(this.active.config,this.active.currentTime);});
      this.observer.observe(surface);
      this.canvas.addEventListener('webglcontextlost',event=>{event.preventDefault();this.contextLost=true;this.cancel();});
      this.canvas.addEventListener('webglcontextrestored',()=>{this.contextLost=false;this.resize();});
    }
    mesh(geometry,material,parent=this.root){const mesh=new T.Mesh(geometry,material);parent.add(mesh);return mesh;}
    makeBat(){
      // Physical dimensions: 0.86m knob-to-tip, 0.067m maximum barrel diameter.
      const profile=[[-.08,0],[-.0798,.014],[-.079,.0175],[-.077,.020],[-.074,.021],[-.072,.021],[-.069,.0195],[-.066,.0145],[-.065,.013],
        [.08,.013],[.18,.014],[.30,.017],[.42,.023],[.53,.031],[.59,.0335],[.73,.0335],
        [.744,.0331],[.758,.0318],[.770,.028],[.778,.021],[.781,.012],[.782,0]];
      // Monotone cubic tangents round the taper without overshooting its physical size.
      const slopes=profile.slice(1).map(([x,r],i)=>(r-profile[i][1])/(x-profile[i][0]));
      const tangents=profile.map((p,i)=>{
        if(i===0)return slopes[0];if(i===profile.length-1)return slopes.at(-1);
        const a=slopes[i-1],b=slopes[i];
        if(a*b<=0)return 0;
        const before=p[0]-profile[i-1][0],after=profile[i+1][0]-p[0];
        const wa=2*after+before,wb=after+2*before;
        return (wa+wb)/(wa/a+wb/b);
      });
      const points=[];
      for(let i=0;i<profile.length-1;i++){
        const [x,a]=profile[i],[end,b]=profile[i+1],span=end-x;
        const steps=this.mode==='webgl'?Math.max(3,Math.ceil(span/.018)):Math.max(1,Math.ceil(span/.06));
        for(let j=0;j<steps;j++){
          const t=j/steps,t2=t*t,t3=t2*t;
          const radius=(2*t3-3*t2+1)*a+(t3-2*t2+t)*span*tangents[i]+(-2*t3+3*t2)*b+(t3-t2)*span*tangents[i+1];
          points.push(new T.Vector2(radius,x+span*t));
        }
      }
      points.push(new T.Vector2(0,.782));
      this.outlineProfile=points.map(point=>({x:point.y,radius:point.x}));
      const wood=this.mesh(new T.LatheGeometry(points,this.mode==='webgl'?80:28),this.materials.wood);
      wood.rotation.z=-Math.PI/2;wood.name='solid-maple-bat';this.batMesh=wood;

    }
    mergeRigMeshes(){
      this.root.updateMatrixWorld(true);const groups=new Map(),original=[];
      this.root.traverse(mesh=>{if(!mesh.isMesh||mesh.parent!==this.root)return;original.push(mesh);const geometry=mesh.geometry.index?mesh.geometry.toNonIndexed():mesh.geometry.clone();geometry.applyMatrix4(mesh.matrixWorld);if(!groups.has(mesh.material))groups.set(mesh.material,[]);groups.get(mesh.material).push(geometry);});
      original.forEach(mesh=>{mesh.removeFromParent();mesh.geometry.dispose();});
      for(const [material,parts] of groups){
        const geometry=new T.BufferGeometry();
        for(const name of ['position','normal','uv']){const size=name==='uv'?2:3;const length=parts.reduce((sum,p)=>sum+p.attributes[name].array.length,0),data=new Float32Array(length);let offset=0;parts.forEach(p=>{data.set(p.attributes[name].array,offset);offset+=p.attributes[name].array.length;});geometry.setAttribute(name,new T.BufferAttribute(data,size));}
        const mesh=this.mesh(geometry,material);if(material===this.materials.wood){mesh.name='solid-maple-bat';this.batMesh=mesh;}parts.forEach(p=>p.dispose());
      }
    }
    resize(){
      const rect=this.surface.getBoundingClientRect();
      this.width=rect.width;this.height=rect.height;this.ratio=rect.height/rect.width;
      this.camera.aspect=this.width/this.height;this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld(true);
      const dpr=Math.min(devicePixelRatio||1,2);
      if(this.renderer){this.renderer.setPixelRatio(dpr);this.renderer.setSize(this.width,this.height,false);}
      else if(this.context){this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.dpr=dpr;}
      // A resize changes the screen mapping, never the bat or arm dimensions.
      if(this.active){
        const old=this.active.config;
        this.active.config=this.configure({x:old.targetUV.x*this.width,y:old.targetUV.y*this.height},old.lead,old.follow,old.miss,old.row,old.column,old.failureStyle);
      }
    }
    project(point){
      const p=point.clone().project(this.camera);
      return {x:(p.x+1)*this.width/2,y:(1-p.y)*this.height/2,depth:p.z};
    }
    onPlane(screen,z=0){
      const direction=V(screen.x/this.width*2-1,1-screen.y/this.height*2,.5).unproject(this.camera).sub(this.camera.position).normalize();
      return this.camera.position.clone().addScaledVector(direction,(z-this.camera.position.z)/direction.z);
    }
    configure(target,lead,follow,miss,row,column=2,failureStyle='miss'){
      const point=this.onPlane(target),aim=point.clone();
      failureStyle=miss?(failureStyle==='glance'?'glance':'miss'):'hit';
      if(failureStyle==='miss')aim.y-=.12;
      const pitch=clamp((aim.y-1.174)*.65,-.27,.27);
      const direction=V(Math.sqrt(1-pitch*pitch-.01),pitch,-.10);
      // A glancing hit catches the upper edge of the barrel; a miss clears it.
      const normal=failureStyle==='glance'?V(0,.85,-.53):V(0,0,-1);
      normal.addScaledVector(direction,-normal.dot(direction)).normalize();
      const grip=aim.clone().addScaledVector(normal,-(this.barrelRadius+this.ballRadius)).addScaledVector(direction,-this.sweetX);
      // A reach that is already extended needs less additional hand drive.
      // This is a joint-motion adjustment; bat dimensions never depend on the zone.
      const drive=clamp(.34-Math.max(0,grip.x+.65)*.9,.06,.34);
      return {point,grip,direction,normal,drive,shoulder:V(-.65,1.35+clamp((point.y-1.174)*.35,-.09,.09),.30),
        targetUV:{x:target.x/this.width,y:target.y/this.height},
        lead,follow,miss,failureStyle,row,column,name:row<2?'high':row===2?'middle':'low',
        swingDuration:Math.min(lead,120),swingStart:lead-Math.min(lead,120),
        revealTime:lead-Math.min(lead,120)};
    }
    // Project the physical bat at contact without moving the live swing rig or drawing an outcome.
    contactPreview(target,row,column){
      if(!this.outlineProfile)return null;
      const g=this.configure(target,360,180,false,row,column),pose=this.sample(g,g.lead);
      const up=pose.normal.clone().cross(pose.direction).normalize();
      const edge=sign=>this.outlineProfile.map(p=>this.project(pose.grip.clone().addScaledVector(pose.direction,p.x).addScaledVector(up,p.radius*sign)));
      return {outline:[...edge(1),...edge(-1).reverse()],contact:this.project(pose.contact)};
    }
    angleAt(g,time){
      const hermite=(a,b,ma,mb,t)=>{const t2=t*t,t3=t2*t;return(2*t3-3*t2+1)*a+(t3-2*t2+t)*ma+(-2*t3+3*t2)*b+(t3-t2)*mb;};
      const speed=.015;
      if(time<=g.lead){const t=clamp((time-g.swingStart)/(g.swingDuration||1),0,1);return hermite(radians(-95),0,.30,speed*g.swingDuration,t);}
      const t=clamp((time-g.lead)/(g.follow||1),0,1);
      return hermite(0,radians(115),speed*g.follow,.35,t);
    }
    solveArm(shoulder,wanted){
      const delta=wanted.clone().sub(shoulder),requested=delta.length();
      const reach=clamp(requested,Math.abs(this.upperArm-this.forearm)+.001,this.upperArm+this.forearm-.001);
      const direction=delta.normalize();
      const pole=V(0,-1,.4).addScaledVector(direction,-V(0,-1,.4).dot(direction)).normalize();
      const along=(this.upperArm*this.upperArm-this.forearm*this.forearm+reach*reach)/(2*reach);
      const elbow=shoulder.clone().addScaledVector(direction,along).addScaledVector(pole,Math.sqrt(Math.max(0,this.upperArm*this.upperArm-along*along)));
      return {shoulder:shoulder.clone(),elbow,wrist:shoulder.clone().addScaledVector(direction,reach),clamped:Math.abs(requested-reach)>.000001};
    }
    pose(g,angle){
      const smooth=t=>t*t*(3-2*t),axis=V(0,1,0);
      const load=smooth(clamp(-angle/radians(95),0,1));
      const turn=angle-.22*load;
      const finish=smooth(clamp((angle-.50)/(radians(115)-.50),0,1));
      const lift=radians(50)*finish;
      const direction=g.direction.clone().applyAxisAngle(axis,turn).applyAxisAngle(V(1,0,0),lift);
      const normal=g.normal.clone().applyAxisAngle(axis,turn).applyAxisAngle(V(1,0,0),lift);
      const wanted=g.grip.clone().sub(g.shoulder).applyAxisAngle(axis,angle*.55).add(g.shoulder)
        .add(V(g.drive*Math.sin(angle)*(1-.5*finish),.025*Math.sin(angle),-.18*Math.sin(angle)));
      const joints=this.solveArm(g.shoulder,wanted),grip=joints.wrist;
      const barrel=grip.clone().addScaledVector(direction,this.sweetX);
      const contact=barrel.clone().addScaledVector(normal,this.barrelRadius+this.ballRadius);
      const tip=grip.clone().addScaledVector(direction,this.tipX);
      return {grip,direction,normal,barrel,contact,tip,joints,q:angle/radians(115)};
    }
    sample(g,time){
      const p=this.pose(g,this.angleAt(g,time));
      p.alpha=time>=g.revealTime&&time<g.lead+g.follow?1:0;
      return p;
    }
    makeBall(){
      this.ball=new T.Group();this.ball.name='Baseball';this.scene.add(this.ball);
      this.mesh(new T.SphereGeometry(this.ballRadius,24,16),new T.MeshStandardMaterial({color:0xf5f1e5,roughness:.78}),this.ball);
      const seamMaterial=new T.MeshStandardMaterial({color:0xa92228,roughness:.9});
      const radius=this.ballRadius*1.008;
      const curve=new T.Curve();
      curve.getPoint=t=>{const a=t*Math.PI*2;return V(Math.cos(a),Math.sin(a)*.72,Math.sin(2*a)*.48).normalize().multiplyScalar(radius);};
      this.mesh(new T.TubeGeometry(curve,72,.00065,4,true),seamMaterial,this.ball);
      this.ball.traverse(mesh=>{if(mesh.isMesh){mesh.material.transparent=true;mesh.material.depthWrite=false;}});
      this.ball.visible=false;
    }
    sampleBall(g,time,track=this.ballTrack){
      if(!track)return {visible:false};
      const t=clamp((time-track.start)/track.duration,0,1);
      // Failure variants are separate trajectories, both starting at the incoming ball.
      if(track.hitBack&&g.miss){
        const position=g.point.clone();
        if(g.failureStyle==='glance'){
          const seconds=t*track.duration/1000;
          position.x+=(g.column<2?-.12:.12)*seconds;
          position.y+=1.35*seconds-4.905*seconds*seconds;
          position.z-=.50*seconds;
        }else{
          const origin=this.onPlane({x:(track.pitchFromUV?.x??.47)*this.width,y:(track.pitchFromUV?.y??.21)*this.height},-16);
          const direction=g.point.clone().sub(origin).normalize();
          position.addScaledVector(direction,.85*t);
          position.y-=.025*t*t;
        }
        return {position,visible:time>=track.start&&t<1,done:t>=1,opacity:1-clamp((t-.75)/.25,0,1),rotation:t*Math.PI*4};
      }
      let from,to;
      const profile=track.hitBack?(track.profile||this.hitProfile()):null;
      if(track.hitBack){from=g.point;to=this.onPlane({x:track.toUV.x*this.width,y:track.toUV.y*this.height},-profile.depth);}
      else {from=this.onPlane({x:track.fromUV.x*this.width,y:track.fromUV.y*this.height},-16);to=g.point;}
      // Compensate for the very close batting camera: retain readable near-field travel
      // instead of compressing almost the entire visible path into the first few frames.
      // Extra-base hits use the original immediate, constant-speed line drive.
      const u=profile&&!profile.linear?t/(1+profile.depth/5*(1-t)):t;
      const position=from.clone().lerp(to,u);
      // Lift is zero at contact and arrival, preserving exact bat/ball contact.
      // Singles descend into the outfield; extra-base hits finish wholly above the viewport.
      position.y+=profile?4*profile.arc*u*(1-u):.10*Math.sin(Math.PI*u);
      const opacity=profile&&!profile.exitsTop?1-clamp((t-.82)/.18,0,1):1;
      return {position,visible:time>=track.start&&(!track.hitBack||t<1),done:t>=1,opacity,rotation:t*Math.PI*4};
    }
    animateBall(from,to,duration,hitBack,controller){
      if(!this.available||this.contextLost||!duration||!controller||controller.done||controller!==this.active)return Promise.resolve();
      const pitchFromUV=hitBack?this.ballTrack?.fromUV:null;
      if(this.ballTrack)this.ballTrack.resolve();
      if(!hitBack)controller.startTime=document.timeline.currentTime-(controller.config.lead-duration);
      return new Promise(resolve=>{
        this.ballTrack={fromUV:{x:from.x/this.width,y:from.y/this.height},toUV:{x:to.x/this.width,y:to.y/this.height},
          start:hitBack?controller.config.lead:controller.config.lead-duration,duration,hitBack,pitchFromUV,profile:hitBack?to.flight:null,resolve};
        this.draw(controller.config,controller.currentTime);
      });
    }
    draw(g,time){
      if(!this.available||this.contextLost)return;
      const p=this.sample(g,time);
      this.shoulder.position.copy(p.joints.shoulder);
      this.elbow.position.copy(p.joints.elbow).sub(p.joints.shoulder);
      this.wrist.position.copy(p.grip).sub(p.joints.elbow);
      this.root.visible=p.alpha>0;
      const up=p.normal.clone().cross(p.direction).normalize();
      this.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(p.direction,up,p.normal));
      const ball=this.sampleBall(g,time);
      this.ball.visible=ball.visible;
      if(ball.visible){this.ball.position.copy(ball.position);this.ball.rotation.set(ball.rotation,ball.rotation*.6,0);this.ball.traverse(mesh=>{if(mesh.isMesh)mesh.material.opacity=ball.opacity;});}
      this.scene.updateMatrixWorld(true);
      this.canvas.style.opacity=this.root.visible||this.ball.visible?'1':'0';
      this.canvas.dataset.profile=g.name;this.canvas.dataset.zone=g.row+','+g.column;
      this.canvas.dataset.phase=time<g.swingStart?'load':time<g.lead?'swing':'follow';
      if(this.renderer)this.renderer.render(this.scene,this.camera);else this.drawSoftware();
      this.lastPose=p;
      if(ball.done&&this.ballTrack){const resolve=this.ballTrack.resolve;this.ballTrack.resolve=()=>{};resolve();}
    }
    drawSoftware(){
      const ctx=this.context,w=this.width,h=this.height;ctx.setTransform(this.dpr,0,0,this.dpr,0,0);ctx.clearRect(0,0,w,h);
      const faces=[],light=V(.35,.7,1).normalize();
      const clip=(input,z)=>{
        const out=[];for(let i=0;i<input.length;i++){const a=input[i],b=input[(i+1)%input.length],insideA=a.z<=z,insideB=b.z<=z;
          if(insideA)out.push(a);if(insideA!==insideB)out.push(a.clone().lerp(b,(z-a.z)/(b.z-a.z)));}return out;
      };
      this.scene.traverse(obj=>{
        if(!obj.isMesh)return;for(let p=obj;p;p=p.parent)if(!p.visible)return;
        const pos=obj.geometry.attributes.position,idx=obj.geometry.index,n=idx?idx.count:pos.count;
        const normals=obj.geometry.attributes.normal,normalMatrix=new T.Matrix3().getNormalMatrix(obj.matrixWorld);
        for(let i=0;i<n;i+=3){
          const world=[0,1,2].map(k=>V().fromBufferAttribute(pos,idx?idx.getX(i+k):i+k).applyMatrix4(obj.matrixWorld));
          const normal=world[1].clone().sub(world[0]).cross(world[2].clone().sub(world[0])).normalize();
          if(normal.dot(this.camera.position.clone().sub(world[0]))<=0)continue;
          const view=clip(world.map(v=>v.applyMatrix4(this.camera.matrixWorldInverse)),-this.camera.near);
          if(view.length<3)continue;
          const depth=view.reduce((sum,v)=>sum+v.z,0)/view.length;
          if(depth < -this.camera.far)continue;
          const smoothNormal=obj.material===this.materials.wood&&normals?V().fromBufferAttribute(normals,idx?idx.getX(i):i)
            .add(V().fromBufferAttribute(normals,idx?idx.getX(i+1):i+1))
            .add(V().fromBufferAttribute(normals,idx?idx.getX(i+2):i+2)).applyMatrix3(normalMatrix).normalize():normal;
          const color=obj.material.color.clone().multiplyScalar(obj.material===this.materials.wood?.50+.70*Math.max(0,smoothNormal.dot(light)):.60+.6*Math.max(0,normal.dot(light)));
          faces.push({v:view.map(v=>v.clone().applyMatrix4(this.camera.projectionMatrix)),depth,opacity:obj.material.opacity,color:'#'+color.getHexString()});
        }
      });
      faces.sort((a,b)=>a.depth-b.depth);
      for(const face of faces){ctx.beginPath();face.v.forEach((v,i)=>{const x=(v.x+1)*w/2,y=(1-v.y)*h/2;i?ctx.lineTo(x,y):ctx.moveTo(x,y);});ctx.closePath();ctx.globalAlpha=face.opacity;ctx.fillStyle=face.color;ctx.fill();}
      ctx.globalAlpha=1;
    }
    play(target,lead,follow,miss,row,column=2,failureStyle='miss'){
      this.cancel();if(!this.available||this.contextLost||(!lead&&!follow))return null;
      this.resize();const rig=this;
      let start=document.timeline.currentTime,paused=false,held=0,frame=0,done=false,resolve;
      const finished=new Promise(r=>resolve=r);
      const controller={config:this.configure(target,lead,follow,miss,row,column,failureStyle),contactTime:lead,finished,
        get done(){return done},
        get startTime(){return start},set startTime(v){start=v},
        get currentTime(){return paused?held:document.timeline.currentTime-start},
        set currentTime(v){held=v;start=document.timeline.currentTime-v;rig.draw(this.config,v)},
        pause(){held=this.currentTime;paused=true;cancelAnimationFrame(frame)},
        play(){if(done)return;start=document.timeline.currentTime-held;paused=false;frame=requestAnimationFrame(tick)},
        cancel(){if(done)return;done=true;cancelAnimationFrame(frame);if(rig.ballTrack)rig.ballTrack.resolve();resolve();},
        seek(time){this.pause();this.currentTime=time;}
      };
      function tick(){
        if(done||paused)return;
        const time=controller.currentTime,g=controller.config;
        // The bat finishes after 300ms; an outfield ball can keep flying.
        const end=Math.max(g.lead+g.follow,rig.ballTrack?rig.ballTrack.start+rig.ballTrack.duration:0);
        rig.draw(g,Math.min(time,end));
        if(time>=end){done=true;if(rig.ballTrack)rig.ballTrack.resolve();resolve();}else frame=requestAnimationFrame(tick);
      }
      this.active=controller;this.draw(controller.config,0);frame=requestAnimationFrame(tick);return controller;
    }
    cancel(){
      if(this.active)this.active.cancel();this.active=null;
      if(this.ballTrack)this.ballTrack.resolve();this.ballTrack=null;
      if(this.root)this.root.visible=false;if(this.ball)this.ball.visible=false;
      this.canvas.style.opacity='0';
      if(this.renderer)this.renderer.clear();else if(this.context)this.context.clearRect(0,0,this.canvas.width,this.canvas.height);
    }
    inspect(g,time){const p=this.sample(g,time);return{profile:g.name,grip:this.project(p.grip),contact:this.project(p.contact),tip:this.project(p.tip),length:p.grip.distanceTo(p.tip),armClamped:p.joints.clamped,alpha:p.alpha,q:p.q};}

  }
  window.BaseballSwing=BaseballSwing;
})();
