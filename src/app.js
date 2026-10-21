import {fluxBetween} from './editor.js';
import {clone,validate,analytical,derivative} from './model.js';
import {presets,blank} from './presets.js?v=20261021-boundary-flux';
import {variableName,poolVariable,variableProblem,budgetExpression} from './notation.js';
import {unitSystem,toCanonical,displayModel} from './units.js';
import {axisScale,trajectoryPath,boxEdge,wrapLabel} from './view.js';
const $=id=>document.getElementById(id), colors=['#227c75','#426fb0','#8660a8','#5c8a46','#b05287','#278b9b','#6465a8','#647548','#795d87','#536a7d'], selectedFluxColor='#cd8d3f';

const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let model=clone(presets[0]),selected={type:'pool',id:'M'},result=null,baseline=null,history=[],future=[],revision=0,timer=null,runTimer,connecting=false,connectionStart=null;
let viewUnits=unitSystem(model);
 for(const [id,legacy,label] of [['unit-prefix','micro','micro (legacy)'],['unit-volume','mL','mL (legacy)']]){const select=$(id);select.querySelector('[data-legacy]')?.remove();if((id==='unit-prefix'?viewUnits.selected.prefix:viewUnits.selected.volume)===legacy){const option=document.createElement('option');option.value=legacy;option.textContent=label;option.dataset.legacy='true';select.add(option);}}
