'use client';
import {useEffect,useRef,useState} from 'react';
import {loadImage} from '@/lib/work-layout';

type Crop={x:number;y:number;w:number;h:number};
const full:Crop={x:0,y:0,w:1,h:1};
const clamp=(v:number,min:number,max:number)=>Math.max(min,Math.min(max,v));

// Process pixels before upload so the editor, thumbnails and PDF share one image.
export function rotatedPhoto(image:HTMLImageElement,turns:number){
 const swap=turns%2!==0,ratio=Math.min(1,4096/Math.max(image.naturalWidth,image.naturalHeight));
 const w=Math.round(image.naturalWidth*ratio),h=Math.round(image.naturalHeight*ratio);
 const canvas=document.createElement('canvas');canvas.width=swap?h:w;canvas.height=swap?w:h;
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo editing is unavailable in this browser.');
 ctx.translate(canvas.width/2,canvas.height/2);ctx.rotate(turns*Math.PI/2);ctx.drawImage(image,-w/2,-h/2,w,h);return canvas;
}
export async function cropPhoto(source:HTMLCanvasElement,crop:Crop){
 const canvas=document.createElement('canvas');
 const x=Math.round(crop.x*source.width),y=Math.round(crop.y*source.height);
 canvas.width=Math.max(1,Math.min(source.width-x,Math.round(crop.w*source.width)));
 canvas.height=Math.max(1,Math.min(source.height-y,Math.round(crop.h*source.height)));
 const ctx=canvas.getContext('2d');if(!ctx)throw new Error('Photo editing is unavailable in this browser.');
 ctx.drawImage(source,x,y,canvas.width,canvas.height,0,0,canvas.width,canvas.height);
 const blob=await new Promise<Blob>((resolve,reject)=>canvas.toBlob(b=>b?resolve(b):reject(new Error('Could not prepare the edited photo.')),'image/png'));
 if(blob.size>12000000)throw new Error('The edited photo is larger than 12 MB. Choose a smaller source photo.');
 return {file:new File([blob],'edited-photo.png',{type:'image/png'}),width:canvas.width,height:canvas.height};
}

