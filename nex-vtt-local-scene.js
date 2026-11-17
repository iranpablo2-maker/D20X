/* Estado do NEX Tabletop guardado apenas no navegador do mestre.
 * Separado da cache de mídia, para não depender do Firestore.
 */
export function createVttLocalScene(uid,campaignId){
 const DB='nex-vtt-scene-local-v1',STORE='scenes',KEY=String(uid)+':'+String(campaignId);
 let connection;
 function open(){
  if(connection)return connection;
  connection=new Promise((resolve,reject)=>{
   if(!('indexedDB' in window)){reject(Error('IndexedDB indisponível neste navegador'));return;}
   const req=indexedDB.open(DB,1);
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'key'});};
   req.onsuccess=()=>resolve(req.result);
   req.onerror=()=>reject(req.error||Error('Erro ao abrir IndexedDB'));
   req.onblocked=()=>reject(Error('Feche outras abas do NEX e tente novamente'));
  });
  return connection;
 }
 async function transaction(mode,action){
  const db=await open();
  return new Promise((resolve,reject)=>{
   try{
    const tx=db.transaction(STORE,mode),store=tx.objectStore(STORE);
    const req=action(store);
    req.onsuccess=()=>resolve(req.result);
    req.onerror=()=>reject(req.error||Error('Erro de armazenamento local'));
    tx.onabort=()=>reject(tx.error||Error('Erro ao salvar a mesa'));
   }catch(error){reject(error);}
  });
 }
 return {
  async read(){const record=await transaction('readonly',store=>store.get(KEY));return record?.scene||null;},
  async save(scene){await transaction('readwrite',store=>store.put({key:KEY,scene,savedAt:Date.now()}));},
  async clear(){await transaction('readwrite',store=>store.delete(KEY));}
 };
}
