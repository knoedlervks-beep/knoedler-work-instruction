// Verify Cloudflare Access RS256 JWTs using Web Crypto. No email header is trusted.
const decode=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
const parse=(s:string)=>JSON.parse(new TextDecoder().decode(decode(s)));
export async function verifyAccessJwt(token:string,issuer:string,audience:string,keys:JsonWebKey[]){
 const parts=token.split('.');if(parts.length!==3)throw new Error('Invalid login token.');
 const h=parse(parts[0]);if(h.alg!=='RS256'||typeof h.kid!=='string')throw new Error('Invalid login token.');
 const jwk=keys.find(k=>(k as any).kid===h.kid&&k.kty==='RSA');if(!jwk)throw new Error('Unknown login signing key.');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const ok=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!ok)throw new Error('Invalid login signature.');
 const p=parse(parts[1]),now=Date.now()/1000;
 if(p.iss!==issuer||!Array.isArray(p.aud)||!p.aud.includes(audience)||typeof p.exp!=='number'||p.exp<=now||typeof p.iat!=='number'||p.iat>now+60||(p.nbf!==undefined&&(typeof p.nbf!=='number'||p.nbf>now+60))||typeof p.email!=='string'||!p.email.includes('@')||typeof p.sub!=='string'||!p.sub)throw new Error('Login expired or not valid for this application.');
 return {userId:p.sub,email:p.email,displayName:p.email,fullName:null};
}
