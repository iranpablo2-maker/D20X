/* NEX Tabletop — cache local por conta/campanha para mídias compartilhadas.
   O Firebase continua sendo a fonte de verdade; o cache apenas evita leituras repetidas. */
export function createVttMediaCache(uid,campaignId){
 const namespace=String(uid||'anonymous')+':'+String(campaignId||'');
 const DB_NAME='nex-vtt-media-v1',STORE='media',MAX_BYTES=75*1024*1024;
 let connection=null;
 function db(){
  if(!('indexedDB' in window))return Promise.resolve(null);
  if(!connection)connection=new Promise(resolve=>{
   let request;
   try{request=indexedDB.open(DB_NAME,1);}catch(_){resolve(null);return;}
   request.onupgradeneeded=()=>{const database=request.result;if(!database.objectStoreNames.contains(STORE))database.createObjectStore(STORE,{keyPath:'key'});};
   request.onsuccess=()=>resolve(request.result);
   request.onerror=()=>resolve(null);
   request.onblocked=()=>resolve(null);
  });
  return connection;
 }
 const key=src=>namespace+':'+String(src||'');
 async function read(src){
  const database=await db();if(!database)return null;
  return new Promise(resolve=>{
   try{
    const r=database.transaction(STORE,'readonly').objectStore(STORE).get(key(src));
    r.onsuccess=()=>resolve(typeof r.result?.data==='string'?r.result.data:null);
    r.onerror=()=>resolve(null);
   }catch(_){resolve(null);}
  });
 }
 async function put(src,data,persistent=false){
  if(typeof data!=='string'||data.length>8*1024*1024)return false;
  const database=await db();if(!database)return false;
  const value={key:key(src),data,size:data.length*2,timestamp:Date.now(),persistent:!!persistent};
  const success=await new Promise(resolve=>{
   try{
    const tx=database.transaction(STORE,'readwrite');
    tx.objectStore(STORE).put(value);
    tx.oncomplete=()=>resolve(true);tx.onerror=()=>resolve(false);tx.onabort=()=>resolve(false);
   }catch(_){resolve(false);}
  });
  if(success&&!persistent)void trim();
  return success;
 }
 async function remove(src){
  const database=await db();if(!database)return;
  return new Promise(resolve=>{
   try{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(key(src));tx.oncomplete=()=>resolve();tx.onerror=()=>resolve();}catch(_){resolve();}
  });
 }
 let trimming=false;
 async function trim(){
  if(trimming)return;trimming=true;
  try{
   const database=await db();if(!database)return;
   const rows=await new Promise(resolve=>{
    try{const r=database.transaction(STORE,'readonly').objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result||[]);r.onerror=()=>resolve([]);}catch(_){resolve([]);}
   });
   let total=rows.filter(row=>!row.persistent).reduce((sum,row)=>sum+(row.size||0),0);
   if(total<=MAX_BYTES)return;
   rows.sort((a,b)=>(a.timestamp||0)-(b.timestamp||0));
   for(const row of rows){
    if(row.persistent)continue;
    if(total<=MAX_BYTES*.8)break;
    await new Promise(resolve=>{
     try{const tx=database.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(row.key);tx.oncomplete=resolve;tx.onerror=resolve;}catch(_){resolve();}
    });
    total-=row.size||0;
   }
  }finally{trimming=false;}
 }
 return {read,put,remove};
}
