import {setupSidebarResize} from './sidebar.js';
import {curvePresentation} from './curve-state.js';
import {createMiniDiagram} from './mini-diagram.js?v=20261022-mini-bounds';
import {excludedFromTransport,transportProblem,groupReservoirs,includedReservoirs,transportLinks,processParts,volumeLaw,normalizeTransportFlags,detachReservoir} from './compartments.js?v=20261021-flux-ports';
import {fluxBetween,availableFluxLaws} from './editor.js?v=20261021-boundary-laws';
import {clone,validate,analytical,derivative} from './model.js?v=20261021-flux-ports';
import {presets,blank} from './presets.js?v=20261021-example-setups';
import {variableName,poolVariable,variableProblem,budgetExpression} from './notation.js?v=20261021-flux-ports';
import {unitSystem,toCanonical,displayModel} from './units.js';
import {axisScale,trajectoryPath,arrowBoxContact,wrapLabel,nearestVisibleSample,normalizedBoxPort,boxPortContact,boxBorderNormal,placeDiagramLabel,parallelFluxRoutes} from './view.js?v=20261021-parallel-fluxes';
const $=id=>document.getElementById(id), colors=['#227c75','#426fb0','#8660a8','#5c8a46','#b05287','#278b9b','#6465a8','#647548','#795d87','#536a7d'], selectedFluxColor='#cd8d3f';

const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let model=clone(presets[0]),selected={type:null,id:null},result=null,baseline=null,history=[],future=[],revision=0,timer=null,runTimer,connecting=false,connectionStart=null,grouping=false,groupStart=null,groupEnd=null,groupSelection=new Set();
let customModels=[],floatingDiagram=null;
function guidedExampleIndex(){return model.workspaceId?-1:presets.findIndex(p=>p.title===model.title);}
function renderExampleActions(){
 const index=guidedExampleIndex();
 $('reset-example').hidden=index<0;$('save-as-example').hidden=index<0;
 $('reset-example').disabled=index<0||JSON.stringify(model)===JSON.stringify(presets[index]);
}
function saveCurrentModel(){
 try{
   localStorage.setItem('anbm-model',JSON.stringify(model));
   if(model.workspaceId){
     const index=customModels.findIndex(m=>m.workspaceId===model.workspaceId);
     if(index<0)customModels.push(clone(model));else customModels[index]=clone(model);
   }
   localStorage.setItem('anbm-custom-models',JSON.stringify(customModels));
 }catch{}
 renderExampleActions();
}
function renderNavigation(){
 $('lessons').innerHTML=presets.map((p,i)=>`<button class="${!model.workspaceId&&p.title===model.title?'active':''}" data-lesson="${i}"><span class="number">${String(i+1).padStart(2,'0')}</span>${esc(p.title)}</button>`).join('');
 $('custom-models-section').hidden=false;
 $('custom-models').innerHTML=customModels.map(m=>`<button data-custom-model="${esc(m.workspaceId)}" class="${m.workspaceId===model.workspaceId?'active':''}" ${m.workspaceId===model.workspaceId?'aria-current="true"':''}>${esc(m.title)}</button>`).join('');
}
let viewUnits=unitSystem(model);
 for(const [id,legacy,label] of [['unit-prefix','micro','micro (legacy)'],['unit-volume','mL','mL (legacy)']]){const select=$(id);select.querySelector('[data-legacy]')?.remove();if((id==='unit-prefix'?viewUnits.selected.prefix:viewUnits.selected.volume)===legacy){const option=document.createElement('option');option.value=legacy;option.textContent=label;option.dataset.legacy='true';select.add(option);}}
