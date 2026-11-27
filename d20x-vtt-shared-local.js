/* D20X: estado compartilhado local, mestre como autoridade. Firestore mantém cadastro e permissões. */
export const RESOURCE_FIELDS=['pv','pe','san'];
const clone=v=>JSON.parse(JSON.stringify(v));
export function canEditSharedSheet(sheet,actor,master){
 return !!sheet&&!!actor&&(actor===master||(!sheet.isHidden&&(sheet.controllerUid||sheet.ownerUid)===actor));
}
export function sharedSheetIdentity(sheet){return JSON.stringify([sheet.id,sheet.ownerUid||'',sheet.linkedAgentId||'']);}
export function sharedSheetData(sheet,record){
 if(!record||record.identity!==sharedSheetIdentity(sheet))return sheet;
 return {...sheet,...record.values,fullSheet:record.fullSheet??sheet.fullSheet,localRevision:record.revision};
}
export function resourceChange(sheet,field,amount,mode){
 if(!RESOURCE_FIELDS.includes(field)||!['set','delta'].includes(mode)||typeof amount!=='number'||!Number.isFinite(amount)||Math.abs(amount)>9999)throw Error('Recurso inválido');
 const full=sheet.fullSheet&&typeof sheet.fullSheet==='object'?clone(sheet.fullSheet):null;
 const base=Number(full?.[field+'Current']??sheet[field])||0;
 const raw=full?.[field+'Max']??full?.['max'+field[0].toUpperCase()+field.slice(1)];
 const limit=Number(raw)>0?Math.min(9999,Number(raw)):9999;
 const next=Math.trunc(Math.max(0,Math.min(limit,mode==='delta'?base+Math.trunc(amount):Math.trunc(amount))));
 if(full)full[field+'Current']=next;
 return {...sheet,[field]:next,fullSheet:full};
}
export function sheetRecord(sheet,revision){
 const values={};
 for(const field of RESOURCE_FIELDS)values[field]=Math.max(0,Math.min(9999,Math.trunc(Number(sheet.fullSheet?.[field+'Current']??sheet[field])||0)));
 if(typeof sheet.name==='string')values.name=sheet.name.slice(0,100);
 if(Number.isFinite(Number(sheet.nex)))values.nex=Math.max(0,Math.min(99,Math.trunc(Number(sheet.nex))));
 const fullSheet=sheet.fullSheet&&typeof sheet.fullSheet==='object'&&!Array.isArray(sheet.fullSheet)?clone(sheet.fullSheet):null;
 if(JSON.stringify(fullSheet).length>450000)throw Error('Ficha excede limite local de compartilhamento');
 return {identity:sharedSheetIdentity(sheet),revision,values,fullSheet};
}
export function mergeSharedEdit(sheet,changes){
 if(!Array.isArray(changes)||changes.length>500)throw Error('Alterações inválidas');
 const full=clone(sheet.fullSheet||{});
 for(const change of changes){
  const key=change?.key;
  if(typeof key!=='string'||key.length>120||['__proto__','constructor','prototype','nexVttAbilityEffects'].includes(key))throw Error('Campo não permitido');
  const has=Object.prototype.hasOwnProperty.call(full,key);
  if(has!==change.had||has&&JSON.stringify(full[key])!==JSON.stringify(change.before))throw Error('Ficha atualizada por outra pessoa. Reabra a ficha antes de editar.');
  if(change.remove)delete full[key];else full[key]=clone(change.after);
 }
 if(JSON.stringify(full).length>450000)throw Error('Ficha excede limite local de compartilhamento');
 return {...sheet,fullSheet:full,name:String(full.name||sheet.name||'Personagem').slice(0,100),nex:Number(full.nex??sheet.nex)||0};
}
export function sharedEditDiff(before,after){
 const keys=new Set([...Object.keys(before||{}),...Object.keys(after||{})]);
 const changes=[];
 for(const key of keys){
  if(['__proto__','constructor','prototype','nexVttAbilityEffects'].includes(key))continue;
  const had=Object.prototype.hasOwnProperty.call(before||{},key),has=Object.prototype.hasOwnProperty.call(after||{},key);
  if(had===has&&JSON.stringify(before?.[key])===JSON.stringify(after?.[key]))continue;
  changes.push({key,had,...(had?{before:before[key]}:{}),...(has?{after:after[key]}:{remove:true})});
 }
 return changes;
}
export function createSharedSheetStore(uid,campaignId){
 const key=JSON.stringify([uid,campaignId]);
 let connection;
 function open(){
  if(!connection)connection=new Promise((resolve,reject)=>{
   const req=indexedDB.open('D20X_SHARED_SHEETS',1);
   req.onupgradeneeded=()=>req.result.createObjectStore('campaigns');
   req.onsuccess=()=>{const db=req.result;db.onversionchange=()=>{db.close();connection=null};resolve(db)};
   req.onerror=req.onblocked=()=>reject(req.error||Error('Banco local indisponível'));
  }).catch(error=>{connection=null;throw error});
  return connection;
 }
 async function op(mode,value){
  const db=await open();
  return new Promise((resolve,reject)=>{
   const tx=db.transaction('campaigns',mode),store=tx.objectStore('campaigns');
   const req=mode==='readonly'?store.get(key):store.put(value,key);
   tx.oncomplete=()=>resolve(req.result);
   tx.onerror=tx.onabort=()=>reject(tx.error||Error('Não foi possível confirmar gravação local'));
  });
 }
 return {read:async()=>await op('readonly')||{},save:async records=>{await op('readwrite',clone(records));}};
}
