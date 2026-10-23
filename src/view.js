// View transformations do not alter simulation values.
export function axisScale(values, logarithmic, start, end) {
  const usable=values.filter(x=>Number.isFinite(x)&&(!logarithmic||x>0));
  if(!usable.length)return null;
  let min=usable.reduce((a,b)=>Math.min(a,b),logarithmic?Infinity:0);
  let max=usable.reduce((a,b)=>Math.max(a,b),logarithmic?-Infinity:0);
  if(min===max){if(logarithmic){min/=Math.sqrt(10);max*=Math.sqrt(10);}else max=min+1;}
  let ticks;
  if(!logarithmic){
    // Round the domain outward to readable 1/2/2.5/5/10 intervals.
    const raw=(max-min)/4,power=10**Math.floor(Math.log10(raw)),fraction=raw/power;
    const step=([1,2,2.5,5,10].find(x=>x>=fraction-1e-12)??10)*power;
    min=Math.floor(min/step)*step;max=Math.ceil(max/step)*step;
    const count=Math.round((max-min)/step);
    ticks=Array.from({length:count+1},(_,i)=>Number((min+i*step).toPrecision(12)));
  }
  const transform=logarithmic?Math.log10:x=>x,lo=transform(min),hi=transform(max);
  return {
    map:value=>!Number.isFinite(value)||(logarithmic&&value<=0)?null:start+(transform(value)-lo)/(hi-lo)*(end-start),
    ticks:logarithmic?Array.from({length:5},(_,i)=>10**(lo+(hi-lo)*i/4)):ticks
  };
}
export function trajectoryPath(rows,xValue,yValue,xScale,yScale){
  if(!xScale||!yScale)return '';
  let connected=false;
  return rows.map(row=>{
    const x=xScale.map(xValue(row)),y=yScale.map(yValue(row));
    if(x===null||y===null){connected=false;return '';}
    const command=connected?'L':'M';connected=true;
    return `${command}${x.toFixed(2)},${y.toFixed(2)}`;
  }).join(' ');
}
// Intersect the ray toward the curve control point with an expanded node rectangle.
export function boxEdge(center,toward,gap=9,scale=1,dimensions={width:152,height:76}){
  const dx=toward.x-center.x,dy=toward.y-center.y;
  if(!dx&&!dy)return {x:center.x+dimensions.width/2*scale+gap,y:center.y};
  const t=Math.min(dx?(dimensions.width/2*scale+gap)/Math.abs(dx):Infinity,dy?(dimensions.height/2*scale+gap)/Math.abs(dy):Infinity);
  return {x:center.x+dx*t,y:center.y+dy*t};
}

export function wrapLabel(text,maxWidth,measure){
  const lines=[];let line='';
  for(const word of text.trim().split(/\s+/u)){
    if(line&&measure(line+' '+word)<=maxWidth){line+=' '+word;continue;}
    if(line){lines.push(line);line='';}
    for(const character of word){if(line&&measure(line+character)>maxWidth){lines.push(line);line='';}line+=character;}
  }
  if(line||!lines.length)lines.push(line);
  return lines;
}

// Find the simulated sample nearest a graph position, including logarithmic axes.
export function nearestVisibleSample(rows,xValue,xScale,pixel){
 if(!xScale||!Number.isFinite(pixel))return -1;
 let nearest=-1,distance=Infinity;
 rows.forEach((row,i)=>{const x=xScale.map(xValue(row));if(x===null)return;const delta=Math.abs(x-pixel);if(delta<distance){distance=delta;nearest=i;}});
 return nearest;
}