const shown=(kind,value)=>value*viewUnits.factors[kind];
const unitLabel=kind=>viewUnits.labels[kind];
function renderUnits(){
 viewUnits=unitSystem(model);
 for(const [key,id] of [['amount','unit-amount'],['prefix','unit-prefix'],['volume','unit-volume'],['time','unit-time']])$(id).value=viewUnits.selected[key];
 $('duration-unit').textContent=unitLabel('time');
 const labels={inventory:`Inventory · ${unitLabel('inventory')}`,concentration:`Concentration · ${unitLabel('concentration')}`,flux:`Process flux · ${unitLabel('constant')}`};
 for(const option of $('quantity').options)option.textContent=labels[option.value];
}
let diagramFont=14,diagramHeight=350;
try{const saved=JSON.parse(localStorage.getItem('anbm-diagram-view')||'{}');if(Number.isFinite(saved.font))diagramFont=Math.max(11,Math.min(20,saved.font));if(Number.isFinite(saved.height))diagramHeight=Math.max(260,Math.min(1000,saved.height));}catch{}
const diagramScale=()=>diagramFont/14;
function canvasHeight(){return Math.max(350,diagramHeight*760/Math.max(760,$('diagram').getBoundingClientRect().width));}
function applyDiagramView(){
 $('diagram-font').value=diagramFont;$('diagram-font-label').textContent=`${diagramFont} px`;
 $('diagram-height').value=diagramHeight;$('diagram-pane').style.height=`${diagramHeight}px`;
 $('diagram-resize').setAttribute('aria-valuenow',diagramHeight);
 $('diagram').setAttribute('viewBox',`0 0 760 ${canvasHeight()}`);
 try{localStorage.setItem('anbm-diagram-view',JSON.stringify({font:diagramFont,height:diagramHeight}));}catch{}
 renderDiagram();
}
const worker=new Worker(new URL('./worker.js',import.meta.url),{type:'module'});
worker.onmessage=({data})=>{if(data.id!==revision)return; $('run').disabled=false;if(data.error){$('status').textContent=data.error;return;}result=data.result;for(const key of ['pools','processes'])for(const record of result.model[key]){const current=model[key].find(p=>p.id===record.id);if(current){record.name=current.name;if(key==='pools')record.variableName=variableName(current);}}$('time').max=result.rows.length-1;$('time').value=0;renderResults();renderDiagram();};
worker.onerror=()=>{$('status').textContent='Could not start the solver worker. Serve the app over HTTP using the README instructions.';$('run').disabled=false;};
function stop(){clearInterval(timer);timer=null;$('play').textContent='▶ Play';}
function run(){clearTimeout(runTimer);stop();try{validate(model);$('status').textContent='';$('run').disabled=true;worker.postMessage({id:revision,model});}catch(e){$('status').textContent=e.message;$('run').disabled=false;}}
function changed(){revision++;result=null;connecting=false;connectionStart=null;$('connect').setAttribute('aria-pressed','false');stop();render();clearTimeout(runTimer);runTimer=setTimeout(run,180);try{localStorage.setItem('anbm-model',JSON.stringify(model));}catch{}}
function remember(){history.push(clone(model));if(history.length>60)history.shift();future=[];}
function change(fn){remember();fn();changed();}
function selectedObject(){return (selected.type==='pool'?model.pools:model.processes).find(p=>p.id===selected.id);}
function choose(type,id){selected={type,id};renderDiagram();renderInspector();renderEquations();renderResults();}
function render(){
 renderUnits();
 $('title').textContent=model.title;$('question').textContent=model.question;$('duration').value=Number(shown('time',model.simulation.duration).toPrecision(12));
 const lesson=presets.findIndex(p=>p.title===model.title);$('lesson-label').textContent=lesson>=0?`EXPLORATION ${String(lesson+1).padStart(2,'0')} / 06`:'YOUR MODEL';
 $('lessons').innerHTML=presets.map((p,i)=>`<button class="${p.title===model.title?'active':''}" data-lesson="${i}"><span class="number">${String(i+1).padStart(2,'0')}</span>${esc(p.title)}</button>`).join('');
 $('experiments').innerHTML=(model.experiments||[]).map(x=>`<li>${esc(x)}</li>`).join('');
 $('undo').disabled=!history.length;$('redo').disabled=!future.length;
 renderDiagram();renderInspector();renderEquations();renderResults();
}
function position(id){const i=model.pools.findIndex(p=>p.id===id);return model.layout?.[id]||{x:130+(i%3)*220,y:100+Math.floor(i/3)*110};}
const labelMeasure=document.createElement('canvas').getContext('2d');
function boxDimensions(pool,scale=diagramScale()){
 const measure=(text,font)=>{labelMeasure.font=`${font}px ${getComputedStyle($('diagram')).fontFamily}`;return labelMeasure.measureText(text).width;};
 const padding=12*scale;
 const index=model.pools.findIndex(p=>p.id===pool.id),inventory=currentRow()?.inventory[index]??pool.initial;
 const volume=model.compartments.find(c=>c.id===pool.compartment).volume;
 const titleWidth=Math.min(220*scale,measure(pool.name,diagramFont)+2*padding);
 const inventoryWidth=measure(fmt(shown('inventory',inventory)),22*scale)+measure(' '+unitLabel('inventory'),12*scale);
 const concentrationWidth=measure(`[${variableName(pool)}] = ${fmt(shown('concentration',inventory/volume))} ${unitLabel('concentration')}`,12*scale);
 const width=Math.max(96*scale,titleWidth,inventoryWidth+2*padding,concentrationWidth+2*padding);
 const lines=wrapLabel(pool.name,width-2*padding,text=>measure(text,diagramFont));
 const height=(76+(lines.length-1)*18)*scale;
 return {width,height,lines};
}
function clampPoolPosition(id,x,y){
 const box=boxDimensions(model.pools.find(p=>p.id===id)),volume=$('show-volume').checked?24*diagramScale():0;
 return {x:Math.max(box.width/2+6,Math.min(754-box.width/2,x)),y:Math.max(box.height/2+6,Math.min(canvasHeight()-box.height/2-volume-6,y))};
}
function currentRow(){return result?.rows[Number($('time').value)]||null;}
function renderDiagram(){
 const row=currentRow(),scale=diagramScale(),height=canvasHeight();
 let svg='<defs>'+[['arrow','#7a8b89'],['arrow-selected',selectedFluxColor]].map(([id,color])=>`<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`).join('')+'</defs>';
 const boxes=Object.fromEntries(model.pools.map(p=>[p.id,boxDimensions(p,scale)]));
 const occupiedLabels=[];
 model.processes.forEach((p,i)=>{
   const marker=selected.type==='process'&&selected.id===p.id?'arrow-selected':'arrow';
   const dest=p.to?position(p.to):null,origin=p.from?position(p.from):null;
   const boundary=model.layout?.[p.id];
   const a=origin||boundary||{x:dest.x,y:dest.y>=150?dest.y-135:dest.y+135},b=dest||boundary||{x:Math.min(730,origin.x+170),y:origin.y+70};
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
   const paired=Boolean(p.from&&p.to&&model.processes.some(q=>q.id!==p.id&&q.from===p.to&&q.to===p.from));
   const offset=paired?-55:0;
   const control={x:(a.x+b.x)/2-dy/len*offset,y:(a.y+b.y)/2+dx/len*offset};
   const start=origin?boxEdge(a,control,9,1,boxes[p.from]):a,end=dest?boxEdge(b,control,9,1,boxes[p.to]):b;
   const ax=start.x,ay=start.y,bx=end.x,by=end.y;
   const cx=(ax+bx)/2-dy/len*offset,cy=(ay+by)/2+dx/len*offset;
   const coefficientSymbol={constant:'F₀',firstOrder:'k',exchange:'Exchange E',advection:'Q'}[p.law];
   const forcingActive=p.forcing?.type&&p.forcing.type!=='constant';
   const lawEquation={constant:'F = F₀',firstOrder:`F = k * ${poolVariable(model,p.from)}`,exchange:`F = E * ([${poolVariable(model,p.from)}] − [${poolVariable(model,p.to)}])`,advection:`F = Q * [${poolVariable(model,p.from)}]`}[p.law]+(forcingActive?' * g(t)':'');
   const showCoefficients=$('show-coefficients').checked;
   const halfWidth=Math.max(p.name.length,showCoefficients?lawEquation.length:0,showCoefficients?`${coefficientSymbol} = ${fmt(shown(p.law,p.value))} ${unitLabel(p.law)}`.length:0,14)*3.7*scale;
   const bottom=(showCoefficients?46:13)*scale;
   const obstacles=model.pools.map(pool=>{const point=position(pool.id),box=boxes[pool.id];return {left:point.x-box.width/2-6,right:point.x+box.width/2+6,top:point.y-box.height/2-6,bottom:point.y+box.height/2+($('show-volume').checked?24:6)*scale};}).concat(occupiedLabels);
   // Put reciprocal labels outside mirrored curves, with matching block-center clearance.
   const midpoint={x:(ax+2*cx+bx)/4,y:(ay+2*cy+by)/4};
   const clearance=(showCoefficients?50:33)*scale,blockCenter=(showCoefficients?15:-1.5)*scale;
   const preferred=paired?{x:midpoint.x+dy/len*clearance,y:midpoint.y-dx/len*clearance-blockCenter}:{x:cx,y:cy};
   const candidates=[0,-65,65,-110,110,-155,155].flatMap(oy=>[0,-100,100,-180,180].map(ox=>({x:Math.max(halfWidth+8,Math.min(752-halfWidth,preferred.x+ox)),y:Math.max(24*scale,Math.min(height-8-bottom,preferred.y+oy))}))).sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
   const label=candidates.find(q=>!obstacles.some(o=>q.x+halfWidth>o.left&&q.x-halfWidth<o.right&&q.y+bottom>o.top&&q.y-25*scale<o.bottom))||{x:cx,y:cy};
   const lx=label.x,ly=label.y;
   occupiedLabels.push({left:lx-halfWidth-5,right:lx+halfWidth+5,top:ly-28*scale,bottom:ly+bottom+5});
   const coefficientLabel=$('show-coefficients').checked?`<text class="law-label" style="font-size:${diagramFont}px" x="${lx}" y="${ly+24*scale}" text-anchor="middle">${esc(lawEquation)}</text><text class="coefficient-label" style="font-size:${diagramFont}px" x="${lx}" y="${ly+40*scale}" text-anchor="middle">${coefficientSymbol} = ${fmt(shown(p.law,p.value))} ${esc(unitLabel(p.law))}</text>`:'';

   svg+=`<g class="process ${selected.type==='process'&&selected.id===p.id?'selected':''}" tabindex="0" role="button" aria-label="Inspect ${esc(p.name)}" data-process="${esc(p.id)}"><path d="M${ax},${ay} Q${cx},${cy} ${bx},${by}" fill="none" stroke="#7a8b89" stroke-width="2" marker-end="url(#${marker})" ${p.law==='exchange'?`marker-start="url(#${marker})"`:''}/><path class="hit-target" d="M${ax},${ay} Q${cx},${cy} ${bx},${by}" fill="none" stroke="transparent" stroke-width="18"/><text style="font-size:${diagramFont}px" x="${lx}" y="${ly-10*scale}" text-anchor="middle">${esc(p.name)}</text><text style="font-size:${diagramFont}px" x="${lx}" y="${ly+7*scale}" text-anchor="middle">${row?`${fmt(shown('constant',row.fluxes[i]))} ${unitLabel('constant')}`:esc(unitLabel(p.law))}</text>${coefficientLabel}</g>`;
 });
 model.pools.forEach((p,i)=>{
   const {x,y}=position(p.id),M=row?.inventory[i]??p.initial,V=model.compartments.find(c=>c.id===p.compartment).volume;
   const box=boxes[p.id],titleY=-box.height/2+25*scale,inventoryY=titleY+(box.lines.length-1)*18*scale+22*scale;
   const title=box.lines.map((line,j)=>`<tspan x="0" y="${titleY+j*18*scale}">${esc(line)}</tspan>`).join('');
   svg+=`<g class="node ${selected.type==='pool'&&selected.id===p.id?'selected':''}" style="--pool-color:${colors[i%colors.length]};--pool-tint:${colors[i%colors.length]}12" transform="translate(${x},${y})" data-pool="${esc(p.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(p.name)}; arrow keys move"><rect x="${-box.width/2}" y="${-box.height/2}" width="${box.width}" height="${box.height}" rx="9"/><text class="pool-title" text-anchor="middle" style="font-size:${diagramFont}px">${title}</text><text y="${inventoryY}" text-anchor="middle" style="font-size:${22*scale}px">${fmt(shown('inventory',M))} <tspan style="font-size:${12*scale}px">${unitLabel('inventory')}</tspan></text><text y="${inventoryY+18*scale}" text-anchor="middle" style="font-size:${12*scale}px">${esc(`[${variableName(p)}]`)} = ${fmt(shown('concentration',M/V))} ${unitLabel('concentration')}</text>${$('show-volume').checked?`<text class="volume-label" style="font-size:${diagramFont}px" y="${box.height/2+16*scale}" text-anchor="middle">V = ${fmt(shown('volume',V))} ${unitLabel('volume')}</text>`:''}</g>`;
 });
 if(connecting){
   const targets=[['top',0,0,760,28,380,19],['bottom',0,height-28,760,28,380,height-9],['left',0,28,28,height-56,18,height/2],['right',732,28,28,height-56,742,height/2]];
   svg+=targets.map(([side,x,y,w,h,tx,ty])=>`<g class="boundary-target ${connectionStart?.side===side?'active':''}" data-boundary="${side}" tabindex="0" role="button" aria-label="${side} external boundary"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><text x="${tx}" y="${ty}" text-anchor="middle" ${side==='left'||side==='right'?`transform="rotate(-90 ${tx} ${ty})"`:''}>External boundary</text></g>`).join('');
   svg+='<path id="flux-preview" fill="none" stroke="#cd8d3f" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>';
 }
 $('diagram').classList.toggle('adding-flux',connecting);
 $('diagram').innerHTML=svg;
}
let inspectorHelp={};
function propertyHeader(label,key){
 const help=inspectorHelp[key];
 return `<div class="property-heading" ${help?`data-help="${esc(help)}"`:''}><label for="property-${key}">${esc(label)}</label>${help?`<button type="button" class="property-help" aria-label="About ${esc(label)}" aria-describedby="help-${key}">?</button><span class="sr-only" id="help-${key}">${esc(help)}</span>`:''}</div>`;
}
function propertyQuantity(key){return key==='initial'?'inventory':key==='volume'?'volume':key==='value'?selectedObject()?.law:['forcing.start','forcing.end','forcing.period'].includes(key)?'time':null;}
function field(label,key,value,type='number',extra=''){
 const kind=propertyQuantity(key);if(type==='number'&&kind)value=Number(shown(kind,value).toPrecision(12));
 return `<div class="field">${propertyHeader(label,key)}<input id="property-${key}" data-key="${key}" type="${type}" value="${esc(value)}" ${type==='number'?'step="any"':''} ${inspectorHelp[key]?`aria-describedby="help-${key}${key==='variableName'?' variable-name-error':''}"`:''} ${extra}></div>`;
}
function options(items,value){return items.map(([v,n])=>`<option value="${esc(v)}" ${String(v)===String(value)?'selected':''}>${esc(n)}</option>`).join('');}
function select(label,key,items,value){return `<div class="field">${propertyHeader(label,key)}<select id="property-${key}" data-key="${key}" ${inspectorHelp[key]?`aria-describedby="help-${key}"`:''}>${options(items,value)}</select></div>`;}
function renderInspector(){
 hidePropertyTooltip();
 const p=selectedObject();if(!p){$('inspector').innerHTML='<p class="muted">Select a reservoir or process.</p>';return;}
 inspectorHelp={name:selected.type==='pool'?'Display name labels the reservoir and plot legend. Variable name denotes inventory in equations; brackets denote its concentration. Renaming preserves connections.':'Display name labels this process in the diagram and flux legend. Renaming preserves its connections.',variableName:'Variable name denotes inventory in equations and appears in bracketed concentration labels. Use a unique name with 1–24 letters, digits, underscores or primes; start with a letter or underscore. Renaming preserves connections.',initial:`Inventory at the start of each run, in ${unitLabel('inventory')}. Every run restarts from this initial condition.`,from:'The donor pool loses material through this process. External boundary represents an input from outside the modeled system.',to:'The recipient pool gains material through this process. External boundary represents a loss from the modeled system.',law:`Choose how flux is calculated. Tracer fluxes use ${unitLabel('constant')}. First-order processes move material only; advection also transports water and requires a balanced water budget.`, 'forcing.type':'Forcing multiplies the base coefficient by g(t). A pulse is a finite change in rate, not an instantaneous addition to inventory.', 'forcing.start':`Time in ${unitLabel('time')} at which the step or pulse begins.`, 'forcing.end':`Time in ${unitLabel('time')} at which the pulse ends and the multiplier returns to 1.`, 'forcing.factor':'Dimensionless multiplier applied after a step or during a pulse. Outside the pulse the multiplier is 1.', 'forcing.amplitude':'Seasonal fractional amplitude between 0 and 1. The multiplier is 1 + amplitude * sin(2π * t / period).', 'forcing.period':`Duration of one seasonal cycle in ${unitLabel('time')}.`};
 let html=field('Display name','name',p.name,'text','maxlength="80"');
 if(selected.type==='pool'){
  const c=model.compartments.find(c=>c.id===p.compartment);
  inspectorHelp.volume=`Compartment: ${c.name}. Volume in ${unitLabel('volume')} is fixed and shared by all pools in this compartment. Concentration equals inventory divided by volume.`;
  html+=field('Variable name','variableName',variableName(p),'text','maxlength="24"')+'<p id="variable-name-error" class="field-error" role="status"></p>';
  html+=field(`Initial inventory · ${unitLabel('inventory')}`,'initial',p.initial)+field(`Compartment volume · ${unitLabel('volume')}`,'volume',c.volume);
 }else{
  const donor=poolVariable(model,p.from),recipient=poolVariable(model,p.to),forced=p.forcing?.type&&p.forcing.type!=='constant';
  inspectorHelp.value=`Base coefficient for the selected process law. The current tracer flux is shown separately in ${unitLabel('constant')}.`;
  if(p.law==='exchange')inspectorHelp.value=`E is the symmetric exchange coefficient (volume per time, ${unitLabel('exchange')}). Net tracer flux F = E * ([${donor}] − [${recipient}])${forced?' * g(t)':''}, in ${unitLabel('constant')}. Positive flux goes from donor to recipient; negative flux reverses direction. Exchange preserves both fixed compartment volumes.`;
  if(p.law==='firstOrder'){
   const simple=analytical(model,0)!==null&&model.processes.filter(q=>q.law==='firstOrder').length===1;
   inspectorHelp.value=`${p.to?'Transfer':'Removal'} flux = k * ${donor}${forced?' * g(t)':''}, where ${donor} is donor inventory (${unitLabel('inventory')}). The rate constant k is in ${unitLabel('firstOrder')}; flux is in ${unitLabel('constant')}.${simple&&p.value>0?` For this one-box model, adjustment time is 1/k = ${fmt(shown('time',1/p.value))} ${unitLabel('time')}.`:simple&&p.value===0?' With k = 0 there is no first-order removal and no finite removal adjustment time.':''}`;
  }
  if(p.law==='advection')inspectorHelp.value=`Q is water transport in ${unitLabel('advection')}. Flux = Q * [${donor}], in ${unitLabel('constant')}. Fixed compartment volumes require balanced water transport.`;
  const endpoints=[['','External boundary'],...model.pools.map(b=>[b.id,b.name])];
  html+=select('From','from',endpoints,p.from||'')+select('To','to',endpoints,p.to||'')+select('Process law','law',[['constant','Prescribed flux'],['firstOrder','First-order transfer / loss'],['exchange','Symmetric exchange'],['advection','Advective water transport']],p.law)+field(`${p.law==='exchange'?'Exchange coefficient E':p.law==='firstOrder'?`First-order ${p.to?'transfer':'removal'} rate constant k`:'Coefficient'} · ${unitLabel(p.law)}`,'value',p.value);
  if(p.law==='firstOrder')html+=`<label class="field">Explore rate<input type="range" data-key="value" min="0" max="${shown('firstOrder',Math.max(1,p.value*2))}" step="${shown('firstOrder',0.005)}" value="${shown('firstOrder',p.value)}"></label>`;
  const f=p.forcing||{type:'constant'};
  html+=select('Coefficient forcing','forcing.type',[['constant','Constant'],['step','Step'],['pulse','Finite rate pulse'],['seasonal','Seasonal sine']],f.type);
  if(['step','pulse'].includes(f.type))html+=field(`Start · ${unitLabel('time')}`,'forcing.start',f.start)+field('Multiplier after / during','forcing.factor',f.factor);
  if(f.type==='pulse')html+=field(`End · ${unitLabel('time')}`,'forcing.end',f.end);
  if(f.type==='seasonal')html+=field('Relative amplitude · 0–1','forcing.amplitude',f.amplitude)+field(`Period · ${unitLabel('time')}`,'forcing.period',f.period);
 }
 html+='<button id="duplicate">Duplicate</button> <button id="delete" class="danger">Delete</button>';$('inspector').innerHTML=html;
}
let tooltipHeading=null;
function hidePropertyTooltip(){const tip=$('property-tooltip');if(tip?.matches(':popover-open'))tip.hidePopover();tooltipHeading=null;}
function showPropertyTooltip(heading){
 if(!heading?.dataset.help)return;
 const tip=$('property-tooltip');tooltipHeading=heading;tip.textContent=heading.dataset.help;
 if(!tip.matches(':popover-open'))tip.showPopover();
 const r=heading.getBoundingClientRect(),width=tip.offsetWidth,height=tip.offsetHeight;
 tip.style.left=`${Math.max(8,Math.min(innerWidth-width-8,r.left))}px`;
 tip.style.top=`${r.bottom+8+height<innerHeight?r.bottom+8:Math.max(8,r.top-height-8)}px`;
}
$('inspector').addEventListener('pointerover',e=>{const heading=e.target.closest('.property-heading[data-help]');if(heading&&heading!==tooltipHeading)showPropertyTooltip(heading);});
$('inspector').addEventListener('pointerout',e=>{const heading=e.target.closest('.property-heading[data-help]');if(heading&&!heading.contains(e.relatedTarget)&&!heading.contains(document.activeElement)&&e.relatedTarget!==$('property-tooltip'))hidePropertyTooltip();});
$('inspector').addEventListener('focusin',e=>{if(e.target.matches('.property-help'))showPropertyTooltip(e.target.closest('.property-heading'));});
$('inspector').addEventListener('focusout',e=>{if(e.target.matches('.property-help')&&!e.target.closest('.property-heading').contains(e.relatedTarget))hidePropertyTooltip();});
$('inspector').addEventListener('click',e=>{if(e.target.closest('.property-help'))showPropertyTooltip(e.target.closest('.property-heading'));});
document.addEventListener('keydown',e=>{if(e.key==='Escape')hidePropertyTooltip();});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.property-heading')&&e.target!==$('property-tooltip'))hidePropertyTooltip();});
$('property-tooltip').addEventListener('pointerleave',()=>{if(!tooltipHeading?.contains(document.activeElement))hidePropertyTooltip();});
window.addEventListener('resize',hidePropertyTooltip);document.addEventListener('scroll',hidePropertyTooltip,true);
function fraction(numerator,denominator,label){return `<span class="fraction" role="math" aria-label="${esc(label)}"><span aria-hidden="true" class="numerator">${numerator}</span><span aria-hidden="true" class="denominator">${denominator}</span></span>`;}
function renderEquations(){
 const displayed=displayModel(model);
 $('equations').innerHTML=model.pools.map(p=>{
 const terms=model.processes.filter(q=>q.from===p.id||q.to===p.id).map(q=>`<button class="term ${selected.type==='process'&&selected.id===q.id?'selected':''}" data-term="${esc(q.id)}" title="${esc(q.name)} · ${esc(unitLabel(q.law))}">${q.to===p.id?'+':'−'} ${esc(budgetExpression(displayed,displayed.processes.find(p=>p.id===q.id),fmt))}</button>`).join('');
 return `<div class="equation">${fraction(`d(${esc(variableName(p))})`,'dt',`d(${variableName(p)})/dt`)} = ${terms||'0'} <small class="muted">${unitLabel('constant')}</small></div>`;
 }).join('');
 let text='Each internal arrow removes exactly the amount it adds. C = M/V. Exchange is a signed net flux; negative values reverse its direction.';
 const exchanges=model.processes.filter(p=>p.law==='exchange');
 if(exchanges.length)text+=` E is the symmetric exchange coefficient (${unitLabel('exchange')}). `+exchanges.map(p=>`${p.name}: F = E * ([${poolVariable(model,p.from)}] − [${poolVariable(model,p.to)}]).`).join(' ')+` Brackets denote concentration in ${unitLabel('concentration')}.`;
 if(analytical(model,0)!==null){const k=model.processes.filter(p=>p.law==='firstOrder').reduce((s,p)=>s+p.value,0),I=model.processes.filter(p=>p.law==='constant').reduce((s,p)=>s+(p.to?1:-1)*p.value,0);text=k>0?`One-box reference: M(t) = M* + (M₀ − M*) exp(−kt). M* = I/k = ${fmt(shown('inventory',I/k))} ${unitLabel('inventory')}; adjustment time τ = 1/k = ${fmt(shown('time',1/k))} ${unitLabel('time')}. These relations apply to this constant-input, first-order model.`:'Zero-loss reference: M(t) = M₀ + It. With positive net input there is no finite equilibrium.';}
 if(analytical(model,0)!==null)text=text.replaceAll('M',variableName(model.pools[0]));
 $('reference').innerHTML=esc(text).replaceAll('I/k',fraction('I','k','I divided by k')).replaceAll('1/k',fraction('1','k','1 divided by k')).replace('C = M/V',`C = ${fraction('M','V','M divided by V')}`);
}
function fmt(x){return Number.isFinite(x)?Math.abs(x)>=1e5||Math.abs(x)>0&&Math.abs(x)<0.001?x.toExponential(2):Number(x.toPrecision(4)).toString():'—';}
function renderResults(){
 $('clear-baseline').hidden=!baseline;
 if(!result){$('plot').innerHTML='<text x="500" y="130" text-anchor="middle" fill="#8b9e92" font-size="14">Run the model to explore its response.</text>';$('diagnostics').innerHTML='';$('legend').innerHTML='';$('scale-note').textContent='';$('time-label').textContent=`0 ${unitLabel('time')}`;return;}
 const mode=$('quantity').value,m=result.model,row=currentRow()||result.rows[0],index=result.rows.indexOf(row);
 $('time-label').textContent=`${fmt(shown('time',row.t))} ${unitLabel('time')}`;
 const volumes=m.pools.map(p=>m.compartments.find(c=>c.id===p.compartment).volume);
 const vals=r=>mode==='flux'?r.fluxes.map(x=>shown('constant',x)):r.inventory.map((x,i)=>mode==='concentration'?shown('concentration',x/volumes[i]):shown('inventory',x));
 const labels=mode==='flux'?m.processes:m.pools;
 const seriesColor=i=>mode==='flux'&&selected.type==='process'&&selected.id===labels[i].id?selectedFluxColor:colors[i%colors.length];
 const compatible=baseline && JSON.stringify(baseline.model.pools.map(p=>[p.id,p.compartment]))===JSON.stringify(m.pools.map(p=>[p.id,p.compartment])) && (mode!=='flux'||JSON.stringify(baseline.model.processes.map(p=>p.id))===JSON.stringify(m.processes.map(p=>p.id)));
 const baseVals=r=>mode==='flux'?r.fluxes.map(x=>shown('constant',x)):r.inventory.map((x,i)=>mode==='concentration'?shown('concentration',x/baseline.model.compartments.find(c=>c.id===baseline.model.pools[i].compartment).volume):shown('inventory',x));
 let all=result.rows.flatMap(vals);if(compatible)all=all.concat(baseline.rows.flatMap(baseVals));
 const ref=result.rows.map(r=>analytical(m,r.t));if(mode!=='flux'&&ref[0]!==null)all.push(...ref.map(x=>mode==='concentration'?shown('concentration',x/volumes[0]):shown('inventory',x)));
 const logX=$('log-x').checked,logY=$('log-y').checked;
 const xValues=result.rows.map(r=>shown('time',r.t)).concat(compatible?baseline.rows.map(r=>shown('time',r.t)):[]);
 const xScale=axisScale(xValues,logX,95,970),yScale=axisScale(all,logY,225,30);
 const yLabel={inventory:`Inventory · ${unitLabel('inventory')}`,concentration:`Concentration · ${unitLabel('concentration')}`,flux:`Process flux · ${unitLabel('constant')}`}[mode];
 const notes=[];
 if(logX)notes.push('Log X: t = 0 is omitted.');
 if(logY&&all.some(x=>x<=0))notes.push('Log Y: zero and negative values are omitted; curves break at these values.');
 if(!xScale||!yScale)notes.push('No positive data are available for the selected logarithmic scale.');
 $('scale-note').textContent=notes.join(' ');
 let svg=`<text transform="translate(18,130) rotate(-90)" text-anchor="middle" font-size="18" fill="#607b70">${yLabel}${logY?' (log scale)':''}</text><text x="530" y="267" text-anchor="middle" font-size="18" fill="#607b70">Time · ${unitLabel('time')}${logX?' (log scale)':''}</text>`;
 if(xScale&&yScale){
   for(const v of yScale.ticks){const y=yScale.map(v);svg+=`<line x1="95" y1="${y}" x2="970" y2="${y}" stroke="#e8eee6"/><text x="82" y="${y+4}" text-anchor="end" font-size="18" fill="#809588">${fmt(v)}</text>`;}
   for(const t of xScale.ticks){const x=xScale.map(t);svg+=`<text x="${x}" y="248" text-anchor="middle" font-size="18" fill="#809588">${fmt(t)}</text>`;}
   const path=(rows,get,i)=>trajectoryPath(rows,r=>shown('time',r.t),r=>get(r)[i],xScale,yScale);
   labels.forEach((p,i)=>{svg+=`<path d="${path(result.rows,vals,i)}" fill="none" stroke="${seriesColor(i)}" stroke-width="2.5"/>`;if(compatible)svg+=`<path d="${path(baseline.rows,baseVals,i)}" fill="none" stroke="${seriesColor(i)}" stroke-dasharray="6 5" opacity=".5" stroke-width="2"/>`;});
   if(mode!=='flux'&&ref[0]!==null)svg+=`<path d="${trajectoryPath(result.rows,r=>shown('time',r.t),r=>mode==='concentration'?shown('concentration',analytical(m,r.t)/volumes[0]):shown('inventory',analytical(m,r.t)),xScale,yScale)}" fill="none" stroke="#263d40" stroke-width="1.5" stroke-dasharray="3 5"/>`;
   const cursor=xScale.map(shown('time',row.t));
   if(cursor!==null)svg+=`<line x1="${cursor}" y1="30" x2="${cursor}" y2="225" stroke="#a1afa3" stroke-dasharray="4 4"/>`;
 }else svg+='<text x="530" y="130" text-anchor="middle" font-size="16" fill="#809588">No positive values to plot. Choose a linear scale to see zero or negative values.</text>';
 $('plot').innerHTML=svg;
 $('legend').innerHTML=labels.map((p,i)=>`<span><i class="legend-dot" style="background:${seriesColor(i)}"></i>${esc(p.name)}: ${fmt(vals(row)[i])}</span>`).join('')+(compatible?'<span>Dashed: pinned baseline</span>':'');
 const total=row.inventory.reduce((a,b)=>a+b,0),net=derivative(m,row.t,[...row.inventory,0]).slice(0,-1).reduce((a,b)=>a+b,0),error=analytical(m,row.t);
 $('diagnostics').innerHTML=[[`Total inventory · ${unitLabel('inventory')}`,fmt(shown('inventory',total))],[`Net boundary flux · ${unitLabel('constant')}`,fmt(shown('constant',net))],[`Budget residual · ${unitLabel('inventory')}`,fmt(shown('inventory',row.residual))],[error===null?`Integrated boundary input · ${unitLabel('inventory')}`:`Analytical error · ${unitLabel('inventory')}`,fmt(shown('inventory',error===null?row.external:row.inventory[0]-error))]].map(([label,v])=>`<div class="metric"><small>${label}</small><strong>${v}</strong></div>`).join('');
 $('baseline').disabled=index<0;
}
function updateDisplayUnits(update){
 const next={...viewUnits.selected,...update};
 unitSystem({displayUnits:next});
 remember();model.displayUnits=next;render();
 try{localStorage.setItem('anbm-model',JSON.stringify(model));}catch{}
}
for(const [key,id] of [['amount','unit-amount'],['prefix','unit-prefix'],['volume','unit-volume'],['time','unit-time']])$(id).onchange=e=>updateDisplayUnits({[key]:e.target.value});
$('lessons').onclick=e=>{const b=e.target.closest('[data-lesson]');if(b)change(()=>{model=clone(presets[+b.dataset.lesson]);selected={type:'pool',id:model.pools[0].id};});};
$('blank').onclick=()=>change(()=>{model=blank();selected={type:'pool',id:'M'};});
$('undo').onclick=()=>{if(history.length){future.push(clone(model));model=history.pop();changed();}};
$('redo').onclick=()=>{if(future.length){history.push(clone(model));model=future.pop();changed();}};
$('inspector').onchange=e=>{const key=e.target.dataset.key;if(!key||key==='name'||key==='variableName')return;const value=e.target.type==='number'||e.target.type==='range'?Number(e.target.value):e.target.value;change(()=>{const p=selectedObject();const kind=propertyQuantity(key),canonical=kind?toCanonical(model,kind,value):value;if(key==='volume')model.compartments.find(c=>c.id===p.compartment).volume=canonical;else if(key.startsWith('forcing.')){p.forcing||={type:'constant'};if(key==='forcing.type')p.forcing={type:value,start:10,end:15,factor:2,amplitude:0.5,period:10};else p.forcing[key.split('.')[1]]=canonical;}else p[key]=key==='from'||key==='to'?value||null:canonical;});};
let metadataEditTarget=null,metadataRecorded=false;
$('inspector').onfocusin=e=>{if(['name','variableName'].includes(e.target.dataset.key)){metadataEditTarget=e.target;metadataRecorded=false;}};
$('inspector').oninput=e=>{
 const key=e.target.dataset.key;
 if(!['name','variableName'].includes(key))return;
 const p=selectedObject();if(!p)return;
 const value=e.target.value;
 const problem=key==='variableName'?variableProblem(model.pools,p.id,value):value.trim()?'':'Enter a display name.';
 e.target.setCustomValidity(problem);e.target.setAttribute('aria-invalid',String(Boolean(problem)));
 if($('variable-name-error'))$('variable-name-error').textContent=problem;
 if(problem)return;
 if((key==='variableName'?variableName(p):p[key])===value)return;
 if(metadataEditTarget!==e.target){metadataEditTarget=e.target;metadataRecorded=false;}
 if(!metadataRecorded){remember();metadataRecorded=true;}
 p[key]=value;
 // Keep run labels current without recomputing or disturbing scrubbed simulation time.
 const runPool=result&&(selected.type==='pool'?result.model.pools:result.model.processes).find(q=>q.id===p.id);
 if(runPool)runPool[key]=value;
 renderDiagram();renderEquations();renderResults();
 $('undo').disabled=!history.length;$('redo').disabled=!future.length;
 try{localStorage.setItem('anbm-model',JSON.stringify(model));}catch{}
};
function nextVariable(base='M'){
 let value=base.slice(0,24),index=2;while(model.pools.some(p=>variableName(p)===value)){const suffix='_'+index++;value=base.slice(0,24-suffix.length)+suffix;}
 return value;
}
function uid(prefix){return prefix+crypto.randomUUID().slice(0,8);}
$('inspector').onclick=e=>{
 if(e.target.id==='delete')change(()=>{if(selected.type==='pool'){model.pools=model.pools.filter(p=>p.id!==selected.id);model.processes=model.processes.filter(p=>p.from!==selected.id&&p.to!==selected.id);}else model.processes=model.processes.filter(p=>p.id!==selected.id);selected={type:'pool',id:model.pools[0]?.id};});
 if(e.target.id==='duplicate')change(()=>{const p=clone(selectedObject());p.id=uid(selected.type==='pool'?'M':'F');p.name+=' copy';if(selected.type==='pool'){p.variableName=nextVariable(variableName(selectedObject()));model.pools.push(p);model.layout[p.id]={x:position(selected.id).x+30,y:position(selected.id).y+60};}else model.processes.push(p);selected.id=p.id;});
};
$('add-pool').onclick=()=>change(()=>{const id=uid('M');model.compartments.push({id,name:'New reservoir',volume:10});model.pools.push({id,name:'New reservoir',variableName:nextVariable(),initial:10,compartment:id});model.layout[id]={x:180+model.pools.length*70%450,y:220};selected={type:'pool',id};});
$('add-process').onclick=()=>{if(!model.pools.length)return;change(()=>{const id=uid('F');model.processes.push({id,name:'New process',from:selected.type==='pool'?selected.id:model.pools[0].id,to:model.pools.find(p=>p.id!==selected.id)?.id||null,law:'firstOrder',value:0.1,forcing:{type:'constant'}});selected={type:'process',id};});};
$('equations').onclick=e=>{const el=e.target.closest('[data-term]');if(el)choose('process',el.dataset.term);};
function boundaryPoint(side,p){
 const h=canvasHeight();
 return {x:side==='left'?14:side==='right'?746:Math.max(35,Math.min(725,p?.x??380)),y:side==='top'?14:side==='bottom'?h-14:Math.max(35,Math.min(h-35,p?.y??h/2))};
}
function endpoint(el,p){
 const target=el?.closest('[data-pool],[data-boundary]');
 if(!target)return null;
 return target.hasAttribute('data-pool')?{pool:target.dataset.pool}:{pool:null,side:target.dataset.boundary,point:boundaryPoint(target.dataset.boundary,p)};
}
function sameEndpoint(a,b){return a.pool===b.pool&&(a.pool!==null||a.side===b.side);}
function connectEndpoint(end){
 if(!connectionStart){connectionStart=end;renderDiagram();return;}
 if(sameEndpoint(connectionStart,end))return;
 let process;
 try{process=fluxBetween(uid('F'),connectionStart.pool,end.pool);}catch(error){$('status').textContent=error.message;return;}
 const boundary=connectionStart.pool===null?connectionStart:end.pool===null?end:null;
 change(()=>{model.processes.push(process);if(boundary){model.layout??={};model.layout[process.id]=boundary.point;}selected={type:'process',id:process.id};});
}
$('connect').onclick=()=>{connecting=!connecting;connectionStart=null;$('connect').setAttribute('aria-pressed',String(connecting));$('status').textContent=connecting?'Select the donor, then the recipient, or drag between them. Highlighted edges represent external sources and sinks. Escape cancels.':'';renderDiagram();};
$('diagram').onclick=e=>{if(connecting)return;const p=e.target.closest('[data-process]');if(p)choose('process',p.dataset.process);};
let drag;
const point=e=>{const p=$('diagram').createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform($('diagram').getScreenCTM().inverse());};
$('diagram').onpointerdown=e=>{
 if(connecting){const end=endpoint(e.target,point(e));if(end){e.preventDefault();connectEndpoint(end);if(connecting)$('diagram').setPointerCapture(e.pointerId);}return;}
 const g=e.target.closest('[data-pool]');if(!g)return;choose('pool',g.dataset.pool);drag={id:g.dataset.pool,start:point(e),origin:{...position(g.dataset.pool)},moved:false};$('diagram').setPointerCapture(e.pointerId);
};
$('diagram').onpointermove=e=>{
 if(connecting&&connectionStart){const p=point(e),start=connectionStart.pool?position(connectionStart.pool):connectionStart.point;$('flux-preview')?.setAttribute('d',`M${start.x},${start.y} L${p.x},${p.y}`);return;}
 if(!drag)return;const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<3)return;if(!drag.moved){remember();drag.moved=true;}model.layout[drag.id]=clampPoolPosition(drag.id,drag.origin.x+dx,drag.origin.y+dy);renderDiagram();
};
function endDrag(){if(drag?.moved){try{localStorage.setItem('anbm-model',JSON.stringify(model));}catch{}$('undo').disabled=false;}drag=null;}
$('diagram').onpointerup=e=>{if(connecting&&connectionStart){const end=endpoint(document.elementFromPoint(e.clientX,e.clientY),point(e));if(end&&!sameEndpoint(connectionStart,end))connectEndpoint(end);}endDrag();};$('diagram').onpointercancel=endDrag;
$('diagram').onkeydown=e=>{
 const p=e.target.closest('[data-pool]'),f=e.target.closest('[data-process]');
 if(e.key==='Escape'){connecting=false;connectionStart=null;$('connect').setAttribute('aria-pressed','false');$('status').textContent='';renderDiagram();$('connect').focus();}
 if(['Enter',' '].includes(e.key)){
   e.preventDefault();
   if(connecting){const end=endpoint(e.target);if(end){connectEndpoint(end);if(connecting){const selector=end.pool?`[data-pool="${CSS.escape(end.pool)}"]`:`[data-boundary="${end.side}"]`;$('diagram').querySelector(selector)?.focus();}}}
   else if(p)choose('pool',p.dataset.pool);else if(f)choose('process',f.dataset.process);
 }
 if(!connecting&&p&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();remember();const pos=position(p.dataset.pool);model.layout[p.dataset.pool]=clampPoolPosition(p.dataset.pool,pos.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),pos.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0));renderDiagram();$('diagram').querySelector(`[data-pool="${CSS.escape(p.dataset.pool)}"]`).focus();}
};
$('duration').onchange=e=>change(()=>model.simulation.duration=toCanonical(model,'time',+e.target.value));
$('show-coefficients').onchange=renderDiagram;$('show-volume').onchange=renderDiagram;
$('log-x').onchange=renderResults;$('log-y').onchange=renderResults;
$('run').onclick=run;$('quantity').onchange=renderResults;$('time').oninput=()=>{renderResults();renderDiagram();};
$('play').onclick=()=>{if(timer){stop();return;}if(!result)return;if(+$('time').value>=result.rows.length-1)$('time').value=0;$('play').textContent='Ⅱ Pause';timer=setInterval(()=>{const i=+$('time').value+1;if(i>=result.rows.length){stop();return;}$('time').value=i;renderResults();renderDiagram();},50);};
$('baseline').onclick=()=>{if(result){baseline=clone(result);renderResults();}};$('clear-baseline').onclick=()=>{baseline=null;renderResults();};
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('summary').onclick=()=>{try{
 validate(model);const shownModel=displayModel(model);
 const text=[model.title,model.question,`Units: ${unitLabel('inventory')}, ${unitLabel('volume')}, ${unitLabel('time')}. Fixed volumes; one tracer currency.`,'',...shownModel.pools.map(p=>`${p.name} [${variableName(p)}]: initial ${fmt(p.initial)} ${unitLabel('inventory')}; volume ${fmt(shownModel.compartments.find(c=>c.id===p.compartment).volume)} ${unitLabel('volume')}`),'',...shownModel.processes.map(p=>`${p.name} [${p.id}]: ${p.from?poolVariable(shownModel,p.from):'boundary'} → ${p.to?poolVariable(shownModel,p.to):'boundary'}; F = ${budgetExpression(shownModel,p,fmt)} ${unitLabel('constant')}; coefficient in ${unitLabel(p.law)}; forcing ${JSON.stringify(p.forcing||{type:'constant'})}`),'',...shownModel.pools.map(p=>`d(${variableName(p)})/dt = `+(shownModel.processes.filter(q=>q.from===p.id||q.to===p.id).map(q=>(q.to===p.id?'+':'−')+' ('+budgetExpression(shownModel,q,fmt)+')').join(' ')||'0')),'',`Duration: ${shownModel.simulation.duration} ${unitLabel('time')}`,`Solver settings (inventory: ${unitLabel('inventory')}; time: ${unitLabel('time')}): ${JSON.stringify(model.simulation)}`].join('\n');
 download('model-summary.txt',text,'text/plain');
}catch(e){$('status').textContent=e.message;}};
$('save').onclick=()=>{try{validate(model);download('box-model.json',JSON.stringify(model,null,2),'application/json');}catch(e){$('status').textContent=e.message;}};
$('load').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1e6)throw Error('Model file exceeds 1 MB.');const m=validate(JSON.parse(await file.text()));if(!m.layout||typeof m.layout!=='object')m.layout={};for(const pos of Object.values(m.layout))if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw Error('Invalid diagram coordinates.');change(()=>{model=m;selected={type:'pool',id:m.pools[0].id};});}catch(err){$('status').textContent=err.message;}e.target.value='';};
$('csv').onclick=()=>{
 if(!result)return;
 const m=result.model,quote=x=>'"'+String(x).replaceAll('"','""')+'"';
 const head=[`time_${unitLabel('time')}`,...m.pools.map(p=>`${variableName(p)}_${unitLabel('inventory')}`),...m.pools.map(p=>`${variableName(p)}_${unitLabel('concentration')}`),...m.processes.map(p=>`${p.id}_${unitLabel('constant')}`),`net_external_integral_${unitLabel('inventory')}`,`budget_residual_${unitLabel('inventory')}`];
 const rows=result.rows.map(r=>[shown('time',r.t),...r.inventory.map(x=>shown('inventory',x)),...r.inventory.map((x,i)=>shown('concentration',x/m.compartments.find(c=>c.id===m.pools[i].compartment).volume)),...r.fluxes.map(x=>shown('constant',x)),shown('inventory',r.external),shown('inventory',r.residual)].join(','));
 download('trajectory.csv',[head.map(quote).join(','),...rows].join('\n'),'text/csv');
};
try{const saved=localStorage.getItem('anbm-model');if(saved){model=validate(JSON.parse(saved));selected={type:'pool',id:model.pools[0].id};}}catch{}
$('diagram-font').oninput=e=>{diagramFont=+e.target.value;applyDiagramView();};
function setDiagramHeight(value){if(!Number.isFinite(value))return;diagramHeight=Math.round(Math.max(260,Math.min(1000,value)));applyDiagramView();}
$('diagram-height').onchange=e=>setDiagramHeight(+e.target.value);
$('reset-diagram-view').onclick=()=>{diagramFont=14;diagramHeight=350;applyDiagramView();};
let resizeStart=null;
$('diagram-resize').onpointerdown=e=>{e.preventDefault();resizeStart={y:e.clientY,height:diagramHeight};$('diagram-resize').setPointerCapture(e.pointerId);};
$('diagram-resize').onpointermove=e=>{if(resizeStart)setDiagramHeight(resizeStart.height+e.clientY-resizeStart.y);};
$('diagram-resize').onpointerup=()=>{resizeStart=null;};$('diagram-resize').onpointercancel=()=>{resizeStart=null;};
$('diagram-resize').onkeydown=e=>{if(['ArrowUp','ArrowDown','Home','End'].includes(e.key)){e.preventDefault();setDiagramHeight(e.key==='Home'?260:e.key==='End'?1000:diagramHeight+(e.key==='ArrowDown'?20:-20));}};
new ResizeObserver(()=>{$('diagram').setAttribute('viewBox',`0 0 760 ${canvasHeight()}`);renderDiagram();}).observe($('diagram-pane'));
render();applyDiagramView();run();
