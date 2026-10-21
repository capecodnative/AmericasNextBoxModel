import {simulate} from './solver.js';
self.onmessage=({data})=>{try{self.postMessage({id:data.id,result:simulate(data.model)});}catch(e){self.postMessage({id:data.id,error:e.message});}};