const shown=(kind,value)=>value*viewUnits.factors[kind];
const unitLabel=kind=>viewUnits.labels[kind];
function renderUnits(){
 viewUnits=unitSystem(model);
 for(const [key,id] of [['amount','unit-amount'],['prefix','unit-prefix'],['volume','unit-volume'],['time','unit-time']])$(id).value=viewUnits.selected[key];
 $('duration-unit').textContent=unitLabel('time');
 const labels={inventory:`Inventory · ${unitLabel('inventory')}`,concentration:`Concentration · ${unitLabel('concentration')}`,flux:`Flux · ${unitLabel('constant')}`};
 for(const option of $('quantity').options)option.textContent=labels[option.value];
}
let diagramFont=14,diagramHeight=350;
try{const saved=JSON.parse(localStorage.getItem('anbm-diagram-view')||'{}');if(Number.isFinite(saved.font))diagramFont=Math.max(11,Math.min(20,saved.font));if(Number.isFinite(saved.height))diagramHeight=Math.max(260,Math.min(1000,saved.height));}catch{}
const diagramScale=()=>diagramFont/14;
function canvasHeight(){return Math.max(350,diagramHeight*760/Math.max(760,$('diagram').getBoundingClientRect().width));}
function fitDiagramToModel(){
 const bottom=Math.max(0,...model.pools.map(p=>position(p.id).y+90),...model.processes.filter(p=>(!p.from||!p.to)&&model.layout?.[p.id]).map(p=>model.layout[p.id].y+20));
 diagramHeight=Math.min(1000,Math.max(diagramHeight,Math.ceil(bottom*Math.max(760,$('diagram').getBoundingClientRect().width)/760)));
 applyDiagramView();
}
function externalPosition(process){
 const saved=model.layout?.[process.id];if(saved)return saved;
 const box=position(process.from||process.to);
 return {x:box.x,y:process.from?Math.min(canvasHeight()-18,box.y+135):Math.max(18,box.y-135)};
}
function clampExternalPosition(x,y){return {x:Math.max(14,Math.min(746,x)),y:Math.max(14,Math.min(canvasHeight()-14,y))};}
function applyDiagramView(){
 $('diagram-font').value=diagramFont;$('diagram-font-label').textContent=`${diagramFont} px`;
 $('diagram-height').value=diagramHeight;$('diagram-pane').style.height=`${diagramHeight}px`;
 $('diagram-resize').setAttribute('aria-valuenow',diagramHeight);
 $('diagram').setAttribute('viewBox',`0 0 760 ${canvasHeight()}`);
 try{localStorage.setItem('anbm-diagram-view',JSON.stringify({font:diagramFont,height:diagramHeight}));}catch{}
 renderDiagram();
}
const worker=new Worker(new URL('./worker.js?v=20261021-flux-ports',import.meta.url),{type:'module'});
worker.onmessage=({data})=>{if(data.id!==revision)return; $('run').disabled=false;if(data.error){$('status').textContent=data.error;return;}result=data.result;for(const key of ['pools','processes'])for(const record of result.model[key]){const current=model[key].find(p=>p.id===record.id);if(current){record.name=current.name;if(key==='pools')record.variableName=variableName(current);}}$('time').max=result.rows.length-1;$('time').value=0;renderResults();renderDiagram();};
worker.onerror=()=>{$('status').textContent='Could not start the solver worker. Serve the app over HTTP using the README instructions.';$('run').disabled=false;};
function stop(){clearInterval(timer);timer=null;$('play').textContent='▶ Play';}
function run(){clearTimeout(runTimer);stop();try{validate(model);$('status').textContent='';$('run').disabled=true;worker.postMessage({id:revision,model});}catch(e){$('status').textContent=e.message;$('run').disabled=false;}}
function changed(){revision++;result=null;connecting=false;connectionStart=null;grouping=false;groupStart=null;groupEnd=null;groupSelection.clear();$('add-compartment').setAttribute('aria-pressed','false');$('connect').setAttribute('aria-pressed','false');stop();saveCurrentModel();render();clearTimeout(runTimer);runTimer=setTimeout(run,180);}
function workspaceSnapshot(){return {model:clone(model),customModels:clone(customModels)};}
function remember(){history.push(workspaceSnapshot());if(history.length>60)history.shift();future=[];}
function change(fn){saveCurrentModel();remember();fn();changed();}
function selectedObject(){return (selected.type==='compartment'?model.compartments:selected.type==='pool'?model.pools:model.processes).find(p=>p.id===selected.id);}
function choose(type,id){selected={type,id};renderDiagram();renderInspector();renderEquations();renderResults();}
function render(){
 renderUnits();
 $('main-model-menu').hidden=!model.workspaceId;
 for(const button of document.querySelectorAll('[data-model-action="remove"]'))button.hidden=!model.workspaceId;
 if(model.workspaceId)$('title').innerHTML=`<input id="model-title" aria-label="Model title" maxlength="80" value="${esc(model.title)}" title="Edit model title">`;else $('title').textContent=model.title;$('question').textContent=presets[guidedExampleIndex()]?.question||model.question;$('duration').value=Number(shown('time',model.simulation.duration).toPrecision(12));
 const lesson=guidedExampleIndex();$('lesson-label').textContent=lesson>=0?`EXPLORATION ${String(lesson+1).padStart(2,'0')} / 06`:'YOUR MODEL';
 renderNavigation();
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
 const custom=model.diagramSizes?.pools?.[pool.id];
 const width=Math.max(96*scale,custom?.width??titleWidth,inventoryWidth+2*padding,concentrationWidth+2*padding);
 const lines=wrapLabel(pool.name,width-2*padding,text=>measure(text,diagramFont));
 const height=Math.max((76+(lines.length-1)*18)*scale,custom?.height??0);
 return {width,height,lines};
}
function clampPoolPosition(id,x,y){
 const box=boxDimensions(model.pools.find(p=>p.id===id)),volume=$('show-volume').checked?24*diagramScale():0;
 return {x:Math.max(box.width/2+6,Math.min(754-box.width/2,x)),y:Math.max(box.height/2+6,Math.min(canvasHeight()-box.height/2-volume-6,y))};
}
function compartmentBoxes(){
 return Object.fromEntries(model.compartments.flatMap(c=>{
   const pools=model.pools.filter(p=>p.compartment===c.id);if(!pools.length||(!c.grouped&&pools.length<2))return [];
   const members=pools.map(p=>({pos:position(p.id),box:boxDimensions(p)}));
   const left=Math.max(8,Math.min(...members.map(m=>m.pos.x-m.box.width/2))-24),right=Math.min(752,Math.max(...members.map(m=>m.pos.x+m.box.width/2))+24);
   const top=Math.max(8,Math.min(...members.map(m=>m.pos.y-m.box.height/2))-40),bottom=Math.min(canvasHeight()-8,Math.max(...members.map(m=>m.pos.y+m.box.height/2))+24);
   const custom=model.diagramSizes?.compartments?.[c.id],width=Math.min(752-left,Math.max(right-left,custom?.width??0)),height=Math.min(canvasHeight()-8-top,Math.max(bottom-top,custom?.height??0));
   return [[c.id,{x:left+width/2,y:top+height/2,width,height,left,top,radius:14}]];
 }));
}
function currentRow(){return result?.rows[Number($('time').value)]||null;}
let renderedFluxPorts={};
function renderDiagram(){
 renderedFluxPorts={};
 const row=currentRow(),scale=diagramScale(),height=canvasHeight();
 let svg='<defs>'+[['arrow','#7a8b89'],['arrow-selected',selectedFluxColor]].map(([id,color])=>`<marker id="${id}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="12" markerHeight="12" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${color}"/></marker>`).join('')+'</defs>';
 const boxes=Object.fromEntries(model.pools.map(p=>[p.id,boxDimensions(p,scale)]));
 const groups=compartmentBoxes();
 for(const c of model.compartments){const box=groups[c.id];if(!box)continue;
   svg+=`<g class="compartment ${selected.type==='compartment'&&selected.id===c.id?'selected':''}" data-compartment="${esc(c.id)}" tabindex="0" role="button" aria-label="Inspect compartment ${esc(c.name)}"><rect x="${box.left}" y="${box.top}" width="${box.width}" height="${box.height}" rx="14"/><!--compartment-label-${encodeURIComponent(c.id)}--></g>`;
 }
 const routes=parallelFluxRoutes(model.processes,p=>['from','to'].map(end=>{
   if(!p[end])return null;const pool=model.pools.find(q=>q.id===p[end]);
   return volumeLaw(p)&&groups[pool?.compartment]?`compartment:${pool.compartment}`:`pool:${p[end]}`;
 }));
 const occupiedLabels=[],arrowObstacles=[];
 // Place long exchange labels first so shorter labels can fit around them.
 model.processes.map((p,i)=>({p,i})).sort((a,b)=>Number(b.p.law==='exchange')-Number(a.p.law==='exchange')).forEach(({p,i})=>{
   const marker=selected.type==='process'&&selected.id===p.id?'arrow-selected':'arrow';
   const fromCompartment=model.pools.find(q=>q.id===p.from)?.compartment,toCompartment=model.pools.find(q=>q.id===p.to)?.compartment;
   const crossesCompartments=volumeLaw(p)&&fromCompartment!==toCompartment;
   const dest=p.to?(crossesCompartments&&groups[toCompartment]||position(p.to)):null,origin=p.from?(crossesCompartments&&groups[fromCompartment]||position(p.from)):null;
   const boundary=!p.from||!p.to?externalPosition(p):null;
   const a=origin||boundary,b=dest||boundary;
   const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;
   const route=routes[p.id],paired=route.count>1;
   const offset=route.offset;
   let control={x:(a.x+b.x)/2-dy/len*offset,y:(a.y+b.y)/2+dx/len*offset};
   const volumeBased=crossesCompartments;
   const fromGroup=volumeBased&&model.pools.find(q=>q.id===p.from)?.compartment,toGroup=volumeBased&&model.pools.find(q=>q.id===p.to)?.compartment;
   const fromBox=groups[fromGroup],toBox=groups[toGroup];
   let start,end;
   for(let pass=0;pass<10;pass++){
     start=origin?arrowBoxContact(fromBox||a,control,p.law==='exchange'?6:0,fromBox||boxes[p.from]):a;
     end=dest?arrowBoxContact(toBox||b,control,6,toBox||boxes[p.to]):b;
     control={x:(start.x+end.x)/2-dy/len*offset,y:(start.y+end.y)/2+dx/len*offset};
   }
   let ax=start.x,ay=start.y,bx=end.x,by=end.y,cx=control.x,cy=control.y;
   let pathData=`M${ax},${ay} Q${cx},${cy} ${bx},${by}`,portMidpoint=null,cubicControls=null;
   if(volumeLaw(p)&&origin&&dest){
     const fromDimensions=fromBox||boxes[p.from],toDimensions=toBox||boxes[p.to],fromCenter=fromBox||a,toCenter=toBox||b,saved=model.diagramPorts?.[p.id];
     const fromContact=saved?.from?boxPortContact(fromCenter,fromDimensions,saved.from):arrowBoxContact(fromCenter,control,0,fromDimensions);
     const toContact=saved?.to?boxPortContact(toCenter,toDimensions,saved.to):arrowBoxContact(toCenter,control,0,toDimensions);
     renderedFluxPorts[p.id]={from:{contact:fromContact,center:fromCenter,dimensions:fromDimensions},to:{contact:toContact,center:toCenter,dimensions:toDimensions}};
     if(saved?.from||saved?.to){
       const length=Math.max(40,Math.min(160,Math.hypot(toContact.x-fromContact.x,toContact.y-fromContact.y)*0.35));
       const n1=boxBorderNormal(fromCenter,fromDimensions,fromContact),n2=boxBorderNormal(toCenter,toDimensions,toContact);
       const c1={x:fromContact.x+n1.x*length-dy/len*offset,y:fromContact.y+n1.y*length+dx/len*offset},c2={x:toContact.x+n2.x*length-dy/len*offset,y:toContact.y+n2.y*length+dx/len*offset};
       const offsetMarker=(point,toward,gap)=>{const dx=toward.x-point.x,dy=toward.y-point.y,l=Math.hypot(dx,dy)||1;return {x:point.x+dx/l*gap,y:point.y+dy/l*gap};};
       start=offsetMarker(fromContact,c1,p.law==='exchange'?6:0);end=offsetMarker(toContact,c2,6);
       ax=start.x;ay=start.y;bx=end.x;by=end.y;cx=(c1.x+c2.x)/2;cy=(c1.y+c2.y)/2;
       cubicControls=[c1,c2];
       portMidpoint={x:(ax+3*c1.x+3*c2.x+bx)/8,y:(ay+3*c1.y+3*c2.y+by)/8};
       pathData=`M${ax},${ay} C${c1.x},${c1.y} ${c2.x},${c2.y} ${bx},${by}`;
     }
   }
   const curvePoints=[];
   for(let step=0;step<=60;step++){
     const t=step/60,u=1-t;
     const x=cubicControls?u*u*u*ax+3*u*u*t*cubicControls[0].x+3*u*t*t*cubicControls[1].x+t*t*t*bx:u*u*ax+2*u*t*cx+t*t*bx;
     const y=cubicControls?u*u*u*ay+3*u*u*t*cubicControls[0].y+3*u*t*t*cubicControls[1].y+t*t*t*by:u*u*ay+2*u*t*cy+t*t*by;
     curvePoints.push({x,y});
     arrowObstacles.push({left:x-5,right:x+5,top:y-5,bottom:y+5});
   }
   const coefficientSymbol={constant:'F₀',firstOrder:'k',exchange:'Exchange E',advection:'Q'}[p.law];
   const forcingActive=p.forcing?.type&&p.forcing.type!=='constant';
   const links=volumeLaw(p)?transportLinks(model,p):[],sumFrom=links.map(q=>`[${poolVariable(model,q.from)}]`).join(' + '),sumTo=links.filter(q=>q.to).map(q=>`[${poolVariable(model,q.to)}]`).join(' + ');
   const lawEquation={constant:'F = F₀',firstOrder:`F = k * ${poolVariable(model,p.from)}`,exchange:`F = E * (${sumFrom||'?'} − ${sumTo||'?'})`,advection:`F = Q * (${sumFrom||'?'})`}[p.law]+(forcingActive?' * g(t)':'');
   const showCoefficients=$('show-coefficients').checked;
   labelMeasure.font=`${diagramFont}px ${getComputedStyle($('diagram')).fontFamily}`;
   const fluxReadout=row?`${fmt(shown('constant',row.fluxes[i]))} ${unitLabel('constant')}`:unitLabel(p.law);
   const labelLines=[p.name,fluxReadout,...(showCoefficients?[lawEquation,`${coefficientSymbol} = ${fmt(shown(p.law,p.value))} ${unitLabel(p.law)}`]:[])];
   const halfWidth=Math.max(...labelLines.map(text=>labelMeasure.measureText(text).width))/2+3*scale;
   const bottom=(showCoefficients?46:13)*scale;
   const obstacles=model.pools.map(pool=>{const point=position(pool.id),box=boxes[pool.id];return {left:point.x-box.width/2-6,right:point.x+box.width/2+6,top:point.y-box.height/2-6,bottom:point.y+box.height/2+($('show-volume').checked?24:6)*scale};}).concat(occupiedLabels,model.processes.filter(q=>!q.from||!q.to).map(q=>{const a=externalPosition(q);return {left:a.x-15,right:a.x+15,top:a.y-15,bottom:a.y+15};}));
   // Put reciprocal labels outside mirrored curves, with matching block-center clearance.
   const midpoint=portMidpoint||{x:(ax+2*cx+bx)/4,y:(ay+2*cy+by)/4};
   const clearance=(showCoefficients?50:33)*scale,blockCenter=(showCoefficients?15:-1.5)*scale;
   const preferred=paired?{x:midpoint.x+dy/len*clearance,y:midpoint.y-dx/len*clearance-blockCenter}:{x:portMidpoint?.x??cx,y:portMidpoint?.y??cy};
   const clampLabel=q=>({x:Math.max(halfWidth+8,Math.min(752-halfWidth,q.x)),y:Math.max(25*scale,Math.min(height-8-bottom,q.y))});
   const candidates=[0,-65,65,-110,110,-155,155].flatMap(oy=>[0,-100,100,-180,180].map(ox=>clampLabel({x:preferred.x+ox,y:preferred.y+oy}))).sort((a,b)=>Math.hypot(a.x-preferred.x,a.y-preferred.y)-Math.hypot(b.x-preferred.x,b.y-preferred.y));
   if(boundary){
     // Keep boundary labels alongside their own shaft before considering distant space.
     const lineLength=Math.hypot(bx-ax,by-ay)||1,nx=-(by-ay)/lineLength,ny=(bx-ax)/lineLength;
     const halfHeight=(bottom+25*scale)/2,centerOffset=(bottom-25*scale)/2;
     const gap=Math.abs(nx)*halfWidth+Math.abs(ny)*halfHeight+16*scale;
     const side=nx*(380-midpoint.x)+ny*(height/2-midpoint.y)>=0?1:-1;
     const nearby=[0.5,0.35,0.65,0.2,0.8,0.1,0.9].flatMap(t=>[side,-side].map(sign=>clampLabel({x:ax+(bx-ax)*t+nx*gap*sign,y:ay+(by-ay)*t+ny*gap*sign-centerOffset})));
     candidates.unshift(...nearby);
   }
   let label;
   if(paired){
     const halfHeight=(bottom+25*scale)/2,centerOffset=(bottom-25*scale)/2,buckets=[[],[],[]];
     for(const t of [0.5,0.4,0.6,0.3,0.7,0.2,0.8]){
       const index=Math.round(t*60),q=curvePoints[index],before=curvePoints[index-1],after=curvePoints[index+1];
       const tx=after.x-before.x,ty=after.y-before.y,length=Math.hypot(tx,ty)||1,nx=-ty/length,ny=tx/length;
       const clearance=Math.abs(nx)*halfWidth+Math.abs(ny)*halfHeight+6*scale;
       const outward=offset?Math.sign(offset):0;
       (outward?[outward*clearance,-outward*clearance,0]:[0,-clearance,clearance]).forEach((distance,priority)=>buckets[priority].push(clampLabel({x:q.x+nx*distance,y:q.y+ny*distance-centerOffset})));
     }
     const chosen=placeDiagramLabel(buckets.flat().map(q=>({x:q.x-halfWidth,y:q.y+bottom})),halfWidth*2,bottom+25*scale,obstacles);
     label={x:chosen.x+halfWidth,y:chosen.y-bottom};
   }else label=candidates.find(q=>!obstacles.some(o=>q.x+halfWidth>o.left&&q.x-halfWidth<o.right&&q.y+bottom>o.top&&q.y-25*scale<o.bottom))||{x:cx,y:cy};
   const lx=label.x,ly=label.y;
   occupiedLabels.push({left:lx-halfWidth-5,right:lx+halfWidth+5,top:ly-28*scale,bottom:ly+bottom+5});
   const coefficientLabel=$('show-coefficients').checked?`<text class="law-label" style="font-size:${diagramFont}px" x="${lx}" y="${ly+24*scale}" text-anchor="middle">${esc(lawEquation)}</text><text class="coefficient-label" style="font-size:${diagramFont}px" x="${lx}" y="${ly+40*scale}" text-anchor="middle">${coefficientSymbol} = ${fmt(shown(p.law,p.value))} ${esc(unitLabel(p.law))}</text>`:'';

   svg+=`<g class="process ${selected.type==='process'&&selected.id===p.id?'selected':''}" tabindex="0" role="button" aria-label="Inspect ${esc(p.name)}" data-process="${esc(p.id)}"><path d="${pathData}" fill="none" stroke="#7a8b89" stroke-width="2" marker-end="url(#${marker})" ${p.law==='exchange'?`marker-start="url(#${marker})"`:''}/><path class="hit-target" d="${pathData}" fill="none" stroke="transparent" stroke-width="18"/><text style="font-size:${diagramFont}px" x="${lx}" y="${ly-10*scale}" text-anchor="middle">${esc(p.name)}</text><text style="font-size:${diagramFont}px" x="${lx}" y="${ly+7*scale}" text-anchor="middle">${row?`${fmt(shown('constant',row.fluxes[i]))} ${unitLabel('constant')}`:esc(unitLabel(p.law))}</text>${coefficientLabel}</g>`;
 });
 const headerObstacles=[...occupiedLabels,...arrowObstacles,...model.pools.map(p=>{const q=position(p.id),b=boxes[p.id];return {left:q.x-b.width/2-5,right:q.x+b.width/2+5,top:q.y-b.height/2-5,bottom:q.y+b.height/2+5};})];
 labelMeasure.font=`${diagramFont}px ${getComputedStyle($('diagram')).fontFamily}`;
 for(const c of model.compartments){
   const b=groups[c.id];if(!b)continue;
   const text=`${c.name} · V = ${fmt(c.volume)} ${unitLabel('volume')}`,width=Math.min(736,labelMeasure.measureText(text).width+8),labelHeight=diagramFont+8;
   const xs=[b.left+12,b.left+(b.width-width)/2,b.left+b.width-width-12,...Array.from({length:Math.max(1,Math.ceil(b.width/24))},(_,i)=>b.left+12+i*24)];
   const candidates=[b.top+24,b.top-8,b.top+b.height-8].flatMap(y=>xs.map(x=>({x:Math.max(8,Math.min(752-width,x)),y:Math.max(labelHeight+8,Math.min(height-8,y))})));
   const label=placeDiagramLabel(candidates,width,labelHeight,headerObstacles);
   headerObstacles.push({left:label.x-4,right:label.x+width,top:label.y-labelHeight,bottom:label.y+4});
   svg=svg.replace(`<!--compartment-label-${encodeURIComponent(c.id)}-->`,`<text class="compartment-label" x="${label.x}" y="${label.y-3}" style="font-size:${diagramFont}px">${esc(text)}</text>`);
 }
 model.pools.forEach((p,i)=>{
   const {x,y}=position(p.id),M=row?.inventory[i]??p.initial,V=model.compartments.find(c=>c.id===p.compartment).volume;
   const box=boxes[p.id],titleY=-box.height/2+25*scale,inventoryY=titleY+(box.lines.length-1)*18*scale+22*scale;
   const title=box.lines.map((line,j)=>`<tspan x="0" y="${titleY+j*18*scale}">${esc(line)}</tspan>`).join('');
   svg+=`<g class="node ${groupSelection.has(p.id)?'group-selected ':''}${selected.type==='pool'&&selected.id===p.id?'selected':''}" style="--pool-color:${colors[i%colors.length]};--pool-tint:${colors[i%colors.length]}12" transform="translate(${x},${y})" data-pool="${esc(p.id)}" tabindex="0" role="button" aria-label="Inspect ${esc(p.name)}; arrow keys move"><rect x="${-box.width/2}" y="${-box.height/2}" width="${box.width}" height="${box.height}" rx="9"/><text class="pool-title" text-anchor="middle" style="font-size:${diagramFont}px">${title}</text><text y="${inventoryY}" text-anchor="middle" style="font-size:${22*scale}px">${fmt(shown('inventory',M))} <tspan style="font-size:${12*scale}px">${unitLabel('inventory')}</tspan></text><text y="${inventoryY+18*scale}" text-anchor="middle" style="font-size:${12*scale}px">${esc(`[${variableName(p)}]`)} = ${fmt(shown('concentration',M/V))} ${unitLabel('concentration')}</text>${excludedFromTransport(p)?`<text class="transport-excluded-mark" x="${box.width/2-10}" y="${-box.height/2+13}" text-anchor="middle" font-size="11"><title>This reservoir is excluded from volume-based exchanges (mixing and advection)</title>⦸</text>`:''}${$('show-volume').checked&&!groups[p.compartment]?`<text class="volume-label" style="font-size:${diagramFont}px" y="${box.height/2+16*scale}" text-anchor="middle">V = ${fmt(shown('volume',V))} ${unitLabel('volume')}</text>`:''}</g>`;
 });
 if(!connecting&&!grouping){
   const handle=(kind,id,name,x,y)=>`<g class="box-resize-handle" data-resize-kind="${kind}" data-resize-id="${esc(id)}" tabindex="0" role="button" aria-label="Resize ${kind==='pool'?'reservoir':'compartment'} ${esc(name)}; drag or use arrow keys"><title>Drag to resize; arrow keys adjust width and height</title><rect x="${x-12}" y="${y-12}" width="12" height="12" rx="2"/><path d="M${x-9},${y-3} L${x-3},${y-9} M${x-6},${y-3} L${x-3},${y-6}"/></g>`;
   for(const pool of model.pools.filter(p=>selected.type==='pool'&&selected.id===p.id)){const box=boxes[pool.id],q=position(pool.id);svg+=handle('pool',pool.id,pool.name,q.x+box.width/2,q.y+box.height/2);}
   for(const c of model.compartments.filter(c=>selected.type==='compartment'&&selected.id===c.id)){const box=groups[c.id];if(box)svg+=handle('compartment',c.id,c.name,box.left+box.width,box.top+box.height);}
 }
 if(!connecting&&!grouping)for(const process of model.processes.filter(p=>volumeLaw(p)&&selected.type==='process'&&selected.id===p.id))for(const end of ['from','to']){
   const port=renderedFluxPorts[process.id]?.[end];if(!port)continue;
   svg+=`<circle class="flux-port-handle ${selected.type==='process'&&selected.id===process.id?'selected':''}" data-flux-port="${esc(process.id)}" data-port-end="${end}" data-manual-port="${Boolean(model.diagramPorts?.[process.id]?.[end])}" cx="${port.contact.x}" cy="${port.contact.y}" r="7" tabindex="0" role="button" aria-label="Move ${end==='from'?'source':'receiving'} attachment of ${esc(process.name)}; drag or use arrow keys"><title>Drag along the box border; double-click to restore automatic placement</title></circle>`;
 }
 for(const process of model.processes.filter(p=>!p.from||!p.to)){
   const end=externalPosition(process),active=selected.type==='process'&&selected.id===process.id;
   svg+=`<circle class="external-handle ${active?'selected':''}" data-external="${esc(process.id)}" cx="${end.x}" cy="${end.y}" r="9" tabindex="0" role="button" aria-label="Move external endpoint of ${esc(process.name)}; drag or use arrow keys"><title>Drag to move external endpoint</title></circle>`;
 }
 if(grouping&&groupStart&&groupEnd)svg+=`<rect class="compartment-marquee" x="${Math.min(groupStart.x,groupEnd.x)}" y="${Math.min(groupStart.y,groupEnd.y)}" width="${Math.abs(groupStart.x-groupEnd.x)}" height="${Math.abs(groupStart.y-groupEnd.y)}"/>`;
 if(connecting){
   const targets=[['top',0,0,760,28,380,19],['bottom',0,height-28,760,28,380,height-9],['left',0,28,28,height-56,18,height/2],['right',732,28,28,height-56,742,height/2]];
   svg+=targets.map(([side,x,y,w,h,tx,ty])=>`<g class="boundary-target ${connectionStart?.side===side?'active':''}" data-boundary="${side}" tabindex="0" role="button" aria-label="${side} external boundary"><rect x="${x}" y="${y}" width="${w}" height="${h}" rx="5"/><text x="${tx}" y="${ty}" text-anchor="middle" ${side==='left'||side==='right'?`transform="rotate(-90 ${tx} ${ty})"`:''}>External boundary</text></g>`).join('');
   svg+='<path id="flux-preview" fill="none" stroke="#cd8d3f" stroke-width="2" stroke-dasharray="6 4" pointer-events="none"/>';
 }
 $('diagram').classList.toggle('adding-flux',connecting);
 $('diagram').innerHTML=svg;
 floatingDiagram?.refresh();
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
 const p=selectedObject();
 $('properties-title').textContent=p?`Properties: ${selected.type==='pool'?'Reservoir':selected.type==='compartment'?'Compartment':'Flux'}`:'Properties';
 if(!p){$('inspector').innerHTML='<p class="muted">Select a reservoir, flux, or compartment to change its properties.</p>';return;}
 if(selected.type==='compartment'){
   inspectorHelp={volume:'One shared physical volume for every reservoir inside this compartment. Mixing and advection cross compartment boundaries; the compartment itself has no inventory.'};
   $('inspector').innerHTML=field(`Volume · ${unitLabel('volume')}`,'volume',p.volume);return;
 }
 inspectorHelp={name:selected.type==='pool'?'Display name labels the reservoir and plot legend. Variable name denotes inventory in equations; brackets denote its concentration. Renaming preserves connections.':'Display name labels this process in the diagram and flux legend. Renaming preserves its connections.',variableName:'Variable name denotes inventory in equations and appears in bracketed concentration labels. Use a unique name with 1–24 letters, digits, underscores or primes; start with a letter or underscore. Renaming preserves connections.',initial:`Inventory at the start of each run, in ${unitLabel('inventory')}. Every run restarts from this initial condition.`,from:'The donor pool loses material through this process. External boundary represents an input from outside the modeled system.',to:'The recipient pool gains material through this process. External boundary represents a loss from the modeled system.',law:`Choose how flux is calculated. Tracer fluxes use ${unitLabel('constant')}. First-order processes move material only; advection also transports water and requires a balanced water budget.`, 'forcing.type':'Forcing multiplies the base coefficient by g(t). A pulse is a finite change in rate, not an instantaneous addition to inventory.', 'forcing.start':`Time in ${unitLabel('time')} at which the step or pulse begins.`, 'forcing.end':`Time in ${unitLabel('time')} at which the pulse ends and the multiplier returns to 1.`, 'forcing.factor':'Dimensionless multiplier applied after a step or during a pulse. Outside the pulse the multiplier is 1.', 'forcing.amplitude':'Seasonal fractional amplitude between 0 and 1. The multiplier is 1 + amplitude * sin(2π * t / period).', 'forcing.period':`Duration of one seasonal cycle in ${unitLabel('time')}.`};
 let html=field('Display name','name',p.name,'text','maxlength="80"');
 if(selected.type==='pool'){
  const c=model.compartments.find(c=>c.id===p.compartment);
  inspectorHelp.volume=`Compartment: ${c.name}. Volume in ${unitLabel('volume')} is fixed and shared by all pools in this compartment. Concentration equals inventory divided by volume.`;
  html+=field('Variable name','variableName',variableName(p),'text','maxlength="24"')+'<p id="variable-name-error" class="field-error" role="status"></p>';
  html+=field(`Initial inventory · ${unitLabel('inventory')}`,'initial',p.initial)+(compartmentBoxes()[c.id]?`<p class="muted">Shared volume: ${esc(c.name)} · ${fmt(c.volume)} ${esc(unitLabel('volume'))}. Select the compartment to edit.</p>`:field(`Volume · ${unitLabel('volume')}`,'volume',c.volume));
  if(compartmentBoxes()[c.id])html+='<button type="button" id="leave-compartment">Leave compartment</button>';
  html+=`<label class="check-control transport-exclusion"><input type="checkbox" id="exclude-transport" data-key="excludeFromTransport" ${excludedFromTransport(p)?'checked':''}> Exclude from Mixing+Advection</label>`;
 }else{
  const donor=poolVariable(model,p.from),recipient=poolVariable(model,p.to),forced=p.forcing?.type&&p.forcing.type!=='constant';
  inspectorHelp.value=`Base coefficient for the selected process law. The current tracer flux is shown separately in ${unitLabel('constant')}.`;
  if(p.law==='exchange')inspectorHelp.value=`E is the symmetric exchange coefficient (volume per time, ${unitLabel('exchange')}). Net tracer flux F = E * ([${donor}] − [${recipient}])${forced?' * g(t)':''}, in ${unitLabel('constant')}. Positive flux goes from donor to recipient; negative flux reverses direction. Exchange preserves both fixed compartment volumes.`;
  if(p.law==='firstOrder'){
   const simple=analytical(model,0)!==null&&model.processes.filter(q=>q.law==='firstOrder').length===1;
   inspectorHelp.value=`${p.to?'Transfer':'Removal'} flux = k * ${donor}${forced?' * g(t)':''}, where ${donor} is donor inventory (${unitLabel('inventory')}). The rate constant k is in ${unitLabel('firstOrder')}; flux is in ${unitLabel('constant')}.${simple&&p.value>0?` For this one-box model, adjustment time is 1/k = ${fmt(shown('time',1/p.value))} ${unitLabel('time')}.`:simple&&p.value===0?' With k = 0 there is no first-order removal and no finite removal adjustment time.':''}`;
  }
  if(p.law==='advection')inspectorHelp.value=`Q is water transport in ${unitLabel('advection')}. Flux = Q * [${donor}], in ${unitLabel('constant')}. Fixed compartment volumes require balanced water transport.`;
  if(volumeLaw(p)){
   inspectorHelp.from='The source physical compartment. This water-flow connection transports every included reservoir, using its concentration in the shared volume.';
   inspectorHelp.to='The receiving physical compartment. Included material forms are paired explicitly when more than one is transported.';
   inspectorHelp.value=p.law==='advection'?`Q is one water flow (${unitLabel('advection')}), counted once in the compartment water budget. Each included form carries Q * its donor concentration. The graph shows their summed tracer flux.`:`E is one symmetric exchange coefficient (${unitLabel('exchange')}). Each included pair carries E * (donor concentration − recipient concentration). The graph shows their summed net tracer flux.`;
  }
  const endpoints=volumeLaw(p)?model.compartments.filter(c=>model.pools.some(b=>b.compartment===c.id)).map(c=>[model.pools.find(b=>b.compartment===c.id).id,c.name]):[['','External boundary'],...model.pools.map(b=>[b.id,b.name])];
  const endpointValue=id=>volumeLaw(p)?model.pools.find(q=>q.compartment===model.pools.find(b=>b.id===id)?.compartment)?.id||'':id||'';
  const allowedLaws=availableFluxLaws(p.from,p.to).filter(law=>law===p.law||!transportProblem(model,{...p,law},{checkPairs:false}));
  if(!p.from)inspectorHelp.law=`External inputs have no modeled donor inventory, so use a prescribed flux (${unitLabel('constant')}). Coefficient forcing can vary this input over time.`;
  html+=select(volumeLaw(p)?'From compartment':'From','from',endpoints,endpointValue(p.from))+select(volumeLaw(p)?'To compartment':'To','to',endpoints,endpointValue(p.to))+select('Process law','law',[['constant','Prescribed flux'],['firstOrder','First-order transfer / loss'],['exchange','Symmetric exchange'],['advection','Advective water transport']].filter(([law])=>allowedLaws.includes(law)),p.law)+field(`${p.law==='exchange'?'Exchange coefficient E':p.law==='firstOrder'?`First-order ${p.to?'transfer':'removal'} rate constant k`:'Coefficient'} · ${unitLabel(p.law)}`,'value',p.value);
  if(volumeLaw(p)){
    const fromComp=model.pools.find(q=>q.id===p.from)?.compartment,toComp=model.pools.find(q=>q.id===p.to)?.compartment;
    const sources=includedReservoirs(model,fromComp),targets=includedReservoirs(model,toComp);
    html+='<p class="muted">One water-flow coefficient carries all included reservoirs. Excluded reservoirs remain unchanged by this flux.</p>';
    if(sources.length>1||targets.length>1)for(const source of sources){
      const target=transportLinks(model,p).find(q=>q.from===source.id)?.to;
      html+=select(`Carry ${source.name} into`,'transportTarget:'+source.id,[['','Choose matching reservoir'],...targets.map(q=>[q.id,q.name])],target||'');
    }
    const problem=transportProblem(model,p);if(problem)html+=`<p class="field-error" role="status">${esc(problem)}</p>`;
  }
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
document.addEventListener('keydown',e=>{if(e.key==='Escape'){hidePropertyTooltip();if(grouping)$('add-compartment').click();}});
document.addEventListener('pointerdown',e=>{if(!e.target.closest('.property-heading')&&e.target!==$('property-tooltip'))hidePropertyTooltip();});
$('property-tooltip').addEventListener('pointerleave',()=>{if(!tooltipHeading?.contains(document.activeElement))hidePropertyTooltip();});
window.addEventListener('resize',hidePropertyTooltip);document.addEventListener('scroll',hidePropertyTooltip,true);
function fraction(numerator,denominator,label){return `<span class="fraction" role="math" aria-label="${esc(label)}"><span aria-hidden="true" class="numerator">${numerator}</span><span aria-hidden="true" class="denominator">${denominator}</span></span>`;}
function renderEquations(){
 const displayed=displayModel(model);
 $('equations').innerHTML=model.pools.map(p=>{
 const terms=model.processes.flatMap(q=>processParts(model,q)).filter(q=>q.from===p.id||q.to===p.id).map(q=>`<button class="term ${selected.type==='process'&&selected.id===q.id?'selected':''}" data-term="${esc(q.id)}" title="${esc(q.name)} · ${esc(unitLabel(q.law))}">${q.to===p.id?'+':'−'} ${esc(budgetExpression(displayed,{...displayed.processes.find(p=>p.id===q.id),from:q.from,to:q.to},fmt,true))}</button>`).join('');
 return `<div class="equation">${fraction(`d(${esc(variableName(p))})`,'dt',`d(${variableName(p)})/dt`)} = ${terms||'0'} <small class="muted">${unitLabel('constant')}</small></div>`;
 }).join('');
 let text='';
 if(analytical(model,0)!==null){const k=model.processes.filter(p=>p.law==='firstOrder').reduce((s,p)=>s+p.value,0),I=model.processes.filter(p=>p.law==='constant').reduce((s,p)=>s+(p.to?1:-1)*p.value,0);text=k>0?`One-box reference: M(t) = M* + (M₀ − M*) exp(−kt). M* = I/k = ${fmt(shown('inventory',I/k))} ${unitLabel('inventory')}; adjustment time τ = 1/k = ${fmt(shown('time',1/k))} ${unitLabel('time')}. These relations apply to this constant-input, first-order model.`:'Zero-loss reference: M(t) = M₀ + It. With positive net input there is no finite equilibrium.';}
 if(analytical(model,0)!==null)text=text.replaceAll('M',variableName(model.pools[0]));
 $('reference').hidden=!text;
 $('reference').innerHTML=esc(text).replaceAll('I/k',fraction('I','k','I divided by k')).replaceAll('1/k',fraction('1','k','1 divided by k')).replace('C = M/V',`C = ${fraction('M','V','M divided by V')}`);
}
function fmt(x){return Number.isFinite(x)?Math.abs(x)>=1e5||Math.abs(x)>0&&Math.abs(x)<0.001?x.toExponential(2):Number(x.toPrecision(4)).toString():'—';}
const responseTimeScales={};
const hiddenCurves={pool:new Set(),flux:new Set()},highlightedCurves={pool:new Set(),flux:new Set()};
function resetCurveVisibility(){for(const curves of [hiddenCurves,highlightedCurves])for(const kind of ['pool','flux'])curves[kind].clear();}
for(const [id,kind] of [['legend','pool'],['flux-legend','flux']])$(id).onclick=e=>{
 const button=e.target.closest('[data-curve]');if(!button)return;
 const hidden=hiddenCurves[kind],highlighted=highlightedCurves[kind],key=button.dataset.curve;
 if(selected.id===key&&selected.type===(kind==='flux'?'process':'pool')){selected={type:null,id:null};highlighted.add(key);hidden.delete(key);renderDiagram();renderInspector();renderEquations();}
 if(hidden.has(key))hidden.delete(key);
 else if(highlighted.has(key)){highlighted.delete(key);hidden.add(key);}
 else highlighted.add(key);
 renderResults();floatingDiagram.refresh();
 $(id).querySelector(`[data-curve="${CSS.escape(key)}"]`)?.focus({preventScroll:true});
};
function renderResponseGraph(mode,plotId,legendId,noteId){
 const m=result.model,row=currentRow()||result.rows[0];
 const volumes=m.pools.map(p=>m.compartments.find(c=>c.id===p.compartment).volume);
 const vals=r=>mode==='flux'?r.fluxes.map(x=>shown('constant',x)):r.inventory.map((x,i)=>mode==='concentration'?shown('concentration',x/volumes[i]):shown('inventory',x));
 const labels=mode==='flux'?m.processes:m.pools;
 const kind=mode==='flux'?'flux':'pool';
 const selectedId=selected.type===(kind==='flux'?'process':'pool')&&labels.some(p=>p.id===selected.id)?selected.id:null;
 const {hidden,highlighted}=curvePresentation(hiddenCurves[kind],highlightedCurves[kind],selectedId);
 const hasHighlight=labels.some(p=>highlighted.has(p.id)&&!hidden.has(p.id));
 const curveOpacity=id=>hasHighlight&&!highlighted.has(id)?.22:1;
 const visible=labels.map((p,i)=>hidden.has(p.id)?null:i).filter(i=>i!==null);
 const visibleVals=r=>visible.map(i=>vals(r)[i]);
 const seriesColor=i=>mode==='flux'&&selected.type==='process'&&selected.id===labels[i].id?selectedFluxColor:colors[i%colors.length];
 const compatible=baseline && JSON.stringify(baseline.model.pools.map(p=>[p.id,p.compartment]))===JSON.stringify(m.pools.map(p=>[p.id,p.compartment])) && (mode!=='flux'||JSON.stringify(baseline.model.processes.map(p=>p.id))===JSON.stringify(m.processes.map(p=>p.id)));
 const baseVals=r=>mode==='flux'?r.fluxes.map(x=>shown('constant',x)):r.inventory.map((x,i)=>mode==='concentration'?shown('concentration',x/baseline.model.compartments.find(c=>c.id===baseline.model.pools[i].compartment).volume):shown('inventory',x));
 let all=result.rows.flatMap(visibleVals);if(compatible)all=all.concat(baseline.rows.flatMap(r=>visible.map(i=>baseVals(r)[i])));
 const ref=result.rows.map(r=>analytical(m,r.t));if(mode!=='flux'&&ref[0]!==null&&visible.includes(0))all.push(...ref.map(x=>mode==='concentration'?shown('concentration',x/volumes[0]):shown('inventory',x)));
 const logX=$(mode==='flux'?'flux-log-x':'log-x').checked,logY=$(mode==='flux'?'flux-log-y':'log-y').checked;
 const xValues=result.rows.map(r=>shown('time',r.t)).concat(compatible?baseline.rows.map(r=>shown('time',r.t)):[]);
 const xScale=axisScale(xValues,logX,95,970),yScale=axisScale(all,logY,225,30);
 responseTimeScales[plotId]=xScale;
 const yLabel={inventory:`Inventory · ${unitLabel('inventory')}`,concentration:`Concentration · ${unitLabel('concentration')}`,flux:`Flux · ${unitLabel('constant')}`}[mode];
 const notes=[];
 if(logX)notes.push('Log X: t = 0 is omitted.');
 if(logY&&all.some(x=>x<=0))notes.push('Log Y: zero and negative values are omitted; curves break at these values.');
 if(visible.length&&(!xScale||!yScale))notes.push('No positive data are available for the selected logarithmic scale.');
 $(noteId).textContent=notes.join(' ');
 let svg=`<text transform="translate(18,130) rotate(-90)" text-anchor="middle" font-size="18" fill="#607b70">${yLabel}${logY?' (log scale)':''}</text><text x="530" y="267" text-anchor="middle" font-size="18" fill="#607b70">Time · ${unitLabel('time')}${logX?' (log scale)':''}</text>`;
 if(xScale&&yScale){
   for(const v of yScale.ticks){const y=yScale.map(v);svg+=`<line x1="95" y1="${y}" x2="970" y2="${y}" stroke="#e8eee6"/><text x="82" y="${y+4}" text-anchor="end" font-size="18" fill="#809588">${fmt(v)}</text>`;}
   for(const t of xScale.ticks){const x=xScale.map(t);svg+=`<text x="${x}" y="248" text-anchor="middle" font-size="18" fill="#809588">${fmt(t)}</text>`;}
   const path=(rows,get,i)=>trajectoryPath(rows,r=>shown('time',r.t),r=>get(r)[i],xScale,yScale);
   // Draw emphasized curves last so they remain visible where trajectories overlap.
   visible.slice().sort((a,b)=>Number(highlighted.has(labels[a].id))-Number(highlighted.has(labels[b].id))).forEach(i=>{const p=labels[i],emphasized=highlighted.has(p.id),opacity=curveOpacity(p.id);svg+=`<path data-series="${esc(p.id)}" d="${path(result.rows,vals,i)}" fill="none" stroke="${seriesColor(i)}" opacity="${opacity}" stroke-width="${emphasized?4.5:2.5}"/>`;if(compatible)svg+=`<path d="${path(baseline.rows,baseVals,i)}" fill="none" stroke="${seriesColor(i)}" stroke-dasharray="6 5" opacity="${opacity*.5}" stroke-width="${emphasized?3:2}"/>`;});
   if(mode!=='flux'&&ref[0]!==null&&visible.includes(0))svg+=`<path d="${trajectoryPath(result.rows,r=>shown('time',r.t),r=>mode==='concentration'?shown('concentration',analytical(m,r.t)/volumes[0]):shown('inventory',analytical(m,r.t)),xScale,yScale)}" fill="none" stroke="#263d40" opacity="${curveOpacity(labels[0].id)}" stroke-width="1.5" stroke-dasharray="3 5"/>`;
   for(const i of visible.slice().sort((a,b)=>Number(highlighted.has(labels[a].id))-Number(highlighted.has(labels[b].id))))svg+=`<path class="curve-hit-target" data-curve-target="${esc(labels[i].id)}" d="${path(result.rows,vals,i)}" fill="none" stroke="transparent" stroke-width="14" tabindex="0" role="button" aria-label="Highlight ${esc(labels[i].name)} curve"/>`;
   const cursor=xScale.map(shown('time',row.t));
   if(cursor!==null)svg+=`<line x1="${cursor}" y1="30" x2="${cursor}" y2="225" stroke="#a1afa3" stroke-dasharray="4 4" pointer-events="none"/>`;
 }else if(visible.length)svg+='<text x="530" y="130" text-anchor="middle" font-size="16" fill="#809588">No positive values to plot. Choose a linear scale to see zero or negative values.</text>';
 if(!visible.length)svg+='<text x="530" y="130" text-anchor="middle" font-size="16" fill="#809588">All curves hidden. Select a legend entry to show a curve.</text>';
 $(plotId).innerHTML=svg;
 $(legendId).innerHTML=labels.map((p,i)=>{const state=hidden.has(p.id)?'hidden':highlighted.has(p.id)?'highlighted':'normal',next={normal:'Highlight',highlighted:'Hide',hidden:'Restore'}[state];return `<button type="button" data-curve="${esc(p.id)}" data-curve-state="${state}" aria-pressed="${state==='highlighted'}" title="${esc(p.name)}: ${state}. ${next} curve"><i class="legend-dot" style="background:${seriesColor(i)}"></i>${esc(p.name)}: ${fmt(vals(row)[i])}<span class="sr-only"> (${state}; ${next.toLowerCase()} curve)</span></button>`;}).join('')+(compatible?'<span>Dashed: pinned baseline</span>':'');
}
function renderResults(){
 $('clear-baseline').hidden=!baseline;
 if(!result){
   for(const id of ['plot','flux-plot']){responseTimeScales[id]=null;$(id).innerHTML='<text x="500" y="130" text-anchor="middle" fill="#8b9e92" font-size="14">Run the model to explore its response.</text>';}
   for(const id of ['diagnostics','legend','flux-legend'])$(id).innerHTML='';
   for(const id of ['scale-note','flux-scale-note'])$(id).textContent='';
   $('time-label').textContent=`0 ${unitLabel('time')}`;return;
 }
 const m=result.model,row=currentRow()||result.rows[0],index=result.rows.indexOf(row);
 $('time-label').textContent=`${fmt(shown('time',row.t))} ${unitLabel('time')}`;
 renderResponseGraph($('quantity').value,'plot','legend','scale-note');
 renderResponseGraph('flux','flux-plot','flux-legend','flux-scale-note');
 const total=row.inventory.reduce((a,b)=>a+b,0),net=derivative(m,row.t,[...row.inventory,0]).slice(0,-1).reduce((a,b)=>a+b,0),error=analytical(m,row.t);
 $('diagnostics').innerHTML=[[`Total inventory · ${unitLabel('inventory')}`,fmt(shown('inventory',total))],[`Net boundary flux · ${unitLabel('constant')}`,fmt(shown('constant',net))],[`Budget residual · ${unitLabel('inventory')}`,fmt(shown('inventory',row.residual))],[error===null?`Integrated boundary input · ${unitLabel('inventory')}`:`Analytical error · ${unitLabel('inventory')}`,fmt(shown('inventory',error===null?row.external:row.inventory[0]-error))]].map(([label,v])=>`<div class="metric"><small>${label}</small><strong>${v}</strong></div>`).join('');
 $('baseline').disabled=index<0;
}
function updateDisplayUnits(update){
 const next={...viewUnits.selected,...update};
 unitSystem({displayUnits:next});
 remember();model.displayUnits=next;render();
 saveCurrentModel();
}
for(const [key,id] of [['amount','unit-amount'],['prefix','unit-prefix'],['volume','unit-volume'],['time','unit-time']])$(id).onchange=e=>updateDisplayUnits({[key]:e.target.value});
$('lessons').onclick=e=>{const b=e.target.closest('[data-lesson]');if(b)change(()=>{model=clone(presets[+b.dataset.lesson]);fitDiagramToModel();resetCurveVisibility();selected={type:null,id:null};});};
$('reset-example').onclick=()=>{
 const index=guidedExampleIndex();if(index<0)return;
 change(()=>{model=clone(presets[index]);selected={type:null,id:null};resetCurveVisibility();fitDiagramToModel();});
};
$('save-as-example').onclick=()=>{
 if(guidedExampleIndex()<0)return;
 change(()=>{
   model=clone(model);model.workspaceId=crypto.randomUUID();
   const base=model.title+' copy';model.title=base;let n=2;while(customModels.some(m=>m.title===model.title))model.title=base+' '+n++;
 });
 $('model-title').focus();$('model-title').select();
};
$('blank').onclick=()=>{
 change(()=>{model=blank();model.workspaceId=crypto.randomUUID();let n=2;while(customModels.some(m=>m.title===model.title))model.title='Untitled model '+n++;customModels.push(clone(model));resetCurveVisibility();selected={type:null,id:null};});
 $('model-title').focus();$('model-title').select();
};
$('custom-models').onclick=e=>{
 const button=e.target.closest('[data-custom-model]');if(!button)return;
 const saved=customModels.find(m=>m.workspaceId===button.dataset.customModel);if(!saved)return;
 change(()=>{model=clone(saved);resetCurveVisibility();selected={type:null,id:null};fitDiagramToModel();});
};
function removeCustomModel(){
 if(!model.workspaceId)return;
 change(()=>{customModels=customModels.filter(m=>m.workspaceId!==model.workspaceId);try{localStorage.setItem('anbm-custom-models',JSON.stringify(customModels));}catch{}model=clone(presets[0]);selected={type:null,id:null};resetCurveVisibility();});
};
$('title').addEventListener('focusin',e=>{if(e.target.id==='model-title')remember();});
$('title').addEventListener('input',e=>{
 if(e.target.id!=='model-title')return;
 model.title=e.target.value.trim()||'Untitled model';if(result)result.model.title=model.title;
 saveCurrentModel();renderNavigation();$('undo').disabled=!history.length;$('redo').disabled=!future.length;
});
$('title').addEventListener('focusout',e=>{if(e.target.id==='model-title')e.target.value=model.title;});
$('title').addEventListener('keydown',e=>{if(e.target.id==='model-title'&&e.key==='Enter')e.target.blur();});
$('undo').onclick=()=>{if(history.length){future.push(workspaceSnapshot());({model,customModels}=history.pop());changed();}};
$('redo').onclick=()=>{if(future.length){history.push(workspaceSnapshot());({model,customModels}=future.pop());changed();}};
$('inspector').onchange=e=>{const key=e.target.dataset.key;if(!key||key==='name'||key==='variableName')return;const value=e.target.type==='checkbox'?e.target.checked:e.target.type==='number'||e.target.type==='range'?Number(e.target.value):e.target.value;change(()=>{const p=selectedObject();const kind=propertyQuantity(key),canonical=kind?toCanonical(model,kind,value):value;if(key==='volume')(selected.type==='compartment'?p:model.compartments.find(c=>c.id===p.compartment)).volume=canonical;else if(key.startsWith('transportTarget:')){const from=key.slice(16);p.transportPairs=(p.transportPairs||[]).filter(q=>q.from!==from);if(value)p.transportPairs.push({from,to:value});}else if(key.startsWith('forcing.')){p.forcing||={type:'constant'};if(key==='forcing.type')p.forcing={type:value,start:10,end:15,factor:2,amplitude:0.5,period:10};else p.forcing[key.split('.')[1]]=canonical;}else {p[key]=key==='from'||key==='to'?value||null:canonical;if((key==='from'||key==='to')&&!availableFluxLaws(p.from,p.to).includes(p.law)){p.law='constant';p.value=1;}}});};
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
 if(key==='name'&&$('exclude-transport'))$('exclude-transport').checked=excludedFromTransport(p);
 // Keep run labels current without recomputing or disturbing scrubbed simulation time.
 const runPool=result&&(selected.type==='pool'?result.model.pools:result.model.processes).find(q=>q.id===p.id);
 if(runPool)runPool[key]=value;
 renderDiagram();renderEquations();renderResults();
 $('undo').disabled=!history.length;$('redo').disabled=!future.length;
 saveCurrentModel();
};
function nextVariable(base='M'){
 let value=base.slice(0,24),index=2;while(model.pools.some(p=>variableName(p)===value)){const suffix='_'+index++;value=base.slice(0,24-suffix.length)+suffix;}
 return value;
}
function uid(prefix){return prefix+crypto.randomUUID().slice(0,8);}
$('inspector').onclick=e=>{
 if(e.target.id==='leave-compartment')change(()=>detachReservoir(model,selected.id,uid('C')));
 if(e.target.id==='delete')change(()=>{if(selected.type==='pool'){model.pools=model.pools.filter(p=>p.id!==selected.id);model.processes=model.processes.filter(p=>p.from!==selected.id&&p.to!==selected.id);}else model.processes=model.processes.filter(p=>p.id!==selected.id);selected={type:null,id:null};});
 if(e.target.id==='duplicate')change(()=>{const p=clone(selectedObject());p.id=uid(selected.type==='pool'?'M':'F');p.name+=' copy';if(selected.type==='pool'){p.variableName=nextVariable(variableName(selectedObject()));model.pools.push(p);model.layout[p.id]={x:position(selected.id).x+30,y:position(selected.id).y+60};}else model.processes.push(p);selected.id=p.id;});
};
function placeNewPool(id){
 const box=boxDimensions(model.pools.find(p=>p.id===id));
 const obstacles=[...Object.values(compartmentBoxes()).map(g=>({left:g.left,right:g.left+g.width,top:g.top,bottom:g.top+g.height})),...model.pools.filter(p=>p.id!==id).map(p=>{const q=position(p.id),b=boxDimensions(p);return {left:q.x-b.width/2,right:q.x+b.width/2,top:q.y-b.height/2,bottom:q.y+b.height/2};})];
 const candidates=[150,350,550,750].flatMap(y=>[130,380,630].map(x=>({x,y})));
 model.layout[id]=candidates.find(q=>!obstacles.some(o=>q.x+box.width/2+20>o.left&&q.x-box.width/2-20<o.right&&q.y+box.height/2+20>o.top&&q.y-box.height/2-20<o.bottom))||{x:380,y:750};
 fitDiagramToModel();
}
$('add-pool').onclick=()=>change(()=>{const id=uid('M');model.compartments.push({id,name:'New reservoir',volume:10});model.pools.push({id,name:'New reservoir',variableName:nextVariable(),initial:10,compartment:id,excludeFromTransport:false});placeNewPool(id);selected={type:'pool',id};});
function finishCompartment(ids){
 if(new Set(ids).size<2){$('status').textContent='Draw around at least two reservoirs, or select two reservoirs and press Enter.';return;}
 change(()=>{const compartment=groupReservoirs(model,ids,uid('C'));selected={type:'compartment',id:compartment.id};});
}
$('add-compartment').onclick=()=>{
 grouping=!grouping;connecting=false;connectionStart=null;groupStart=null;groupEnd=null;groupSelection.clear();
 $('connect').setAttribute('aria-pressed','false');$('add-compartment').setAttribute('aria-pressed',String(grouping));
 $('status').textContent=grouping?'Drag a rectangle around two or more reservoirs. Or select reservoirs with Space/click and press Enter. Escape cancels.':'';
 renderDiagram();
};
$('equations').onclick=e=>{const el=e.target.closest('[data-term]');if(el)choose('process',el.dataset.term);};
function boundaryPoint(side,p){
 const h=canvasHeight();
 return {x:side==='left'?14:side==='right'?746:Math.max(35,Math.min(725,p?.x??380)),y:side==='top'?14:side==='bottom'?h-14:Math.max(35,Math.min(h-35,p?.y??h/2))};
}
function endpoint(el,p){
 const target=el?.closest('[data-pool],[data-boundary],[data-compartment]');
 if(!target)return null;
 if(target.hasAttribute('data-compartment'))return {pool:includedReservoirs(model,target.dataset.compartment)[0]?.id||model.pools.find(p=>p.compartment===target.dataset.compartment)?.id,compartment:target.dataset.compartment};
 return target.hasAttribute('data-pool')?{pool:target.dataset.pool}:{pool:null,side:target.dataset.boundary,point:boundaryPoint(target.dataset.boundary,p)};
}
function sameEndpoint(a,b){return a.pool===b.pool&&(a.pool!==null||a.side===b.side);}
function connectEndpoint(end){
 if(!connectionStart){connectionStart=end;renderDiagram();return;}
 if(sameEndpoint(connectionStart,end))return;
 let process;
 try{process=fluxBetween(uid('F'),connectionStart.pool,end.pool);if(connectionStart.compartment||end.compartment){process.law='exchange';process.name='Mixing';process.value=1;const problem=transportProblem(model,process,{checkPairs:false});if(problem)throw Error(problem);}}catch(error){$('status').textContent=error.message;return;}
 const boundary=connectionStart.pool===null?connectionStart:end.pool===null?end:null;
 change(()=>{model.processes.push(process);if(boundary){model.layout??={};model.layout[process.id]=boundary.point;}selected={type:'process',id:process.id};});
}
$('connect').onclick=()=>{grouping=false;groupStart=null;groupEnd=null;groupSelection.clear();$('add-compartment').setAttribute('aria-pressed','false');connecting=!connecting;connectionStart=null;$('connect').setAttribute('aria-pressed',String(connecting));$('status').textContent=connecting?'Select the donor, then the recipient, or drag between them. Highlighted edges represent external sources and sinks. Escape cancels.':'';renderDiagram();};
let blankDiagramClick=false;
$('diagram').onclick=e=>{if(connecting||grouping)return;if(blankDiagramClick&&e.target===$('diagram')){blankDiagramClick=false;choose(null,null);return;}const compartment=e.target.closest('[data-compartment]');if(compartment){choose('compartment',compartment.dataset.compartment);return;}const handle=e.target.closest('[data-external]');if(handle){choose('process',handle.dataset.external);return;}const p=e.target.closest('[data-process]');if(p)choose('process',p.dataset.process);};
function moveFluxPort(id,end,point){
 const current=renderedFluxPorts[id]?.[end];if(!current)return;
 const port=normalizedBoxPort(current.center,current.dimensions,point);if(!port)return;
 model.diagramPorts??={};model.diagramPorts[id]??={};model.diagramPorts[id][end]=port;renderDiagram();
}
let lastPortPointer=null;
$('diagram').ondblclick=e=>{
 const handle=e.target.closest('[data-flux-port]'),recent=lastPortPointer&&performance.now()-lastPortPointer.when<900&&Math.hypot(e.clientX-lastPortPointer.x,e.clientY-lastPortPointer.y)<20?lastPortPointer:null;
 const id=handle?.dataset.fluxPort??recent?.id,end=handle?.dataset.portEnd??recent?.end;if(!model.diagramPorts?.[id]?.[end])return;
 remember();delete model.diagramPorts[id][end];if(!Object.keys(model.diagramPorts[id]).length)delete model.diagramPorts[id];if(!Object.keys(model.diagramPorts).length)delete model.diagramPorts;renderDiagram();saveCurrentModel();$('undo').disabled=false;$('redo').disabled=true;
};
function resizeBounds(kind,id){
 if(kind==='compartment')return compartmentBoxes()[id];
 const box=boxDimensions(model.pools.find(p=>p.id===id)),q=position(id);
 return {...box,left:q.x-box.width/2,top:q.y-box.height/2};
}
function resizeDiagramBox(kind,id,width,height,bounds){
 model.diagramSizes??={};const key=kind==='pool'?'pools':'compartments';model.diagramSizes[key]??={};
 model.diagramSizes[key][id]={width:Math.max(1,Math.min(752-bounds.left,width)),height:Math.max(1,Math.min(canvasHeight()-8-bounds.top,height))};
 if(kind==='pool'){
   const box=boxDimensions(model.pools.find(p=>p.id===id));model.layout[id]={x:bounds.left+box.width/2,y:bounds.top+box.height/2};
 }
 renderDiagram();
}
let drag;
const point=e=>{const p=$('diagram').createSVGPoint();p.x=e.clientX;p.y=e.clientY;return p.matrixTransform($('diagram').getScreenCTM().inverse());};
$('diagram').onpointerdown=e=>{
 blankDiagramClick=!connecting&&!grouping&&!e.target.closest('[data-pool],[data-compartment],[data-process],[data-external],[data-flux-port],[data-resize-kind]');
 if(grouping){e.preventDefault();groupStart=point(e);groupEnd=groupStart;groupStart.pool=e.target.closest('[data-pool]')?.dataset.pool;$('diagram').setPointerCapture(e.pointerId);return;}
 if(connecting){const end=endpoint(e.target,point(e));if(end){e.preventDefault();connectEndpoint(end);if(connecting)$('diagram').setPointerCapture(e.pointerId);}return;}
 const resize=e.target.closest('[data-resize-kind]');
 if(resize){e.preventDefault();const kind=resize.dataset.resizeKind,id=resize.dataset.resizeId;choose(kind==='pool'?'pool':'compartment',id);drag={id,resize:kind,start:point(e),bounds:resizeBounds(kind,id),moved:false};$('diagram').setPointerCapture(e.pointerId);return;}
 const port=e.target.closest('[data-flux-port]');
 if(port){e.preventDefault();const id=port.dataset.fluxPort;lastPortPointer={id,end:port.dataset.portEnd,when:performance.now(),x:e.clientX,y:e.clientY};drag={id,port:port.dataset.portEnd,start:point(e),moved:false};$('diagram').setPointerCapture(e.pointerId);return;}
 const handle=e.target.closest('[data-external]');
 if(handle){e.preventDefault();const id=handle.dataset.external,origin={...externalPosition(model.processes.find(p=>p.id===id))};choose('process',id);drag={id,external:true,start:point(e),origin,moved:false};$('diagram').setPointerCapture(e.pointerId);return;}
 const compartment=e.target.closest('[data-compartment]');
 if(compartment){const id=compartment.dataset.compartment;choose('compartment',id);drag={id,compartment:true,start:point(e),origins:model.pools.filter(p=>p.compartment===id).map(p=>({id:p.id,...position(p.id)})),bounds:compartmentBoxes()[id],moved:false};$('diagram').setPointerCapture(e.pointerId);return;}
 const g=e.target.closest('[data-pool]');if(!g)return;choose('pool',g.dataset.pool);drag={id:g.dataset.pool,start:point(e),origin:{...position(g.dataset.pool)},moved:false};$('diagram').setPointerCapture(e.pointerId);
};
$('diagram').onpointermove=e=>{
 if(grouping&&groupStart){groupEnd=point(e);renderDiagram();return;}
 if(connecting&&connectionStart){const p=point(e),start=connectionStart.pool?position(connectionStart.pool):connectionStart.point;$('flux-preview')?.setAttribute('d',`M${start.x},${start.y} L${p.x},${p.y}`);return;}
 if(!drag)return;const p=point(e),dx=p.x-drag.start.x,dy=p.y-drag.start.y;if(!drag.moved&&Math.hypot(dx,dy)<3)return;if(!drag.moved){remember();drag.moved=true;}if(drag.port){moveFluxPort(drag.id,drag.port,p);return;}if(drag.resize){resizeDiagramBox(drag.resize,drag.id,drag.bounds.width+dx,drag.bounds.height+dy,drag.bounds);return;}if(drag.compartment){const b=drag.bounds,x=Math.max(-b.left+8,Math.min(752-b.left-b.width,dx)),y=Math.max(-b.top+8,Math.min(canvasHeight()-8-b.top-b.height,dy));for(const pool of drag.origins)model.layout[pool.id]={x:pool.x+x,y:pool.y+y};renderDiagram();return;}model.layout[drag.id]=drag.external?clampExternalPosition(drag.origin.x+dx,drag.origin.y+dy):clampPoolPosition(drag.id,drag.origin.x+dx,drag.origin.y+dy);renderDiagram();
};
function endDrag(){if(drag?.moved){saveCurrentModel();$('undo').disabled=false;$('redo').disabled=!future.length;}drag=null;}
$('diagram').onpointerup=e=>{
 if(grouping&&groupStart){
   const end=point(e),start=groupStart;groupStart=null;groupEnd=null;
   if(Math.hypot(end.x-start.x,end.y-start.y)<5&&start.pool){if(groupSelection.has(start.pool))groupSelection.delete(start.pool);else groupSelection.add(start.pool);renderDiagram();return;}
   const ids=model.pools.filter(p=>{const q=position(p.id);return q.x>=Math.min(start.x,end.x)&&q.x<=Math.max(start.x,end.x)&&q.y>=Math.min(start.y,end.y)&&q.y<=Math.max(start.y,end.y);}).map(p=>p.id);
   finishCompartment(ids);renderDiagram();return;
 }
 if(connecting&&connectionStart){const end=endpoint(document.elementFromPoint(e.clientX,e.clientY),point(e));if(end&&!sameEndpoint(connectionStart,end))connectEndpoint(end);}endDrag();};$('diagram').onpointercancel=()=>{groupStart=null;groupEnd=null;endDrag();renderDiagram();};
$('diagram').onkeydown=e=>{
 const port=e.target.closest('[data-flux-port]');
 if(port&&!connecting&&!grouping&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();const id=port.dataset.fluxPort,end=port.dataset.portEnd;choose('process',id);remember();const q=renderedFluxPorts[id][end].contact;
   moveFluxPort(id,end,{x:q.x+(e.key==='ArrowRight'?8:e.key==='ArrowLeft'?-8:0),y:q.y+(e.key==='ArrowDown'?8:e.key==='ArrowUp'?-8:0)});
   $('diagram').querySelector(`[data-flux-port="${CSS.escape(id)}"][data-port-end="${end}"]`).focus();saveCurrentModel();$('undo').disabled=false;$('redo').disabled=true;return;
 }
 const p=e.target.closest('[data-pool]'),f=e.target.closest('[data-process]'),handle=e.target.closest('[data-external]'),comp=e.target.closest('[data-compartment]'),resize=e.target.closest('[data-resize-kind]');
 if(!connecting&&!grouping&&resize&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();const kind=resize.dataset.resizeKind,id=resize.dataset.resizeId;choose(kind==='pool'?'pool':'compartment',id);remember();const b=resizeBounds(kind,id);resizeDiagramBox(kind,id,b.width+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),b.height+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0),b);$('diagram').querySelector(`[data-resize-kind="${kind}"][data-resize-id="${CSS.escape(id)}"]`).focus();saveCurrentModel();$('undo').disabled=false;$('redo').disabled=true;return;}
 if(grouping&&['Enter',' '].includes(e.key)){e.preventDefault();if(e.key==='Enter'&&groupSelection.size>=2){finishCompartment([...groupSelection]);return;}if(p){if(groupSelection.has(p.dataset.pool))groupSelection.delete(p.dataset.pool);else groupSelection.add(p.dataset.pool);renderDiagram();$('diagram').querySelector(`[data-pool="${CSS.escape(p.dataset.pool)}"]`).focus();}return;}
 if(e.key==='Escape'){grouping=false;groupStart=null;groupEnd=null;groupSelection.clear();$('add-compartment').setAttribute('aria-pressed','false');connecting=false;connectionStart=null;$('connect').setAttribute('aria-pressed','false');$('status').textContent='';renderDiagram();$('connect').focus();}
 if(['Enter',' '].includes(e.key)){
   e.preventDefault();
   if(connecting){const end=endpoint(e.target);if(end){connectEndpoint(end);if(connecting){const selector=end.compartment?`[data-compartment="${CSS.escape(end.compartment)}"]`:end.pool?`[data-pool="${CSS.escape(end.pool)}"]`:`[data-boundary="${end.side}"]`;$('diagram').querySelector(selector)?.focus();}}}
   else if(port){const id=port.dataset.fluxPort,end=port.dataset.portEnd;choose('process',id);$('diagram').querySelector(`[data-flux-port="${CSS.escape(id)}"][data-port-end="${end}"]`).focus();}else if(comp)choose('compartment',comp.dataset.compartment);else if(p)choose('pool',p.dataset.pool);else if(f)choose('process',f.dataset.process);else if(handle){choose('process',handle.dataset.external);$('diagram').querySelector(`[data-external="${CSS.escape(handle.dataset.external)}"]`)?.focus();}
 }
 if(!connecting&&!grouping&&comp&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();remember();const id=comp.dataset.compartment,b=compartmentBoxes()[id],dx=e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0,dy=e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0;
   const x=Math.max(-b.left+8,Math.min(752-b.left-b.width,dx)),y=Math.max(-b.top+8,Math.min(canvasHeight()-8-b.top-b.height,dy));
   for(const pool of model.pools.filter(p=>p.compartment===id)){const q=position(pool.id);model.layout[pool.id]={x:q.x+x,y:q.y+y};}
   renderDiagram();$('diagram').querySelector(`[data-compartment="${CSS.escape(id)}"]`).focus();saveCurrentModel();$('undo').disabled=false;$('redo').disabled=true;
 }
 if(!connecting&&handle&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){
   e.preventDefault();remember();const id=handle.dataset.external,pos=externalPosition(model.processes.find(p=>p.id===id));
   model.layout[id]=clampExternalPosition(pos.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),pos.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0));
   renderDiagram();$('diagram').querySelector(`[data-external="${CSS.escape(id)}"]`).focus();
   $('undo').disabled=false;$('redo').disabled=true;saveCurrentModel();
 }
 if(!connecting&&p&&['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(e.key)){e.preventDefault();remember();const pos=position(p.dataset.pool);model.layout[p.dataset.pool]=clampPoolPosition(p.dataset.pool,pos.x+(e.key==='ArrowRight'?10:e.key==='ArrowLeft'?-10:0),pos.y+(e.key==='ArrowDown'?10:e.key==='ArrowUp'?-10:0));renderDiagram();$('diagram').querySelector(`[data-pool="${CSS.escape(p.dataset.pool)}"]`).focus();saveCurrentModel();}
};
$('duration').onchange=e=>change(()=>model.simulation.duration=toCanonical(model,'time',+e.target.value));
for(const id of ['show-coefficients','show-volume']){
 const controls=[$(id),$('mini-'+id)];
 for(const control of controls)control.onchange=()=>{for(const other of controls)other.checked=control.checked;renderDiagram();};
}
for(const id of ['log-x','log-y','flux-log-x','flux-log-y'])$(id).onchange=renderResults;
for(const id of ['plot','flux-plot']){
 const plot=$(id);let scrubbing=false;
 const scrubGraph=(e,starting=false)=>{
   if(!result)return false;
   const matrix=plot.getScreenCTM();if(!matrix)return false;
   const point=plot.createSVGPoint();point.x=e.clientX;point.y=e.clientY;
   const local=point.matrixTransform(matrix.inverse());
   if(starting&&(local.x<95||local.x>970||local.y<30||local.y>225))return false;
   const index=nearestVisibleSample(result.rows,r=>shown('time',r.t),responseTimeScales[id],Math.max(95,Math.min(970,local.x)));
   if(index<0)return false;
   stop();$('time').value=index;renderResults();renderDiagram();return true;
 };
 plot.onpointerdown=e=>{if(e.button!==0)return;const curve=e.target.closest('[data-curve-target]');if(curve)choose(id==='flux-plot'?'process':'pool',curve.dataset.curveTarget);if(scrubGraph(e,true)){e.preventDefault();scrubbing=true;plot.setPointerCapture(e.pointerId);}};
 plot.onpointermove=e=>{if(scrubbing)scrubGraph(e);};
 plot.onpointerup=e=>{if(scrubbing)scrubGraph(e);scrubbing=false;};
 plot.onpointercancel=()=>{scrubbing=false;};
 plot.onkeydown=e=>{const curve=e.target.closest('[data-curve-target]');if(!curve||!['Enter',' '].includes(e.key))return;e.preventDefault();const key=curve.dataset.curveTarget;choose(id==='flux-plot'?'process':'pool',key);plot.querySelector(`[data-curve-target="${CSS.escape(key)}"]`)?.focus({preventScroll:true});};
}
$('run').onclick=run;$('quantity').onchange=renderResults;$('time').oninput=()=>{renderResults();renderDiagram();};
$('play').onclick=()=>{if(timer){stop();return;}if(!result)return;if(+$('time').value>=result.rows.length-1)$('time').value=0;$('play').textContent='Ⅱ Pause';timer=setInterval(()=>{const i=+$('time').value+1;if(i>=result.rows.length){stop();return;}$('time').value=i;renderResults();renderDiagram();},50);};
$('baseline').onclick=()=>{if(result){baseline=clone(result);renderResults();}};$('clear-baseline').onclick=()=>{baseline=null;renderResults();};
function download(name,data,type){const url=URL.createObjectURL(new Blob([data],{type})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
$('summary').onclick=()=>{try{
 validate(model);const shownModel=displayModel(model);
 const text=[model.title,model.question,`Units: ${unitLabel('inventory')}, ${unitLabel('volume')}, ${unitLabel('time')}. Fixed volumes; one tracer currency.`,'',...shownModel.pools.map(p=>`${p.name} [${variableName(p)}]: initial ${fmt(p.initial)} ${unitLabel('inventory')}; volume ${fmt(shownModel.compartments.find(c=>c.id===p.compartment).volume)} ${unitLabel('volume')}`),'',...shownModel.processes.map(p=>`${p.name} [${p.id}]: ${p.from?poolVariable(shownModel,p.from):'boundary'} → ${p.to?poolVariable(shownModel,p.to):'boundary'}; F = ${budgetExpression(shownModel,p,fmt)} ${unitLabel('constant')}; coefficient in ${unitLabel(p.law)}; forcing ${JSON.stringify(p.forcing||{type:'constant'})}`),'',...shownModel.pools.map(p=>`d(${variableName(p)})/dt = `+(shownModel.processes.flatMap(q=>processParts(shownModel,q)).filter(q=>q.from===p.id||q.to===p.id).map(q=>(q.to===p.id?'+':'−')+' ('+budgetExpression(shownModel,q,fmt,true)+')').join(' ')||'0')),'',`Duration: ${shownModel.simulation.duration} ${unitLabel('time')}`,`Solver settings (inventory: ${unitLabel('inventory')}; time: ${unitLabel('time')}): ${JSON.stringify(model.simulation)}`].join('\n');
 download('model-summary.txt',text,'text/plain');
}catch(e){$('status').textContent=e.message;}};
function saveModel(){try{validate(model);download('box-model.json',JSON.stringify(model,null,2),'application/json');}catch(e){$('status').textContent=e.message;}};
document.addEventListener('click',e=>{
 const button=e.target.closest('[data-model-action]');
 if(button){
   button.closest('details').open=false;
   if(button.dataset.modelAction==='open')$('load').click();
   if(button.dataset.modelAction==='save')saveModel();
   if(button.dataset.modelAction==='remove')removeCustomModel();
 }
 for(const menu of document.querySelectorAll('.model-menu[open]'))if(!menu.contains(e.target))menu.open=false;
});
for(const menu of document.querySelectorAll('.model-menu')){
 menu.addEventListener('toggle',()=>{if(menu.open)for(const other of document.querySelectorAll('.model-menu'))if(other!==menu)other.open=false;});
 menu.addEventListener('keydown',e=>{if(e.key==='Escape'){menu.open=false;menu.querySelector('summary').focus();}});
}
$('load').onchange=async e=>{try{const file=e.target.files[0];if(!file)return;if(file.size>1e6)throw Error('Model file exceeds 1 MB.');const m=normalizeTransportFlags(validate(JSON.parse(await file.text()),{allowTransportIssues:true}));if(!m.layout||typeof m.layout!=='object')m.layout={};for(const pos of Object.values(m.layout))if(!Number.isFinite(pos.x)||!Number.isFinite(pos.y))throw Error('Invalid diagram coordinates.');change(()=>{m.workspaceId=crypto.randomUUID();model=m;fitDiagramToModel();resetCurveVisibility();selected={type:null,id:null};});}catch(err){$('status').textContent=err.message;}e.target.value='';};
$('csv').onclick=()=>{
 if(!result)return;
 const m=result.model,quote=x=>'"'+String(x).replaceAll('"','""')+'"';
 const head=[`time_${unitLabel('time')}`,...m.pools.map(p=>`${variableName(p)}_${unitLabel('inventory')}`),...m.pools.map(p=>`${variableName(p)}_${unitLabel('concentration')}`),...m.processes.map(p=>`${p.id}_${unitLabel('constant')}`),`net_external_integral_${unitLabel('inventory')}`,`budget_residual_${unitLabel('inventory')}`];
 const rows=result.rows.map(r=>[shown('time',r.t),...r.inventory.map(x=>shown('inventory',x)),...r.inventory.map((x,i)=>shown('concentration',x/m.compartments.find(c=>c.id===m.pools[i].compartment).volume)),...r.fluxes.map(x=>shown('constant',x)),shown('inventory',r.external),shown('inventory',r.residual)].join(','));
 download('trajectory.csv',[head.map(quote).join(','),...rows].join('\n'),'text/csv');
};
try{const saved=JSON.parse(localStorage.getItem('anbm-custom-models')||'[]');if(Array.isArray(saved))for(const item of saved){try{if(typeof item.workspaceId==='string'&&!customModels.some(m=>m.workspaceId===item.workspaceId))customModels.push(normalizeTransportFlags(validate(item,{allowTransportIssues:true})));}catch{}}}catch{}
try{const saved=localStorage.getItem('anbm-model');if(saved){model=normalizeTransportFlags(validate(JSON.parse(saved),{allowTransportIssues:true}));selected={type:null,id:null};}}catch{}
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
floatingDiagram=createMiniDiagram($('diagram'),document.querySelector('.diagram-panel'),()=>highlightedCurves,choose);
saveCurrentModel();render();fitDiagramToModel();run();

setupSidebarResize();
