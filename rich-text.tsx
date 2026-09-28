'use client';
import {useEffect,useRef} from 'react';
import {cleanHTML,tableHTML} from '@/lib/work-layout';
export default function RichText({value,onChange,label='Text',compact=false}:{value:string;onChange:(v:string)=>void;label?:string;compact?:boolean}){
 const root=useRef<HTMLDivElement>(null),selection=useRef<Range|null>(null);
 useEffect(()=>{if(root.current&&document.activeElement!==root.current&&root.current.innerHTML!==value)root.current.innerHTML=cleanHTML(value||'<p><br></p>');},[value]);
 function remember(){const s=window.getSelection();if(s?.rangeCount&&root.current?.contains(s.anchorNode))selection.current=s.getRangeAt(0).cloneRange();}
 function restore(){root.current?.focus();if(selection.current&&root.current?.contains(selection.current.commonAncestorContainer)){const s=window.getSelection();s?.removeAllRanges();s?.addRange(selection.current);}}
 function changed(){if(root.current)onChange(cleanHTML(root.current.innerHTML));remember();}
 function cmd(name:string,v?:string){restore();document.execCommand(name,false,v);changed();}
 function tableAction(action:string){restore();let n=window.getSelection()?.anchorNode;let cell=(n?.nodeType===1?n as Element:n?.parentElement)?.closest('td,th') as HTMLTableCellElement|null;
  if(!cell||!root.current?.contains(cell)){alert('Tap inside a table cell first.');return;}
  const row=cell.parentElement as HTMLTableRowElement,table=cell.closest('table')!;
  if(action==='row'){const r=table.insertRow(row.rowIndex+1);for(let i=0;i<row.cells.length;i++)r.insertCell().innerHTML='<br>';}
  if(action==='column')for(const r of Array.from(table.rows))r.insertCell(cell.cellIndex+1).innerHTML='<br>';
  if(action==='deleteRow'){if(table.rows.length===1)table.remove();else row.remove();}
  if(action==='deleteColumn'){const i=cell.cellIndex;if(row.cells.length===1)table.remove();else for(const r of Array.from(table.rows))r.deleteCell(i);}
  if(action==='deleteTable')table.remove();changed();
 }
 const buttons=[['bold','B','Bold'],['italic','I','Italic'],['underline','U','Underline'],['strikeThrough','S','Strike through'],['insertUnorderedList','• List','Bullet list'],['insertOrderedList','1. List','Numbered list'],['justifyLeft','Left','Align left'],['justifyCenter','Centre','Align centre'],['justifyRight','Right','Align right']];
 return <div className={'rich-editor '+(compact?'compact':'')}><div className="rich-tools" aria-label="Text formatting" onPointerDown={e=>{remember();if((e.target as HTMLElement).closest('button'))e.preventDefault();}}>
 {buttons.map(([c,t,title])=><button type="button" key={c} title={title} aria-label={title} onClick={()=>cmd(c)}>{t}</button>)}
 <select aria-label="Font size" defaultValue="3" onFocus={remember} onChange={e=>cmd('fontSize',e.target.value)}><option value="2">Small</option><option value="3">Normal</option><option value="4">Large</option><option value="5">Heading</option><option value="6">Title</option></select>
 <label title="Text colour">A<input aria-label="Text colour" type="color" defaultValue="#18283f" onFocus={remember} onChange={e=>cmd('foreColor',e.target.value)}/></label>
 <label title="Highlight colour">▰<input aria-label="Text highlight colour" type="color" defaultValue="#fff09c" onFocus={remember} onChange={e=>cmd('hiliteColor',e.target.value)}/></label>
 <button type="button" onClick={()=>cmd('undo')}>Undo</button><button type="button" onClick={()=>cmd('redo')}>Redo</button>
 <button type="button" onClick={()=>cmd('removeFormat')}>Clear style</button>
 <button type="button" onClick={()=>cmd('insertHTML',tableHTML())}>+ Table</button>
 <button type="button" onClick={()=>tableAction('row')}>+ Row</button><button type="button" onClick={()=>tableAction('column')}>+ Column</button><button type="button" onClick={()=>tableAction('deleteRow')}>− Row</button><button type="button" onClick={()=>tableAction('deleteColumn')}>− Column</button><button type="button" onClick={()=>tableAction('deleteTable')}>Delete table</button>
 </div><div ref={root} className="rich-body" contentEditable suppressContentEditableWarning role="textbox" aria-label={label} aria-multiline="true" onKeyUp={remember} onMouseUp={remember} onTouchEnd={remember} onBlur={changed} onInput={changed} onPaste={e=>{e.preventDefault();const html=e.clipboardData.getData('text/html');const text=e.clipboardData.getData('text/plain');if(html)cmd('insertHTML',cleanHTML(html));else cmd('insertText',text);}}/></div>;
}
