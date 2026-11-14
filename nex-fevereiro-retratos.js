/* Retratos das duas formas de cinco personagens dos Arquivos Secretos de Fevereiro.
   Os nomes correspondem às fotos enviadas na ordem original.
   Juan não foi incluído porque não há fotos desse par no lote recebido. */
(()=>{
 const folder="./assets/ameacas/arquivos-secretos/fevereiro/";
 const pairs={
  "Arquivos Secretos — Fevereiro::Jonas Aguiar":["jonas-aguiar","mutilador-noturno"],
  "Arquivos Secretos — Fevereiro::Dalmo Magno":["dalmo-magno","colosso"],
  "Arquivos Secretos — Fevereiro::Jae":["jae","x"],
  "Arquivos Secretos — Fevereiro::Kemi":["kemi","fantasma"],
  "Arquivos Secretos — Fevereiro::Labirinto":["labirinto","labirinto-antena-do-medo"]
 };
 const pictures=Object.fromEntries(Object.entries(pairs).map(([key,p])=>
  [key,{normal:folder+p[0]+".webp",alternativa:folder+p[1]+".webp"}]));
 window.NEX_FEVEREIRO_FORM_IMAGES=pictures;
 const zipFile="./NEX_Fevereiro_Formas_10_Fotos.zip";
 const cache=new Map();let zipPromise=null;
 const u16=(v,p)=>v.getUint16(p,true),u32=(v,p)=>v.getUint32(p,true);
 async function indexZip(){
  const response=await fetch(zipFile,{cache:"force-cache"});
  if(!response.ok)throw new Error("Pacote de retratos indisponível");
  const bytes=await response.arrayBuffer(),view=new DataView(bytes);
  let end=-1;
  for(let p=bytes.byteLength-22;p>=Math.max(0,bytes.byteLength-65557);p--){
   if(u32(view,p)===0x06054b50){end=p;break}
  }
  if(end<0)throw new Error("ZIP inválido");
  let pos=u32(view,end+16);
  const count=u16(view,end+10),entries=new Map(),decoder=new TextDecoder("utf-8");
  for(let i=0;i<count;i++){
   if(u32(view,pos)!==0x02014b50)throw new Error("Entrada ZIP inválida");
   const method=u16(view,pos+10),size=u32(view,pos+20);
   const nameLen=u16(view,pos+28),extra=u16(view,pos+30),comment=u16(view,pos+32);
   const name=decoder.decode(new Uint8Array(bytes,pos+46,nameLen));
   entries.set(name,{method,size,offset:u32(view,pos+42)});
   pos+=46+nameLen+extra+comment;
  }
  return {bytes,view,entries};
 }
 async function imageUrl(key,form){
  const path=pictures[key]?.[form==="alternativa"?"alternativa":"normal"];
  if(!path)return null;
  const file=path.replace(/^\.\//,"");
  if(cache.has(file))return cache.get(file);
  const job=(async()=>{
   const {bytes,view,entries}=await (zipPromise||(zipPromise=indexZip().catch(e=>{zipPromise=null;throw e})));
   const entry=entries.get(file);
   if(!entry)return null;
   const start=entry.offset;
   if(u32(view,start)!==0x04034b50)throw new Error("Conteúdo ZIP inválido");
   const offset=start+30+u16(view,start+26)+u16(view,start+28);
   const data=bytes.slice(offset,offset+entry.size);
   let imageBytes=data;
   if(entry.method===8){
    const stream=new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"));
    imageBytes=await new Response(stream).arrayBuffer();
   }else if(entry.method!==0)throw new Error("Compressão ZIP não suportada");
   return URL.createObjectURL(new Blob([imageBytes],{type:"image/webp"}));
  })();
  cache.set(file,job);return job;
 }
 window.NEX_FEVEREIRO_FORM_IMAGE_URL=imageUrl;
})();