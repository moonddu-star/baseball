/* Bat-only 3D swing with an ascending contact path. Three.js license is in vendor/. */
(function () {
  'use strict';
  const T = window.THREE;
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const smooth = t => { t = clamp(t, 0, 1); return t*t*(3-2*t); };
  const V = (x=0,y=0,z=0) => new T.Vector3(x,y,z);
  const PROFILES = {
    high: { drop: .045, loadLift: .15, finishLift: .14, sweep: 137 },
    middle: { drop: .075, loadLift: .38, finishLift: .24, sweep: 150 },
    low: { drop: .055, loadLift: .57, finishLift: .34, sweep: 160 }
  };
  class BaseballSwing {
    constructor(canvas, surface) {
      this.canvas = canvas; this.surface = surface; this.active = null;
      this.length = .82; this.available = false;
      if (!T) return;
      this.scene = new T.Scene();
      this.camera = new T.OrthographicCamera(0,1,16/9,0,.1,30);
      this.camera.position.set(0,0,8); this.camera.lookAt(0,0,0);
      try {
        this.renderer = new T.WebGLRenderer({canvas,alpha:true,antialias:true,powerPreference:'low-power',preserveDrawingBuffer:true});
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
      this.scene.add(new T.HemisphereLight(0xd5e8ff,0x30241a,2.1));
      const key=new T.DirectionalLight(0xffe5bc,2.5);key.position.set(2,4,5);this.scene.add(key);
      const rim=new T.DirectionalLight(0x78acdc,1.8);rim.position.set(-3,1,-2);this.scene.add(rim);
      this.materials = {
        wood:new T.MeshStandardMaterial({color:0xbfa37b,roughness:.55,metalness:.01}),
        end:new T.MeshStandardMaterial({color:0x9b6838,roughness:.65}),
        grip:new T.MeshStandardMaterial({color:0x101b2b,roughness:.85}),
        wrap:new T.MeshStandardMaterial({color:0x344352,roughness:.88}),
        gold:new T.MeshStandardMaterial({color:0xb58a45,roughness:.55})
      };
      // Wood grain follows the solid surface and never scales independently of the bat.
      this.materials.wood.onBeforeCompile = shader => {
        shader.vertexShader = 'varying vec3 vWood;\n' + shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvWood = position;');
        shader.fragmentShader = 'varying vec3 vWood;\n' + shader.fragmentShader.replace('#include <color_fragment>','#include <color_fragment>\nfloat grain = sin(vWood.y*650.0 + sin(vWood.x*22.0)*2.0 + vWood.z*340.0);\ndiffuseColor.rgb *= 0.97 + 0.035*grain;');
      };
      this.root = new T.Group();this.root.name='bat-only-swing-rig';this.scene.add(this.root);
      this.makeBat();
      this.mergeRigMeshes();
      this.trailGeometry = new T.BufferGeometry().setFromPoints([V(),V()]);
      this.trail = new T.Line(this.trailGeometry,new T.LineBasicMaterial({color:0xf8dc9b,transparent:true,opacity:.16,depthWrite:false}));
      this.trail.visible=false;this.scene.add(this.trail);
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
      const points=[[-.104,0],[-.104,.014],[-.103,.016],[-.10,.020],[-.095,.020],[-.09,.012],[-.02,.011],[.10,.012],[.25,.0135],[.43,.018],[.60,.025],[.73,.027],[.90,.027],[.938,.024],[.947,.015],[.95,.001]].map(([x,r])=>new T.Vector2(r,x));
      const wood=this.mesh(new T.LatheGeometry(points,28),this.materials.wood);wood.rotation.z=-Math.PI/2;wood.name='solid-maple-bat';this.batMesh=wood;
      const handle=this.mesh(new T.CylinderGeometry(.0128,.012,.185,20),this.materials.grip);handle.rotation.z=-Math.PI/2;handle.position.x=.008;
      for(let i=0;i<12;i++){const ring=this.mesh(new T.TorusGeometry(.0128,.0009,4,16),this.materials.wrap);ring.rotation.y=Math.PI/2;ring.position.x=-.071+i*.014;}
      const end=this.mesh(new T.CircleGeometry(.019,24),this.materials.end);end.rotation.y=Math.PI/2;end.position.x=.9455;
      const cap=this.mesh(new T.TorusGeometry(.020,.001,4,24),this.materials.gold);cap.rotation.y=Math.PI/2;cap.position.x=.9458;
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
      const rect=this.surface.getBoundingClientRect();this.width=rect.width;this.height=rect.height;this.ratio=rect.height/rect.width;
      this.camera.top=this.ratio;this.camera.updateProjectionMatrix();
      const dpr=Math.min(devicePixelRatio||1,2);
      if(this.renderer){this.renderer.setPixelRatio(dpr);this.renderer.setSize(this.width,this.height,false);}
      else if(this.context){this.canvas.width=Math.round(this.width*dpr);this.canvas.height=Math.round(this.height*dpr);this.dpr=dpr;}
    }
    configure(target,lead,follow,miss,row){
      const name=row<2?'high':row===2?'middle':'low', profile=PROFILES[name];
      const point={x:target.x/this.width,y:target.y/this.width};
      const pivot={x:.09,y:Math.min(point.y+profile.drop,this.ratio*.716)};
      const dx=(point.x-pivot.x)/this.length,dy=(pivot.y-point.y-(miss?.055:0))/this.length;
      const yaw=Math.acos(clamp(dx/Math.sqrt(1-dy*dy),-1,1));
      // An 18-degree screen-space rise at impact; the yaw derivative matches across contact.
      const horizontal=Math.sqrt(1-dy*dy),attack=Math.tan(18*Math.PI/180);
      const forward=.038+this.length*(68*Math.PI/180)*horizontal*Math.sin(yaw);
      const coupling=this.length*dy*Math.cos(yaw)/horizontal;
      const contactRise=(attack*forward-.013)/(this.length+attack*coupling);
      const config={point,pivot,profile,name,lead,follow,miss,dy,yaw,contactRise,ratio:this.ratio,length:this.length};
      const table=(from,to)=>{const values=[];let distance=0,previous;for(let i=0;i<=180;i++){const q=from+(to-from)*i/180,pose=this.pose(config,q);if(previous)distance+=Math.hypot(pose.sweet.x-previous.x,pose.sweet.y-previous.y);values.push({q,distance});previous=pose.sweet;}return{values,distance};};
      config.approach=table(-1,0);config.finish=table(0,1);
      // Match the speed through contact; the follow-through then loses speed progressively.
      const swingDuration=lead*.38;
      config.contactSpeed=3*config.approach.distance/swingDuration;
      config.finishPower=clamp(config.contactSpeed*follow/config.finish.distance,1.25,5.5);
      return config;
    }
    pose(g,q){
      const contact=q>=0;
      const x=g.pivot.x+.038*q-(contact?.070*q*q:0);
      const y=g.pivot.y-.013*q+(contact?-.045:.022)*q*q;
      // Load above the ball, dip into the hitting plane, then rise through it and finish high.
      let cy=g.dy+g.contactRise*q+(contact?g.profile.finishLift:g.profile.loadLift+g.contactRise)*q*q;
      const guard=.294*g.ratio+.025;
      cy=Math.min(cy,(y-guard)/.95);
      const turn=68*q+(contact?(g.profile.sweep-68)*q*q:0);
      const yaw=g.yaw-turn*Math.PI/180;
      let dx=Math.sqrt(Math.max(0,1-cy*cy))*Math.cos(yaw);
      // Camera is on +Z; the barrel must pass through contact toward the field (-Z).
      const zSign=Math.sign(Math.sin(yaw)||1),dz=zSign*Math.sqrt(Math.max(0,1-dx*dx-cy*cy));
      const grip=V(x,g.ratio-y,.05-.03*q);
      const direction=V(dx,cy,dz).normalize();
      const sweet=grip.clone().addScaledVector(direction,this.length);
      return {grip,direction,sweet,q};
    }
    progress(table,fraction){
      const d=clamp(fraction,0,1)*table.distance,values=table.values;
      let low=0,high=values.length-1;
      while(low+1<high){const mid=(low+high)>>1;if(values[mid].distance<d)low=mid;else high=mid;}
      const a=values[low],b=values[high];return a.q+(b.q-a.q)*(d-a.distance)/(b.distance-a.distance||1);
    }
    sample(g,time){
      const start=g.lead*.62;let q=-1;
      if(time>start&&time<=g.lead)q=this.progress(g.approach,Math.pow((time-start)/(g.lead-start),3));
      else if(time>g.lead)q=this.progress(g.finish,1-Math.pow(1-clamp((time-g.lead)/g.follow,0,1),g.finishPower));
      const pose=this.pose(g,q);
      pose.alpha=smooth(time/Math.min(85,g.lead*.2))*(1-smooth((time-g.lead-g.follow*.72)/(g.follow*.28)));
      return pose;
    }
    draw(g,time){
      if(!this.available||this.contextLost)return;
      const p=this.sample(g,time);
      this.root.visible=true;this.root.position.copy(p.grip);
      // Keep the bat surface stable as the swing climbs through the hitting plane.
      const up=V(0,1,0).addScaledVector(p.direction,-p.direction.y).normalize();
      const normal=p.direction.clone().cross(up).normalize();
      this.root.quaternion.setFromRotationMatrix(new T.Matrix4().makeBasis(p.direction,up,normal));
      this.root.updateMatrixWorld(true);
      const inContact=time>g.lead-45&&time<g.lead+75;
      this.trail.visible=inContact;
      if(inContact){const points=[];for(let offset=28;offset>=0;offset-=4)points.push(this.sample(g,Math.max(0,time-offset)).sweet);this.trailGeometry.setFromPoints(points);this.trail.material.opacity=.14;}
      this.canvas.style.opacity=String(p.alpha);
      this.canvas.dataset.profile=g.name;this.canvas.dataset.phase=time<g.lead*.62?'load':time<g.lead?'swing':'follow';
      if(this.renderer)this.renderer.render(this.scene,this.camera);else this.drawSoftware();
      this.lastPose=p;
    }
    drawSoftware(){
      const ctx=this.context,w=this.width,h=this.height,dpr=this.dpr;ctx.setTransform(dpr,0,0,dpr,0,0);ctx.clearRect(0,0,w,h);
      this.scene.updateMatrixWorld(true);const faces=[],light=V(.35,.7,1).normalize();
      this.scene.traverse(obj=>{if(!obj.isMesh)return;let visible=true;for(let p=obj;p;p=p.parent)if(!p.visible)visible=false;if(!visible)return;
        const pos=obj.geometry.attributes.position,idx=obj.geometry.index;const n=idx?idx.count:pos.count;
        for(let i=0;i<n;i+=3){const vertices=[0,1,2].map(k=>V().fromBufferAttribute(pos,idx?idx.getX(i+k):i+k).applyMatrix4(obj.matrixWorld));const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0])).normalize();if(normal.z<=0)continue;const color=obj.material.color.clone().multiplyScalar(.60+.6*Math.max(0,normal.dot(light)));faces.push({v:vertices,z:vertices.reduce((a,p)=>a+p.z,0)/3,color:'#'+color.getHexString()});}
      });
      faces.sort((a,b)=>a.z-b.z);for(const face of faces){ctx.beginPath();face.v.forEach((v,i)=>{const x=v.x*w,y=(this.ratio-v.y)*w;i?ctx.lineTo(x,y):ctx.moveTo(x,y)});ctx.closePath();ctx.fillStyle=face.color;ctx.fill();}
    }
    play(target,lead,follow,miss,row){
      this.cancel();if(!lead&&!follow)return null;
      this.resize();const config=this.configure(target,lead,follow,miss,row),rig=this;
      let start=document.timeline.currentTime,paused=false,held=0,frame=0,done=false,resolve;
      const finished=new Promise(r=>resolve=r);
      const controller={config,contactTime:lead,companions:[],finished,
        get startTime(){return start},set startTime(v){start=v},
        get currentTime(){return paused?held:document.timeline.currentTime-start},
        set currentTime(v){held=v;start=document.timeline.currentTime-v;rig.draw(config,v)},
        pause(){held=this.currentTime;paused=true;cancelAnimationFrame(frame)},
        play(){if(done)return;start=document.timeline.currentTime-held;paused=false;frame=requestAnimationFrame(tick)},
        cancel(){if(done)return;done=true;cancelAnimationFrame(frame);resolve();},
        seek(time){this.pause();this.currentTime=time;}
      };
      function tick(){if(done||paused)return;const time=controller.currentTime;rig.draw(config,Math.min(time,lead+follow));if(time>=lead+follow){done=true;resolve();}else frame=requestAnimationFrame(tick);}
      this.active=controller;this.draw(config,0);frame=requestAnimationFrame(tick);return controller;
    }
    cancel(){if(this.active)this.active.cancel();this.active=null;this.canvas.style.opacity='0';if(this.renderer)this.renderer.clear();else if(this.context)this.context.clearRect(0,0,this.canvas.width,this.canvas.height);}
    inspect(g,time){const p=this.sample(g,time);return{profile:g.name,grip:{x:p.grip.x*this.width,y:(g.ratio-p.grip.y)*this.width},contact:{x:p.sweet.x*this.width,y:(g.ratio-p.sweet.y)*this.width},length:p.grip.distanceTo(p.sweet),alpha:p.alpha,q:p.q};}
  }
  window.BaseballSwing=BaseballSwing;
})();
