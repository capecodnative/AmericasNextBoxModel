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
