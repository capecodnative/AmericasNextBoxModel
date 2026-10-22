// Diagram selection is a temporary overlay; saved legend choices remain untouched.
export function curvePresentation(hidden,highlighted,selectedId){
 const visibleHidden=new Set(hidden),visibleHighlighted=new Set(highlighted);
 if(selectedId!==null){visibleHidden.delete(selectedId);visibleHighlighted.clear();visibleHighlighted.add(selectedId);}
 return {hidden:visibleHidden,highlighted:visibleHighlighted};
}
