import test from 'node:test';
import assert from 'node:assert/strict';
import {clone,validate} from '../src/model.js';
import {simulate} from '../src/solver.js';
import {presets} from '../src/presets.js';
import {variableName,poolVariable,budgetExpression,variableProblem} from '../src/notation.js';
test('variable renaming updates equations without altering connectivity or trajectories',()=>{
 const before=clone(presets[3]),after=clone(before);
 after.pools[0].name='Upper ocean';after.pools[0].variableName='Pₛ';after.pools[1].variableName='P_d';
 assert.equal(budgetExpression(after,after.processes[0]),'2 * ([Pₛ] − [P_d])');
 assert.deepEqual(after.processes,before.processes);
 assert.deepEqual(simulate(after).rows,simulate(before).rows);
 const saved=JSON.parse(JSON.stringify(after));validate(saved);assert.equal(poolVariable(saved,'surface'),'Pₛ');
});
test('legacy files retain their variable labels without changing scientific data',()=>{
 const m=clone(presets[1]);delete m.pools[0].variableName;validate(m);
 assert.equal(variableName(m.pools[0]),'M');assert.equal(budgetExpression(m,m.processes[1]),'0.2 * M');
});
test('blank, duplicate and ambiguous variable labels are rejected',()=>{
 const m=clone(presets[3]);
 for(const value of ['', 'Deep', 'a b','[P]','1P','P'.repeat(25)])assert.ok(variableProblem(m.pools,'surface',value));
 m.pools[0].variableName='Deep';assert.throws(()=>validate(m),/unique variable/);
});

test('examples 04–06 default to capitalized variables while retaining stable IDs',()=>{for(const m of presets.slice(3,6))for(const p of m.pools){assert.equal(variableName(p)[0],variableName(p)[0].toUpperCase());assert.equal(p.id,p.id.toLowerCase());}assert.equal(presets[1].pools[0].variableName,'M');});
