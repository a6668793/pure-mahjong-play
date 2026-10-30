const style=document.createElement('link');style.rel='stylesheet';style.href=new URL('./play-comfort.css?v=161',import.meta.url).href;document.head.append(style);
const version=document.querySelector('footer');if(version)for(const child of version.children)if(child.textContent.includes('1.6.0'))child.textContent='1.6.2 · 方位對話牌桌';
/* Presentation only: move original navigation nodes; preserve every handler. */
const header=document.querySelector('body > header');
const menu=document.createElement('dialog');
menu.className='comfort-menu';menu.id='comfort-menu';menu.setAttribute('aria-label','更多館內服務');
const title=document.createElement('h2');title.textContent='館內服務';
const items=document.createElement('div');items.className='comfort-menu-items';
for(const id of ['sound','music','accountButton','ranksButton','profileButton']){
  const button=document.getElementById(id);if(button)items.append(button);
}
const close=document.createElement('button');close.textContent='返回牌桌／首頁';close.onclick=()=>menu.close();
menu.append(title,items,close);document.body.append(menu);
const more=document.createElement('button');more.className='quiet comfort-more';more.textContent='更多';more.setAttribute('aria-haspopup','dialog');more.setAttribute('aria-controls',menu.id);
more.onclick=()=>menu.showModal();header.append(more);
// Close this dialog before the original handler opens its own dialog.
items.addEventListener('click',event=>{if(event.target.closest('button'))menu.close();},true);
menu.addEventListener('click',event=>{if(event.target===menu){const r=menu.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)menu.close();}});

// Always reachable close control; native close events retain the game's resume logic.
function addClose(dialog){
  if(dialog.querySelector(':scope > .comfort-close'))return;
  const close=document.createElement('button');close.type='button';close.className='comfort-close';close.textContent='×';close.setAttribute('aria-label','關閉視窗');close.onclick=()=>dialog.close();dialog.prepend(close);
}
document.querySelectorAll('dialog').forEach(addClose);
new MutationObserver(records=>{for(const record of records)for(const node of record.addedNodes)if(node.nodeType===1&&node.matches('dialog'))addClose(node);}).observe(document.body,{childList:true});
