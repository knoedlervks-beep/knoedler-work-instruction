// Run in the browser console while signed in as administrator on the OLD website.
(async()=>{
 const r=await fetch('/api/work');const data=await r.json();
 if(!r.ok||!data.user?.admin)throw Error('Sign in as the administrator first.');
 const urls=new Set();
 for(const d of data.instructions)for(const s of d.steps||[]){if(s.image)urls.add(s.image);for(const p of s.photos||[])if(p.image)urls.add(p.image);}
 const photos=[];
 for(const value of urls){
  const u=new URL(value,location.origin);
  if(u.origin!==location.origin||u.pathname!=='/api/media')throw Error('Unexpected photo URL: '+value);
  const key=u.searchParams.get('key');if(!key)throw Error('Photo has no key.');
  const resp=await fetch(u);if(!resp.ok)throw Error('Unable to export photo '+key);
  const blob=await resp.blob();const base64=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(blob);});
  photos.push({key,type:blob.type,base64});
 }
 const snapshot={format:'knoedler-current-state-v1',created:new Date().toISOString(),config:data.config,instructions:data.instructions,photos};
 const url=URL.createObjectURL(new Blob([JSON.stringify(snapshot)],{type:'application/json'}));
 const a=document.createElement('a');a.href=url;a.download='knoedler-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),60000);
 console.log('Exported',data.instructions.length,'current instructions and',photos.length,'photos. Revision history is not included.');
})().catch(console.error);
