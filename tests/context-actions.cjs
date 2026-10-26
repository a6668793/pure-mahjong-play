const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const html=fs.readFileSync('index.html','utf8'),code=html.slice(html.indexOf('function showaTableActions('),html.indexOf('function showaPerspectiveRiver('));
const context={};vm.createContext(context);vm.runInContext(code+';globalThis.apply=showaTableActions',context);
function actions(buttons){return {buttons:[...buttons],querySelectorAll(){return [...this.buttons]},querySelector(){return null},append(b){this.buttons=this.buttons.filter(x=>x!==b);this.buttons.push(b)},setAttribute(){}};}
let count=0;const chi1={dataset:{action:'chi'},onclick:()=>count++},chi2={dataset:{action:'chi'},onclick:()=>count++},pass={dataset:{action:'pass'},onclick:()=>count++};
const options=actions([pass,chi1,chi2]);context.apply(options);assert.deepEqual(options.buttons,[chi1,chi2,pass]);options.buttons.forEach(b=>b.onclick());assert.equal(count,3,'all legal chi choices and original handlers retained');
const empty=actions([]);context.apply(empty);assert.equal(empty.buttons.length,0,'must not manufacture inactive eat/pong/kong/win buttons');
const discard={dataset:{action:'discard'},disabled:true},own=actions([discard]);context.apply(own);assert.equal(own.buttons[0],discard);assert.equal(discard.disabled,true);
console.log('PASS: no placeholder actions; multiple legal choices, disabled state and original handlers retained.');
