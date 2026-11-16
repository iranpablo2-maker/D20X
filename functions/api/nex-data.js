// Cloudflare Pages Functions endpoint for authenticated, owner-scoped NEX records.
// Env: FIREBASE_PROJECT_ID, NEX_D1 (D1 binding), TURSO_DATABASE_URL, TURSO_AUTH_TOKEN.
// Database tables must first be provisioned using docs/NEX-MULTISTORE.md.
const respond=(body,status=200)=>new Response(JSON.stringify(body),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
function base64url(text){const bytes=Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4)),c=>c.charCodeAt(0));return bytes;}
function decode(text){return JSON.parse(new TextDecoder().decode(base64url(text)));}
async function verifyFirebase(request,env){
 const authorization=request.headers.get('Authorization')||'',jwt=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 const parts=jwt.split('.');if(parts.length!==3)throw Error('Login obrigatório.');
 const header=decode(parts[0]),payload=decode(parts[1]);
 const project=env.FIREBASE_PROJECT_ID;
 if(!project||header.alg!=='RS256'||typeof header.kid!=='string'||payload.aud!==project||payload.iss!=='https://securetoken.google.com/'+project||
  typeof payload.sub!=='string'||!payload.sub||payload.sub.length>128||
  typeof payload.exp!=='number'||payload.exp<=Date.now()/1000||
  typeof payload.iat!=='number'||payload.iat>Date.now()/1000+60)throw Error('Sessão inválida.');
 const response=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
 if(!response.ok)throw Error('Não foi possível validar a sessão.');
 const {keys=[]}=await response.json();const jwk=keys.find(key=>key.kid===header.kid);
 if(!jwk)throw Error('Sessão inválida.');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!valid)throw Error('Assinatura inválida.');
 return payload.sub;
}
async function turso(env,sql,args=[]){
 const url=String(env.TURSO_DATABASE_URL||'').replace(/\/$/,'').replace(/^libsql:\/\//,'https://');
 if(!/^https:\/\//.test(url)||!env.TURSO_AUTH_TOKEN)throw Error('Turso não configurado.');
 const res=await fetch(url+'/v2/pipeline',{method:'POST',headers:{Authorization:'Bearer '+env.TURSO_AUTH_TOKEN,'Content-Type':'application/json'},
 body:JSON.stringify({requests:[{type:'execute',stmt:{sql,args:args.map(v=>({type:'text',value:String(v)}))}},{type:'close'}]})});
 if(!res.ok)throw Error('Turso indisponível: HTTP '+res.status);
 const data=await res.json(),result=data.results?.[0];
 if(result?.type==='error')throw Error('Falha na consulta do Turso.');
 return result?.response?.result??{};
}
async function handle({request,env}){
 if(!['GET','PUT','DELETE'].includes(request.method))return respond({error:'Método não permitido.'},405);
 try{
  const uid=await verifyFirebase(request,env);
  const url=new URL(request.url),store=url.searchParams.get('store'),key=url.searchParams.get('key');
  if(!['d1','turso'].includes(store)||!key||!/^[a-zA-Z0-9_.:-]{1,160}$/.test(key))return respond({error:'Parâmetros inválidos.'},400);
  if(store==='d1'&&!env.NEX_D1)return respond({error:'Cloudflare D1 ainda não foi configurado.'},503);
  if(store==='turso'&&(!env.TURSO_DATABASE_URL||!env.TURSO_AUTH_TOKEN))return respond({error:'Turso ainda não foi configurado.'},503);
  if(request.method==='GET'){
   let row;
   if(store==='d1')row=await env.NEX_D1.prepare('SELECT body FROM nex_records WHERE uid=? AND record_key=?').bind(uid,key).first();
   else {const out=await turso(env,'SELECT body FROM nex_records WHERE uid=? AND record_key=?',[uid,key]);row=out.rows?.[0];}
   const data=store==='d1'?row?.body:row?.[0]?.value;
   return respond({value:data==null?null:JSON.parse(data)});
  }
  if(request.method==='PUT'){
   let body;try{body=await request.json();}catch{return respond({error:'JSON inválido.'},400);}
   if(!body||!Object.hasOwn(body,'value'))return respond({error:'Valor obrigatório.'},400);
   const data=JSON.stringify(body.value);
   if(data===undefined||new TextEncoder().encode(data).length>100000)return respond({error:'Registro excede 100 KB.'},413);
   if(store==='d1')await env.NEX_D1.prepare('INSERT INTO nex_records (uid,record_key,body,updated_at) VALUES (?,?,?,?) ON CONFLICT(uid,record_key) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at').bind(uid,key,data,Date.now()).run();
   else await turso(env,'INSERT INTO nex_records (uid,record_key,body,updated_at) VALUES (?,?,?,?) ON CONFLICT(uid,record_key) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at',[uid,key,data,Date.now()]);
   return respond({ok:true});
  }
  if(store==='d1')await env.NEX_D1.prepare('DELETE FROM nex_records WHERE uid=? AND record_key=?').bind(uid,key).run();
  else await turso(env,'DELETE FROM nex_records WHERE uid=? AND record_key=?',[uid,key]);
  return respond({ok:true});
 }catch(error){const msg=String(error.message||'Erro de servidor');const auth=/login|sessão|assinatura/i.test(msg);
  return respond({error:auth?'Sessão Google inválida. Faça login novamente.':msg},auth?401:500);}
}
export const onRequest=handle;
