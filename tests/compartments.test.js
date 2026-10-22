import test from 'node:test';
import assert from 'node:assert/strict';
import {clone,validate,derivative,flux} from '../src/model.js';
import {simulate} from '../src/solver.js';
import {presets} from '../src/presets.js';
import {groupReservoirs,excludedFromTransport,transportProblem} from '../src/compartments.js';
import {budgetExpression} from '../src/notation.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
function paired(){
 const m=clone(presets[3]);
 m.pools.push({id:'formA',name:'Second form A',initial:8,compartment:'surface'},{id:'formB',name:'Second form B',initial:4,compartment:'deep'});
 m.layout.formA={x:120,y:280};m.layout.formB={x:640,y:280};
 m.processes[0].transportPairs=[{from:'surface',to:'deep'},{from:'formA',to:'formB'}];
 return m;
}
test('drawing a compartment shares one editable volume while retaining inventories',()=>{
 const m=clone(presets[3]),before=m.pools.map(p=>p.initial);
 const c=groupReservoirs(m,['surface','deep'],'shared');
 assert.equal(c.volume,10);assert.equal(m.compartments.length,1);assert.equal(c.grouped,true);
 assert.deepEqual(m.pools.map(p=>p.initial),before);assert.ok(m.pools.every(p=>p.compartment===c.id));
 m.processes=[];c.volume=25;validate(m);
 assert.throws(()=>groupReservoirs(m,['surface'],'bad'),/at least two/);
});
test('all included forms mix through one compartment connection with matching budgets',()=>{
 const m=paired();validate(m);
 const d=derivative(m,0,[40,10,8,4]);
 [-7.5,7.5,-1.4,1.4,0].forEach((x,i)=>close(d[i],x));
 close(flux(m,m.processes[0],0,[40,10,8,4]),8.9);
 assert.match(budgetExpression(m,m.processes[0]),/formA/);
 for(const row of simulate(m).rows)close(row.residual,0);
});
test('excluded reservoirs stay untouched and particles default excluded',()=>{
 const m=paired();m.pools[2].excludeFromTransport=true;m.pools[3].excludeFromTransport=true;
 validate(m);assert.deepEqual(derivative(m,0,[40,10,8,4]).slice(2,4),[0,0]);
 assert.equal(excludedFromTransport(presets[5].pools[1]),true);
 assert.equal(excludedFromTransport({...presets[5].pools[1],excludeFromTransport:false}),false);
 m.processes=[{id:'material',name:'Material transfer',from:'formA',to:'formB',law:'firstOrder',value:0.1}];validate(m);
 close(derivative(m,0,[40,10,8,4])[2],-0.8);
});
test('paired advection carries all forms and still requires a balanced water budget',()=>{
 const m=paired();m.processes[0].law='advection';assert.throws(()=>validate(m),/balanced/);
 m.processes.push({...m.processes[0],id:'return',from:'deep',to:'surface',transportPairs:[{from:'deep',to:'surface'},{from:'formB',to:'formA'}]});
 validate(m);[-7.5,7.5,-1.4,1.4,0].forEach((x,i)=>close(derivative(m,0,[40,10,8,4])[i],x));
 for(const row of simulate(m).rows)close(row.residual,0);
});
test('ambiguous forms require explicit one-to-one pairing; drafts remain recoverable',()=>{
 const m=paired();delete m.processes[0].transportPairs;
 assert.throws(()=>validate(m),/Pair every included/);validate(m,{allowTransportIssues:true});
 m.processes[0].transportPairs=[{from:'surface',to:'deep'},{from:'formA',to:'deep'}];assert.ok(transportProblem(m,m.processes[0]));
});
test('intra-compartment advection is flagged instead of passing a cancelling water budget',()=>{
 const m=clone(presets[4]);m.processes.find(p=>p.id==='uptake').law='advection';
 assert.throws(()=>validate(m),/different physical compartments/);validate(m,{allowTransportIssues:true});
 assert.equal(JSON.parse(JSON.stringify(m)).processes.find(p=>p.id==='uptake').law,'advection');
});

test('leaving a compartment preserves inventory and gives the reservoir its own volume',async()=>{
 const {detachReservoir,normalizeTransportFlags}=await import('../src/compartments.js');
 const m=clone(presets[4]);m.processes=[];detachReservoir(m,'particles','separate');validate(m);
 assert.equal(m.pools.find(p=>p.id==='particles').initial,2);
 assert.equal(m.compartments.find(c=>c.id==='separate').volume,10);
 assert.equal(m.pools.find(p=>p.id==='surface').compartment,'surface');
 const legacy=clone(presets[5]);for(const p of legacy.pools)delete p.excludeFromTransport;
 normalizeTransportFlags(legacy);const particle=legacy.pools[1];particle.name='Renamed form';particle.id='renamed';
 assert.equal(excludedFromTransport(particle),true);
});

test('saved diagram sizes are validated and never alter scientific trajectories',()=>{
 const m=clone(presets[4]),before=simulate(m);
 m.diagramSizes={pools:{surface:{width:230,height:140}},compartments:{surface:{width:700,height:300}}};
 validate(m);assert.deepEqual(simulate(m).rows,before.rows);
 assert.deepEqual(JSON.parse(JSON.stringify(m)).diagramSizes,m.diagramSizes);
 m.diagramSizes.pools.surface.width=-1;assert.throws(()=>validate(m),/Invalid diagram box sizes/);
});

test('manual flux attachment metadata round-trips without changing transport',()=>{
 const m=clone(presets[3]),before=simulate(m).rows;
 m.diagramPorts={mix:{from:{x:0.5,y:1},to:{x:-1,y:-0.5}}};
 validate(m);assert.deepEqual(simulate(m).rows,before);
 assert.deepEqual(JSON.parse(JSON.stringify(m)).diagramPorts,m.diagramPorts);
 m.diagramPorts.mix.from.x=NaN;assert.throws(()=>validate(m),/Invalid diagram flux attachments/);
});
