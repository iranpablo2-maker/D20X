/* Música do NEX Tabletop: biblioteca privada do navegador.
   Nunca envia áudio ao Firestore, R2 ou outras APIs. */
export function mountNexLocalMusic({uid,campaignId,root}){
 if(!root||!uid||!campaignId)return ()=>{};
 const PREFIX=String(uid)+':'+String(campaignId)+':';
 const DB_NAME='nex-vtt-local-music-v1',STORE='tracks';
 const MAX_TRACKS=24,MAX_FILE=25*1024*1024,MAX_TOTAL=120*1024*1024;
 let disposed=false,selectedId='',objectURL='',dbPromise=null;
 let audioContext=null,audioSource=null,audioDestination=null;
 const panel=document.createElement('details');
 panel.className='nex-vtt-local-music';
 panel.style.cssText='margin:10px 0;padding:10px;border:1px solid #6a353b;border-radius:8px;background:#181417;color:#f4e8e8;';
 const header=document.createElement('summary');
 header.textContent='♫ Músicas e sons locais';
 header.style.cssText='cursor:pointer;font-weight:650;font-size:13px;';
 const subtitle=document.createElement('p');
 subtitle.textContent='Músicas armazenadas somente neste dispositivo. Durante a sessão, o som será transmitido ao vivo aos jogadores conectados, sem enviar o arquivo.';
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
 // Biblioteca organizada em playlists, mantendo o mesmo player para WebRTC.
 const playlistKey='nex-vtt-playlists:'+PREFIX;
 let playlistState={groups:[{id:'default',name:'Minhas músicas'}],assignment:{}};
 try{const saved=JSON.parse(localStorage.getItem(playlistKey)||'null');if(saved&&Array.isArray(saved.groups)&&saved.groups.length)playlistState=saved;}catch(_){}
 const expandedGroups=new Set(['default']),songList=document.createElement('div');
 let repeatTrack=false,repeatPlaylist=false,randomPlay=false,playingGroup='default',targetGroup='default',draggedSongKey='';
 if(!playlistState.order||typeof playlistState.order!=='object')playlistState.order={};
 const playlistToolbar=document.createElement('div');playlistToolbar.className='nex-music-playlist-toolbar';
 const newList=document.createElement('button');newList.type='button';newList.textContent='＋ Nova playlist';
 const uploadButton=document.createElement('button');uploadButton.type='button';uploadButton.textContent='＋ Adicionar músicas';
 playlistToolbar.append(newList,uploadButton);
 panel.insertBefore(playlistToolbar,input);
 panel.insertBefore(songList,selector);
 selector.hidden=true;player.hidden=true;remove.hidden=true;input.hidden=true;subtitle.hidden=true;
 const playlistStyles=document.createElement('style');playlistStyles.textContent=
 '#roomTabletopPanel .nex-music-playlist-toolbar{display:flex;gap:5px;margin:8px 0;flex-wrap:wrap}'+
 '#roomTabletopPanel #nexVttMainMenu .nex-music-playlist-toolbar button{width:auto!important;min-height:29px!important;font-size:11px!important;padding:5px 7px!important}'+
 '#roomTabletopPanel .nex-music-playlist-group{padding:5px 0;border-bottom:1px solid #414656}'+
 '#roomTabletopPanel .nex-music-playlist-header{display:flex;align-items:center;gap:4px;min-width:0}'+
 '#roomTabletopPanel .nex-music-playlist-title{flex:1;font-size:12px;font-weight:650;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}'+
 '#roomTabletopPanel #nexVttMainMenu .nex-music-playlist-header button,#roomTabletopPanel #nexVttMainMenu .nex-music-song button{background:transparent!important;border:0!important;width:25px!important;min-width:25px!important;min-height:25px!important;height:25px!important;padding:2px!important;font-size:15px!important;box-shadow:none!important;display:inline-flex!important;align-items:center!important;justify-content:center!important}'+
 '#roomTabletopPanel #nexVttMainMenu .nex-music-playlist-header button[aria-pressed=true],#roomTabletopPanel #nexVttMainMenu .nex-music-song button[aria-pressed=true]{color:#7fe3aa!important}'+
 '#roomTabletopPanel .nex-music-song{margin:4px 0 4px 14px;padding:5px 0;border-top:1px solid #39404e;min-width:0}'+
 '#roomTabletopPanel .nex-music-song-name{font-size:11px;font-weight:600;display:block;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
 '#roomTabletopPanel .nex-music-song-controls{display:flex;align-items:center;gap:3px}'+
 '#roomTabletopPanel .nex-music-song-controls input[type=range]{flex:1;width:20px;min-width:20px;accent-color:#36afda}'+
 '#roomTabletopPanel .nex-music-song-header{display:flex;align-items:center;gap:5px;min-width:0}'+
 '#roomTabletopPanel .nex-music-song-header .nex-music-song-name{flex:1;min-width:0}'+
 '#roomTabletopPanel #nexVttMainMenu .nex-music-song-header button.nex-music-drag-handle{cursor:grab!important;touch-action:none!important;flex:0 0 25px!important;font-size:16px!important}'+
 '#roomTabletopPanel .nex-music-playlist-group.nex-music-drop-target,#roomTabletopPanel .nex-music-song.nex-music-drop-target{outline:1px dashed #6fd6c1!important;background:rgba(71,187,160,.1)!important}';
 document.head.append(playlistStyles);
 const savePlaylists=()=>{try{localStorage.setItem(playlistKey,JSON.stringify(playlistState));}catch(_){}};
 function tinyButton(label,title,callback,active){
  const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);
  if(active!==undefined)b.setAttribute('aria-pressed',String(active));
  b.addEventListener('click',callback);return b;
 }
 function groupTracks(rows,id){
  const included=rows.filter(row=>(playlistState.assignment[row.key]||'default')===id);
  const order=playlistState.order[id]||[];
  return included.sort((a,b)=>{
   const ai=order.indexOf(a.key),bi=order.indexOf(b.key);
   return (ai<0?100000:ai)-(bi<0?100000:bi)||a.name.localeCompare(b.name,'pt-BR');
  });
 }
 function moveSong(key,groupId,beforeKey=''){
  if(!key||!playlistState.groups.some(g=>g.id===groupId))return;
  const oldGroup=playlistState.assignment[key]||'default';
  // Preserva a ordem visível antes de mudar o grupo da música.
  const next=groupTracksCached(groupId).filter(k=>k!==key);
  for(const id of Object.keys(playlistState.order))playlistState.order[id]=playlistState.order[id].filter(k=>k!==key);
  playlistState.assignment[key]=groupId;
  const index=beforeKey?next.indexOf(beforeKey):-1;
  next.splice(index>=0?index:next.length,0,key);
  playlistState.order[groupId]=next;
  if(oldGroup!==groupId&&selectedId===key)playingGroup=groupId;
  expandedGroups.add(groupId);savePlaylists();
  void update().catch(e=>say(e.message));
 }
 let renderedRows=[];
 function groupTracksCached(groupId){return groupTracks(renderedRows,groupId).map(row=>row.key);}
 function acceptSongDrop(event,groupId,beforeKey=''){
  event.preventDefault();event.stopPropagation();
  const key=draggedSongKey||event.dataTransfer?.getData('text/plain');
  draggedSongKey='';
  if(key&&renderedRows.some(row=>row.key===key))moveSong(key,groupId,beforeKey);
 }
 function enableDrop(node,groupId,beforeKey=''){
  node.addEventListener('dragover',event=>{if(!draggedSongKey&&!event.dataTransfer?.types?.includes('text/plain'))return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move';node.classList.add('nex-music-drop-target');});
  node.addEventListener('dragleave',event=>{if(!node.contains(event.relatedTarget))node.classList.remove('nex-music-drop-target');});
  node.addEventListener('drop',event=>{node.classList.remove('nex-music-drop-target');acceptSongDrop(event,groupId,beforeKey);});
 }
 function drawPlaylists(rows){
  if(disposed)return;
  renderedRows=rows;
  songList.replaceChildren();
  for(const group of playlistState.groups){
   const block=document.createElement('section');block.className='nex-music-playlist-group';
   const head=document.createElement('div');head.className='nex-music-playlist-header';
   enableDrop(block,group.id);
   const opened=expandedGroups.has(group.id);
   head.append(tinyButton(opened?'▾':'▸','Expandir ou recolher',()=>{opened?expandedGroups.delete(group.id):expandedGroups.add(group.id);drawPlaylists(rows);}));
   const name=document.createElement('span');name.className='nex-music-playlist-title';name.textContent=group.name;head.append(name);
   head.append(tinyButton('▶','Reproduzir playlist',async()=>{
    const songs=groupTracks(rows,group.id);if(!songs.length)return;playingGroup=group.id;
    await choose(songs[0].key);void player.play().catch(e=>say(e.message));
   }));
   head.append(tinyButton('⤨','Aleatório',()=>{randomPlay=!randomPlay;drawPlaylists(rows);},randomPlay));
   head.append(tinyButton('↻','Repetir playlist',()=>{repeatPlaylist=!repeatPlaylist;drawPlaylists(rows);},repeatPlaylist));
   head.append(tinyButton('⋮','Excluir playlist',async()=>{
    const others=playlistState.groups.filter(g=>g.id!==group.id);
    if(!others.length){say('Crie outra playlist antes de excluir a única playlist.');return;}
    if(!confirm('Excluir a playlist "'+group.name+'"? As músicas serão mantidas e movidas para "'+others[0].name+'".'))return;
    const destination=others[0].id;
    for(const row of rows){
     if((playlistState.assignment[row.key]||'default')===group.id)playlistState.assignment[row.key]=destination;
    }
    const previous=playlistState.order[group.id]||[];
    playlistState.order[destination]=[...(playlistState.order[destination]||[]),...previous.filter(k=>!playlistState.order[destination]?.includes(k))];
    delete playlistState.order[group.id];
    playlistState.groups=others;expandedGroups.delete(group.id);expandedGroups.add(destination);
    if(playingGroup===group.id)playingGroup=destination;
    // O grupo principal permanece como identificador de compatibilidade para músicas antigas.
    if(group.id==='default'){
     for(const row of rows)if(!playlistState.assignment[row.key])playlistState.assignment[row.key]=destination;
    }
    savePlaylists();drawPlaylists(rows);say('Playlist excluída. Músicas preservadas.');
   }));
   block.append(head);
   if(opened)for(const row of groupTracks(rows,group.id)){
    const song=document.createElement('div');song.className='nex-music-song';
    const title=document.createElement('span');title.className='nex-music-song-name';title.textContent=row.name;title.title=row.name;
    const songHeader=document.createElement('div');songHeader.className='nex-music-song-header';
    const grip=tinyButton('☰','Arrastar música para uma playlist ou mudar a ordem',()=>{});
    grip.className='nex-music-drag-handle';grip.draggable=true;grip.setAttribute('aria-label','Arrastar '+row.name);
    grip.addEventListener('dragstart',event=>{
     draggedSongKey=row.key;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain',row.key);
    });
    grip.addEventListener('dragend',()=>{draggedSongKey='';songList.querySelectorAll('.nex-music-drop-target').forEach(n=>n.classList.remove('nex-music-drop-target'));});
    songHeader.append(grip,title);song.append(songHeader);
    enableDrop(song,group.id,row.key);
    const controls=document.createElement('div');controls.className='nex-music-song-controls';
    controls.append(tinyButton(selectedId===row.key&&!player.paused?'❚❚':'▶','Reproduzir ou pausar',async()=>{
     if(selectedId===row.key&&!player.paused){player.pause();drawPlaylists(rows);return;}
     playingGroup=group.id;await choose(row.key);void player.play().then(()=>drawPlaylists(rows)).catch(e=>say(e.message));
    }));
    controls.append(tinyButton('↻','Repetir música',()=>{repeatTrack=!repeatTrack;drawPlaylists(rows);},repeatTrack&&selectedId===row.key));
    const vol=document.createElement('input');vol.type='range';vol.min='0';vol.max='100';vol.value=String(Math.round(player.volume*100));
    vol.setAttribute('aria-label','Volume');vol.addEventListener('input',()=>{player.volume=Number(vol.value)/100;});controls.append(vol);
    controls.append(tinyButton('⋮','Excluir música',async()=>{
     if(!confirm('Excluir definitivamente esta música do dispositivo?'))return;
     try{
      await write({key:row.key},'delete');
      if(selectedId===row.key){selectedId='';clearAudio();}
      delete playlistState.assignment[row.key];
      for(const id of Object.keys(playlistState.order))playlistState.order[id]=playlistState.order[id].filter(k=>k!==row.key);
      savePlaylists();await update();say('Música excluída.');
     }catch(e){say(e.message);}
    }));
    song.append(controls);block.append(song);
   }
   songList.append(block);
  }
 }
 newList.addEventListener('click',()=>{
  const name=prompt('Nome da nova playlist:')?.trim();if(!name)return;
  if(playlistState.groups.length>=20)return say('Máximo de 20 playlists.');
  const id='playlist_'+crypto.randomUUID();playlistState.groups.push({id,name:name.slice(0,80)});expandedGroups.add(id);savePlaylists();void update();
 });
 uploadButton.addEventListener('click',()=>{targetGroup=playlistState.groups[0]?.id||'default';input.click();});
 player.addEventListener('ended',async()=>{
  const rows=await list();if(disposed)return;
  if(repeatTrack){player.currentTime=0;void player.play().catch(()=>{});return;}
  const songs=groupTracks(rows,playingGroup),index=songs.findIndex(r=>r.key===selectedId);
  let next=null;
  if(randomPlay&&songs.length>1){const others=songs.filter(r=>r.key!==selectedId);next=others[Math.floor(Math.random()*others.length)];}
  else if(index>=0&&index<songs.length-1)next=songs[index+1];
  else if(repeatPlaylist)next=songs[0];
  if(next){await choose(next.key);void player.play().catch(e=>say(e.message));}
  else drawPlaylists(rows);
 });
 player.addEventListener('pause',()=>{void list().then(drawPlaylists).catch(()=>{});});
 player.addEventListener('play',()=>{void list().then(drawPlaylists).catch(()=>{});});
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
 function audioStream(){
  if(!audioDestination){
   const AudioContextType=window.AudioContext||window.webkitAudioContext;
   if(!AudioContextType)throw Error('Este navegador não permite transmitir áudio diretamente.');
   audioContext=new AudioContextType();
   audioSource=audioContext.createMediaElementSource(player);
   audioDestination=audioContext.createMediaStreamDestination();
   audioSource.connect(audioContext.destination);
   audioSource.connect(audioDestination);
  }
  return audioDestination.stream;
 }
 player.addEventListener('play',()=>{
  try{audioStream();void audioContext?.resume().catch(error=>say('Áudio bloqueado pelo navegador: '+error.message));}
  catch(error){say('Transmissão de música indisponível: '+error.message);}
 });
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
  drawPlaylists(rows);
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
  say('Pronta para reproduzir. Ao iniciar a sessão, os jogadores também poderão escutar ao vivo.');
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
    try{await write(record,'put');playlistState.assignment[record.key]=targetGroup;savePlaylists();rows.push(record);bytes+=file.size;added++;}
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
 const dispose=()=>{disposed=true;clearAudio();void audioContext?.close().catch(()=>{});panel.remove();playlistStyles.remove();};
 dispose.getStream=audioStream;
 return dispose;
}
