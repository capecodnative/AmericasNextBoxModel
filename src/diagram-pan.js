export function setupDiagramPan(pane,{enabled,deselect}){
 let pan=null,spaceHeld=false,suppressClick=false;
 const objects='[data-pool],[data-compartment],[data-process],[data-external],[data-flux-port],[data-resize-kind]';
 function ready(){pane.classList.toggle('pan-ready',spaceHeld&&enabled());}
 document.addEventListener('keydown',e=>{
   if(e.code!=='Space'||!enabled()||e.target.closest('input,select,textarea,[contenteditable="true"]'))return;
   if(!pane.matches(':hover')&&!pane.contains(document.activeElement))return;
   e.preventDefault();spaceHeld=true;ready();
 },true);
 document.addEventListener('keyup',e=>{if(e.code==='Space'){spaceHeld=false;ready();}},true);
 pane.addEventListener('pointerdown',e=>{
   suppressClick=false;
   if(e.button!==0||!enabled())return;
   const blank=!e.target.closest(objects);if(!blank&&!spaceHeld)return;
   e.preventDefault();e.stopPropagation();
   pan={id:e.pointerId,x:e.clientX,y:e.clientY,left:pane.scrollLeft,top:pane.scrollTop,moved:false,blank};
   suppressClick=true;pane.setPointerCapture(e.pointerId);pane.classList.add('panning');
 },true);
 pane.addEventListener('pointermove',e=>{
   if(!pan||e.pointerId!==pan.id)return;e.preventDefault();e.stopPropagation();
   const dx=e.clientX-pan.x,dy=e.clientY-pan.y;
   if(!pan.moved&&Math.hypot(dx,dy)<3)return;pan.moved=true;
   pane.scrollLeft=pan.left-dx;pane.scrollTop=pan.top-dy;
 },true);
 function finish(e,cancel=false){
   if(!pan||e.pointerId!==pan.id)return;e.stopPropagation();
   const previous=pan;pan=null;pane.classList.remove('panning');
   if(pane.hasPointerCapture(e.pointerId))pane.releasePointerCapture(e.pointerId);
   if(cancel)suppressClick=false;
   else if(!previous.moved&&previous.blank)deselect();
 }
 pane.addEventListener('pointerup',e=>finish(e),true);
 pane.addEventListener('pointercancel',e=>finish(e,true),true);
 pane.addEventListener('click',e=>{if(suppressClick){suppressClick=false;e.preventDefault();e.stopPropagation();}},true);
 window.addEventListener('blur',()=>{spaceHeld=false;ready();if(pan){const id=pan.id;pan=null;suppressClick=false;pane.classList.remove('panning');if(pane.hasPointerCapture(id))pane.releasePointerCapture(id);}});
}
