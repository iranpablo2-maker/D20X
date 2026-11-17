// NEX Tabletop private R2 asset API.
// No public bucket URL and no R2 access tokens in the browser.
// Firebase ID token + Cloud Firestore Security Rules authorize campaign access.
const MAX_SIZE=10*1024*1024;
const MAX_CAMPAIGN_SIZE=300*1024*1024;
const MAX_CAMPAIGN_FILES=200;
const IMAGE_MIME={gif:'image/gif',png:'image/png',jpeg:'image/jpeg',webp:'image/webp'};
const CAMPAIGN_PATTERN=/^[A-Za-z0-9_-]{5,128}$/;
const REF_PATTERN=/^r2:((?:atmo|map|asset)_[A-Za-z0-9_-]+):(gif|png|jpeg|webp)$/;
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
function base64url(text){
 return Uint8Array.from(atob(text.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-text.length%4)%4)),c=>c.charCodeAt(0));
}
function decodeJWT(text){return JSON.parse(new TextDecoder().decode(base64url(text)));}
async function authenticate(request,projectId){
 const authorization=request.headers.get('Authorization')||'';
 const token=authorization.startsWith('Bearer ')?authorization.slice(7):'';
 const parts=token.split('.');
 if(parts.length!==3||!projectId)throw Object.assign(Error('Faça login na conta NEX.'),{status:401});
 let header,payload;
 try{header=decodeJWT(parts[0]);payload=decodeJWT(parts[1]);}catch(_){throw Object.assign(Error('Sessão inválida.'),{status:401});}
 const now=Date.now()/1000;
 if(header.alg!=='RS256'||!header.kid||payload.aud!==projectId||
  payload.iss!=='https://securetoken.google.com/'+projectId||typeof payload.sub!=='string'||
  !payload.sub||payload.sub.length>128||!Number.isFinite(payload.exp)||payload.exp<=now||
  !Number.isFinite(payload.iat)||payload.iat>now+60){
  throw Object.assign(Error('Sessão NEX inválida.'),{status:401});
 }
 const jwks=await fetch('https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com');
 if(!jwks.ok)throw Object.assign(Error('Não foi possível validar o login.'),{status:503});
 const {keys=[]}=await jwks.json();
 const jwk=keys.find(value=>value.kid===header.kid);
 if(!jwk)throw Object.assign(Error('Sessão expirada. Entre novamente.'),{status:401});
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 const valid=await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,base64url(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1]));
 if(!valid)throw Object.assign(Error('Assinatura da sessão inválida.'),{status:401});
 return {uid:payload.sub,token};
}
async function authorizeCampaign(env,campaignId,identity,write){
 // Firebase REST verifies this same user's ID token and enforces the campaign rules.
 const project=encodeURIComponent(env.FIREBASE_PROJECT_ID);
 const endpoint='https://firestore.googleapis.com/v1/projects/'+project+'/databases/(default)/documents/campaigns/'+encodeURIComponent(campaignId);
 const response=await fetch(endpoint,{headers:{'Authorization':'Bearer '+identity.token,'Accept':'application/json'}});
 if(response.status===401||response.status===403||response.status===404){
  throw Object.assign(Error('Você não tem acesso a esta campanha.'),{status:403});
 }
 if(!response.ok)throw Object.assign(Error('Não foi possível conferir as permissões da campanha.'),{status:503});
 if(write){
  const data=await response.json();
  if(data.fields?.gmUid?.stringValue!==identity.uid){
   throw Object.assign(Error('Somente o mestre pode enviar ou excluir imagens compartilhadas.'),{status:403});
  }
 }
}
function parseRef(src){const result=REF_PATTERN.exec(src||'');return result?{id:result[1],ext:result[2]}:null;}
async function handler({request,env}){
 if(!['GET','POST','DELETE'].includes(request.method))return json({error:'Método não permitido.'},405);
 if(!env?.NEX_MEDIA||typeof env.NEX_MEDIA.get!=='function')return json({error:'R2 ainda não foi configurado no Cloudflare. Crie o bucket nex-vtt-media e associe NEX_MEDIA.'},503);
 try{
  const url=new URL(request.url),campaignId=url.searchParams.get('campaignId');
  if(!CAMPAIGN_PATTERN.test(campaignId||''))return json({error:'Identificador da campanha inválido.'},400);
  const identity=await authenticate(request,env.FIREBASE_PROJECT_ID);
  await authorizeCampaign(env,campaignId,identity,request.method!=='GET');
  const bucket=env.NEX_MEDIA,base=campaignId+'/';
  if(request.method==='POST'){
   const mime=request.headers.get('Content-Type')?.split(';')[0]?.toLowerCase()||'';
   const ext=Object.keys(IMAGE_MIME).find(key=>IMAGE_MIME[key]===mime);
   if(!ext)return json({error:'Envie somente imagens PNG, JPG, WebP ou GIF.'},415);
   const sizeHint=Number(request.headers.get('Content-Length'));
   if(Number.isFinite(sizeHint)&&sizeHint>MAX_SIZE)return json({error:'O limite por imagem R2 é 10 MB.'},413);
   const buffer=await request.arrayBuffer();
   if(!buffer.byteLength||buffer.byteLength>MAX_SIZE)return json({error:'Imagem vazia ou maior que 10 MB.'},413);
   // Restrict abuse and prevent accidental unlimited media usage per campaign.
   const list=await bucket.list({prefix:base,limit:MAX_CAMPAIGN_FILES+1});
   const bytes=list.objects.reduce((sum,obj)=>sum+obj.size,0);
   if(list.truncated||list.objects.length>=MAX_CAMPAIGN_FILES||bytes+buffer.byteLength>MAX_CAMPAIGN_SIZE){
    return json({error:'Biblioteca da campanha atingiu o limite de 200 arquivos ou 300 MB.'},413);
   }
   const kind=url.searchParams.get('kind');
   if(!['map','asset'].includes(kind))return json({error:'O R2 aceita apenas mapas e tokens. GIFs de atmosfera e músicas devem ficar no navegador.'},400);
   const id=kind+'_'+crypto.randomUUID(),key=base+id+'.'+ext;
   await bucket.put(key,buffer,{httpMetadata:{contentType:mime},customMetadata:{campaignId,uploadedBy:identity.uid}});
   return json({src:'r2:'+id+':'+ext,size:buffer.byteLength},201);
  }
  const src=parseRef(url.searchParams.get('src'));
  if(!src)return json({error:'Referência de imagem inválida.'},400);
  const key=base+src.id+'.'+src.ext;
  if(request.method==='DELETE'){
   await bucket.delete(key);
   return json({ok:true});
  }
  const file=await bucket.get(key);
  if(!file)return json({error:'Imagem não encontrada no R2.'},404);
  const headers=new Headers();
  file.writeHttpMetadata(headers);
  headers.set('Content-Type',IMAGE_MIME[src.ext]);
  headers.set('Cache-Control','private, max-age=3600');
  headers.set('X-Content-Type-Options','nosniff');
  headers.set('Content-Disposition','inline');
  return new Response(file.body,{status:200,headers});
 }catch(error){
  console.warn('NEX R2 access error:',String(error.message||error));
  return json({error:String(error.message||'Erro no armazenamento R2').slice(0,180)},error.status||500);
 }
}
export const onRequest=handler;
