'use client';
import {useEffect,useRef,useState} from 'react';
import {WorkElement,ElementKind,PAGE_W,PAGE_H,id,elementBounds,plainHTML,tableHTML} from '@/lib/work-layout';
import {ElementContent} from './page-view';
import RichText from './rich-text';
import PhotoEditor from './photo-editor';
export default function CanvasEditor({step,onChange,onGestureStart,selected,setSelected,uploadPhoto,preview=false}:{step:any;onChange:(s:any)=>void;onGestureStart:()=>void;selected:string|null;setSelected:(id:string|null)=>void;uploadPhoto:(file:File)=>Promise<string>;preview?:boolean}){
 const [tool,setTool]=useState('select'),[color,setColor]=useState('#e66032'),[scale,setScale]=useState(1),[zoom,setZoom]=useState(1),[panel,setPanel]=useState(true),[editingPhoto,setEditingPhoto]=useState<WorkElement|null>(null);
 const wrap=useRef<HTMLDivElement>(null),surface=useRef<HTMLDivElement>(null),drag=useRef<any>(null),live=useRef(step);live.current=step;
 const elements:WorkElement[]=step.elements||[],chosen=elements.find(e=>e.id===selected),height=step.canvasHeight||PAGE_H;
 useEffect(()=>{const ob=new ResizeObserver(entries=>setScale(Math.min(1,entries[0].contentRect.width/PAGE_W)));if(wrap.current)ob.observe(wrap.current);return()=>ob.disconnect();},[]);
 function updateElement(p:Partial<WorkElement>){if(!chosen)return;onGestureStart();onChange({...step,elements:elements.map(e=>e.id===selected?{...e,...p}:e)});}
 function point(ev:React.PointerEvent){const r=surface.current!.getBoundingClientRect();return {x:Math.max(0,Math.min(PAGE_W,(ev.clientX-r.left)/(scale*zoom))),y:Math.max(0,Math.min(height,(ev.clientY-r.top)/(scale*zoom)))};}
 function down(ev:React.PointerEvent,element?:WorkElement,resize=false){if(preview||ev.button!==0)return;ev.stopPropagation();const p=point(ev);if(tool==='select'&&!element){setSelected(null);return;}ev.preventDefault();(ev.currentTarget as HTMLElement).setPointerCapture(ev.pointerId);onGestureStart();
  if(tool==='select'&&element){setSelected(element.id);drag.current={mode:resize?'resize':'move',p,element:structuredClone(element),all:structuredClone(elements)};return;}
  const newId=id();let e:WorkElement={id:newId,type:tool as ElementKind,x:p.x,y:p.y,w:1,h:1,color};
  if(tool==='text'){e={...e,x:Math.min(p.x,PAGE_W-280),y:Math.min(p.y,height-100),w:280,h:100,html:plainHTML('Tap Edit text to write.')};}
  if(tool==='marker'){e={...e,w:40,h:40,x:Math.min(p.x,PAGE_W-40),y:Math.min(p.y,height-40),number:Math.max(0,...elements.filter(x=>x.type==='marker').map(x=>x.number||0))+1,note:''};}
  if(tool==='table'){e={...e,x:Math.min(p.x,PAGE_W-430),y:Math.min(p.y,height-210),w:430,h:210,html:tableHTML()};}
  // Keep annotations attached to their photo when that photo is moved or resized.
  const parent=[...elements].reverse().find(x=>x.type==='image'&&p.x>=x.x&&p.x<=x.x+x.w&&p.y>=x.y&&p.y<=x.y+x.h);if(parent&&tool!=='table')e.parentId=parent.id;
  onChange({...step,elements:[...elements,e]});setSelected(newId);
  if(['text','marker','table'].includes(tool)){setTool('select');setPanel(true);}else drag.current={mode:'draw',p,element:e,all:elements};
 }
 function move(ev:React.PointerEvent){if(!drag.current)return;const g=drag.current,p=point(ev),dx=p.x-g.p.x,dy=p.y-g.p.y;let e={...g.element};
  if(g.mode==='draw'){e.w=p.x-e.x;e.h=p.y-e.y;if(e.type!=='arrow'){e.x=Math.min(g.p.x,p.x);e.y=Math.min(g.p.y,p.y);e.w=Math.abs(e.w);e.h=Math.abs(e.h);}onChange({...live.current,elements:[...g.all,e]});return;}
  if(g.mode==='move'){const b=elementBounds(e);e.x+=Math.max(-b.left,Math.min(PAGE_W-b.left-b.width,dx));e.y+=Math.max(-b.top,Math.min(height-b.top-b.height,dy));}
  else if(e.type==='arrow'){e.w+=dx;e.h+=dy;}else {e.w=Math.max(30,Math.min(PAGE_W-e.x,e.w+dx));e.h=e.type==='image'?e.w*g.element.h/g.element.w:Math.max(30,Math.min(height-e.y,e.h+dy));if(e.y+e.h>height){e.h=height-e.y;if(e.type==='image')e.w=e.h*g.element.w/g.element.h;}}
  const sx=e.w/g.element.w,sy=e.h/g.element.h;
  onChange({...live.current,elements:g.all.map((x:WorkElement)=>x.id===e.id?e:x.parentId===e.id?{...x,x:e.x+(x.x-g.element.x)*sx,y:e.y+(x.y-g.element.y)*sy,w:x.w*sx,h:x.h*sy}:x)});
 }
 function up(){if(drag.current?.mode==='draw'){const e=live.current.elements.find((x:WorkElement)=>x.id===drag.current.element.id);if(e&&Math.abs(e.w)+Math.abs(e.h)<12)onChange({...live.current,elements:live.current.elements.filter((x:WorkElement)=>x.id!==e.id)});setTool('select');}drag.current=null;}
 function remove(){onGestureStart();onChange({...step,elements:elements.filter(e=>e.id!==selected&&e.parentId!==selected)});setSelected(null);}
 function duplicate(){if(!chosen)return;onGestureStart();const nextId=id(),x=Math.max(0,Math.min(PAGE_W-Math.abs(chosen.w),chosen.x+20)),y=Math.max(0,Math.min(height-Math.abs(chosen.h),chosen.y+20));const copy={...chosen,id:nextId,x,y,...(chosen.type==='marker'?{number:Math.max(...elements.filter(e=>e.type==='marker').map(e=>e.number||0))+1}:{})};const children=elements.filter(e=>e.parentId===chosen.id).map(e=>({...e,id:id(),parentId:nextId,x:e.x+x-chosen.x,y:e.y+y-chosen.y}));onChange({...step,elements:[...elements,copy,...children]});setSelected(nextId);}
 async function applyPhoto(file:File,width:number,photoHeight:number){
  if(!editingPhoto)return;
  const url=await uploadPhoto(file),current=live.current,photo=current.elements.find((e:WorkElement)=>e.id===editingPhoto.id);
  if(!photo)throw new Error('The selected photo is no longer on this page.');
  const ratio=width/photoHeight,w=Math.min(photo.w, PAGE_W, (current.canvasHeight||PAGE_H)*ratio),h=w/ratio;
  const x=Math.max(0,Math.min(PAGE_W-w,photo.x+(photo.w-w)/2)),y=Math.max(0,Math.min((current.canvasHeight||PAGE_H)-h,photo.y+(photo.h-h)/2));
  onGestureStart();onChange({...current,elements:current.elements.map((e:WorkElement)=>e.id===photo.id?{...e,image:url,originalImage:e.originalImage||e.image,x,y,w,h}:e)});
 }
 return <><div className="canvas-tools" aria-label="Image editing tools">{!preview&&[['select','Move / resize'],['arrow','Arrow'],['rectangle','Rectangle'],['circle','Circle'],['highlight','Highlight'],['marker','Number'],['text','Text box'],['table','Table']].map(([v,label])=><button key={v} className={tool===v?'active':''} onClick={()=>setTool(v)}>{label}</button>)}{!preview&&<input aria-label="Annotation colour" type="color" value={color} onChange={e=>{setColor(e.target.value);if(chosen&&chosen.type!=='image')updateElement({color:e.target.value});}}/>}<button onClick={()=>setZoom(zoom===1?1.5:1)}>Zoom {zoom===1?'150%':'to fit'}</button>{!preview&&<button onClick={()=>setPanel(!panel)}>{panel?'Hide':'Show'} elements</button>}</div>
 {!preview&&<p className="tool-hint">{tool==='select'?'Tap an object to select it. Drag to move; drag its corner to resize.':'Drag on the page to draw, or tap to place text, a table or a numbered marker.'}</p>}
 <div ref={wrap} className="canvas-scroll"><div style={{width:PAGE_W*scale*zoom,height:height*scale*zoom,position:'relative'}}><div ref={surface} className={'design-canvas '+(tool==='select'?'':'drawing')} style={{width:PAGE_W,height,transform:`scale(${scale*zoom})`,transformOrigin:'top left'}} onPointerDown={e=>down(e)} onPointerMove={move} onPointerUp={up} onPointerCancel={up}>
 {elements.map(e=>{const b=elementBounds(e);return <div key={e.id} className={'canvas-object '+(!preview&&selected===e.id?'selected':'')} data-object-id={e.id} style={{left:b.left,top:b.top,width:Math.max(b.width,1),height:Math.max(b.height,1),pointerEvents:preview?'none':undefined}} onPointerDown={ev=>down(ev,e)}><ElementContent e={e}/>{!preview&&selected===e.id&&tool==='select'&&<button className="resize-handle" aria-label="Resize selected object" style={e.type==='arrow'?{right:'auto',bottom:'auto',left:e.w<0?-12:Math.abs(e.w)-12,top:e.h<0?-12:Math.abs(e.h)-12}:undefined} onPointerDown={ev=>down(ev,e,true)}/>}</div>;})}
 {!elements.length&&<div className="canvas-empty">Add a photo or choose a tool above.<small>Your landscape instruction page</small></div>}
 </div></div></div>
 {!preview&&panel&&<section className="inspector"><div className="inspector-title"><h3>Elements</h3><span>{elements.length} on this page</span></div><div className="element-list">{elements.map((e,i)=><button className={e.id===selected?'active':''} key={e.id} onClick={()=>{setSelected(e.id);setTool('select');}}>{i+1}. {e.type==='marker'?`Number ${e.number}`:e.type}</button>)}</div>
 {chosen&&<>{chosen.type==='image'&&<div className="photo-edit-actions"><button className="primary" onClick={()=>setEditingPhoto(chosen)}>Crop &amp; rotate photo</button></div>}<div className="object-actions"><strong>{chosen.type==='image'?'Photo':chosen.type==='marker'?`Number ${chosen.number}`:'Selected '+chosen.type}</strong><button onClick={duplicate}>Duplicate</button><button onClick={()=>{onGestureStart();onChange({...step,elements:[...elements.filter(e=>e.id!==selected),chosen]});}}>Bring to front</button><button onClick={()=>{onGestureStart();onChange({...step,elements:[chosen,...elements.filter(e=>e.id!==selected)]});}}>Send to back</button><button className="danger" onClick={remove}>Delete</button></div>
 {['text','table'].includes(chosen.type)&&<><p className="tool-hint">Edit text here. Resize its box on the page to fit all content.</p><RichText key={chosen.id} label="Selected object text" compact value={chosen.html||''} onChange={html=>updateElement({html})}/></>}
 {chosen.type==='marker'&&<label>Instruction for number {chosen.number}<textarea value={chosen.note||''} placeholder="Explain what this numbered marker shows…" onChange={e=>updateElement({note:e.target.value})}/></label>}
 </>}
 </section>}
 {editingPhoto&&<PhotoEditor image={editingPhoto.image!} originalImage={editingPhoto.originalImage} hasAnnotations={elements.some(e=>e.parentId===editingPhoto.id)} onApply={applyPhoto} onClose={()=>setEditingPhoto(null)}/>}
 </>;
}
