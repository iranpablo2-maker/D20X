// NEX MultiStore: local-first storage with optional authenticated Cloudflare APIs.
// This module does not automatically migrate or delete any Firebase records.
const DB_NAME='nex-multistore-v1',STORE='records';
function openDB(){return new Promise((resolve,reject)=>{const req=indexedDB.open(DB_NAME,1);req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE);};req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error);});}
async function localOp(type,key,value){const db=await openDB();try{return await new Promise((resolve,reject)=>{const tx=db.transaction(STORE,type==='read'?'readonly':'readwrite');const os=tx.objectStore(STORE);const req=type==='read'?os.get(key):type==='delete'?os.delete(key):os.put(value,key);req.onsuccess=()=>resolve(type==='read'?req.result??null:true);req.onerror=()=>reject(req.error);});}finally{db.close();}}
const validKey=key=>typeof key==='string'&&/^[a-zA-Z0-9_.:-]{1,160}$/.test(key);
export function createNexMultiStore({getIdToken,uid}){
 if(!uid||typeof uid!=='string')throw Error('É necessário estar conectado ao NEX.');
 const scoped=key=>{if(!validKey(key))throw Error('Chave inválida');return uid+'::'+key;};
 async function remote(method,store,key,value){
  if(!['d1','turso'].includes(store))throw Error('Banco inválido');
  if(typeof getIdToken!=='function')throw Error('Login Google necessário para sincronizar.');
  const token=await getIdToken();
  if(!token)throw Error('Sessão não autenticada.');
  const response=await fetch('/api/d20x-data?store='+encodeURIComponent(store)+'&key='+encodeURIComponent(key),{
   method,headers:{Authorization:'Bearer '+token,...(method==='PUT'?{'Content-Type':'application/json'}:{})},
   ...(method==='PUT'?{body:JSON.stringify({value})}:{})
  });
  let payload;try{payload=await response.json();}catch{throw Error('Resposta inválida do servidor de dados.');}
  if(!response.ok)throw Error(payload.error||'Não foi possível acessar '+store);
  return payload.value??null;
 }
 return Object.freeze({
  async saveLocal(key,value){await localOp('put',scoped(key),{value,updatedAt:Date.now()});return true;},
  async readLocal(key){return (await localOp('read',scoped(key)))?.value??null;},
  async deleteLocal(key){await localOp('delete',scoped(key));return true;},
  async saveRemote(store,key,value){scoped(key);return remote('PUT',store,key,value);},
  async readRemote(store,key){scoped(key);return remote('GET',store,key);},
  async deleteRemote(store,key){scoped(key);return remote('DELETE',store,key);},
  async saveHybrid(store,key,value){await this.saveLocal(key,value);return this.saveRemote(store,key,value);},
  async readHybrid(store,key){const cached=await this.readLocal(key);if(cached!==null)return cached;const value=await this.readRemote(store,key);if(value!==null)await this.saveLocal(key,value);return value;}
 });
}
