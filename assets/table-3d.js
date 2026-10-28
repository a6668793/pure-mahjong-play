import './play-comfort.js';
import {mountShowaScene,unmountShowaScene} from './showa-scene.js';
import {SoftwareRenderer} from './table-software-renderer.js';
/* PURE MAHJONG V1.5 — presentation-only WebGL adapter.
 * Reads the existing public DOM; original buttons remain the sole action path.
 * No storage, engine, network state, or hidden opponent tile access. */
const root = document.querySelector('#app');
let view, generation = 0, forceSoftware = false;
const threeReady = import('./vendor/three.module.js');
const loader = () => threeReady;
const sides = ['south', 'east', 'north', 'west'];
let queued = false;
const observe = new MutationObserver(() => {
  if (queued) return;
  queued = true;
  requestAnimationFrame(() => { queued = false; reconcile(); });
});
observe.observe(root, {childList:true});
reconcile();
globalThis.PureTable3D = {sync: reconcile};
async function reconcile() {
  const board = root.querySelector('.immersive-table');
  if (view?.board === board && board?.isConnected) return;
  const ticket = ++generation;
  if (!board) { view?.dispose(); view = null; unmountShowaScene(); return; }
  mountShowaScene();
  if (view) { view.updateBoard(board); return; }
  board.classList.add('three-loading');board.setAttribute('aria-busy','true');
  try {
    const THREE = await loader();
    if (ticket !== generation || !board.isConnected) return;
    view = new TableScene(THREE, board);
    board.classList.remove('three-loading');board.removeAttribute('aria-busy');
  } catch (error) {
    board.classList.remove('three-table','three-loading');board.classList.add('three-error');board.removeAttribute('aria-busy');
    board.querySelector('.webgl-stage')?.remove();
    const panel=document.createElement('section');panel.className='scene-error';panel.setAttribute('role','alert');
    const message=document.createElement('p');message.textContent='立體牌桌暫時無法載入，請重新整理後再試。';
    const retry=document.createElement('button');retry.textContent='重新整理';retry.onclick=()=>location.reload();panel.append(message,retry);board.append(panel);
    console.warn('3D table could not be initialized.', error);
  }
}
class TableScene {
  constructor(T, board) {
    this.T=T; this.board=board; this.dead=false; this.resources=new Set(); this.faceCache=new Map(); this.buttons=[]; this.identities=[];
    this.scene=new T.Scene();
    this.camera=new T.PerspectiveCamera(35, 2, .1, 150);
    try{if(forceSoftware)throw new Error('Use software 3D');this.renderer=new T.WebGLRenderer({alpha:true,antialias:false,powerPreference:'low-power'});}catch{this.renderer=new SoftwareRenderer(T);}
    this.board.dataset.renderer=this.renderer.isSoftwareRenderer?'software-3d':'webgl';
    this.renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.5));
    this.renderer.outputColorSpace=T.SRGBColorSpace;
    this.renderer.shadowMap.enabled=true; this.renderer.shadowMap.type=T.PCFSoftShadowMap;
    this.stage=document.createElement('div'); this.stage.className='webgl-stage';
    this.canvas=this.renderer.domElement; this.canvas.className='mahjong-canvas';
    this.canvas.setAttribute('role','img'); this.canvas.setAttribute('aria-label','昭和麻將館立體牌桌；使用手牌按鈕選牌，再按出牌。');
    this.stage.append(this.canvas); board.prepend(this.stage);
    this.contextLost = e => {e.preventDefault(); forceSoftware=true; this.dispose(); view=null; reconcile();};
    this.canvas.addEventListener('webglcontextlost',this.contextLost);
    const ambient=new T.HemisphereLight(0xffeed1,0x405044,2.4); this.scene.add(ambient);
    const key=new T.DirectionalLight(0xffdc9b,3.1); key.position.set(-7,18,9); key.castShadow=true;
    Object.assign(key.shadow.camera,{left:-14,right:14,top:13,bottom:-13,near:1,far:45});
    key.shadow.mapSize.set(1024,1024); key.shadow.bias=-.001; key.shadow.normalBias=.03;
    this.scene.add(key);
    const fill=new T.DirectionalLight(0xb4d4cd,1.25); fill.position.set(9,8,-10); this.scene.add(fill);
    this.makeTable(); this.dynamic=new T.Group();this.scene.add(this.dynamic);this.readTiles();
    board.classList.add('three-table');
    this.resizeObserver=new ResizeObserver(()=>this.resize()); this.resizeObserver.observe(board);
    this.scroll=()=>this.projectControls(); this.stage.addEventListener('scroll',this.scroll,{passive:true});
    this.resize();
  }
  own(resource) {this.resources.add(resource); return resource;}
  material(color,extra={}) {return this.own(new this.T.MeshStandardMaterial({color,roughness:.85,...extra}));}
  box(w,h,d,material,x,y,z) {
    const mesh=new this.T.Mesh(this.own(new this.T.BoxGeometry(w,h,d)),material);
    mesh.position.set(x,y,z);mesh.castShadow=true;mesh.receiveShadow=true;this.scene.add(mesh);return mesh;
  }
  texture(canvas) {const t=this.own(new this.T.CanvasTexture(canvas));t.colorSpace=this.T.SRGBColorSpace;t.magFilter=this.T.NearestFilter;t.minFilter=this.T.LinearMipmapLinearFilter;return t;}
  makeTable() {
    const T=this.T;
    // Low-resolution procedural materials; no photography or paid assets.
    const wood=document.createElement('canvas');wood.width=128;wood.height=128;const wc=wood.getContext('2d');
    wc.fillStyle='#593923';wc.fillRect(0,0,128,128);
    for(let i=0;i<128;i++){wc.fillStyle=['#68452b','#4b301e','#795135','#57351f'][i%4];wc.fillRect(0,i,128,i%7===0?2:1);}
    const felt=document.createElement('canvas');felt.width=felt.height=128;const fc=felt.getContext('2d');fc.fillStyle='#166047';fc.fillRect(0,0,128,128);
    for(let y=0;y<128;y+=2)for(let x=0;x<128;x+=2){const v=(x*31+y*17)%13;fc.fillStyle=v<4?'#1b674d':v<8?'#155c43':'#185f47';fc.fillRect(x,y,1,1);}
    const wt=this.texture(wood);wt.wrapS=wt.wrapT=T.RepeatWrapping;wt.repeat.set(3,2);
    const ft=this.texture(felt);ft.wrapS=ft.wrapT=T.RepeatWrapping;ft.repeat.set(7,5);
    const woodMat=this.material('#ffffff',{map:wt}),dark=this.material('#281b12'),gold=this.material('#bd9250',{metalness:.45,roughness:.5}),green=this.material('#ffffff',{map:ft});
    this.box(22.8,.9,15.9,dark,0,-.65,0);
    this.box(22.6,.48,15.7,woodMat,0,-.15,0);
    this.box(21.3,.14,14.4,green,0,.15,0);
    for(const s of [-1,1]){
      this.box(22.7,.44,.62,woodMat,0,.2,s*7.55);
      this.box(.64,.44,15,woodMat,s*11.05,.2,0);
      this.box(21.7,.035,.055,gold,0,.44,s*7.3);
      this.box(.055,.035,14.6,gold,s*10.75,.44,0);
      this.box(22.7,.06,.06,gold,0,-.25,s*7.87);
    }
    this.box(3.9,.15,2.45,woodMat,0,.3,-.1);
    this.box(3.7,.04,2.25,gold,0,.39,-.1);
    this.box(3.5,.04,2.07,dark,0,.425,-.1);
    this.handRail=this.box(1,1,1,woodMat,0,0,0);this.handRail.visible=false;this.handRail.castShadow=false;
    this.handLip=this.box(1,1,1,gold,0,0,0);this.handLip.visible=false;this.handLip.castShadow=false;
    // A reusable bevelled ivory tile with a green backing slab.
    const shape=new T.Shape(),w=.62,h=.9,r=.045;
    shape.moveTo(-w/2+r,-h/2);shape.lineTo(w/2-r,-h/2);shape.quadraticCurveTo(w/2,-h/2,w/2,-h/2+r);shape.lineTo(w/2,h/2-r);shape.quadraticCurveTo(w/2,h/2,w/2-r,h/2);shape.lineTo(-w/2+r,h/2);shape.quadraticCurveTo(-w/2,h/2,-w/2,h/2-r);shape.lineTo(-w/2,-h/2+r);shape.quadraticCurveTo(-w/2,-h/2,-w/2+r,-h/2);
    this.tileGeometry=this.own(new T.ExtrudeGeometry(shape,{depth:.27,bevelEnabled:true,bevelSegments:1,steps:1,bevelSize:.025,bevelThickness:.025,curveSegments:2}));
    this.tileGeometry.translate(0,0,-.135);
    this.backGeometry=this.own(new T.BoxGeometry(.62,.9,.09));
    this.faceGeometry=this.own(new T.PlaneGeometry(.59,.87));
    this.ivory=this.material('#f3e5c7');this.backMaterial=this.material('#16563d',{roughness:.65});
    this.contactGeometry=this.own(new T.PlaneGeometry(.74,1.02));this.contactMaterial=this.material('#0c3c2d');
    this.selectMaterial=this.material('#ffd16d',{emissive:'#b66d13',emissiveIntensity:.3});
  }
  face(svg) {
    const key=svg.getAttribute('aria-label') || svg.outerHTML;
    if(this.faceCache.has(key))return this.faceCache.get(key);
    const canvas=document.createElement('canvas');canvas.width=120;canvas.height=160;
    const ctx=canvas.getContext('2d');ctx.fillStyle=key==='牌背'?'#16563d':'#f3e5c7';ctx.fillRect(0,0,120,160);
    const tex=this.texture(canvas),mat=this.material('#ffffff',{map:tex,roughness:.8});
    this.faceCache.set(key,mat);
    const clone=svg.cloneNode(true);
    // Reuse the exact existing, valid tile artwork; remove only its old faux-depth shell.
    [...clone.children].slice(0,5).forEach(n=>n.remove());
    clone.setAttribute('viewBox','0 0 60 80');clone.setAttribute('width','120');clone.setAttribute('height','160');
    const image=new Image(),url=URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(clone)],{type:'image/svg+xml'}));
    image.onload=()=>{URL.revokeObjectURL(url);if(this.dead)return;ctx.drawImage(image,0,0,120,160);tex.needsUpdate=true;this.render();};
    image.onerror=()=>URL.revokeObjectURL(url); image.src=url;
    return mat;
  }
  tile(svg,x,y,z,{flat=false,angle=0,scale=1,button=null,selected=false}={}) {
    const T=this.T,g=new T.Group();
    if(this.renderer.isSoftwareRenderer){const shadow=new T.Mesh(this.contactGeometry,this.contactMaterial);shadow.rotation.x=-Math.PI/2;shadow.rotation.z=-angle;shadow.position.set(x+.05,.233,z+.07);shadow.scale.set(scale,flat?scale:scale*.4,1);this.dynamic.add(shadow);g.userData.contactShadow=shadow;}
    const shell=new T.Mesh(this.tileGeometry,selected?this.selectMaterial:this.ivory);shell.castShadow=shell.receiveShadow=true;g.add(shell);
    const back=new T.Mesh(this.backGeometry,this.backMaterial);back.position.z=-.17;back.castShadow=true;g.add(back);
    const face=new T.Mesh(this.faceGeometry,this.face(svg));face.position.z=.164;g.add(face);
    if(flat)g.rotation.x=-Math.PI/2;
    g.rotation.y=flat?0:angle;
    if(flat){ // turn around the tabletop normal, preserving the face-up orientation
      const turn=new T.Group();turn.rotation.y=angle;turn.add(g);turn.position.set(x,y,z);turn.scale.setScalar(scale);this.dynamic.add(turn);return turn;
    }
    if(button)g.rotation.x=-.18;g.position.set(x,y,z);g.scale.setScalar(scale);this.dynamic.add(g);
    if(button)this.buttons.push({button,mesh:g,basePosition:g.position.clone(),baseQuaternion:g.quaternion.clone(),baseScale:g.scale.clone()});return g;
  }
  rotate(x,z,angle) {return [x*Math.cos(angle)+z*Math.sin(angle),-x*Math.sin(angle)+z*Math.cos(angle)];}
  readTiles() {
    this.hud=document.createElement('section');this.hud.className='seat-dock';this.hud.setAttribute('aria-label','四方玩家與分數');this.board.append(this.hud);
    for(const [sideIndex,side]of sides.entries()){
      const player=this.board.querySelector('.player.'+side);if(!player)continue;
      const angle=[0,Math.PI/2,Math.PI,-Math.PI/2][sideIndex];
      const identity=player.querySelector('.player-identity');
      if(identity){
        identity.classList.add('seat-badge','seat-'+side);identity.classList.toggle('seat-active',player.classList.contains('active'));
        const position=document.createElement('span');position.className='seat-position';position.textContent=['自己','右家','對家','左家'][sideIndex];identity.prepend(position);
        const name=identity.querySelector('.player-name'),text=name?.textContent??'',split=text.lastIndexOf(' ／ ');
        if(name&&split>=0){name.textContent=text.slice(0,split);name.title=text.slice(0,split);const score=document.createElement('strong');score.className='seat-score';score.textContent=text.slice(split+3);identity.querySelector('.identity-copy').append(score);}
        this.hud.append(identity);this.identities.push({element:identity});
      }
      if(side==='south'){
        const buttons=[...player.querySelectorAll('.hand .tile,.drawn-slot .tile')],step=1.02,total=(buttons.length-1)*step+.55;
        buttons.forEach((b,i)=>{b.addEventListener('focus',()=>{const edge=b.getBoundingClientRect(),area=this.board.getBoundingClientRect();if(edge.left<area.left||edge.right>area.right){this.stage.scrollLeft+=edge.left-area.left-this.board.clientWidth/2;this.projectControls();}});const drawn=b.classList.contains('drawn-tile'),selected=b.classList.contains('selected');this.tile(b.querySelector('svg'),-total/2+i*step+(drawn?.55:0),1.05+(selected?.28:0),6.55,{button:b,selected,scale:1.5});});
      }else{
        const backs=[...player.querySelectorAll('.backs>svg')];
        backs.forEach((svg,i)=>{const [x,z]=this.rotate((i-(backs.length-1)/2)*.65,sideIndex===2?6.3:9.5,angle);this.tile(svg,x,.83,z,{angle});});
      }
      // Public melds and flowers only; hidden kongs remain backs as in the original UI.
      const pub=[...player.querySelectorAll(':scope>.tiles svg')];
      pub.forEach((svg,i)=>{const [x,z]=this.rotate(-2.31+(i%8)*.66,(sideIndex%2?8.15:5.05)-Math.floor(i/8)*1.02,angle);this.tile(svg,x,.48,z,{flat:true,angle});});
      const zone=this.board.querySelector('.river-zone-'+side);
      const river=[...(zone?.querySelectorAll('.river-tile')||[])];
      // Six tiles per row. A complete Taiwan hand cannot exhaust this 6-row capacity.
      const rows=Math.ceil(river.length/6),rowStep=Math.min(.94,2.6/Math.max(1,rows-1));
      river.forEach((item,i)=>{const col=i%6,row=Math.floor(i/6);const [x,z]=this.rotate(-1.65+col*.66,1.82+row*rowStep,angle);this.tile(item.querySelector('svg'),x,.48,z,{flat:true,angle,selected:item.classList.contains('latest-discard'),scale:Math.min(.92,rowStep/.95)});});
    }
    // Each wall stack and layer comes from the original wallLayout, including gaps.
    for(const [sideIndex,side]of sides.entries()){
      const rack=this.board.querySelector('.wall-'+side);if(!rack)continue;
      const angle=[0,Math.PI/2,Math.PI,-Math.PI/2][sideIndex];
      const stacks=[...rack.children],backSvg=new DOMParser().parseFromString(Engine.svg(0,true),'image/svg+xml').documentElement;
      stacks.forEach((stack,i)=>{for(const layer of stack.children){const n=layer.classList.contains('layer-1')?1:0;const [x,z]=this.rotate((i-(stacks.length-1)/2)*.655,sideIndex%2?7.3:4.5,angle);this.tile(backSvg,x,.48+n*.37,z,{flat:true,angle});}});
    }
    this.centerLabel=this.board.querySelector('.center-label');
  }
  updateBoard(board) {
    this.resizeObserver.unobserve(this.board);this.board.classList.remove('three-table');this.hud?.remove();
    for(const {button}of this.buttons)button.removeAttribute('style');
    for(const {element}of this.identities)element?.removeAttribute('style');this.centerLabel?.removeAttribute('style');
    this.board=board;board.dataset.renderer=this.renderer.isSoftwareRenderer?'software-3d':'webgl';this.buttons=[];this.identities=[];this.dynamic.clear();
    board.prepend(this.stage);this.readTiles();board.classList.add('three-table');
    this.resizeObserver.observe(board);this.resize();
  }
  resize() {
    if(this.dead)return;
    const landscape=matchMedia('(max-width:1100px) and (max-height:600px) and (orientation:landscape)').matches;
    const portrait=matchMedia('(max-width:700px) and (orientation:portrait)').matches;
    const h=Math.max(this.stage.clientHeight,120),w=(landscape||portrait)?Math.max(this.board.clientWidth,280):Math.max(this.board.clientWidth,820);
    const dimensionsChanged=this.width!==w||this.height!==h;
    this.width=w;this.height=h;this.canvas.style.width=w+'px';this.canvas.style.height=h+'px';
    if(dimensionsChanged)this.renderer.setSize(w,h,false);
    // Keep the whole world above the foreground hand, with undistorted perspective.
    const compact=landscape||portrait;
    this.worldHeight=compact?Math.max(60,h-(portrait?166:94)):h;
    this.camera.clearViewOffset();this.camera.aspect=w/this.worldHeight;
    if(compact)this.camera.setViewOffset(w,this.worldHeight,0,0,w,h);
    this.board.dataset.worldHeight=String(this.worldHeight);
    if(this.lastViewport!==this.board.clientWidth){this.stage.scrollLeft=Math.max(0,(w-this.board.clientWidth)/2);this.lastViewport=this.board.clientWidth;}
    const T=this.T,target=new T.Vector3(0,.25,.1),direction=new T.Vector3(0,18,23).normalize();
    // Fit real world bounds, rather than skewing each UI region independently.
    const bounds=[];for(const x of [-11.7,11.7])for(const z of [-8,8])for(const y of [-1,2.3])bounds.push(new T.Vector3(x,y,z));
    let lo=12,hi=95;
    for(let i=0;i<20;i++){const d=(lo+hi)/2;this.camera.position.copy(target).addScaledVector(direction,d);this.camera.lookAt(target);this.camera.updateProjectionMatrix();this.camera.updateMatrixWorld();const fits=bounds.every(p=>{const q=p.clone().project(this.camera);return Math.abs(q.x)<.97&&q.y<.94&&q.y>1-2*this.worldHeight/h+.06});if(fits)hi=d;else lo=d;}
    this.camera.position.copy(target).addScaledVector(direction,hi);this.camera.lookAt(target);this.camera.updateMatrixWorld();
    this.placeForegroundHand();this.scene.updateMatrixWorld(true);this.projectControls();this.render();
  }
  placeForegroundHand(){
    const compact=matchMedia('(max-width:700px), (max-width:1100px) and (max-height:600px) and (orientation:landscape)').matches;
    this.board.dataset.compactHand=String(compact);this.handRail.visible=this.handLip.visible=compact&&this.buttons.length>0;
    const T=this.T,depth=10,viewHeight=2*Math.tan(this.camera.fov*Math.PI/360)*depth,units=viewHeight/this.worldHeight;
    const count=this.buttons.length,hasDraw=this.buttons.some(x=>x.button.classList.contains('drawn-tile')),twoRows=matchMedia('(max-width:700px) and (orientation:portrait)').matches&&count>9,columns=twoRows?Math.ceil(count/2):count;
    const step=Math.min(49,(this.width-50-(hasDraw?13:0))/Math.max(columns,1)),tileWidth=step-3;
    const position=(mesh,x,y,z)=>{const k=z/depth;mesh.position.set((x-this.width/2)*units*k,(this.worldHeight/2-y)*units*k,-z).applyMatrix4(this.camera.matrixWorld);mesh.quaternion.copy(this.camera.quaternion);};
    for(const [i,item]of this.buttons.entries()){
      const {mesh,button}=item;
      if(mesh.userData.contactShadow)mesh.userData.contactShadow.visible=!compact;
      if(!compact){mesh.position.copy(item.basePosition);mesh.quaternion.copy(item.baseQuaternion);mesh.scale.copy(item.baseScale);continue;}
      const selected=button.classList.contains('selected'),drawn=button.classList.contains('drawn-tile');
      const row=twoRows?Math.floor(i/columns):0,col=twoRows?i%columns:i,rowCount=twoRows?Math.min(columns,count-row*columns):count;
      const rowHasDraw=hasDraw&&(!twoRows||row===1),total=(rowCount-1)*step+(rowHasDraw?13:0);
      position(mesh,this.width/2-total/2+col*step+(drawn?13:0),this.height-38-(twoRows&&row===0?72:0)-(selected?10:0),depth);
      mesh.quaternion.multiply(new T.Quaternion().setFromAxisAngle(new T.Vector3(1,0,0),-.12));mesh.scale.setScalar(tileWidth/(.62/units));
    }
    if(compact){
      position(this.handRail,this.width/2,this.height-7,10.8);this.handRail.scale.set((this.width-12)*units*1.08,12*units,.22);
      position(this.handLip,this.width/2,this.height-11,10.7);this.handLip.scale.set((this.width-12)*units*1.07,1.5*units,.1);
    }
  }
  project(point) {const p=new this.T.Vector3(...point).project(this.camera);return {x:(p.x+1)*this.width/2-this.stage.scrollLeft,y:(1-p.y)*this.height/2+this.stage.offsetTop};}
  projectControls() {
    if(this.dead||!this.width)return;
    for(const {button,mesh}of this.buttons){
      const points=[];for(const x of [-.35,.35])for(const y of [-.49,.49]){const v=new this.T.Vector3(x,y,.18);mesh.localToWorld(v);points.push(this.project(v.toArray()));}
      const left=Math.min(...points.map(p=>p.x)),top=Math.min(...points.map(p=>p.y)),right=Math.max(...points.map(p=>p.x)),bottom=Math.max(...points.map(p=>p.y));
      Object.assign(button.style,{left:left+'px',top:top+'px',width:(right-left)+'px',height:(bottom-top)+'px'});
    }
    // Status lives in its reserved DOM rail, never over the river.
    this.centerLabel?.removeAttribute('style');
  }
  render(){if(this.dead||this.frame)return;this.frame=requestAnimationFrame(()=>{this.frame=null;if(this.dead)return;try{const started=performance.now();this.renderer.render(this.scene,this.camera);this.board.dataset.renderMs=(performance.now()-started).toFixed(1);}catch(error){console.warn('Table render failed',error);}});}
  dispose(){
    if(this.dead)return;this.dead=true;if(this.frame)cancelAnimationFrame(this.frame);this.resizeObserver?.disconnect();this.stage.removeEventListener('scroll',this.scroll);this.canvas.removeEventListener('webglcontextlost',this.contextLost);
    this.stage.remove();this.hud?.remove();this.board.classList.remove('three-table');
    for(const {button}of this.buttons)button.removeAttribute('style');
    for(const {element}of this.identities)element?.removeAttribute('style');this.centerLabel?.removeAttribute('style');
    this.resources.forEach(r=>r.dispose());this.resources.clear();this.renderer.dispose();this.renderer.forceContextLoss();
  }
}
