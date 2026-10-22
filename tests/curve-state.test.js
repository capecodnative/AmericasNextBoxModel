import test from 'node:test';
import assert from 'node:assert/strict';
import {curvePresentation} from '../src/curve-state.js';
test('diagram selection temporarily reveals and emphasizes a curve without changing legend choices',()=>{
 const hidden=new Set(['A']),highlighted=new Set(['B']);
 const selected=curvePresentation(hidden,highlighted,'A');
 assert.deepEqual([...selected.hidden],[]);assert.deepEqual([...selected.highlighted],['A']);
 assert.deepEqual([...hidden],['A']);assert.deepEqual([...highlighted],['B']);
 const switched=curvePresentation(hidden,highlighted,'C');
 assert.deepEqual([...switched.hidden],['A']);assert.deepEqual([...switched.highlighted],['C']);
 const cleared=curvePresentation(hidden,highlighted,null);
 assert.deepEqual([...cleared.hidden],['A']);assert.deepEqual([...cleared.highlighted],['B']);
});
