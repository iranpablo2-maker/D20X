/* Estado local do Tabletop. Confirma a transação IndexedDB antes de informar
 * que a mesa está salva; erros não deixam a conexão travada para sempre. */
export function createVttLocalScene(uid,campaignId){
 const DB='nex-vtt-scene-local-v1',STORE='scenes',KEY=String(uid)+':'+String(campaignId);
 let connection=null;
 function open(){
  if(connection)return connection;
  const attempt=new Promise((resolve,reject)=>{
   if(!('indexedDB' in window)){reject(Error('IndexedDB indisponível neste navegador'));return;}
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'key'});};
   req.onsuccess=()=>{
    req.result.onversionchange=()=>{req.result.close();connection=null;};
    req.result.onclose=()=>{connection=null;};
    resolve(req.result);
   };
   req.onerror=()=>reject(req.error||Error('Erro ao abrir IndexedDB'));
   req.onblocked=()=>reject(Error('Feche outras abas do NEX e tente novamente'));
  });
  connection=attempt.catch(error=>{if(connection===attempt)connection=null;throw error;});
  return connection;
 }
 async function transaction(mode,action){
  const db=await open();
  return new Promise((resolve,reject)=>{
   let result,settled=false;
   const finish=(error,value)=>{
    if(settled)return;
    settled=true;
    if(error)reject(error);else resolve(value);
   };
   try{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
    tx.oncomplete=()=>finish(null,result);
    tx.onerror=()=>finish(tx.error||Error('Erro de armazenamento local'));
    tx.onabort=()=>finish(tx.error||Error('Transação do Tabletop cancelada'));
    const req=action(store);
    req.onsuccess=()=>{result=req.result;};
    req.onerror=()=>finish(req.error||Error('Falha no registro do Tabletop'));
   }catch(error){
    if(error?.name==='InvalidStateError')connection=null;
    finish(error);
   }
  });
 }
 return {
  async read(){const record=await transaction('readonly',store=>store.get(KEY));return record?.scene||null;},
  async save(scene){await transaction('readwrite',store=>store.put({key:KEY,scene,savedAt:Date.now()}));},
  async clear(){await transaction('readwrite',store=>store.delete(KEY));}
 };
}
