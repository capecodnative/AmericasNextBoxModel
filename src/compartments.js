// Legacy particle pools default to remaining outside the water-transport fraction.
export function excludedFromTransport(pool){
 return pool?.excludeFromTransport??/particle|particulate|organic phosphorus/i.test(`${pool?.id||''} ${pool?.name||''}`);
}
export function normalizeTransportFlags(model){
 for(const pool of model.pools)if(pool.excludeFromTransport===undefined)pool.excludeFromTransport=excludedFromTransport(pool);
 return model;
}
export const volumeLaw=p=>['exchange','advection'].includes(p.law);
export function includedReservoirs(model,compartment){return model.pools.filter(p=>p.compartment===compartment&&!excludedFromTransport(p));}
export function transportLinks(model,process){
 const a=model.pools.find(p=>p.id===process.from),b=model.pools.find(p=>p.id===process.to);
 if(!a||!b)return [];
 const from=includedReservoirs(model,a.compartment),to=includedReservoirs(model,b.compartment);
 if(from.length===1&&to.length===1)return [{from:from[0].id,to:to[0].id}];
 return from.map(p=>({from:p.id,to:process.transportPairs?.find(q=>q.from===p.id)?.to??null}));
}
export function processParts(model,process){
 return volumeLaw(process)?transportLinks(model,process).filter(q=>q.to).map(q=>({...process,...q})): [process];
}
export function transportProblem(model,process,{checkPairs=true}={}){
 if(!volumeLaw(process))return '';
 const from=model.pools.find(p=>p.id===process.from),to=model.pools.find(p=>p.id===process.to);
 if(!from||!to)return 'Mixing and advection require two reservoir or compartment endpoints.';
 if(from.compartment===to.compartment)return 'Mixing and advection require different physical compartments. Use a material-transfer law within a compartment.';
 const a=includedReservoirs(model,from.compartment),b=includedReservoirs(model,to.compartment);
 if(!a.length||!b.length)return 'Both compartments need at least one reservoir included in Mixing+Advection.';
 if(!checkPairs)return '';
 if(a.length!==b.length)return 'Both compartments need matching transported forms. Include/exclude reservoirs so the counts match, then pair them in Flux properties.';
 const links=transportLinks(model,process);
 if(links.some(q=>!b.some(p=>p.id===q.to))||new Set(links.map(q=>q.to)).size!==b.length)return 'Pair every included reservoir with a different receiving reservoir in Flux properties.';
 return '';
}
export function groupReservoirs(model,ids,id){
 const members=model.pools.filter(p=>new Set(ids).has(p.id));
 if(members.length<2)throw Error('Draw around at least two reservoirs to create a compartment.');
 const first=model.compartments.find(c=>c.id===members[0].compartment);
 const same=members.every(p=>p.compartment===first.id)&&model.pools.filter(p=>p.compartment===first.id).length===members.length;
 const compartment=same?first:{id,name:`Compartment ${model.compartments.filter(c=>c.grouped||model.pools.filter(p=>p.compartment===c.id).length>1).length+1}`,volume:first.volume};
 compartment.grouped=true;
 if(!same)model.compartments.push(compartment);
 for(const member of members)member.compartment=compartment.id;
 model.compartments=model.compartments.filter(c=>model.pools.some(p=>p.compartment===c.id));
 return compartment;
}

export function detachReservoir(model,poolId,id){
 const pool=model.pools.find(p=>p.id===poolId),old=model.compartments.find(c=>c.id===pool.compartment);
 model.compartments.push({id,name:pool.name,volume:old.volume});pool.compartment=id;
 if(model.pools.filter(p=>p.compartment===old.id).length<2)old.grouped=false;
 model.compartments=model.compartments.filter(c=>model.pools.some(p=>p.compartment===c.id));
}
