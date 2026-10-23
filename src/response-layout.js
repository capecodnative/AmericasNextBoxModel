// Reserve adjustable space to the left of the response panel for the floating diagram.
export function setupResponseResize(){
 const layout=document.getElementById('response-layout'),grip=document.getElementById('response-resize'),main=layout.parentElement;
 let requested=0,drag=null;
 try{const saved=Number(localStorage.getItem('anbm-response-inset'));if(Number.isFinite(saved)&&saved>=0)requested=saved;}catch{}
 function availableWidth(){const style=getComputedStyle(main);return main.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);}
 const maximum=()=>innerWidth<=700?0:Math.max(0,availableWidth()-480);
 function apply(){
   const inset=Math.round(Math.min(maximum(),requested));
   layout.style.marginLeft=`${inset}px`;
   grip.setAttribute('aria-valuemax',String(Math.floor(maximum())));
   grip.setAttribute('aria-valuenow',String(inset));
   grip.setAttribute('aria-valuetext',`${inset} pixels of space on the left`);
 }
 function setInset(value){requested=Math.round(Math.max(0,Math.min(maximum(),value)));apply();try{localStorage.setItem('anbm-response-inset',String(requested));}catch{}}
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();drag={x:e.clientX,inset:parseFloat(layout.style.marginLeft)||0};grip.setPointerCapture(e.pointerId);document.body.classList.add('resizing-response');};
 grip.onpointermove=e=>{if(drag)setInset(drag.inset+e.clientX-drag.x);};
 grip.onpointerup=grip.onpointercancel=()=>{drag=null;document.body.classList.remove('resizing-response');};
 grip.ondblclick=()=>setInset(0);
 grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End','Enter'].includes(e.key))return;e.preventDefault();setInset(e.key==='Home'||e.key==='Enter'?0:e.key==='End'?maximum():(parseFloat(layout.style.marginLeft)||0)+(e.key==='ArrowRight'?10:-10));};
 new ResizeObserver(apply).observe(main);window.addEventListener('resize',apply);apply();
}
