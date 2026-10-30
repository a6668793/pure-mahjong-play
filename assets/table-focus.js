/* V1.6.2: presentation-only chrome; original controls and claim events are retained. */
const sheet=document.createElement('link');sheet.rel='stylesheet';sheet.href=new URL('./table-focus.css?v=162',import.meta.url).href;document.head.append(sheet);
const header=document.querySelector('body > header');
const anchor=document.createComment('original header location');header.before(anchor);
const panel=document.createElement('details');panel.className='table-tools';
const summary=document.createElement('summary');summary.textContent='牌局資訊・設定';
const content=document.createElement('div');content.className='table-tools-content';
panel.append(summary,content);document.body.append(panel);
const app=document.querySelector('#app');
new MutationObserver(()=>{if(!app.querySelector('.immersive-table')){anchor.after(header);panel.open=false;panel.hidden=true;}}).observe(app,{childList:true});
panel.hidden=true;
const clean=s=>(s??'').replace(/^(你|電腦)[・·]/,'').trim();
export function mountTableFocus(board){
  panel.hidden=false;content.prepend(header);
  const head=board.parentElement.querySelector('.table-head');
  for(const old of content.querySelectorAll('.table-head'))if(old!==head)old.remove();
  if(head)content.append(head);
  const status=board.querySelector('.center-label')||head?.querySelector('.center-label');
  const current=status?.textContent?.trim();
  const round=status?.dataset.round;
  if(round){summary.textContent=round+' · 設定';summary.title='展開牌局資訊與設定';}
  status?.remove();
  const sides=['south','east','north','west'];
  const seats=sides.map(side=>({side,seat:board.querySelector('.seat-'+side),zone:board.querySelector('.river-zone-'+side)}));
  for(const entry of seats){
    const {seat,zone}=entry;if(!seat)continue;
    const bubble=document.createElement('div');bubble.className='seat-dialogue';bubble.setAttribute('role','status');bubble.setAttribute('aria-live','polite');
    const last=zone?.querySelector('.latest-discard');
    if(last){const text=last.getAttribute('aria-label')??'';bubble.textContent=text.includes('打出 ')?'打出 '+text.split('打出 ').pop():text;}
    else if(seat.classList.contains('seat-active')&&current){bubble.textContent=current.includes('等待回應')?current:(entry.side==='south'?'輪到你出牌':'思考中…');}
    if(bubble.textContent)seat.append(bubble);
  }
  for(const claim of board.querySelectorAll(':scope > .claim-announcement')){
    const name=clean(claim.querySelector('.claim-identity strong')?.textContent);
    const owner=seats.find(({zone})=>clean(zone?.getAttribute('aria-label')?.replace(/的捨牌$/,''))===name);
    // Never guess another player's seat when a name cannot be resolved.
    const target=owner?.seat??content;
    target.querySelector('.seat-dialogue')?.remove();
    claim.classList.add('seat-claim');target.append(claim);
  }
  board.classList.add('focus-table');
}
