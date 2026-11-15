/* Carrega retratos individuais do pacote ZIP publicado no repositório.
   O ZIP contém WebP individuais e evita ampliar o antigo atlas de miniaturas. */
(()=>{
 const zipFile='./NEX_Arquivos_Secretos_39_Fotos.zip';
 let indexPromise=null;
 const urls=new Map();
 function u16(v,p){return v.getUint16(p,true)}
 function u32(v,p){return v.getUint32(p,true)}
 async function readIndex(){
  const response=await fetch(zipFile,{cache:'force-cache'});
  if(!response.ok)throw Error('Pacote de retratos não encontrado ('+response.status+')');
  const bytes=await response.arrayBuffer();
  const view=new DataView(bytes);
  const lower=Math.max(0,bytes.byteLength-65557);
  let end=-1;
  for(let p=bytes.byteLength-22;p>=lower;p--){
   if(u32(view,p)===0x06054b50){end=p;break}
  }
  if(end<0)throw Error('Pacote ZIP inválido');
  const count=u16(view,end+10);
  let pos=u32(view,end+16);
  const entries=new Map();
  const decoder=new TextDecoder('utf-8');
  for(let i=0;i<count;i++){
   if(u32(view,pos)!==0x02014b50)throw Error('Índice ZIP inválido');
   const method=u16(view,pos+10),size=u32(view,pos+20);
   const nameLength=u16(view,pos+28),extraLength=u16(view,pos+30),commentLength=u16(view,pos+32);
   const localOffset=u32(view,pos+42);
   const name=decoder.decode(new Uint8Array(bytes,pos+46,nameLength));
   entries.set(name,{method,size,localOffset});
   pos+=46+nameLength+extraLength+commentLength;
  }
  return {bytes,view,entries};
 }
 async function imageUrl(key){
  const path=(window.NEX_ARQUIVOS_IMAGES||{})[key];
  if(!path)return null;
  const file=decodeURIComponent(path.split('?')[0].replace(/^\.\//,''));
  if(urls.has(file))return urls.get(file);
  const job=(async()=>{
   const {bytes,view,entries}=await (indexPromise||(indexPromise=readIndex().catch(e=>{indexPromise=null;throw e})));
   const entry=entries.get(file);
   if(!entry)return null;
   const p=entry.localOffset;
   if(u32(view,p)!==0x04034b50)throw Error('Entrada ZIP inválida');
   const start=p+30+u16(view,p+26)+u16(view,p+28);
   const data=bytes.slice(start,start+entry.size);
   let blob;
   if(entry.method===0)blob=new Blob([data],{type:'image/webp'});
   else if(entry.method===8){
    const raw=new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
    blob=new Blob([await new Response(raw).arrayBuffer()],{type:'image/webp'});
   }else throw Error('Compressão de imagem não suportada');
   return URL.createObjectURL(blob);
  })();
  urls.set(file,job);
  return job;
 }
 window.NEX_ARQUIVOS_ZIP_IMAGE_URL=imageUrl;
})();
/* Pacote de 20 imagens enviado pelo dono do NEX ao GitHub.
   Os 13 retratos identificados são carregados diretamente do ZIP sem extrair os arquivos no servidor.
   Os 7 retratos pendentes não são associados indevidamente a nenhuma ameaça. */
(()=>{
 const archive="./NEX_20_imagens_organizadas.zip";
 const folder="assets/ameacas/enviadas/";
 const pendingFolder="pendentes/";
 const mapping={
  "Arquivos Secretos — Julho::Strzyga":"strzyga.webp",
  "Arquivos Secretos — Julho::Apóstata":"apostata.webp",
  "Arquivos Secretos — Julho::Alvira":"alvira.webp",
  "Arquivos Secretos — Março::Alê":"ale.webp",
  "Arquivos Secretos — Julho::Incinerado":"incinerado.webp",
  "Arquivos Secretos — Julho::Sabara":"sabara.webp",
  "Arquivos Secretos — Janeiro::Cristino":"cristino.webp",
  "Arquivos Secretos — Julho::Raziel":"raziel.webp",
  "Arquivos Secretos — Março::Caio":"caio.webp",
  "Arquivos Secretos — Março::Caíto":"caito.webp",
  "Arquivos Secretos — Julho::Zéfero":"zefero.webp",
  "Arquivos Secretos — Julho::O Verdadeiro Raziel":"o-verdadeiro-raziel.webp",
  "Arquivos Secretos — Abril::Simulacro":"simulacro.webp",
  "Arquivos Secretos — Março::Cindy":"imagem_03.webp",
  "Arquivos Secretos — Janeiro::Cleo Brisa":"imagem_04.webp",
  "Arquivos Secretos — Março::Coruja":"imagem_10.webp",
  "Arquivos Secretos — Março::Corvo":"imagem_12.webp",
  "Arquivos Secretos — Março::Eloy":"imagem_16.webp",
  "Arquivos Secretos — Março::Franco":"imagem_01.webp"
 };
 window.NEX_UPLOADED_THREAT_IMAGES=mapping;
 const urls=new Map();
 let archivePromise;
 const u16=(view,n)=>view.getUint16(n,true);
 const u32=(view,n)=>view.getUint32(n,true);
 async function readArchive(){
  const res=await fetch(archive,{cache:"force-cache"});
  if(!res.ok)throw Error("Arquivo de imagens do NEX não encontrado: "+res.status);
  const data=await res.arrayBuffer(),v=new DataView(data);
  let end=-1;
  for(let i=data.byteLength-22;i>=Math.max(0,data.byteLength-65557);i--){
   if(u32(v,i)===0x06054b50){end=i;break}
  }
  if(end<0)throw Error("Índice do ZIP de retratos inválido");
  const entries=new Map(),decoder=new TextDecoder();
  let pos=u32(v,end+16);
  for(let i=0,count=u16(v,end+10);i<count;i++){
   if(u32(v,pos)!==0x02014b50)throw Error("Entrada de índice ZIP inválida");
   const nameLen=u16(v,pos+28),extra=u16(v,pos+30),comment=u16(v,pos+32);
   const name=decoder.decode(new Uint8Array(data,pos+46,nameLen));
   entries.set(name,{method:u16(v,pos+10),length:u32(v,pos+20),offset:u32(v,pos+42)});
   pos+=46+nameLen+extra+comment;
  }
  return {data,v,entries};
 }
 window.NEX_UPLOADED_THREAT_IMAGE_URL=async key=>{
  const name=mapping[key];
  if(!name)return null;
  if(urls.has(name))return urls.get(name);
  const pending=(async()=>{
   const {data,v,entries}=await (archivePromise||(archivePromise=readArchive().catch(e=>{archivePromise=null;throw e})));
   const entry=entries.get((name.startsWith("imagem_")?pendingFolder:folder)+name);
   if(!entry)return null;
   if(u32(v,entry.offset)!==0x04034b50)throw Error("Cabeçalho de retrato ZIP inválido");
   const start=entry.offset+30+u16(v,entry.offset+26)+u16(v,entry.offset+28);
   const compressed=data.slice(start,start+entry.length);
   let raw=compressed;
   if(entry.method===8){
    raw=await new Response(new Blob([compressed]).stream().pipeThrough(new DecompressionStream("deflate-raw"))).arrayBuffer();
   }else if(entry.method!==0)throw Error("Compressão ZIP não suportada: "+entry.method);
   return URL.createObjectURL(new Blob([raw],{type:"image/webp"}));
  })();
  urls.set(name,pending);
  return pending;
 };
})();