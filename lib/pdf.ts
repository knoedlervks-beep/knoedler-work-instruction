import {jsPDF} from 'jspdf';
import {createRoot} from 'react-dom/client';
import {flushSync} from 'react-dom';
import {createElement} from 'react';
import html2canvas from '@/vendor/html2canvas';
import {StepBody,printCSS} from '@/components/work/page-view';
import {upgradeDocument,loadImage,PAGE_W,PAGE_H} from './work-layout';


// html2canvas treats a wrapping inline highlight as one large rectangle. Split
// highlighted runs into word boxes so a later highlight cannot paint over text.
function prepareHighlights(root:HTMLElement){
 const inlineTags=new Set(['SPAN','FONT','B','STRONG','I','EM','U','S','STRIKE','A','SUB','SUP']);
 const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT),runs:Array<{node:Text;color:string}>=[];
 let node:Node|null;
 while((node=walker.nextNode())){
  if(!node.textContent?.trim())continue;
  let el=node.parentElement,color='';
  while(el&&el!==root){const bg=getComputedStyle(el).backgroundColor;
   if(inlineTags.has(el.tagName)&&bg!=='transparent'&&bg!=='rgba(0, 0, 0, 0)'){color=bg;break;}el=el.parentElement;
  }
  if(color)runs.push({node:node as Text,color});
 }
 for(const el of Array.from(root.querySelectorAll<HTMLElement>('span,font,b,strong,i,em,u,s,strike,a,sub,sup')))el.style.backgroundColor='transparent';
 for(const {node,color} of runs){const fragment=document.createDocumentFragment();
  for(const word of (node.textContent||'').match(/\S+\s*|\s+/g)||[]){const span=document.createElement('span');span.style.cssText='display:inline-block;white-space:pre;vertical-align:baseline;';span.style.backgroundColor=color;span.textContent=word;fragment.appendChild(span);}
  node.replaceWith(fragment);
 }
}

export async function makePDF(input:any){
 const d=await upgradeDocument(input),p=new jsPDF({orientation:'landscape',unit:'mm',format:'a4'});
 const logo=await loadImage('/knoedler-logo.png');
 const lc=document.createElement('canvas');lc.width=logo.naturalWidth;lc.height=logo.naturalHeight;lc.getContext('2d')!.drawImage(logo,0,0);const logoData=lc.toDataURL('image/png');
 const host=document.createElement('div');host.style.cssText='position:fixed;left:-10000px;top:0;width:1080px;background:#fff;color:#18283f;z-index:-1;';
 const style=document.createElement('style');style.textContent=printCSS;host.appendChild(style);
 const mount=document.createElement('div');host.appendChild(mount);document.body.appendChild(host);const root=createRoot(mount);
 let count=0;
 function header(step:any,index:number,continuation:boolean){if(count++)p.addPage();p.setTextColor(24,40,63);p.setFont('helvetica','bold');p.setFontSize(14);p.addImage(logoData,'PNG',12,8,28,28*logo.naturalHeight/logo.naturalWidth);p.text('WORK INSTRUCTION',48,16);p.setFont('helvetica','normal');p.setFontSize(9);p.text(p.splitTextToSize(`${d.operation} | ${d.description}`,232).slice(0,2),48,23);p.setDrawColor(180,194,211);p.line(12,32,285,32);p.setFontSize(9);p.text(`Knoedler: ${d.knoedlerPart}   Rev: ${d.knoedlerRev||'-'}`,12,38,{maxWidth:130});p.text(`Customer: ${d.customerPart||'-'}   Rev: ${d.customerRev||'-'}`,155,38,{maxWidth:130});p.setFont('helvetica','bold');p.setFontSize(11);p.text(p.splitTextToSize(`Step ${index+1} - ${step.title|| (step.type==='text'?'Text sheet':'Photo instruction')}${continuation?' (continued)':''}`,271).slice(0,2),12,47);}
 try{
  for(let i=0;i<d.steps.length;i++){
   const s=d.steps[i];flushSync(()=>root.render(createElement(StepBody,{step:s})));
   await document.fonts.ready;
   prepareHighlights(mount);
   await Promise.all(Array.from(mount.querySelectorAll('img')).map(im=>im.complete&&im.naturalWidth?Promise.resolve():new Promise<void>((resolve,reject)=>{im.onload=()=>resolve();im.onerror=()=>reject(new Error('A photo could not load. Retry before exporting.'));})));
   // Overflow is an explicit editing issue; never silently truncate a text box in the PDF.
   for(const box of Array.from(mount.querySelectorAll('.wi-rich')) as HTMLElement[])if(box.style.overflow==='hidden'&&box.scrollHeight>box.clientHeight+2)throw new Error(`Step ${i+1}: enlarge the text or table box so all its content fits before exporting.`);
   const body=mount.firstElementChild as HTMLElement;const total=Math.ceil(body.getBoundingClientRect().height),limit=PAGE_H;
   // Avoid cutting through photos, table rows and text lines when a page break is necessary.
   const rect=body.getBoundingClientRect(),bands:Array<[number,number]>=[];
   for(const el of Array.from(body.querySelectorAll('img,tr'))){const r=el.getBoundingClientRect();bands.push([r.top-rect.top,r.bottom-rect.top]);}
   const walker=document.createTreeWalker(body,NodeFilter.SHOW_TEXT);let node:Node|null;
   while((node=walker.nextNode())){if(!node.textContent?.trim())continue;const range=document.createRange();range.selectNodeContents(node);for(const r of Array.from(range.getClientRects()))bands.push([r.top-rect.top,r.bottom-rect.top]);}
   let start=0;
   while(start<total){let end=Math.min(total,start+limit);if(end<total){for(let pass=0;pass<10;pass++){const crossing=bands.filter(([a,b])=>a<end&&b>end&&a>start+20);if(!crossing.length)break;end=Math.min(...crossing.map(([a])=>Math.floor(a)));}}
    if(end<=start+10)end=Math.min(total,start+limit);
    header(s,i,start>0);
    const canvas=await html2canvas(body,{backgroundColor:'#ffffff',scale:2,width:PAGE_W,height:end-start,y:start,logging:false,useCORS:false,windowWidth:1200,windowHeight:1400});
    p.addImage(canvas.toDataURL('image/png'),'PNG',12,56,273,(end-start)*273/PAGE_W);canvas.width=1;canvas.height=1;start=end;
   }
  }
  for(let n=1;n<=p.getNumberOfPages();n++){p.setPage(n);p.setDrawColor(180,194,211);p.line(12,195,285,195);p.setFont('helvetica','normal');p.setFontSize(8);p.setTextColor(92,108,128);p.text(`Knoedler Manufacturers Canada Ltee | ${d.updated?new Date(d.updated).toLocaleDateString():'Draft'}`,12,202);p.text(`Page ${n} of ${p.getNumberOfPages()}`,285,202,{align:'right'});}
  return p;
 }finally{root.unmount();host.remove();}
}