export default function PhotoEditor({image,originalImage,hasAnnotations,onApply,onClose}:{image:string;originalImage?:string;hasAnnotations:boolean;onApply:(file:File,width:number,height:number)=>Promise<void>;onClose:()=>void}){
 const dialog=useRef<HTMLDialogElement>(null),stage=useRef<HTMLDivElement>(null),canvas=useRef<HTMLCanvasElement>(null),drag=useRef<{mode:string;p:{x:number;y:number};crop:Crop}|null>(null);
 const [source,setSource]=useState(image),[loaded,setLoaded]=useState<HTMLImageElement|null>(null),[turns,setTurns]=useState(0),[crop,setCrop]=useState<Crop>(full),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const [size,setSize]=useState({w:1,h:1});
 useEffect(()=>{dialog.current?.showModal();return()=>dialog.current?.close();},[]);
 useEffect(()=>{let active=true;setLoaded(null);setError('');loadImage(source).then(im=>{if(active)setLoaded(im);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[source]);
 useEffect(()=>{if(!loaded||!canvas.current)return;try{const result=rotatedPhoto(loaded,turns);canvas.current.width=result.width;canvas.current.height=result.height;canvas.current.getContext('2d')!.drawImage(result,0,0);setSize({w:result.width,h:result.height});}catch(e:any){setError(e.message);}},[loaded,turns]);
 function rotate(direction:number){setTurns(t=>(t+direction+4)%4);setCrop(full);}
 function point(ev:React.PointerEvent){const r=stage.current!.getBoundingClientRect();return{x:clamp((ev.clientX-r.left)/r.width,0,1),y:clamp((ev.clientY-r.top)/r.height,0,1)};}
 function start(ev:React.PointerEvent,mode:string){if(busy||!loaded)return;ev.preventDefault();ev.stopPropagation();ev.currentTarget.setPointerCapture(ev.pointerId);drag.current={mode,p:point(ev),crop:{...crop}};}
 function move(ev:React.PointerEvent){const g=drag.current;if(!g)return;const p=point(ev),dx=p.x-g.p.x,dy=p.y-g.p.y,c=g.crop;
  if(g.mode==='move'){setCrop({...c,x:clamp(c.x+dx,0,1-c.w),y:clamp(c.y+dy,0,1-c.h)});return;}
  let left=c.x,right=c.x+c.w,top=c.y,bottom=c.y+c.h;
  if(g.mode.includes('w'))left=clamp(c.x+dx,0,right-.05);
  if(g.mode.includes('e'))right=clamp(c.x+c.w+dx,left+.05,1);
  if(g.mode.includes('n'))top=clamp(c.y+dy,0,bottom-.05);
  if(g.mode.includes('s'))bottom=clamp(c.y+c.h+dy,top+.05,1);
  setCrop({x:left,y:top,w:right-left,h:bottom-top});
 }
 async function apply(){if(!canvas.current||!loaded)return;setBusy(true);setError('');try{const result=await cropPhoto(canvas.current,crop);await onApply(result.file,result.width,result.height);onClose();}catch(e:any){setError(e.message||'Unable to save photo. Please retry.');}finally{setBusy(false);}}
 return <dialog ref={dialog} className="photo-edit-modal" aria-labelledby="photo-edit-title" onCancel={e=>{e.preventDefault();if(!busy)onClose();}}>
  <div className="photo-edit-heading"><h2 id="photo-edit-title">Crop &amp; rotate photo</h2><button disabled={busy} onClick={onClose} aria-label="Close photo editor">✕</button></div>
  <p>Drag the corners to crop. Drag inside the box to move it.</p>
  <div className="photo-edit-actions"><button disabled={busy||!loaded} onClick={()=>rotate(-1)}>↶ Rotate left 90°</button><button disabled={busy||!loaded} onClick={()=>rotate(1)}>↷ Rotate right 90°</button><button disabled={busy||!loaded} onClick={()=>setCrop(full)}>Full image</button><button disabled={busy} onClick={()=>{setSource(originalImage||image);setTurns(0);setCrop(full);}}>Restore original</button></div>
  <div className="photo-edit-workspace"><div ref={stage} className="photo-edit-stage" style={{width:`min(100%, ${54*size.w/size.h}dvh)`,aspectRatio:`${size.w}/${size.h}`}}>
   <canvas ref={canvas} aria-label="Photo crop preview" style={{visibility:loaded?'visible':'hidden'}}/>
   {loaded&&<div className="photo-crop-box" style={{left:`${crop.x*100}%`,top:`${crop.y*100}%`,width:`${crop.w*100}%`,height:`${crop.h*100}%`}} onPointerDown={e=>start(e,'move')} onPointerMove={move} onPointerUp={()=>drag.current=null} onPointerCancel={()=>drag.current=null}>
    {['nw','ne','sw','se'].map((corner,i)=><button key={corner} className={'photo-crop-handle '+corner} aria-label={['Crop top left','Crop top right','Crop bottom left','Crop bottom right'][i]} disabled={busy} onPointerDown={e=>start(e,corner)}/>)}
   </div>}
  </div>{!loaded&&!error&&<p>Loading photo…</p>}</div>
  <p className="photo-edit-info">{Math.round(size.w*crop.w)} × {Math.round(size.h*crop.h)} pixels. Changes appear in the preview and PDF after applying.</p>
  {hasAnnotations&&<p className="photo-edit-note">Arrows, text and other annotations stay in their current positions. Check and reposition them after cropping or rotating.</p>}
  {error&&<p role="alert" className="photo-edit-error">{error}</p>}
  <div className="photo-edit-footer"><button disabled={busy} onClick={onClose}>Cancel</button><button className="primary" disabled={busy||!loaded} onClick={apply}>{busy?'Applying…':'Apply photo changes'}</button></div>
 </dialog>;
}
