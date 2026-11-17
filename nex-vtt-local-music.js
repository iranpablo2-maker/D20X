/* Música do NEX Tabletop: biblioteca privada do navegador.
   Nunca envia áudio ao Firestore, R2 ou outras APIs. */
export function mountNexLocalMusic({uid,campaignId,root}){
 if(!root||!uid||!campaignId)return ()=>{};
 const PREFIX=String(uid)+':'+String(campaignId)+':';
 const DB_NAME='nex-vtt-local-music-v1',STORE='tracks';
 const MAX_TRACKS=24,MAX_FILE=25*1024*1024,MAX_TOTAL=120*1024*1024;
 let disposed=false,selectedId='',objectURL='',dbPromise=null;
 const panel=document.createElement('details');
 panel.className='nex-vtt-local-music';
 panel.style.cssText='margin:10px 0;padding:10px;border:1px solid #6a353b;border-radius:8px;background:#181417;color:#f4e8e8;';
 const header=document.createElement('summary');
 header.textContent='♫ Músicas e sons locais';
 header.style.cssText='cursor:pointer;font-weight:650;font-size:13px;';
 const subtitle=document.createElement('p');
 subtitle.textContent='Somente neste dispositivo. Não é enviado ao R2, Firebase ou D1 e não toca automaticamente para os jogadores.';
 subtitle.style.cssText='font-size:12px;line-height:1.4;margin:8px 0;color:#bfb0b0;';
 const input=document.createElement('input');
 input.type='file';input.multiple=true;input.accept='.mp3,.ogg,.wav,.m4a,.webm,.aac,.flac,audio/*';
 input.setAttribute('aria-label','Adicionar músicas ou sons locais');
 input.style.cssText='width:100%;font-size:12px;margin:7px 0;';
 const selector=document.createElement('select');
 selector.setAttribute('aria-label','Escolher música local');
 selector.style.cssText='width:100%;min-height:35px;margin:6px 0;';
 const player=document.createElement('audio');
 player.controls=true;player.preload='none';
 player.style.cssText='width:100%;margin:7px 0;';
 const remove=document.createElement('button');
 remove.type='button';remove.textContent='Excluir música deste dispositivo';
 remove.style.cssText='font-size:12px;background:#4f222b;color:white;border:1px solid #8a3b43;border-radius:6px;padding:7px;cursor:pointer;';
 const status=document.createElement('p');
 status.setAttribute('role','status');
 status.style.cssText='font-size:12px;line-height:1.4;color:#c6c0c0;margin:6px 0;';
 panel.append(header,subtitle,input,selector,player,remove,status);
 root.append(panel);
 function say(value){if(!disposed)status.textContent=value;}
 function openDB(){
  if(dbPromise)return dbPromise;
  dbPromise=new Promise(resolve=>{
   if(typeof indexedDB==='undefined'){resolve(null);return;}
   let req;try{req=indexedDB.open(DB_NAME,1);}catch(_){resolve(null);return;}
   req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains(STORE))req.result.createObjectStore(STORE,{keyPath:'key'});};
   req.onsuccess=()=>resolve(req.result);req.onerror=()=>resolve(null);req.onblocked=()=>resolve(null);
  });
  return dbPromise;
 }
 async function list(){
  const db=await openDB();if(!db)throw Error('O navegador não permite armazenamento local de músicas.');
  const result=await new Promise((resolve,reject)=>{
   try{const q=db.transaction(STORE,'readonly').objectStore(STORE).getAll();
    q.onsuccess=()=>resolve(q.result||[]);q.onerror=()=>reject(q.error||Error('Erro de leitura'));
   }catch(error){reject(error);}
  });
  return result.filter(x=>x.key?.startsWith(PREFIX)).sort((a,b)=>a.name.localeCompare(b.name,'pt-BR'));
 }
 async function write(record,action){
  const db=await openDB();if(!db)throw Error('Armazenamento local indisponível.');
  await new Promise((resolve,reject)=>{
   try{
    const tx=db.transaction(STORE,'readwrite');
    const store=tx.objectStore(STORE);
    if(action==='delete')store.delete(record.key);
    else store.put(record);
    tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||Error('Erro ao salvar arquivo'));
    tx.onabort=()=>reject(tx.error||Error('Armazenamento cheio'));
   }catch(error){reject(error);}
  });
 }
 function clearAudio(){
  player.pause();player.removeAttribute('src');player.load();
  if(objectURL){URL.revokeObjectURL(objectURL);objectURL='';}
 }
 async function update(){
  const rows=await list();if(disposed)return rows;
  const previous=selectedId;
  selector.replaceChildren();
  const placeholder=document.createElement('option');
  placeholder.value='';placeholder.textContent=rows.length?'Selecione uma música':'Nenhuma música salva neste dispositivo';
  selector.append(placeholder);
  for(const row of rows){
   const opt=document.createElement('option');opt.value=row.key;opt.textContent=row.name;selector.append(opt);
  }
  if(rows.some(x=>x.key===previous))selector.value=previous;
  else{selectedId='';clearAudio();}
  remove.disabled=!selector.value;
  return rows;
 }
 async function choose(key){
  if(disposed)return;
  selectedId=key;clearAudio();remove.disabled=!key;
  if(!key)return;
  const rows=await list();if(disposed||selectedId!==key)return;
  const row=rows.find(x=>x.key===key);
  if(!row){say('Música não encontrada.');return;}
  objectURL=URL.createObjectURL(row.blob);
  player.src=objectURL;
  say('Pronta para reproduzir. A música toca apenas neste navegador.');
 }
 selector.addEventListener('change',()=>{void choose(selector.value).catch(error=>say(error.message));});
 input.addEventListener('change',async()=>{
  const files=Array.from(input.files||[]);input.value='';
  if(!files.length)return;input.disabled=true;
  try{
   let rows=await list();
   let bytes=rows.reduce((total,item)=>total+(item.size||0),0);
   let added=0;
   for(const file of files){
    const ext=file.name.split('.').pop()?.toLowerCase();
    if(!['mp3','ogg','wav','m4a','webm','aac','flac'].includes(ext||'')){
     say('Arquivo ignorado: '+file.name+' (formato de áudio não aceito).');continue;
    }
    if(!file.size||file.size>MAX_FILE){say('Limite de 25 MB por música: '+file.name);continue;}
    if(rows.length>=MAX_TRACKS||bytes+file.size>MAX_TOTAL){
     say('Limite local: 24 músicas ou 120 MB nesta campanha.');break;
    }
    const record={key:PREFIX+crypto.randomUUID(),name:file.name.slice(0,140),
     blob:new Blob([file],{type:file.type||'application/octet-stream'}),
     size:file.size,created:Date.now()};
    try{await write(record,'put');rows.push(record);bytes+=file.size;added++;}
    catch(error){say('Não foi possível guardar '+file.name+': '+error.message);break;}
   }
   await update();
   if(added)say(added+' música(s) salva(s) apenas neste dispositivo.');
  }catch(error){say(error.message||'Falha no armazenamento local.');}
  finally{input.disabled=false;}
 });
 remove.addEventListener('click',async()=>{
  if(!selectedId)return;
  const key=selectedId;
  try{
   await write({key},'delete');
   if(selectedId===key){selectedId='';clearAudio();}
   await update();say('Música excluída deste dispositivo.');
  }catch(error){say(error.message);}
 });
 void update().then(()=>say('Biblioteca local pronta.')).catch(error=>say(error.message));
 return ()=>{disposed=true;clearAudio();panel.remove();};
}
