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