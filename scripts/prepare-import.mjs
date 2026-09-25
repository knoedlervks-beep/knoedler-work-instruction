// Prepare a current-state snapshot for a NEW, EMPTY D1 database and R2 bucket.
// This command only creates local files. It never changes a cloud account.
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
const source=process.argv[2];if(!source)throw Error('Usage: node scripts/prepare-import.mjs PATH_TO_BACKUP.json');
const b=JSON.parse(await readFile(source,'utf8'));
if(b.format!=='knoedler-current-state-v1'||!Array.isArray(b.instructions)||!Array.isArray(b.photos))throw Error('Unsupported backup.');
const out=resolve('backups/prepared');await mkdir(out,{recursive:true});
const quote=x=>x==null?'NULL':"'"+String(x).replaceAll("'","''")+"'";
const statements=[];const config={...b.config,adminId:'managed-by-ADMIN_EMAIL'};
statements.push(`INSERT INTO settings(id,value) VALUES('config',${quote(JSON.stringify(config))});`);
const seen=new Set();
for(const d of b.instructions){
 if(!d.id||seen.has(d.id)||!d.operation)throw Error('Invalid or duplicate instruction.');seen.add(d.id);
 statements.push(`INSERT INTO instructions(id,operation,data,version,updated,drive_id) VALUES(${[d.id,d.operation,JSON.stringify(d),d.version||1,d.updated||b.created,d.driveId||null].map(quote).join(',')});`);
 statements.push(`INSERT INTO revisions(id,instruction_id,data,version,updated) VALUES(${[crypto.randomUUID(),d.id,JSON.stringify(d),d.version||1,d.updated||b.created].map(quote).join(',')});`);
}
const manifest=[];
for(const [i,p] of b.photos.entries()){
 if(typeof p.key!=='string'||!p.key.includes('/')||!['image/jpeg','image/png','image/webp'].includes(p.type))throw Error('Invalid photo metadata.');
 const file=`photo-${i}.bin`;await writeFile(resolve(out,file),Buffer.from(p.base64,'base64'));manifest.push({key:p.key,type:p.type,file});
}
await writeFile(resolve(out,'import.sql'),statements.join('\n'));
await writeFile(resolve(out,'photos.json'),JSON.stringify(manifest,null,2));
console.log(`Prepared ${b.instructions.length} instructions and ${manifest.length} photos in ${out}. Import only into an EMPTY initialized database, before first login.`);