// Contact with the visible rounded border; markerOffset is measured along the ray.
export function arrowBoxContact(center,toward,markerOffset=0,dimensions={width:152,height:76,radius:9}){
 let dx=toward.x-center.x,dy=toward.y-center.y;
 const length=Math.hypot(dx,dy);if(!length){dx=1;dy=0;}else {dx/=length;dy/=length;}
 const w=dimensions.width/2,h=dimensions.height/2,r=Math.min(dimensions.radius??9,w,h);
 let distance=Math.min(dx?w/Math.abs(dx):Infinity,dy?h/Math.abs(dy):Infinity);
 if(r&&Math.abs(dx*distance)>w-r&&Math.abs(dy*distance)>h-r){
   const cx=Math.sign(dx)*(w-r),cy=Math.sign(dy)*(h-r),projection=dx*cx+dy*cy;
   distance=projection+Math.sqrt(Math.max(0,projection*projection-cx*cx-cy*cy+r*r));
 }
 return {x:center.x+dx*(distance+markerOffset),y:center.y+dy*(distance+markerOffset)};
}

export function normalizedBoxPort(center,dimensions,point){
 const x=(point.x-center.x)/(dimensions.width/2),y=(point.y-center.y)/(dimensions.height/2),extent=Math.max(Math.abs(x),Math.abs(y));
 return extent>1e-10?{x:x/extent,y:y/extent}:null;
}
export function boxPortContact(center,dimensions,port){
 return arrowBoxContact(center,{x:center.x+port.x*dimensions.width/2,y:center.y+port.y*dimensions.height/2},0,dimensions);
}
export function boxBorderNormal(center,dimensions,point){
 const x=point.x-center.x,y=point.y-center.y,w=dimensions.width/2,h=dimensions.height/2,r=Math.min(dimensions.radius??9,w,h);
 if(Math.abs(x)<=w-r+1e-8)return {x:0,y:Math.sign(y)};
 if(Math.abs(y)<=h-r+1e-8)return {x:Math.sign(x),y:0};
 const dx=x-Math.sign(x)*(w-r),dy=y-Math.sign(y)*(h-r),length=Math.hypot(dx,dy)||1;
 return {x:dx/length,y:dy/length};
}

// Prefer the first clear label position; use the least overlap in crowded diagrams.
export function placeDiagramLabel(candidates,width,height,obstacles){
 let best=null,bestOverlap=Infinity;
 for(const point of candidates){
   const left=point.x,right=left+width,top=point.y-height,bottom=point.y;
   const overlap=obstacles.reduce((sum,o)=>sum+Math.max(0,Math.min(right,o.right)-Math.max(left,o.left))*Math.max(0,Math.min(bottom,o.bottom)-Math.max(top,o.top)),0);
   if(overlap<bestOverlap){best=point;bestOverlap=overlap;}if(!overlap)break;
 }
 return best;
}

// Stable physical lanes for shared endpoints, independent of each arrow's direction.
export function parallelFluxRoutes(processes,endpointKey=p=>[p.from,p.to]){
 const groups=new Map(),routes={};
 for(const p of processes){const [from,to]=endpointKey(p);if(!from||!to){routes[p.id]={offset:0,count:1,rank:0};continue;}
   const pair=[from,to].sort(),key=JSON.stringify(pair);if(!groups.has(key))groups.set(key,[]);groups.get(key).push({p,forward:from===pair[0]});
 }
 for(const members of groups.values())members.forEach(({p,forward},rank)=>{
   const lane=members.length===1?0:rank===0?-55:rank===1?55:rank===2?0:(rank%2?-1:1)*Math.ceil(rank/2)*55;
   routes[p.id]={offset:lane*(forward?1:-1),count:members.length,rank};
 });
 return routes;
}

// Measure formatted text, since the largest numeric value need not be the widest label.
export function maxTextWidth(values,format,measure){return values.reduce((width,value)=>Math.max(width,measure(format(value))),0);}
export function diagramBounds(rectangles){
 const left=Math.min(...rectangles.map(r=>r.left)),top=Math.min(...rectangles.map(r=>r.top));
 return {x:left,y:top,width:Math.max(...rectangles.map(r=>r.right))-left,height:Math.max(...rectangles.map(r=>r.bottom))-top};
}
