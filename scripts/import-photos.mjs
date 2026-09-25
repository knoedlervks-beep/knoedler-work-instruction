// Explicitly uploads the prepared photos to your configured Cloudflare account.
import {readFile} from 'node:fs/promises';import {spawnSync} from 'node:child_process';import {resolve} from 'node:path';
const manifest=JSON.parse(await readFile('backups/prepared/photos.json','utf8'));
const config=JSON.parse(await readFile('wrangler.jsonc','utf8'));const bucket=config.r2_buckets[0].bucket_name;
for(const p of manifest){
 const r=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','r2','object','put',`${bucket}/${p.key}`,'--file',resolve('backups/prepared',p.file),'--content-type',p.type,'--remote'],{stdio:'inherit'});
 if(r.status!==0)throw Error('Upload stopped. Correct the error and rerun.');
}
console.log('Uploaded',manifest.length,'photos.');
