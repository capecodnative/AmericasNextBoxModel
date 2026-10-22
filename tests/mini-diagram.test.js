import test from 'node:test';
import assert from 'node:assert/strict';
import {floatingPosition} from '../src/mini-diagram.js';
test('floating diagram stays inside every visible viewport edge',()=>{
 const viewport={left:0,top:0,width:1000,height:700};
 for(const left of [-900,20,950])for(const top of [-900,30,750]){
   const position=floatingPosition({left,top,width:420,height:300},viewport);
   assert.ok(position.left>=8&&position.left+420<=992);
   assert.ok(position.top>=8&&position.top+300<=692);
 }
});
test('floating diagram respects zoomed viewport offsets and content growth',()=>{
 const area={left:100,top:80,width:600,height:400};
 assert.deepEqual(floatingPosition({left:600,top:400,width:350,height:300},area),{left:342,top:172});
 assert.deepEqual(floatingPosition({left:-20,top:-50,width:350,height:300},area),{left:108,top:88});
});
