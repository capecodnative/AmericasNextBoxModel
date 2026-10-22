import {validate,derivative,flux,clone} from './model.js?v=20261021-flux-ports';
function rk4(f,t,y,h) {
  const add=(v,k,a)=>v.map((x,i)=>x+a*k[i]);
  const a=f(t,y),b=f(t+h/2,add(y,a,h/2)),c=f(t+h/2,add(y,b,h/2)),d=f(t+h,add(y,c,h));
  return y.map((x,i)=>x+h*(a[i]+2*b[i]+2*c[i]+d[i])/6);
}
export function simulate(model) {
  const m=validate(clone(model)),s=m.simulation,n=m.pools.length;
  const boundaries=[0,s.duration]; let cap=s.duration/10;
  for(const p of m.processes) {
    const f=p.forcing;
    if(f?.type==='step' || f?.type==='pulse') boundaries.push(f.start,...(f.type==='pulse'?[f.end]:[]));
    if(f?.type==='seasonal') cap=Math.min(cap,f.period/20);
  }
  const edges=[...new Set(boundaries.filter(t=>t>=0&&t<=s.duration))].sort((a,b)=>a-b);
  let y=[...m.pools.map(p=>p.initial),0],t=0,h=Math.min(cap,s.duration/s.samples),attempts=0;
  const initial=y.slice(0,n).reduce((a,b)=>a+b,0), rows=[];
  function record(){rows.push({t,inventory:y.slice(0,n),external:y[n],residual:y.slice(0,n).reduce((a,b)=>a+b,0)-initial-y[n],fluxes:m.processes.map(p=>flux(m,p,t,y))});}
  record();
  for(let sample=1;sample<=s.samples;sample++) {
    const target=s.duration*sample/s.samples;
    while(t<target) {
      if(++attempts>200000) throw Error('Integration work limit reached. Reduce the time range or rate contrasts (possible stiffness).');
      const edge=edges.find(e=>e>t)??s.duration, end=Math.min(target,edge);
      h=Math.min(h,cap,end-t);
      if(h<=Math.max(1e-14,Math.abs(t)*1e-14)) throw Error('Step size underflow; rates or tolerances exceed supported range.');
      // Use the left-hand limit only at a scheduled discontinuity endpoint.
      const f=(time,state)=>derivative(m,time>=edge?edge-Math.max(1,Math.abs(edge))*Number.EPSILON*4:time,state);
      const full=rk4(f,t,y,h),half=rk4(f,t+h/2,rk4(f,t,y,h/2),h/2);
      if(half.some(x=>!Number.isFinite(x))) throw Error('Nonfinite solution. Check rates and time range.');
      const error=Math.max(...half.map((x,i)=>Math.abs(x-full[i])/15/(s.atol+s.rtol*Math.max(Math.abs(y[i]),Math.abs(x)))));
      if(error<=1) {
        if(half.slice(0,n).some(x=>x<0)) {
          if(h>Math.max(1e-10,s.duration*1e-12)) {h*=0.5;continue;}
          throw Error('A pool becomes negative. Prescribed outflow may exhaust its donor; inventories are never clipped.');
        }
        y=half; t=h===end-t?end:t+h;
      }
      h*=error===0?2:Math.min(2,Math.max(0.1,0.9*error**(-0.2)));
    }
    record();
  }
  return {model:m,rows,attempts};
}
