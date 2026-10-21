import {validateUnitSelection} from './units.js';
import {variableProblem} from './notation.js';
export const clone = x => structuredClone(x);
export const units = {constant:'mol/yr',firstOrder:'1/yr',exchange:'m³/yr',advection:'m³/yr'};
export function validate(m) {
  if (!m || m.schemaVersion !== 1) throw Error('Unsupported model schema (expected version 1).');
  for (const key of ['compartments','pools','processes']) if (!Array.isArray(m[key])) throw Error(`Missing ${key}.`);
  if (!m.pools.length || m.pools.length > 20 || m.processes.length > 80) throw Error('Use 1–20 pools and at most 80 processes.');
  if(typeof m.title!=='string' || typeof m.question!=='string' || !Array.isArray(m.experiments) || m.experiments.some(x=>typeof x!=='string')) throw Error('Missing model title, question, or experiment list.');
  for(const list of [m.compartments,m.pools,m.processes]) if(list.some(x=>!x || typeof x!=='object' || typeof x.name!=='string')) throw Error('Every model record needs a name.');
  if(!m.layout || typeof m.layout!=='object' || Object.values(m.layout).some(p=>!p || !Number.isFinite(p.x) || !Number.isFinite(p.y))) throw Error('Invalid diagram layout.');
  const unique = xs => new Set(xs.map(x=>x.id)).size === xs.length && xs.every(x=>typeof x.id==='string' && x.id.length);
  if (![m.compartments,m.pools,m.processes].every(unique)) throw Error('IDs must be unique within each record type.');
  const finite = (n,min=0) => typeof n==='number' && Number.isFinite(n) && n>=min;
  for(const c of m.compartments) if(!finite(c.volume) || c.volume===0) throw Error(`${c.name}: volume must be positive.`);
  for(const p of m.pools) if(!m.compartments.some(c=>c.id===p.compartment) || !finite(p.initial)) throw Error(`${p.name}: invalid compartment or initial inventory.`);
  for(const p of m.pools) if(p.variableName!==undefined){const problem=variableProblem(m.pools,p.id,p.variableName);if(problem)throw Error(`${p.name}: ${problem}`);}
  validateUnitSelection(m.displayUnits);
  const water = Object.fromEntries(m.compartments.map(c=>[c.id,0]));
  for(const p of m.processes) {
    if(!Object.hasOwn(units,p.law) || !finite(p.value)) throw Error(`${p.name}: invalid law or nonnegative coefficient.`);
    if((!p.from && !p.to) || p.from===p.to || [p.from,p.to].some(id=>id!==null && !m.pools.some(b=>b.id===id))) throw Error(`${p.name}: choose valid, different endpoints.`);
    if(p.law!=='constant' && !p.from || p.law==='exchange' && !p.to || p.law==='advection' && !p.to) throw Error(`${p.name}: this law requires pool endpoints.`);
    const f=p.forcing;
    if(f) {
      if(!['constant','step','pulse','seasonal'].includes(f.type)) throw Error(`${p.name}: unsupported forcing.`);
      if(['step','pulse'].includes(f.type) && (!finite(f.start) || !finite(f.factor))) throw Error(`${p.name}: invalid forcing time/factor.`);
      if(f.type==='pulse' && (!finite(f.end) || f.end<=f.start)) throw Error(`${p.name}: pulse end must follow start.`);
      if(f.type==='seasonal' && (!finite(f.amplitude) || f.amplitude>1 || !finite(f.period) || f.period===0)) throw Error(`${p.name}: use amplitude 0–1 and positive period.`);
    }
    if(p.law==='advection') {
      if(f && f.type!=='constant') throw Error('Time-dependent advection is not supported.');
      const a=m.pools.find(b=>b.id===p.from), b=m.pools.find(b=>b.id===p.to);
      water[a.compartment]-=p.value; water[b.compartment]+=p.value;
    }
  }
  const q=m.processes.filter(p=>p.law==='advection').reduce((s,p)=>s+p.value,0);
  if(Object.values(water).some(x=>Math.abs(x)>1e-10*Math.max(1,q))) throw Error('Fixed volumes require balanced advective water transport in every compartment. Add a return flow.');
  const s=m.simulation;
  if(!s || !finite(s.duration) || !s.duration || !Number.isInteger(s.samples) || s.samples<10 || s.samples>2000 || !finite(s.rtol) || s.rtol<1e-12 || s.rtol>0.01 || !finite(s.atol) || s.atol<1e-14 || s.atol>0.01) throw Error('Invalid duration, sample count (10–2000), or solver tolerances.');
  return m;
}
export function factor(f,t) {
  if(!f || f.type==='constant') return 1;
  if(f.type==='step') return t>=f.start?f.factor:1;
  if(f.type==='pulse') return t>=f.start && t<f.end?f.factor:1;
  return 1+f.amplitude*Math.sin(2*Math.PI*t/f.period);
}
export function flux(m,p,t,y) {
  const index=id=>m.pools.findIndex(b=>b.id===id), conc=id=>y[index(id)]/m.compartments.find(c=>c.id===m.pools[index(id)].compartment).volume;
  const a=p.value*factor(p.forcing,t);
  return p.law==='constant'?a:p.law==='firstOrder'?a*y[index(p.from)]:p.law==='advection'?a*conc(p.from):a*(conc(p.from)-conc(p.to));
}
export function derivative(m,t,y) {
  const d=new Array(m.pools.length+1).fill(0);
  for(const p of m.processes) {
    const f=flux(m,p,t,y);
    if(p.from) d[m.pools.findIndex(b=>b.id===p.from)]-=f; else d[d.length-1]+=f;
    if(p.to) d[m.pools.findIndex(b=>b.id===p.to)]+=f; else d[d.length-1]-=f;
  }
  return d;
}
export function expression(p) {
  const f=p.forcing?.type && p.forcing.type!=='constant'?' * g(t)':'';
  return (p.law==='constant'?`${p.value}`:p.law==='firstOrder'?`${p.value} * M[${p.from}]`:p.law==='advection'?`${p.value} * C[${p.from}]`:`${p.value} * (C[${p.from}] − C[${p.to}])`)+f;
}
export function analytical(m,t) {
  if(m.pools.length!==1 || m.processes.some(p=>p.forcing && p.forcing.type!=='constant' || p.law!=='constant' && p.law!=='firstOrder' || p.law==='firstOrder' && p.to)) return null;
  const I=m.processes.filter(p=>p.law==='constant').reduce((s,p)=>s+(p.to?1:-1)*p.value,0), k=m.processes.filter(p=>p.law==='firstOrder').reduce((s,p)=>s+p.value,0), M=m.pools[0].initial;
  return k===0?M+I*t:M*Math.exp(-k*t)+I*(-Math.expm1(-k*t))/k;
}
