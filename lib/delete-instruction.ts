// Keep only an ID tombstone after deletion so an old open browser cannot
// recreate this instruction. Drive must confirm Trash before content is removed.
export async function deleteInstruction(database:D1Database,row:any,version:number,getToken:()=>Promise<string>){
 const data=JSON.parse(row.data);
 if(data.deleted)return {ok:true,driveTrashed:!!row.drive_id};
 if(row.version!==version)throw new Error('This instruction changed. Refresh and reopen it before deleting.');
 if(String(row.drive_id||'').startsWith('pending:'))throw new Error('A Drive export is incomplete. Finish saving the PDF to Drive, then delete the instruction.');
 const token=row.drive_id?await getToken():'';
 const claimed=await database.prepare("UPDATE instructions SET data=json_set(data,'$.deleting',1) WHERE id=? AND version=? AND COALESCE(drive_id,'')=? AND COALESCE(json_extract(data,'$.deleted'),0)=0").bind(row.id,version,row.drive_id||'').run();
 if(!claimed.meta.changes)throw new Error('This instruction changed. Refresh before deleting.');
 if(row.drive_id){
  const response=await fetch(`https://www.googleapis.com/drive/v3/files/${encodeURIComponent(row.drive_id)}?supportsAllDrives=true&fields=id,trashed`,{method:'PATCH',headers:{Authorization:`Bearer ${token}`,'Content-Type':'application/json'},body:JSON.stringify({trashed:true})});
  if(!response.ok)throw new Error('Google Drive could not move the linked PDF to Trash. The instruction has not been removed. Check Drive access and retry Delete instruction.');
  const result:any=await response.json();if(result.trashed!==true)throw new Error('Google Drive did not confirm deletion. Retry Delete instruction.');
 }
 await database.batch([
  database.prepare('DELETE FROM revisions WHERE instruction_id=?').bind(row.id),
  database.prepare('UPDATE instructions SET data=?,updated=? WHERE id=?').bind(JSON.stringify({deleted:true}),new Date().toISOString(),row.id)
 ]);
 return {ok:true,driveTrashed:!!row.drive_id};
}
