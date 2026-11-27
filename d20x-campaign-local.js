/* Local campaign records, scoped by authenticated owner and campaign.
 * Seed never overwrites existing data; all success is transaction-confirmed. */
export function createCampaignLocalStore(uid,campaignId,section){
 if(!uid||!campaignId||!['shield','metadata'].includes(section))throw Error('Identidade local inválida.');
 const key=JSON.stringify([uid,campaignId,section]);
 let connection;
 function open(){
  if(!connection){
   const pending=new Promise((resolve,reject)=>{
    const req=indexedDB.open('D20X_CAMPAIGNS_LOCAL',1);let blocked=false;
    req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('records'))req.result.createObjectStore('records');};
    req.onblocked=()=>{blocked=true;reject(Error('Feche outras abas para abrir o banco local.'));};
    req.onerror=()=>reject(req.error||Error('Banco local indisponível.'));
    req.onsuccess=()=>{const db=req.result;if(blocked){db.close();return;}db.onversionchange=()=>{db.close();connection=null;};db.onclose=()=>{connection=null;};resolve(db);};
   });
   connection=pending.catch(error=>{connection=null;throw error;});
  }
  return connection;
 }
 async function op(mode,fn){
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('records',mode),store=tx.objectStore('records');
   let value;tx.oncomplete=()=>resolve(value);
   tx.onerror=tx.onabort=()=>reject(tx.error||Error('Gravação local não confirmada.'));
   try{fn(store,v=>{value=v;});}catch(error){try{tx.abort();}catch{}reject(error);}
  });
 }
 return {
  read:()=>op('readonly',(store,done)=>{const r=store.get(key);r.onsuccess=()=>done(r.result??null);}),
  seed:data=>op('readwrite',(store,done)=>{const r=store.get(key);r.onsuccess=()=>{if(r.result!==undefined){done(r.result);return;}store.put(data,key);done(data);};}),
  save:data=>op('readwrite',(store,done)=>{store.put(data,key);done(true);})
 };
}
