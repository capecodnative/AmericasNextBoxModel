import test from 'node:test';
import assert from 'node:assert/strict';
import {unitSystem,toDisplay,toCanonical,displayModel,validateUnitSelection} from '../src/units.js';
import {clone,validate} from '../src/model.js';
import {presets} from '../src/presets.js';
import {simulate} from '../src/solver.js';
const close=(a,b)=>assert.ok(Math.abs(a-b)<=1e-7*Math.max(1,Math.abs(b)),`${a} differs from ${b}`);
test('molar/volume/time selection converts all related dimensions and input round-trips',()=>{
 const m=clone(presets[1]);m.displayUnits={amount:'mmol',volume:'L',time:'day'};
 close(toDisplay(m,'inventory',10),10000);close(toDisplay(m,'volume',10),10000);close(toDisplay(m,'time',1),365.25);
 close(toDisplay(m,'constant',4),4000/365.25);close(toDisplay(m,'firstOrder',0.2),0.2/365.25);
 close(toDisplay(m,'exchange',2),2000/365.25);close(toDisplay(m,'concentration',1),1);
 for(const kind of Object.keys(unitSystem(m).factors))close(toCanonical(m,kind,toDisplay(m,kind,7.123)),7.123);
});
test('mass units require molar mass and convert g/kg consistently',()=>{
 const m=clone(presets[1]);m.displayUnits={amount:'g',volume:'m³',time:'yr'};
 assert.throws(()=>validate(m),/molar mass/);
 m.displayUnits.molarMass=30.97;validate(m);close(toDisplay(m,'inventory',10),309.7);
 m.displayUnits.amount='kg';close(toDisplay(m,'inventory',10),0.3097);
 m.displayUnits.amount='mg';close(toDisplay(m,'inventory',10),309700);
 for(const molarMass of [0,-1,Infinity,NaN])assert.throws(()=>validateUnitSelection({...m.displayUnits,molarMass}));
});
test('changing display units preserves canonical simulation and saved model inputs',()=>{
 const m=clone(presets[3]),original=simulate(m);
 m.displayUnits={amount:'kg',volume:'L',time:'day',molarMass:30.97};
 assert.deepEqual(simulate(m).rows,original.rows);
 const saved=JSON.parse(JSON.stringify(m));validate(saved);assert.deepEqual(saved.displayUnits,m.displayUnits);
 assert.equal(m.pools[0].initial,40);assert.equal(m.compartments[0].volume,10);assert.equal(m.processes[0].value,2);
});
test('converted one-box budgets and forcing produce the same physical trajectories',()=>{
 for(const preset of [presets[1],presets[2],presets[3]]){
 const m=clone(preset);m.displayUnits={amount:'g',volume:'L',time:'day',molarMass:30.97};
 const original=simulate(m),converted=displayModel(m);delete converted.displayUnits;
 converted.simulation.atol=m.simulation.atol*unitSystem(m).factors.inventory;
 const scaled=simulate(converted);
 for(let i=0;i<original.rows.length;i++){
 close(scaled.rows[i].t,toDisplay(m,'time',original.rows[i].t));
 original.rows[i].inventory.forEach((x,j)=>close(scaled.rows[i].inventory[j],toDisplay(m,'inventory',x)));
 }
 }
});

test('inventory prefixes convert molar and mass values through peta and preserve legacy files',()=>{
 const m=clone(presets[1]);
 for(const [prefix,symbol,factor] of [['milli','m',1e-3],['none','',1],['kilo','k',1e3],['mega','M',1e6],['giga','G',1e9],['tera','T',1e12],['peta','P',1e15]]){
  m.displayUnits={amount:'mol',prefix,volume:'m³',time:'yr'};
  assert.equal(unitSystem(m).labels.inventory,symbol+'mol');close(toDisplay(m,'inventory',factor),1);close(toCanonical(m,'inventory',1),factor);
  m.displayUnits.amount='g';m.displayUnits.molarMass=30.97;
  assert.equal(unitSystem(m).labels.inventory,symbol+'g');close(toDisplay(m,'inventory',factor/30.97),1);
 }
 m.displayUnits={amount:'kg',volume:'L',time:'day',molarMass:30.97};
 assert.equal(unitSystem(m).selected.amount,'g');assert.equal(unitSystem(m).selected.prefix,'kilo');
 assert.equal(unitSystem(m).labels.inventory,'kg');
});
