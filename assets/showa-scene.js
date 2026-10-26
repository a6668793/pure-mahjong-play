/* Original lightweight pixel scene accents. Decorative only; never handles game input. */
let scene;
export function mountShowaScene(){
 if(scene?.isConnected)return;
 scene=document.createElement('div');scene.className='showa-scene';scene.setAttribute('aria-hidden','true');
 scene.innerHTML=`<div class="scene-artwork"><div class="scene-lamp-glow"></div><div class="scene-tassel"><i></i></div><div class="scene-television"><svg class="tv-picture" viewBox="0 0 160 70" shape-rendering="crispEdges"><path fill="#27455a" d="M0 0h160v70H0z"/><path fill="#d0ba7c" d="M0 51h160v19H0z"/><path fill="#547075" d="m10 51 29-35 30 35zm74 0 29-26 36 26z"/><path fill="#dddfc1" d="m29 28 10-12 11 13-9-3-5 5z"/><path class="tv-cloud" fill="#b3bdad" d="M68 12h14v4H64v-4zm53 5h15v4h-21v-4z"/><path fill="#74918a" d="M0 56h160v3H0zm0 8h160v2H0z"/></svg><span class="tv-channel">昭和の夜</span></div><div class="cat-trail"><svg class="parlor-cat" viewBox="0 0 36 24" shape-rendering="crispEdges"><g class="cat-tail" fill="#bd8250"><path d="M10 15H5v-3H2V5h3v6h3v2h3z"/></g><path fill="#c59160" d="M9 12h17v8H8v-6h1zM23 5h3V2h3v4h3V3h2v11H23z"/><path fill="#e7c99c" d="M26 10h8v5h-8zm-15 6h14v4H11z"/><path fill="#483021" d="M27 8h2v2h-2zm5 0h2v2h-2zM14 12h2v4h-2zm6 0h2v3h-2z"/><path fill="#d18b78" d="M30 11h2v1h-2z"/><g class="cat-legs-a" fill="#e6c499"><path d="M9 19h4v4H8v-2h1zm15 0h3v4h-5v-2h2z"/></g><g class="cat-legs-b" fill="#b77c48"><path d="M15 19h3v3h-4v-2h1zm13-1h3v4h-4v-2h1z"/></g></svg></div></div>`;
 document.body.prepend(scene);scene.dataset.paused=String(document.hidden);
}
export function unmountShowaScene(){scene?.remove();scene=null;}
document.addEventListener('visibilitychange',()=>{if(scene)scene.dataset.paused=String(document.hidden)});
