// Numbers are stored in the model’s chosen units. Unit selectors relabel; they never rescale values.
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
 delete result.molarMass; // Obsolete conversion metadata; mol/g now only selects an inventory label.
 return result;
}
export function validateUnitSelection(selection){
 if(selection===undefined)return;
 if(!selection||typeof selection!=='object')throw Error('Invalid display unit selection.');
 const selected=normalizedUnits(selection);
 if(!['mol','g'].includes(selected.amount))throw Error('Unsupported inventory base unit.');
 if(!Object.hasOwn(inventoryPrefixes,selected.prefix)&&selected.prefix!=='micro')throw Error('Unsupported inventory prefix.');
 for(const key of ['volume','time'])if(!Object.hasOwn(unitOptions[key],selected[key]))throw Error(`Unsupported ${key} unit.`);
}
export function unitSystem(model){
 const selected=normalizedUnits(model.displayUnits);
 validateUnitSelection(selected);
 const prefix=selected.prefix==='micro'?legacyMicro:inventoryPrefixes[selected.prefix];
 const amount=prefix.symbol+selected.amount;
 return {
  selected,
  factors:{inventory:1,volume:1,time:1,constant:1,firstOrder:1,exchange:1,advection:1,concentration:1},
  labels:{inventory:amount,volume:selected.volume,time:selected.time,constant:`${amount}/${selected.time}`,firstOrder:`${selected.time}⁻¹`,exchange:`${selected.volume}/${selected.time}`,advection:`${selected.volume}/${selected.time}`,concentration:`${amount}/${selected.volume}`}
 };
}
export function toDisplay(model,kind,value){return value*unitSystem(model).factors[kind];}
export function toCanonical(model,kind,value){return value/unitSystem(model).factors[kind];}
export function displayModel(model){
 // Preserve the notation API without changing model numbers or input objects.
 validateUnitSelection(model.displayUnits);
 return structuredClone(model);
}
