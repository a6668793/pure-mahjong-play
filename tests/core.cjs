const fs=require('fs'),vm=require('vm'),assert=require('assert'),cp=require('child_process');
const html=fs.readFileSync('index.html','utf8'),base=cp.execFileSync('git',['show','origin/main:index.html'],{maxBuffer:4000000}).toString();
const engine=h=>h.slice(h.indexOf('const Engine='),h.indexOf('(() => {',h.indexOf('const Engine=')));
const context={console,structuredClone,crypto:require('crypto').webcrypto,setTimeout,clearTimeout,URL,TextEncoder,TextDecoder};vm.createContext(context);vm.runInContext(engine(html)+';globalThis.E=Engine',context);const E=context.E;
for(const [start,end]of [['function decompositions','function rank'],['class Game {','function localShuffle'],['class GuestProfiles','return {RANKS']]){if(start==='function decompositions')continue;const extract=(h)=>{let a=h.indexOf(start);return h.slice(a,h.indexOf(end,a))};assert.equal(extract(html),extract(base),'protected code changed: '+start)}
let actions={},wins=0,draws=0;
for(let n=0;n<100;n++){const g=new E.Game(E.localShuffle(),{taiValue:[10,50,100][n%3]});for(let step=0;g.phase!=='ended'&&step<1000;step++){let s=g.turn;if(g.phase==='response')s=Object.keys(g.pending.options).map(Number).find(s=>!g.pending.replies[s]);const a=E.chooseAction(g.view(s),s);assert(a);actions[a.type]=(actions[a.type]??0)+1;g.act(s,a,g.seq)}assert.equal(g.phase,'ended');assert.equal(g.result.delta.reduce((a,b)=>a+b,0),0);g.result.draw?draws++:wins++;const restored=Object.assign(Object.create(E.Game.prototype),structuredClone(g));assert.equal(restored.phase,'ended')}
assert.equal(E.RANKS.length,20);for(const r of E.RANKS)assert.equal(E.rankFor(r.min).level,r.level);
console.log(JSON.stringify({games:100,wins,draws,actions,protectedEngineAndStorage:'identical',rankCount:E.RANKS.length},null,2));
for(let level=1;level<=20;level++){const id=String(level).padStart(2,'0');assert(fs.statSync(`assets/ranks-clear/rank-${id}.webp`).size>1000);assert(E.rankBadgeSVG(level).includes(`rank-${id}.webp`));assert(E.rankBadgeSVG(level).includes(`Lv.${level}`));}
for(let id=0;id<144;id++){assert(E.svg(id).includes(`aria-label="${E.label(id)}"`));assert(E.svg(id,true).includes('aria-label="牌背"'));}
console.log('20 new badge assets and 144 readable tile labels: PASS');
