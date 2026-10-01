// Reserve an ID before the first upload. Retrying (including after an interrupted
// response) then targets the same Drive file, rather than creating another PDF.
export async function saveDrivePDF(database:D1Database,row:any,folder:string,name:string,pdf:File,token:string){
 const auth={Authorization:`Bearer ${token}`};
 let stored=row.drive_id as string|undefined;
 if(!stored){
  const generated=await fetch('https://www.googleapis.com/drive/v3/files/generateIds?count=1&space=drive&type=files',{headers:auth});
  if(!generated.ok)throw new Error('Google Drive could not prepare this file. Check the Drive connection and retry.');
  const data:any=await generated.json();if(!data.ids?.[0])throw new Error('Google Drive did not return a file ID. Retry the export.');
  const pending='pending:'+data.ids[0];
  await database.prepare("UPDATE instructions SET drive_id=? WHERE id=? AND (drive_id IS NULL OR drive_id='')").bind(pending,row.id).run();
  const latest:any=await database.prepare('SELECT drive_id FROM instructions WHERE id=?').bind(row.id).first();
  stored=latest?.drive_id;if(!stored)throw new Error('Unable to reserve the Drive file. Retry the export.');
 }
 const pending=stored.startsWith('pending:'),fileId=pending?stored.slice(8):stored;
 async function upload(create:boolean){
  const metadata:any={name,mimeType:'application/pdf'};
  if(create){metadata.id=fileId;metadata.parents=[folder];}
  const boundary='wi_'+crypto.randomUUID();
  const body=new Blob([`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${JSON.stringify(metadata)}\r\n--${boundary}\r\nContent-Type: application/pdf\r\n\r\n`,pdf,`\r\n--${boundary}--`]);
  return fetch(`https://www.googleapis.com/upload/drive/v3/files${create?'':'/'+encodeURIComponent(fileId)}?uploadType=multipart&supportsAllDrives=true&fields=id,webViewLink`,{method:create?'POST':'PATCH',headers:{...auth,'Content-Type':`multipart/related; boundary=${boundary}`},body});
 }
 // Existing files always use PATCH, including when their customer part/rev changes.
 let response=await upload(false);
 if(pending&&response.status===404){response=await upload(true);if(response.status===409)response=await upload(false);}
 if(!response.ok)throw new Error('Google Drive could not update the PDF. Check the folder/file access and Drive connection, then retry. No replacement copy was created.');
 const result:any=await response.json();
 await database.prepare('UPDATE instructions SET drive_id=? WHERE id=?').bind(fileId,row.id).run();
 return {id:fileId,url:result.webViewLink||`https://drive.google.com/file/d/${fileId}/view`};
}
