import test from 'node:test';
import assert from 'node:assert/strict';
import {simulate} from '../src/solver.js';
import {analytical,clone,derivative,validate,flux} from '../src/model.js';
import {presets} from '../src/presets.js';
const close=(a,b,t=1e-5)=>assert.ok(Math.abs(a-b)<t,`${a} differs from ${b}`);
test('one-box agrees with analytical reference across inputs, losses and initial inventories',()=>{
 for(const I of [0,0.1,4,100])for(const k of [0,0.001,0.2,5])for(const initial of [0,10,200]){const m=clone(presets[1]);m.processes[0].value=I;m.processes[1].value=k;m.pools[0].initial=initial;for(const r of simulate(m).rows)close(r.inventory[0],analytical(m,r.t),1e-4);}
});
test('closed unequal-volume exchange conserves inventory and equilibrates concentration',()=>{
 const m=clone(presets[3]);m.simulation.duration=200;const r=simulate(m);for(const row of r.rows)close(row.inventory.reduce((a,b)=>a+b),50,1e-10);const last=r.rows.at(-1);close(last.inventory[0]/10,last.inventory[1]/40,1e-8);
});
test('all preset budgets close; scientific inputs round-trip',()=>{for(const m of presets){const r=simulate(JSON.parse(JSON.stringify(m)));assert.deepEqual(r.model,m);for(const row of r.rows)close(row.residual,0,1e-9);}});
test('step and finite rate pulse hit exact scheduled boundaries',()=>{
 for(const type of ['step','pulse']){const m=clone(presets[0]);m.pools[0].initial=0;m.processes[0].value=1;m.processes[0].forcing={type,start:10.013,end:15.027,factor:3};const r=simulate(m);close(r.rows.at(-1).inventory[0],40+2*(type==='step'?40-10.013:15.027-10.013),1e-8);}
});
test('seasonal forcing integrates to correct amount over complete periods',()=>{const m=clone(presets[0]);m.processes[0].forcing={type:'seasonal',amplitude:1,period:4};close(simulate(m).rows.at(-1).inventory[0],170,1e-6);});
test('balanced advection carries donor concentration; unbalanced flow rejected',()=>{
 const m=clone(presets[3]);m.processes[0].law='advection';assert.throws(()=>validate(m),/balanced/);m.processes.push({...m.processes[0],id:'return',from:'deep',to:'surface'});validate(m);close(flux(m,m.processes[0],0,[40,10]),8);close(derivative(m,0,[40,10])[0],-7.5);const r=simulate(m);close(r.rows.at(-1).inventory.reduce((a,b)=>a+b),50,1e-9);
});
test('nutrient recycling and reversible scavenging conserve elemental currency without boundary flows',()=>{
 for(const i of [4,5]){const m=clone(presets[i]);m.processes=m.processes.filter(p=>p.from&&p.to);const r=simulate(m);for(const row of r.rows)close(row.inventory.reduce((a,b)=>a+b),m.pools.reduce((s,p)=>s+p.initial,0),1e-9);}
});
test('negative exhaustion reports failure instead of clipping',()=>{const m=clone(presets[0]);m.processes[0].from='M';m.processes[0].to=null;assert.throws(()=>simulate(m),/negative|underflow/);});
test('tolerance tightening improves convergence',()=>{const m=clone(presets[1]);m.simulation.samples=10;m.simulation.rtol=0.001;m.simulation.atol=1e-5;const loose=simulate(m).rows.at(-1);m.simulation.rtol=1e-10;m.simulation.atol=1e-12;const tight=simulate(m).rows.at(-1);assert.ok(Math.abs(tight.inventory[0]-analytical(m,40))<Math.abs(loose.inventory[0]-analytical(m,40)));});
test('invalid models and forcing are rejected',()=>{for(const mutate of [m=>m.schemaVersion=2,m=>m.compartments[0].volume=0,m=>m.processes[0].to='missing',m=>m.simulation.duration=NaN,m=>m.processes[0].forcing={type:'seasonal',amplitude:2,period:1}]){const m=clone(presets[1]);mutate(m);assert.throws(()=>validate(m));}});
