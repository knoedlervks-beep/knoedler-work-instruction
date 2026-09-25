import {env} from 'cloudflare:workers';
import {getAccessUser} from './access';
import {mayWriteOperation} from './operations';
export function db(): D1Database {return (env as any).DB;}
export function bucket(): R2Bucket {return (env as any).BUCKET;}
export async function context(){
 const user=await getAccessUser();if(!user)throw new Error('Please sign in to continue.');
 const adminEmail=String((env as any).ADMIN_EMAIL||'').trim().toLowerCase();
 if(!adminEmail)throw new Error('Administrator email is not configured.');
 const admin=user.email.toLowerCase()===adminEmail;
 let row:any=await db().prepare('SELECT value FROM settings WHERE id=?').bind('config').first();
 if(!row){if(!admin)throw new Error('An administrator must initialize this workspace.');await db().prepare('INSERT OR IGNORE INTO settings(id,value) VALUES(?,?)').bind('config',JSON.stringify({adminId:user.userId,adminEmail:user.email,folders:{},members:[]})).run();row=await db().prepare('SELECT value FROM settings WHERE id=?').bind('config').first();}
 const config=JSON.parse(row.value);
 const member=config.members.find((x:any)=>x.email.toLowerCase()===user.email.toLowerCase());
 if(!admin&&!member)throw new Error('Your account has not been assigned an operation. Contact your administrator.');
 return {user,config,admin,operation:member?.operation};
}
export function writable(c:any,operation:string){if(!mayWriteOperation(c,operation))throw new Error('This operation is not assigned to your account.');}
export function sameOrigin(r:Request){if(r.headers.get('origin')!==new URL(r.url).origin)throw new Error('Please reload the page and try again.');}
export function failure(e:any){console.error(e);return Response.json({error:e.message||'Unable to complete the request. Please try again.'},{status:400});}
export function driveReady(){const e=env as any;return !!(e.GOOGLE_CLIENT_ID&&e.GOOGLE_CLIENT_SECRET&&e.GOOGLE_REFRESH_TOKEN);}
export async function driveToken(){const e=env as any;if(!driveReady())throw new Error('Google Drive is not connected yet. Your instruction is saved; you can download the PDF.');const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({client_id:e.GOOGLE_CLIENT_ID,client_secret:e.GOOGLE_CLIENT_SECRET,refresh_token:e.GOOGLE_REFRESH_TOKEN,grant_type:'refresh_token'})});const j:any=await r.json();if(!r.ok)throw new Error('Google Drive connection expired. Ask your administrator to reconnect.');return j.access_token;}
