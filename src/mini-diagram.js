export function floatingPosition(rect,viewport,margin=8){
 const left=viewport.left+margin,top=viewport.top+margin;
 return {left:Math.max(left,Math.min(viewport.left+viewport.width-rect.width-margin,rect.left)),top:Math.max(top,Math.min(viewport.top+viewport.height-rect.height-margin,rect.top))};
}
// A selectable mirror of the live diagram, available below the main editor.
export function createMiniDiagram(source,panel,highlighted,select){
 const windowEl=document.getElementById('mini-diagram-window'),view=document.getElementById('mini-diagram'),restore=document.getElementById('restore-mini-diagram'),handle=document.getElementById('mini-diagram-handle');
 let below=false,dismissed=false,manuallyOpen=false,drag=null,resize=null;
 function refresh(){
   const active=document.activeElement,focused=active&&view.contains(active)?target(active):null;
   const bounds=source.getBBox(),padding=18;
   view.setAttribute('viewBox',bounds.width&&bounds.height?`${bounds.x-padding} ${bounds.y-padding} ${bounds.width+2*padding} ${bounds.height+2*padding}`:source.getAttribute('viewBox'));
   view.innerHTML=source.innerHTML;
   // SVG markers need distinct IDs so the two views never resolve each other's definitions.
   for(const el of view.querySelectorAll('[id]'))el.id=`mini-${el.id}`;
   for(const el of view.querySelectorAll('[marker-start],[marker-end]'))for(const attr of ['marker-start','marker-end']){const value=el.getAttribute(attr);if(value)el.setAttribute(attr,value.replace('url(#','url(#mini-'));}
   for(const el of view.querySelectorAll('.box-resize-handle,.flux-port-handle,.boundary-target,.compartment-marquee,#mini-flux-preview'))el.remove();
   for(const el of view.querySelectorAll('[tabindex]')){const item=target(el);if(item){el.setAttribute('aria-label',(el.getAttribute('aria-label')||'').split(';')[0].replace('Inspect','Select').replace('Move external endpoint of','Select flux'));}else{el.removeAttribute('tabindex');el.removeAttribute('role');el.removeAttribute('aria-label');}}
     for(const el of view.querySelectorAll('[data-external] title'))el.textContent='Select this boundary flux';
   const emphasis=highlighted();
   for(const el of view.querySelectorAll('[data-pool]'))el.classList.toggle('mini-emphasized',emphasis.pool.has(el.dataset.pool));
   for(const el of view.querySelectorAll('[data-process]'))el.classList.toggle('selected',el.classList.contains('selected')||emphasis.flux.has(el.dataset.process));
   constrain();
   if(focused)view.querySelector(`[${focused.attribute}="${CSS.escape(focused.id)}"]`)?.focus({preventScroll:true});
 }
 function target(el){
   const object=el.closest('[data-pool],[data-process],[data-compartment],[data-external]');
   if(!object||!view.contains(object))return null;
   for(const [attribute,type] of [['data-pool','pool'],['data-process','process'],['data-compartment','compartment'],['data-external','process']])if(object.hasAttribute(attribute))return {attribute,type,id:object.getAttribute(attribute)};
 }
 view.onclick=e=>{const item=target(e.target);select(item?.type??null,item?.id??null);};
 view.onkeydown=e=>{if(!['Enter',' '].includes(e.key))return;const item=target(e.target);if(item){e.preventDefault();select(item.type,item.id);}};
 function visibility(){windowEl.hidden=(!below&&!manuallyOpen)||dismissed;restore.hidden=!dismissed;restore.setAttribute('aria-expanded',String(!windowEl.hidden));refresh();}
 new IntersectionObserver(([entry])=>{below=entry.boundingClientRect.bottom<=0;if(!below)manuallyOpen=false;visibility();},{threshold:0}).observe(panel);
 document.getElementById('hide-mini-diagram').onclick=()=>{dismissed=true;manuallyOpen=false;visibility();restore.focus({preventScroll:true});};
 restore.onclick=()=>{dismissed=false;manuallyOpen=true;visibility();document.getElementById('hide-mini-diagram').focus({preventScroll:true});};
 function viewport(){
   const visible=window.visualViewport;
   return {left:visible?.offsetLeft??0,top:visible?.offsetTop??0,width:Math.min(visible?.width??innerWidth,document.documentElement.clientWidth),height:visible?.height??innerHeight};
 }
 function constrain(){
   if(windowEl.hidden)return;
   const area=viewport();
   windowEl.style.maxWidth=`${Math.max(0,area.width-16)}px`;
   windowEl.style.maxHeight=`${Math.max(0,area.height-16)}px`;
   const position=floatingPosition(windowEl.getBoundingClientRect(),area);
   windowEl.style.right='auto';windowEl.style.bottom='auto';
   windowEl.style.left=`${position.left}px`;windowEl.style.top=`${position.top}px`;
 }

 for(const button of windowEl.querySelectorAll('[data-mini-size]'))button.onclick=()=>{
   windowEl.style.removeProperty('width');windowEl.style.removeProperty('height');
   windowEl.dataset.size=button.dataset.miniSize;
   for(const option of windowEl.querySelectorAll('[data-mini-size]'))option.setAttribute('aria-pressed',String(option===button));
   constrain();
 };
 handle.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const rect=windowEl.getBoundingClientRect();drag={x:e.clientX,y:e.clientY,left:rect.left,top:rect.top};handle.setPointerCapture(e.pointerId);};
 handle.onpointermove=e=>{if(!drag)return;windowEl.style.right='auto';windowEl.style.bottom='auto';windowEl.style.left=`${drag.left+e.clientX-drag.x}px`;windowEl.style.top=`${drag.top+e.clientY-drag.y}px`;constrain();};
 handle.onpointerup=handle.onpointercancel=()=>{drag=null;};
 handle.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const rect=windowEl.getBoundingClientRect();windowEl.style.right='auto';windowEl.style.bottom='auto';windowEl.style.left=`${rect.left+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0)}px`;windowEl.style.top=`${rect.top+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0)}px`;constrain();};
 const grip=document.getElementById('mini-diagram-resize');
 function resizeTo(width,height){
   windowEl.dataset.size='custom';
   windowEl.style.width=`${Math.max(Math.min(280,viewport().width-24),Math.min(viewport().width-24,width))}px`;
   windowEl.style.height=`${Math.max(Math.min(180,viewport().height-24),Math.min(viewport().height-24,height))}px`;
   for(const option of windowEl.querySelectorAll('[data-mini-size]'))option.setAttribute('aria-pressed','false');
   constrain();
 }
 grip.onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();const rect=windowEl.getBoundingClientRect();resize={x:e.clientX,y:e.clientY,width:rect.width,height:rect.height};grip.setPointerCapture(e.pointerId);};
 grip.onpointermove=e=>{if(resize)resizeTo(resize.width+e.clientX-resize.x,resize.height+e.clientY-resize.y);};
 grip.onpointerup=grip.onpointercancel=()=>{resize=null;};
 grip.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key))return;e.preventDefault();const rect=windowEl.getBoundingClientRect();resizeTo(rect.width+(e.key==='ArrowLeft'?-20:e.key==='ArrowRight'?20:0),rect.height+(e.key==='ArrowUp'?-20:e.key==='ArrowDown'?20:0));};
 window.addEventListener('resize',()=>{if(windowEl.dataset.size==='custom'){resizeTo(parseFloat(windowEl.style.width),parseFloat(windowEl.style.height));}constrain();});
 new ResizeObserver(constrain).observe(windowEl);
 window.visualViewport?.addEventListener('resize',constrain);
 window.visualViewport?.addEventListener('scroll',constrain);
 // The editor refreshes this mirror synchronously after rendering the source,
 // including while minimized, so switching models never leaves a stale snapshot.
 return {refresh};
}
