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
