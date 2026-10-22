import {processParts,volumeLaw} from './compartments.js?v=20261021-compartments-4';
// Scientific identity uses IDs; editable notation is presentation metadata.
export const variableName=pool=>pool.variableName??pool.id;
export function variableProblem(pools,id,value){
  if(typeof value!=='string'||!value.length)return 'Enter a variable name.';
  if(value.length>24||!/^[_\p{L}][\p{L}\p{N}_′″]*$/u.test(value))return 'Use 1–24 letters, digits, underscores or primes; start with a letter or underscore.';
  if(pools.some(p=>p.id!==id&&variableName(p)===value))return 'Each reservoir needs a unique variable name.';
  return '';
}
export const poolVariable=(model,id)=>variableName(model.pools.find(p=>p.id===id)??{id:id??'?'});
export function budgetExpression(model,process,format=String,individual=false){
  if(volumeLaw(process)&&!individual)return processParts(model,process).map(p=>budgetExpression(model,p,format,true)).join(' + ')||'0';
  const from=poolVariable(model,process.from),to=poolVariable(model,process.to);
  const forcing=process.forcing?.type&&process.forcing.type!=='constant'?' * g(t)':'';
  const value=format(process.value);
 const expression=process.law==='constant'?`${value}`:process.law==='firstOrder'?`${value} * ${from}`:process.law==='advection'?`${value} * [${from}]`:`${value} * ([${from}] − [${to}])`;
  return expression+forcing;
}
