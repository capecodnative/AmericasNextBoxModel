export function setupSidebarResize(){
 const shell=document.querySelector('.shell'),sidebar=document.getElementById('sidebar'),grip=document.getElementById('sidebar-resize');
 let requested=null,dragging=false;
 try{const saved=Number(localStorage.getItem('anbm-sidebar-width'));if(Number.isFinite(saved)&&saved>=180)requested=saved;}catch{}
 const maximum=()=>Math.min(460,Math.floor(innerWidth*.4));
 function apply(){
   if(requested!==null)shell.style.setProperty('--sidebar-width',`${Math.max(180,Math.min(maximum(),requested))}px`);
   else shell.style.removeProperty('--sidebar-width');
   grip.setAttribute('aria-valuemax',String(maximum()));
   grip.setAttribute('aria-valuenow',String(Math.round(sidebar.getBoundingClientRect().width)));
 }
 function setWidth(width){
   requested=Math.round(Math.max(180,Math.min(maximum(),width)));apply();
   try{localStorage.setItem('anbm-sidebar-width',String(requested));}catch{}
 }
 function reset(){requested=null;try{localStorage.removeItem('anbm-sidebar-width');}catch{}apply();}
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();dragging=true;grip.setPointerCapture(e.pointerId);document.body.classList.add('resizing-sidebar');};
 grip.onpointermove=e=>{if(dragging)setWidth(e.clientX-shell.getBoundingClientRect().left);};
 grip.onpointerup=grip.onpointercancel=()=>{dragging=false;document.body.classList.remove('resizing-sidebar');};
 grip.ondblclick=reset;
 grip.onkeydown=e=>{
   if(!['ArrowLeft','ArrowRight','Home','End','Enter'].includes(e.key))return;e.preventDefault();
   if(e.key==='Enter'){reset();return;}
   setWidth(e.key==='Home'?180:e.key==='End'?maximum():sidebar.getBoundingClientRect().width+(e.key==='ArrowRight'?10:-10));
 };
 window.addEventListener('resize',apply);apply();
}
