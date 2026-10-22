import test from 'node:test';
import assert from 'node:assert/strict';
import {fluxBetween} from '../src/editor.js';
import {presets} from '../src/presets.js';
import {clone,derivative,validate} from '../src/model.js';
import {simulate} from '../src/solver.js';

test('drawn boundary inputs, transfers and losses have valid budgets',()=>{
 const m=clone(presets[3]);
 m.processes=[fluxBetween('input',null,'surface'),fluxBetween('transfer','surface','deep'),fluxBetween('loss','deep',null)];
 m.layout.input={x:14,y:100};m.layout.loss={x:746,y:200};
 validate(m);
 assert.deepEqual(derivative(m,0,[40,10]).slice(0,2),[-3,3]);
 for(const row of simulate(m).rows)assert.ok(Math.abs(row.residual)<1e-9);
 assert.deepEqual(JSON.parse(JSON.stringify(m)).layout,m.layout);
});
test('drawing rejects boundary-to-boundary and self transfers',()=>{
 assert.throws(()=>fluxBetween('bad',null,null),/boundary to a reservoir/);
 assert.throws(()=>fluxBetween('bad','surface','surface'),/different receiving reservoir/);
});
test('example 06 deposits dust into the particulate pool',()=>{
 const m=clone(presets[5]);
 m.processes=m.processes.filter(p=>p.id==='dust');
 assert.deepEqual(derivative(m,0,[30,2]).slice(0,2),[0,1]);
});

test('external inputs offer only prescribed fluxes; first-order sources are invalid',async()=>{
 const {availableFluxLaws}=await import('../src/editor.js');
 assert.deepEqual(availableFluxLaws(null,'surface'),['constant']);
 const m=clone(presets[3]);
 m.processes=[fluxBetween('supply',null,'surface')];
 validate(m);
 m.processes[0].law='firstOrder';
 assert.throws(()=>validate(m),/requires pool endpoints/);
 for(const law of availableFluxLaws('surface',null)){
   m.processes=[{...fluxBetween('loss','surface',null),law}];
   validate(m);
 }
 assert.ok(availableFluxLaws('surface',null).includes('firstOrder'));
 assert.ok(!availableFluxLaws('surface',null).includes('exchange'));
});
