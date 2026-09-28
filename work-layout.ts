import {stepPhotos} from './photos';
export const PAGE_W=1080, PAGE_H=540;
export type ElementKind='image'|'arrow'|'rectangle'|'circle'|'highlight'|'text'|'marker'|'table';
export type WorkElement={id:string;type:ElementKind;x:number;y:number;w:number;h:number;color?:string;image?:string;html?:string;number?:number;note?:string;flipX?:boolean;flipY?:boolean;parentId?:string};
export const id=()=>crypto.randomUUID();
export const escapeHTML=(s:string)=>String(s||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]!));
export const plainHTML=(s:string)=>'<p>'+escapeHTML(s).replace(/\n/g,'<br>')+'</p>';
// Only formatting is stored: no scripts, event handlers, remote embeds or arbitrary CSS.
export function cleanHTML(html:string):string {
 const doc=new DOMParser().parseFromString(html||'','text/html');
 const allowed=new Set(['P','DIV','BR','B','STRONG','I','EM','U','S','STRIKE','SUB','SUP','SPAN','FONT','UL','OL','LI','H1','H2','H3','BLOCKQUOTE','TABLE','THEAD','TBODY','TR','TD','TH','A']);
 const styles=['color','background-color','font-size','font-weight','font-style','text-decoration','text-align','line-height'];
 function walk(parent:Element){for(const el of Array.from(parent.children)){
  if(['SCRIPT','STYLE','IFRAME','OBJECT','SVG','MATH','IMG','VIDEO','AUDIO'].includes(el.tagName)){el.remove();continue;}
  walk(el);
  if(!allowed.has(el.tagName)){el.replaceWith(...Array.from(el.childNodes));continue;}
  const style=(el as HTMLElement).style;
  const kept=styles.map(k=>[k,style.getPropertyValue(k)]).filter(([,v])=>v&&!/url|expression|var\(/i.test(v));
  const href=el.getAttribute('href'),color=el.getAttribute('color'),size=el.getAttribute('size');
  for(const a of Array.from(el.attributes))el.removeAttribute(a.name);
  for(const [k,v] of kept)style.setProperty(k,v);
  if(el.tagName==='FONT'){if(color&&/^#[0-9a-f]{3,8}$|^[a-z]+$/i.test(color))el.setAttribute('color',color);if(size&&/^[1-7]$/.test(size))el.setAttribute('size',size);}
  if(el.tagName==='A'&&href&&/^https?:\/\//i.test(href)){el.setAttribute('href',href);el.setAttribute('rel','noopener noreferrer');}
 }}walk(doc.body);return doc.body.innerHTML;
}
export function tableHTML(rows=3,cols=3){return '<table><tbody>'+Array.from({length:rows},(_,r)=>'<tr>'+Array.from({length:cols},(_,c)=>`<${r?'td':'th'}>${r?'':`Column ${c+1}`}<br></${r?'td':'th'}>`).join('')+'</tr>').join('')+'</tbody></table><p><br></p>';}
export function oldTableHTML(table:string[][]){return '<table><tbody>'+table.map((row,r)=>'<tr>'+row.map(cell=>`<${r?'td':'th'}>${escapeHTML(cell)}</${r?'td':'th'}>`).join('')+'</tr>').join('')+'</tbody></table>';}
export function newStep(type='photo'){return {id:id(),type,title:'',notes:'',photos:[],tables:[],elements:[],bodyHtml:'<p><br></p>',layoutVersion:2,orientation:'landscape'};}
export function newDocument(operation='Laser'){return {id:id(),customerPart:'',customerRev:'',knoedlerPart:'',knoedlerRev:'',description:'',operation,version:0,steps:[newStep()]};}
export function loadImage(src:string):Promise<HTMLImageElement>{return new Promise((resolve,reject)=>{const img=new Image();img.onload=()=>resolve(img);img.onerror=()=>reject(new Error('A photo could not load. Check your connection and try again.'));img.src=src;});}
// Add layout without discarding the original legacy fields or changing the stored document on read.
export async function upgradeDocument(source:any){const d=structuredClone(source);for(const s of d.steps){
 if(s.layoutVersion===2){if(s.orientation!=='landscape'){s.canvasHeight=Math.max(PAGE_H,...(s.elements||[]).map((e:WorkElement)=>Math.max(e.y,e.y+e.h)+20));s.orientation='landscape';}s.elements=(s.elements||[]).map((e:WorkElement)=>({...e,...(e.html?{html:cleanHTML(e.html)}:{})}));s.bodyHtml=cleanHTML(s.bodyHtml||'');s.notesHtml=cleanHTML(s.notesHtml||'');continue;}
 s.elements=[];s.bodyHtml=plainHTML(s.notes||'')+(s.tables||[]).map(oldTableHTML).join('');s.layoutVersion=2;
 if(s.type==='text')continue;
 const photos=stepPhotos(s),cols=photos.length>1?2:1;let rowY=20,rowHeight=0;
 for(let i=0;i<photos.length;i++){
  const ph=photos[i];let ratio=0.75;try{const im=await loadImage(ph.image);ratio=im.naturalHeight/im.naturalWidth;}catch{/* Keep the reference and show an export error if the source remains unavailable. */}
  const w0=cols===1?680:330,h0=Math.min(photos.length>2?300:540,w0*ratio),w=h0/ratio,x=20+(i%cols)*350,y=rowY;
  const imageId=ph.id||id();s.elements.push({id:imageId,type:'image',x,y,w,h:h0,image:ph.image});
  for(const a of ph.annotations||[]){const x1=x+a.x*w/100,y1=y+a.y*h0/100,x2=x+a.x2*w/100,y2=y+a.y2*h0/100;
   s.elements.push({id:id(),parentId:imageId,type:a.type,x:a.type==='arrow'?x1:Math.min(x1,x2),y:a.type==='arrow'?y1:Math.min(y1,y2),w:a.type==='text'?220:a.type==='arrow'?x2-x1:Math.abs(x2-x1),h:a.type==='text'?60:a.type==='arrow'?y2-y1:Math.abs(y2-y1),color:a.color,html:a.type==='text'?plainHTML(a.text):undefined});
  }
  rowHeight=Math.max(rowHeight,h0);if(i%cols===cols-1||i===photos.length-1){rowY+=rowHeight+20;rowHeight=0;}
 }
 // Legacy notes and tables flow below the canvas so no saved content is lost or clipped.
 s.notesHtml=plainHTML(s.notes||'')+(s.tables||[]).map(oldTableHTML).join('');
 s.canvasHeight=Math.max(PAGE_H,rowY+10);s.orientation='landscape';
 }return d;}
export function elementBounds(e:WorkElement){return {left:Math.min(e.x,e.x+e.w),top:Math.min(e.y,e.y+e.h),width:Math.abs(e.w),height:Math.abs(e.h)};}
