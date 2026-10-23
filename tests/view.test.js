import test from 'node:test';
import assert from 'node:assert/strict';
import {axisScale,trajectoryPath,boxEdge} from '../src/view.js';
test('log axes map equal ratios to equal spacing and reject nonpositive values',()=>{
 const s=axisScale([0,-1,1,10,100],true,0,200);
 assert.equal(s.map(1),0);assert.equal(s.map(10),100);assert.equal(s.map(100),200);assert.equal(s.map(0),null);assert.equal(s.map(-1),null);
 assert.equal(axisScale([0,-10],true,0,100),null);
 assert.ok(Number.isFinite(axisScale([10,10],true,0,100).map(10)));
});
test('log paths break across nonpositive values, preserving signed data',()=>{
 const rows=[{t:0,v:1},{t:1,v:2},{t:2,v:-1},{t:3,v:3}];
 const path=trajectoryPath(rows,r=>r.t,r=>r.v,axisScale([0,1,2,3],true,0,100),axisScale([1,2,-1,3],true,100,0));
 assert.equal((path.match(/M/g)||[]).length,2);assert.equal(rows[2].v,-1);assert.ok(!/NaN|Infinity/.test(path));
});
test('arrow tips lie outside node rectangles in horizontal, vertical and diagonal directions',()=>{
 for(const [x,y] of [[100,0],[-100,0],[0,100],[0,-100],[100,100],[-100,50],[20,-100]]){
 const p=boxEdge({x:0,y:0},{x,y});assert.ok(Math.abs(p.x)>=85-1e-10||Math.abs(p.y)>=47-1e-10);
 }
});

test('linear ticks round near-equilibrium ranges and retain the full data domain',()=>{
 assert.deepEqual(axisScale([10,19.996],false,225,30).ticks,[0,5,10,15,20]);
 assert.deepEqual(axisScale([0,0.019996],false,225,30).ticks,[0,0.005,0.01,0.015,0.02]);
 const signed=axisScale([-2.9,7.7],false,0,100);
 assert.ok(signed.ticks[0]<=-2.9&&signed.ticks.at(-1)>=7.7);
 assert.ok(signed.map(-2.9)>=0&&signed.map(7.7)<=100);
 assert.equal(signed.ticks.some(x=>Object.is(x,-0)),false);
});

test('graph scrubbing selects the nearest visible sample on linear and log axes',async()=>{
 const {nearestVisibleSample}=await import('../src/view.js');
 const rows=[0,1,10,100].map(t=>({t}));
 const linear=axisScale(rows.map(r=>r.t),false,95,970);
 assert.equal(nearestVisibleSample(rows,r=>r.t,linear,linear.map(9)),2);
 assert.equal(nearestVisibleSample(rows,r=>r.t,linear,-100),0);
 assert.equal(nearestVisibleSample(rows,r=>r.t,linear,2000),3);
 const log=axisScale(rows.map(r=>r.t),true,95,970);
 assert.equal(nearestVisibleSample(rows,r=>r.t,log,log.map(10)),2);
 assert.equal(nearestVisibleSample(rows,r=>r.t,log,-100),1);
 assert.equal(nearestVisibleSample(rows,r=>r.t,null,100),-1);
});

test('arrow contacts touch rounded source borders and leave exactly one marker length at the target',async()=>{
 const {arrowBoxContact}=await import('../src/view.js');
 for(const dimensions of [{width:152,height:76,radius:9},{width:270,height:160,radius:14}])for(const toward of [{x:500,y:0},{x:0,y:500},{x:200,y:100},{x:-200,y:-100}]){
   const source=arrowBoxContact({x:0,y:0},toward,0,dimensions),target=arrowBoxContact({x:0,y:0},toward,6,dimensions);
   assert.ok(Math.abs(Math.hypot(target.x-source.x,target.y-source.y)-6)<1e-10);
   const x=Math.abs(source.x),y=Math.abs(source.y),w=dimensions.width/2,h=dimensions.height/2,r=dimensions.radius;
   if(x>w-r&&y>h-r)assert.ok(Math.abs(Math.hypot(x-(w-r),y-(h-r))-r)<1e-8);
   else assert.ok(Math.abs(x-w)<1e-8||Math.abs(y-h)<1e-8);
 }
});

test('manual flux ports follow box movement and resizing while staying on rounded borders',async()=>{
 const {normalizedBoxPort,boxPortContact,boxBorderNormal}=await import('../src/view.js');
 const center={x:100,y:100},size={width:200,height:100,radius:14};
 const port=normalizedBoxPort(center,size,{x:150,y:500});
 assert.deepEqual(port,{x:0.0625,y:1});
 const contact=boxPortContact(center,size,port);assert.equal(contact.y,150);
 const moved=boxPortContact({x:200,y:300},{...size,width:400,height:200},port);
 assert.equal(moved.y,400);assert.equal(moved.x,212.5);
 assert.deepEqual(boxBorderNormal(center,size,contact),{x:0,y:1});
 const corner=boxPortContact(center,size,{x:1,y:1}),normal=boxBorderNormal(center,size,corner);
 assert.ok(Math.abs(Math.hypot(normal.x,normal.y)-1)<1e-10);
 assert.equal(normalizedBoxPort(center,size,center),null);
});

test('compartment labels avoid arrows or reservoir rectangles and prefer clear positions',async()=>{
 const {placeDiagramLabel}=await import('../src/view.js');
 const candidates=[{x:10,y:30},{x:120,y:30},{x:10,y:70}];
 const obstacles=[{left:40,right:50,top:0,bottom:50}];
 assert.deepEqual(placeDiagramLabel(candidates,80,20,obstacles),candidates[1]);
 assert.deepEqual(placeDiagramLabel([{x:10,y:30},{x:25,y:30}],80,20,[{left:0,right:50,top:0,bottom:50}]),{x:25,y:30});
});

test('shared-endpoint fluxes get distinct lanes, with the third on the centerline',async()=>{
 const {parallelFluxRoutes}=await import('../src/view.js');
 const processes=[{id:'a',from:'left',to:'right'},{id:'b',from:'right',to:'left'},{id:'c',from:'left',to:'right'},{id:'d',from:'left',to:'right'},{id:'e',from:'right',to:'left'}];
 const two=parallelFluxRoutes(processes.slice(0,2)),three=parallelFluxRoutes(processes.slice(0,3)),all=parallelFluxRoutes(processes);
 assert.equal(two.a.offset,three.a.offset);assert.equal(two.b.offset,three.b.offset);
 assert.equal(three.c.offset,0);assert.equal(three.a.offset,-55);assert.equal(three.b.offset,-55);
 const physical=processes.map(p=>all[p.id].offset*(p.from==='left'?1:-1));
 assert.equal(new Set(physical).size,5);
 const sameDirection=parallelFluxRoutes(processes.slice(0,3).map(p=>({...p,from:'left',to:'right'})));
 assert.deepEqual(Object.values(sameDirection).map(p=>p.offset),[-55,55,0]);
});

test('playback label envelopes reserve the widest formatted value, not just the largest number',async()=>{
 const {maxTextWidth,diagramBounds}=await import('../src/view.js');
 const values=[100,9.999,0.000001];
 const format=value=>value<0.001?value.toExponential(2):String(value);
 const measure=text=>text.length;
 assert.equal(maxTextWidth(values,format,measure),7);
 assert.equal(maxTextWidth([...values].reverse(),format,measure),7);
 assert.deepEqual(diagramBounds([{left:10,right:30,top:20,bottom:40},{left:-5,right:50,top:0,bottom:15}]),{x:-5,y:0,width:55,height:40});
});
