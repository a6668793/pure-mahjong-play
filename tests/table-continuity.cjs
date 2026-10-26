const assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync('assets/table-3d.js','utf8');
const reconcile=source.slice(source.indexOf('async function reconcile()'),source.indexOf('class TableScene'));
function board(phase='') {const classes=new Set(phase.split(' ').filter(Boolean));return {isConnected:true,classList:{add:(...xs)=>xs.forEach(x=>classes.add(x)),remove:(...xs)=>xs.forEach(x=>classes.delete(x)),contains:x=>classes.has(x)},setAttribute(){},removeAttribute(){},parentElement:{querySelector(selector){return selector==='.scene-mode'?null:{append(){}}},append(){}}};}
(async()=>{
 const context={console,mountShowaScene(){},unmountShowaScene(){},document:{createElement(){return {setAttribute(){},remove(){}}}},generation:0,forceSoftware:false,loader:async()=>({}),currentBoard:null,updates:0,disposed:0};
 context.root={querySelector:()=>context.currentBoard};context.view={board:null,updateBoard(b){this.board=b;context.updates++},dispose(){context.disposed++}};
 const original=context.view;context.TableScene=class {constructor(T,b){this.board=b;b.classList.add('three-table')}dispose(){context.disposed++}};
 vm.createContext(context);vm.runInContext(reconcile+';globalThis.run=reconcile',context);
 for(const phase of ['','is-dealing','is-opening','is-dealing','']){context.currentBoard=board(phase);await context.run();assert.equal(context.view,original,'must retain the same scene during '+phase);}
 assert.equal(context.updates,5);assert.equal(context.disposed,0);
 for(const phase of ['is-opening','is-dealing']){context.view=null;context.currentBoard=board(phase);await context.run();assert(context.currentBoard.classList.contains('three-table'),'3D must initialize during '+phase);}
 assert(!source.includes('scene-mode'));assert(!source.includes('preferred'));
 const html=fs.readFileSync('index.html','utf8');assert.equal((html.match(/globalThis\.PureTable3D\?\.sync\(\)/g)||[]).length,2,'solo and online renders must mount 3D synchronously before paint');
 assert(!html.includes('table-perspective.css'),'retired flat stylesheet must not be loaded');
 console.log('PASS: opening/draw/play retain one scene; opening/draw initialize 3D; solo+online mount synchronously.');
})().catch(error=>{console.error(error);process.exitCode=1});
