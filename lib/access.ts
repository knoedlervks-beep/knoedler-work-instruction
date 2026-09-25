import {headers} from 'next/headers';
import {env} from 'cloudflare:workers';
import {verifyAccessJwt} from './access-jwt';
let cache:{issuer:string;expires:number;keys:JsonWebKey[]}|undefined;
export async function getAccessUser(){
 const e=env as any,issuer=String(e.CF_ACCESS_TEAM_DOMAIN||'').replace(/\/$/,''),audience=String(e.CF_ACCESS_AUD||'');
 if(!/^https:\/\/[a-z0-9-]+\.cloudflareaccess\.com$/.test(issuer)||!audience||audience.startsWith('REPLACE_')||issuer.includes('YOUR-TEAM'))throw new Error('Finish Cloudflare Access setup using README.md.');
 const token=(await headers()).get('Cf-Access-Jwt-Assertion');if(!token)return null;
 if(!cache||cache.issuer!==issuer||cache.expires<Date.now()){
  const r=await fetch(issuer+'/cdn-cgi/access/certs');if(!r.ok)throw new Error('Login verification is temporarily unavailable.');
  const data=await r.json() as {keys:JsonWebKey[]};if(!Array.isArray(data.keys))throw new Error('Invalid login certificates.');
  cache={issuer,expires:Date.now()+300000,keys:data.keys};
 }
 return verifyAccessJwt(token,issuer,audience,cache.keys);
}
