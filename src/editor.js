// A null pool represents the external boundary. Coordinates remain in diagram layout.
export function fluxBetween(id,from,to){
 if(from===to)throw Error(from===null?'Connect a boundary to a reservoir.':'Choose a different receiving reservoir.');
 return {id,name:from===null?'External input':to===null?'External loss':'Transfer',from,to,law:from===null?'constant':'firstOrder',value:from===null?1:0.1,forcing:{type:'constant'}};
}
