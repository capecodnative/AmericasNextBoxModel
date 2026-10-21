// Canonical scientific storage: mol, m³, Julian years (365.25 days).
export const unitOptions={
 amount:{mol:1,mmol:1e-3,'µmol':1e-6,kmol:1e3,g:null,mg:null,kg:null},
 volume:{'m³':1,L:1e-3,mL:1e-6,'km³':1e9},
 time:{yr:1,day:1/365.25,h:1/(365.25*24),s:1/(365.25*86400)}
};
export const inventoryPrefixes={milli:{symbol:'m',factor:1e-3},none:{symbol:'',factor:1},kilo:{symbol:'k',factor:1e3},mega:{symbol:'M',factor:1e6},giga:{symbol:'G',factor:1e9},tera:{symbol:'T',factor:1e12},peta:{symbol:'P',factor:1e15}};
const legacyMicro={symbol:'µ',factor:1e-6};
export const defaultUnits={amount:'mol',prefix:'none',volume:'m³',time:'yr'};
export function normalizedUnits(selection={}){
 const result={...defaultUnits,...selection};
 const legacy={mmol:['mol','milli'],'µmol':['mol','micro'],kmol:['mol','kilo'],mg:['g','milli'],kg:['g','kilo']};
 if(Object.hasOwn(legacy,result.amount))[result.amount,result.prefix]=legacy[result.amount];
 return result;
}
export function validateUnitSelection(selection){
 if(selection===undefined)return;
 if(!selection||typeof selection!=='object')throw Error('Invalid display unit selection.');
 const selected=normalizedUnits(selection);
 if(!['mol','g'].includes(selected.amount))throw Error('Unsupported inventory base unit.');
 if(!Object.hasOwn(inventoryPrefixes,selected.prefix)&&selected.prefix!=='micro')throw Error('Unsupported inventory prefix.');
 for(const key of ['volume','time'])if(!Object.hasOwn(unitOptions[key],selected[key]))throw Error(`Unsupported ${key} unit.`);
 if(selected.molarMass!==undefined&&(!(typeof selected.molarMass==='number')||!Number.isFinite(selected.molarMass)||selected.molarMass<=0))throw Error('Molar mass must be positive, in g/mol.');
 if(selected.amount==='g'&&!selected.molarMass)throw Error('Set a positive tracer molar mass (g/mol) to use mass units.');
}
export function unitSystem(model){
 const selected=normalizedUnits(model.displayUnits);
 validateUnitSelection(selected);
 const prefix=selected.prefix==='micro'?legacyMicro:inventoryPrefixes[selected.prefix];
 const a=prefix.factor*(selected.amount==='g'?1/selected.molarMass:1),v=unitOptions.volume[selected.volume],t=unitOptions.time[selected.time];
 const amount=prefix.symbol+selected.amount;
 return {
  selected,
  factors:{inventory:1/a,volume:1/v,time:1/t,constant:t/a,firstOrder:t,exchange:t/v,advection:t/v,concentration:v/a},
  labels:{inventory:amount,volume:selected.volume,time:selected.time,constant:`${amount}/${selected.time}`,firstOrder:`${selected.time}⁻¹`,exchange:`${selected.volume}/${selected.time}`,advection:`${selected.volume}/${selected.time}`,concentration:`${amount}/${selected.volume}`}
 };
}
export function toDisplay(model,kind,value){return value*unitSystem(model).factors[kind];}
export function toCanonical(model,kind,value){return value/unitSystem(model).factors[kind];}
export function displayModel(model){
 const copy=structuredClone(model),u=unitSystem(model),convert=(kind,x)=>x*u.factors[kind];
 for(const c of copy.compartments)c.volume=convert('volume',c.volume);
 for(const p of copy.pools)p.initial=convert('inventory',p.initial);
 for(const p of copy.processes){p.value=convert(p.law,p.value);if(p.forcing)for(const key of ['start','end','period'])if(p.forcing[key]!==undefined)p.forcing[key]=convert('time',p.forcing[key]);}
 copy.simulation.duration=convert('time',copy.simulation.duration);
 return copy;
}
