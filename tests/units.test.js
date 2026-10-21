import test from 'node:test';
import assert from 'node:assert/strict';
import {unitSystem,toDisplay,toCanonical,displayModel} from '../src/units.js';
import {clone,validate} from '../src/model.js';
import {presets} from '../src/presets.js';
import {simulate} from '../src/solver.js';
test('inventory, volume and time selection relabels every dimension without changing numbers',()=>{
 const m=clone(presets[1]);m.displayUnits={amount:'mol',prefix:'milli',volume:'L',time:'day'};
 const u=unitSystem(m);
 assert.equal(u.labels.inventory,'mmol');assert.equal(u.labels.volume,'L');assert.equal(u.labels.time,'day');
 assert.equal(u.labels.constant,'mmol/day');assert.equal(u.labels.firstOrder,'day⁻¹');assert.equal(u.labels.exchange,'L/day');assert.equal(u.labels.concentration,'mmol/L');
 for(const kind of Object.keys(u.factors)){assert.equal(toDisplay(m,kind,7.123),7.123);assert.equal(toCanonical(m,kind,7.123),7.123);}
});
test('mol and g are labels with identical numbers and no conversion constant',()=>{
 const m=clone(presets[1]);m.displayUnits={amount:'mol',volume:'m³',time:'yr'};
 const mol=unitSystem(m),before=simulate(m).rows;
 m.displayUnits.amount='g';validate(m);const grams=unitSystem(m);
 assert.deepEqual(grams.factors,mol.factors);assert.equal(grams.labels.inventory,'g');
 assert.equal(toDisplay(m,'inventory',10),10);assert.deepEqual(simulate(m).rows,before);
 m.displayUnits.amount='kg';assert.equal(toDisplay(m,'inventory',10),10);
 m.displayUnits.amount='mg';assert.equal(toDisplay(m,'inventory',10),10);
 m.displayUnits={amount:'g',volume:'m³',time:'yr',molarMass:30.97};
 assert.equal(toDisplay(m,'inventory',10),10);assert.equal(unitSystem(m).selected.molarMass,undefined);
});
test('changing any unit keeps numerical trajectories and saved model inputs unchanged',()=>{
 const m=clone(presets[3]),original=simulate(m);
 m.displayUnits={amount:'g',prefix:'peta',volume:'km³',time:'s'};
 assert.deepEqual(simulate(m).rows,original.rows);
 const saved=JSON.parse(JSON.stringify(m));validate(saved);assert.deepEqual(saved.displayUnits,m.displayUnits);
 assert.equal(m.pools[0].initial,40);assert.equal(m.compartments[0].volume,10);assert.equal(m.processes[0].value,2);
});
test('budget display copies retain all numbers, forcing schedules and solver settings',()=>{
 for(const preset of [presets[1],presets[2],presets[3]]){
 const m=clone(preset);m.displayUnits={amount:'g',prefix:'giga',volume:'L',time:'day'};
 const copy=displayModel(m);assert.deepEqual(copy,m);assert.notEqual(copy,m);
 copy.pools[0].initial=999;assert.notEqual(m.pools[0].initial,999);
 }
});
test('every inventory prefix labels molar and mass values without rescaling; old labels remain loadable',()=>{
 const m=clone(presets[1]);
 for(const [prefix,symbol] of [['milli','m'],['none',''],['kilo','k'],['mega','M'],['giga','G'],['tera','T'],['peta','P']]){
  for(const amount of ['mol','g']){
   m.displayUnits={amount,prefix,volume:'m³',time:'yr'};
   assert.equal(unitSystem(m).labels.inventory,symbol+amount);
   assert.equal(toDisplay(m,'inventory',12.34),12.34);assert.equal(toCanonical(m,'inventory',12.34),12.34);
  }
 }
 m.displayUnits={amount:'kg',volume:'L',time:'day'};
 assert.equal(unitSystem(m).selected.amount,'g');assert.equal(unitSystem(m).selected.prefix,'kilo');assert.equal(unitSystem(m).labels.inventory,'kg');
});
