/* NEX Tabletop — base: mapa, grade, tokens, variantes 0-9 e sincronização. */
import {createVttMediaCache} from './nex-vtt-media-cache.js?v=20261117r2cache1';
import {mountNexLocalMusic} from './nex-vtt-local-music.js?v=20261117localmusic2';
import {mountNexPeerMedia} from './nex-vtt-peer-media.js?v=20261117largescene1';
import {createVttLocalScene} from './nex-vtt-local-scene.js?v=20261117localscene1';
export function mountNexTabletop({db,doc,onSnapshot,setDoc,getDoc,deleteDoc,writeBatch,collection,campaignId,uid,gm,getIdToken=null,getSheets=()=>[],updateResource=null,onSelectSheet=null}){
 const $=id=>document.getElementById(id),board=$('nexTabletopBoard'),tools=$('nexTabletopTools'),status=$('nexTabletopMessage');
 if(!board||!tools)return ()=>{};
 const ref=doc(db,'campaigns',campaignId,'tabletop','state');
 const GRID=48,W=25,H=25;
 const r2Pattern=/^r2:((?:atmo|map|asset)_[A-Za-z0-9_-]+):(gif|png|jpeg|webp)$/;
 const isR2Media=src=>typeof src==='string'&&r2Pattern.test(src);
 const mediaCache=createVttMediaCache(uid,campaignId);
 const localSceneStore=createVttLocalScene(uid,campaignId);
 const mediaMemory=new Map(),mediaPending=new Map(),mediaFailed=new Set();
 // Todos os novos arquivos ficam neste dispositivo. Participantes conectam ao mestre via WebRTC.
 // Mídias antigas em Firestore e R2 continuam legíveis, sem migração ou exclusão.
 const musicRoot=document.getElementById('nexVttImmersionMusicHost')||tools;
 const localAudioCleanup=gm?mountNexLocalMusic({uid,campaignId,root:musicRoot}):()=>{};
 let peerMedia=null;
 const localMediaPattern=/^local:(?:atmo|map|asset)_[A-Za-z0-9_-]+:(?:gif|png|jpeg|webp|webm)$/;
 const isLocalMedia=src=>typeof src==='string'&&localMediaPattern.test(src);
 const isWebmMap=src=>typeof src==='string'&&(/:webm$/.test(src)||src.startsWith('data:video/webm;'));
 const mapVideo=document.createElement('video');mapVideo.className='nex-vtt-map-video';mapVideo.muted=true;mapVideo.loop=true;mapVideo.autoplay=true;mapVideo.playsInline=true;mapVideo.preload='metadata';mapVideo.controls=false;mapVideo.setAttribute('aria-hidden','true');mapVideo.style.cssText='position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none;z-index:0;display:none';board.prepend(mapVideo);
 let mapWidth=GRID*W,mapHeight=GRID*H,lastMapSource=null,renderedMapSource=null,mapLoadId=0;
 function mapGeometry(){
   board.style.setProperty('--nex-board-width',mapWidth+'px');
   board.style.setProperty('--nex-board-height',mapHeight+'px');
   board.style.setProperty('--nex-grid-width',(100/W)+'%');
   board.style.setProperty('--nex-grid-height',(100/H)+'%');
   board.style.width=mapWidth+'px';board.style.height=mapHeight+'px';
 }
 mapGeometry();
 function updateMapGeometry(){
  const src=visibleMediaSource(scene.map);
  if(lastMapSource===src)return;
  lastMapSource=src;const loadId=++mapLoadId;
  if(!src){mapWidth=GRID*W;mapHeight=GRID*H;mapGeometry();board.style.visibility='visible';return;}
  board.style.visibility='hidden';
  const useDimensions=(width,height)=>{
   if(disposed||loadId!==mapLoadId)return;
   const ratio=Math.max(.05,Math.min(20,width/Math.max(1,height)));
   mapWidth=Math.max(120,Math.round((GRID*W)*Math.min(1,ratio)));
   mapHeight=Math.max(120,Math.round((GRID*H)*Math.min(1,1/ratio)));
   mapGeometry();render();
   if(typeof vttFitZoom==='function')vttFitZoom();
   board.style.visibility='visible';
  };
  const fallback=()=>{if(loadId!==mapLoadId)return;mapWidth=GRID*W;mapHeight=GRID*H;mapGeometry();render();board.style.visibility='visible';};
  if(isWebmMap(scene.map)){
   const probe=document.createElement('video');probe.preload='metadata';probe.muted=true;
   probe.onloadedmetadata=()=>{useDimensions(probe.videoWidth||GRID*W,probe.videoHeight||GRID*H);probe.removeAttribute('src');probe.load();};
   probe.onerror=fallback;probe.src=src;
  }else{
   const img=new Image();img.onload=()=>useDimensions(img.naturalWidth,img.naturalHeight);
   img.onerror=fallback;img.src=src;
  }
 }
 const empty=()=>({map:'',tokens:[],drawings:[],atmosphere:{type:'none',intensity:45,animated:true,image:''},atmosphereLayers:[],fogEnabled:false,revealed:[],gridVisible:true,turns:[],combatLog:[],library:{tokenImages:[],maps:[]}});
 let scene=empty(),selectedId=null,resizeSelectedId=null,drag=null,remoteReady=false,pending=false,queued=false,disposed=false,saveFailed=false,uploading=0,localDirty=false;
 const backupKey='nex-vtt-pending:'+campaignId;
 let recoveredBackup=null;
 try{
  const raw=localStorage.getItem(backupKey);
  if(raw){
   const parsed=JSON.parse(raw);
   if(parsed?.format==='nex-tabletop-pending-v1'&&Array.isArray(parsed.scene?.tokens))recoveredBackup=parsed.scene;
  }
 }catch(error){console.warn('NEX VTT: backup local indisponível',error);}
 function saveBackup(){
  if(!gm||disposed)return;
  try{
   localStorage.setItem(backupKey,JSON.stringify({format:'nex-tabletop-pending-v1',scene:validScene(scene),savedAt:Date.now()}));
  }catch(error){
   console.warn('NEX VTT: sem espaço para backup local',error);
   console.warn('O backup de emergência no localStorage não coube; IndexedDB será a fonte principal.');
  }
 }
 function clearBackup(){try{localStorage.removeItem(backupKey);}catch(_){}}
 const handlers=[];
 const listen=(el,type,fn,opts)=>{el?.addEventListener(type,fn,opts);handlers.push(()=>el?.removeEventListener(type,fn,opts));};
 const saveNotice=document.createElement('div');saveNotice.id='nexVttSyncNotice';saveNotice.hidden=true;
 const saveText=document.createElement('span');
 const retrySave=document.createElement('button');retrySave.type='button';retrySave.textContent='Tentar salvar novamente';
 saveNotice.append(saveText,retrySave);
 status.insertAdjacentElement('afterend',saveNotice);
 const message=t=>{status.textContent=t;status.classList.toggle('vtt-silent-status',/^Mesa (pronta|sincronizada|salva)/.test(t));};
 const warnSync=detail=>{saveFailed=true;saveText.textContent=detail;saveNotice.hidden=false;};
 const clearSync=()=>{saveFailed=false;saveNotice.hidden=true;};
 listen(retrySave,'click',()=>{if(!gm)return;retrySave.disabled=true;save().finally(()=>{retrySave.disabled=false;});});
 if(gm){
  const storagePanel=document.createElement('div');
  storagePanel.style.cssText='margin:10px 0;padding:10px;border:1px solid #5d3b44;border-radius:8px;color:#ddd;font-size:12px';
  const storageLabel=document.createElement('div');
  storageLabel.textContent='Armazenamento do Tabletop no Brave';
  storageLabel.style.fontWeight='bold';
  const storageInfo=document.createElement('p');
  storageInfo.style.cssText='margin:6px 0;color:#c6bcc0';
  const persistButton=document.createElement('button');
  persistButton.type='button';persistButton.textContent='Proteger dados locais';
  persistButton.style.cssText='background:#702a35;color:#fff;border:1px solid #a44b55;padding:7px;border-radius:6px';
  storagePanel.append(storageLabel,storageInfo,persistButton);
  musicRoot.append(storagePanel);
  const showStorage=async()=>{
   if(!navigator.storage?.estimate){storageInfo.textContent='Este navegador não informa a capacidade local.';return;}
   try{
    const {usage,quota}=await navigator.storage.estimate();
    const mb=n=>((n||0)/(1024*1024)).toFixed(1)+' MB';
    storageInfo.textContent='Uso total estimado do site: '+mb(usage)+' / quota estimada: '+mb(quota)+'. A quota não é espaço reservado.';
    if(await navigator.storage.persisted?.())persistButton.textContent='Armazenamento persistente ativado';
   }catch(error){storageInfo.textContent='Não foi possível consultar o armazenamento.';}
  };
  listen(persistButton,'click',async()=>{
   try{
    const granted=await navigator.storage?.persist?.();
    message(granted?'Armazenamento persistente permitido pelo navegador.':'O Brave não concedeu persistência; faça backups regularmente.');
    await showStorage();
   }catch(error){message('Persistência indisponível neste navegador.');}
  });
  void showStorage();
  handlers.push(()=>storagePanel.remove());
 }
 const selected=()=>scene.tokens.find(t=>t.id===selectedId);
 const linkedSheet=t=>t?.linkedSheetId?getSheets().find(s=>s.id===t.linkedSheetId):null;
 const tokenStat=(t,f)=>{const sh=linkedSheet(t);return Math.max(0,Math.trunc(Number(sh?(sh.fullSheet?.[f+'Current']??sh[f]??t[f]):t[f])||0));};
 const tokenMax=(t,f)=>{const sh=linkedSheet(t),raw=sh?.fullSheet||{};const v=raw[f+'Max']??raw['max'+f[0].toUpperCase()+f.slice(1)]??t[f+'Max'];return Math.max(0,Number(v)||0);};
 const isTyping=e=>e.target?.closest?.('input,textarea,select,[contenteditable="true"]');
 tools.hidden=!gm;
 $('nexTabletopRole').textContent=gm?'Mestre':'Jogador';
 const control=document.createElement('div');control.id='nexTtVariants';
 control.innerHTML='<label>Token selecionado <strong id="nexTtSelected">Nenhum</strong></label><label>Variação <select id="nexTtSlot"></select></label><label>Imagem/GIF da variação <input id="nexTtVariantFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><button id="nexTtDelete" type="button" class="alt">Excluir token</button>';
 control.className='nex-tabletop-tools';control.hidden=!gm;
 tools.insertAdjacentElement('afterend',control);

 const css=document.createElement('style');css.textContent='#nexTabletopTools[hidden],#nexTtVariants[hidden]{display:none!important}#nexTtVariants{border:1px solid #4e2f38;border-radius:8px;padding:9px;margin:8px 0}#nexTtVariants select{background:#1a1317;color:white;border:1px solid #6c3b49;border-radius:5px;padding:8px;min-width:130px}#nexTabletopBoard .nex-tabletop-token[data-selected="true"]{outline:3px solid #ffbd6d;outline-offset:3px}#nexTabletopBoard .nex-tabletop-token img{width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none}';document.head.append(css);
  const tokenResizeCss=document.createElement('style');
 tokenResizeCss.id='nex-token-image-resize-style';
 tokenResizeCss.textContent=`
 #roomTabletopPanel #nexTabletopBoard .nex-tabletop-token{
  border:0!important;border-radius:0!important;box-shadow:none!important;
  background:transparent!important;overflow:visible!important;padding:0!important;
  box-sizing:border-box!important;outline:none!important;touch-action:none!important;
 }
 #roomTabletopPanel #nexTabletopBoard .nex-tabletop-token img{
  width:100%!important;height:100%!important;object-fit:contain!important;
  border:0!important;border-radius:0!important;box-shadow:none!important;
  background:transparent!important;pointer-events:none!important;
 }
 #roomTabletopPanel #nexTabletopBoard .nex-tabletop-token[data-selected="true"]{
  outline:none!important;outline-offset:0!important;
 }
 #roomTabletopPanel #nexTabletopBoard .nex-tabletop-token[data-resize-selected="true"]::after{
  content:'';position:absolute;inset:0;border:1px solid #91b7fc;pointer-events:none;
 }
 #roomTabletopPanel #nexTabletopBoard .nex-tabletop-token:not([data-resize-selected="true"]) .nex-token-resize-handle{display:none!important}
 #roomTabletopPanel #nexTabletopBoard .nex-token-resize-handle{
  position:absolute!important;z-index:15!important;
  display:block!important;box-sizing:border-box!important;
  width:10px!important;height:10px!important;min-width:10px!important;
  background:#91b7fc!important;border:1px solid #5986d6!important;
  border-radius:0!important;overflow:visible!important;pointer-events:auto!important;
  max-width:none!important;white-space:normal!important;touch-action:none!important;
 }
 #roomTabletopPanel .nex-token-resize-handle[data-resize="nw"]{top:-5px;left:-5px;cursor:nwse-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="n"]{top:-5px;left:calc(50% - 5px);cursor:ns-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="ne"]{top:-5px;right:-5px;cursor:nesw-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="e"]{top:calc(50% - 5px);right:-5px;cursor:ew-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="se"]{bottom:-5px;right:-5px;cursor:nwse-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="s"]{bottom:-5px;left:calc(50% - 5px);cursor:ns-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="sw"]{bottom:-5px;left:-5px;cursor:nesw-resize}
 #roomTabletopPanel .nex-token-resize-handle[data-resize="w"]{top:calc(50% - 5px);left:-5px;cursor:ew-resize}
 `;
 document.head.append(tokenResizeCss);
const slot=$('nexTtSlot');for(let k=0;k<10;k++){const o=document.createElement('option');o.value=k;o.textContent=k===0?'0 · Especial':k+' · Variação';slot.append(o);}
 const stateOK=value=>value&&typeof value==='object'&&Array.isArray(value.tokens);
 function validScene(data){
  if(!stateOK(data))return empty();
  return {library:{maps:Array.isArray(data.library?.maps)?data.library.maps.slice(0,30).filter(m=>m&&typeof m.id==='string'&&typeof m.src==='string'&&(isLocalMedia(m.src)||isR2Media(m.src)||(/^data:(?:image\/(?:gif|png|jpeg|webp)|video\/webm);base64,/.test(m.src)&&m.src.length<650000))).map(m=>({id:m.id.slice(0,100),name:String(m.name||'Mapa').slice(0,100),src:m.src})):[],tokenImages:Array.isArray(data.library?.tokenImages)?data.library.tokenImages.slice(0,20).filter(a=>a&&typeof a.id==='string'&&typeof a.src==='string'&&(/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(a.src)&&a.src.length<=55000||/^firestore:asset_[A-Za-z0-9_-]+:([1-9]|[12][0-9]|3[0-2]):(gif|png|jpeg|webp)$/.test(a.src)||isLocalMedia(a.src)||isR2Media(a.src))).map(a=>({id:a.id.slice(0,90),name:String(a.name||'Imagem').slice(0,90),src:a.src,groupId:typeof a.groupId==='string'?a.groupId.slice(0,100):'',slot:Number.isInteger(a.slot)&&a.slot>=0&&a.slot<=9?a.slot:1})):[]},map:typeof data.map==='string'&&(data.map.length<650000&&/^data:(?:image\/(?:png|jpeg|webp|gif)|video\/webm);base64,/i.test(data.map)||/^firestore:map_[A-Za-z0-9_-]+:([1-9]|[12][0-9]|3[0-2]):(gif|png|jpeg|webp)$/.test(data.map)||isLocalMedia(data.map)||isR2Media(data.map))?data.map:'',atmosphereLayers:Array.isArray(data.atmosphereLayers)?data.atmosphereLayers.slice(0,8).filter(a=>a&&typeof a.id==='string'&&typeof a.src==='string'&&(a.src.length<=180000&&/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(a.src)||(a.src.startsWith('storage:campaigns/'+campaignId+'/atmospheres/')&&/^atmo_[a-zA-Z0-9_-]+$/.test(a.src.slice(('storage:campaigns/'+campaignId+'/atmospheres/').length))||/^firestore:atmo_[a-zA-Z0-9_-]+:(?:[1-9]|[12][0-9]|3[0-2]):(?:gif|png|jpeg|webp)$/.test(a.src)||isLocalMedia(a.src)||isR2Media(a.src)))).map(a=>({id:a.id.slice(0,100),name:String(a.name||'Atmosfera').slice(0,90),src:a.src,enabled:a.enabled!==false,opacity:Math.max(0,Math.min(100,Math.round(Number.isFinite(Number(a.opacity))&&a.opacity!=null?Number(a.opacity):100)))})):(typeof data.atmosphere?.image==='string'&&/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(data.atmosphere.image)&&data.atmosphere.image.length<=180000?[{id:'atmo_legacy',name:'Atmosfera anterior',src:data.atmosphere.image,enabled:data.atmosphere.type!=='none',opacity:Math.max(0,Math.min(100,Number(data.atmosphere.intensity)??100))}]:[]),atmosphere:{type:['none','mist','rain','snow','dark','embers','custom'].includes(data.atmosphere?.type)?data.atmosphere.type:'none',intensity:Number.isFinite(Number(data.atmosphere?.intensity))&&data.atmosphere?.intensity!=null?Math.max(0,Math.min(100,Math.round(Number(data.atmosphere.intensity)))):45,animated:data.atmosphere?.animated!==false,image:''},drawings:Array.isArray(data.drawings)?data.drawings.slice(-160):[],fogEnabled:!!data.fogEnabled,revealed:Array.isArray(data.revealed)?data.revealed.slice(-150):[],gridVisible:data.gridVisible!==false,turns:Array.isArray(data.turns)?data.turns.slice(0,90).map(x=>String(x).slice(0,35)):[],combatLog:Array.isArray(data.combatLog)?data.combatLog.slice(-40).map(x=>({id:String(x.id||'').slice(0,100),label:String(x.label||'').slice(0,150),at:Number(x.at)||0})):[],tokens:data.tokens.slice(0,90).filter(t=>t&&typeof t.id==='string'&&typeof t.name==='string').map(t=>({
   id:t.id.slice(0,100),name:t.name.slice(0,35),x:Math.max(0,Math.min(W-.5,Math.round((Number(t.x)||0)*100)/100)),y:Math.max(0,Math.min(H-.5,Math.round((Number(t.y)||0)*100)/100)),
   variation:Math.max(0,Math.min(9,Math.floor(Number(t.variation)||0))),linkedSheetId:typeof t.linkedSheetId==='string'?t.linkedSheetId.slice(0,150):'',
   images:Array.isArray(t.images)?Array.from({length:Math.min(10,t.images.length)},(_,i)=>{const url=t.images[i];return typeof url==='string'&&url.length<650000?url:'';}):[],pv:Number(t.pv)||0,pe:Number(t.pe)||0,san:Number(t.san)||0,pvMax:Math.max(0,Number(t.pvMax)||0),peMax:Math.max(0,Number(t.peMax)||0),sanMax:Math.max(0,Number(t.sanMax)||0),defense:Math.max(0,Number(t.defense)||0),size:Math.max(1,Math.min(3,Number(t.size)||1)),widthCells:Math.max(.5,Math.min(10,Number(t.widthCells)||Number(t.size)||1)),heightCells:Math.max(.5,Math.min(10,Number(t.heightCells)||Number(t.size)||1)),rotation:Number(t.rotation)||0,hidden:!!t.hidden,locked:!!t.locked
  }))};
 }
 if(recoveredBackup){scene=validScene(recoveredBackup);localDirty=true;queued=true;}
 // Infer groups for token collections created before the library gained
 // explicit group metadata. No changes to older saved scenes are required.
 function libraryAssets(){
  const assets=(scene.library?.tokenImages||[]).map(a=>({
   id:a.id,name:a.name,src:visibleMediaSource(a.src),groupId:a.groupId||'',slot:a.slot??1
  }));
  const byId=new Map(assets.map(a=>[a.id,a]));
  for(const token of scene.tokens){
   const refs=(token.images||[]).map((src,i)=>({id:typeof src==='string'&&src.startsWith('asset:')?src.slice(6):'',slot:i}))
    .filter(x=>byId.has(x.id));
   if(refs.length<2)continue;
   for(const item of refs){
    const asset=byId.get(item.id);
    if(!asset.groupId){asset.groupId=token.id;asset.slot=item.slot;}
   }
  }
  return assets;
 }
 function render(){
  if(disposed)return;
  board.querySelectorAll('.nex-tabletop-token').forEach(n=>n.remove());
  const resolvedMap=visibleMediaSource(scene.map);
  if(renderedMapSource!==resolvedMap){
   const video=isWebmMap(scene.map);
   board.style.backgroundImage=resolvedMap&&!video?'url("'+resolvedMap.replace(/"/g,'')+'")':'none';
   mapVideo.style.display=video&&resolvedMap?'block':'none';
   if(video&&resolvedMap){mapVideo.src=resolvedMap;void mapVideo.play().catch(()=>{});}
   else{mapVideo.pause();mapVideo.removeAttribute('src');}
   renderedMapSource=resolvedMap;
  }
  updateMapGeometry();
  for(const t of scene.tokens){
   if(t.hidden&&!gm)continue;
   const el=document.createElement('button');el.type='button';el.className='nex-tabletop-token';el.dataset.token=t.id;el.dataset.master=String(gm);el.dataset.selected=String(t.id===selectedId);el.dataset.resizeSelected=String(gm&&t.id===resizeSelectedId&&!t.locked);
   const cw=mapWidth/W,ch=mapHeight/H;
   // Keep tokens square even when a rectangular map has different X/Y cell sizes.
   // Their saved grid coordinates remain unchanged.
   const unit=Math.min(cw,ch);
   el.style.left=(t.x*cw)+'px';el.style.top=(t.y*ch)+'px';el.style.width=((t.widthCells||t.size||1)*unit)+'px';el.style.height=((t.heightCells||t.size||1)*unit)+'px';el.style.transform='rotate('+t.rotation+'deg)';el.title=t.name+' · Variação '+t.variation;el.setAttribute('aria-label',el.title);
   const portrait=linkedSheet(t)?.fullSheet?.photo||'';
   const safePortrait=typeof portrait==='string'&&(portrait.startsWith('https://')||/^data:image\/(?:png|jpeg|webp);base64,/i.test(portrait))?portrait:'';
   const selectedImage=t.images[t.variation]||'';
   const storedAsset=selectedImage.startsWith('asset:')?scene.library?.tokenImages?.find(a=>a.id===selectedImage.slice(6)):null;
   const tokenSource=storedAsset?.src||(selectedImage.startsWith('asset:')?'':selectedImage);
   const img=visibleMediaSource(tokenSource)||safePortrait||'';
   if(img){const image=document.createElement('img');image.src=img;image.alt=t.name;el.appendChild(image);}
   else{const span=document.createElement('span');span.textContent=t.name.slice(0,3).toUpperCase();el.appendChild(span);}

   if(gm&&t.id===resizeSelectedId&&!t.locked){
    for(const handle of ['nw','n','ne','e','se','s','sw','w']){
     const grip=document.createElement('span');grip.className='nex-token-resize-handle';
     grip.dataset.resize=handle;grip.title='Redimensionar token';grip.setAttribute('aria-hidden','true');
     el.append(grip);
    }
   }
   el.dataset.targeted=String(vttCombatTargets.has(t.id));
   board.appendChild(el);
  }
  renderAdvanced();
  renderCombatDock();
  refreshSceneStatus();
  const t=selected();$('nexTtSelected').textContent=t?t.name:'Nenhum';slot.disabled=!t;slot.value=String(t?.variation??1);
  $('nexTtVariantFile').disabled=!t;$('nexTtDelete').disabled=!t;
  window.dispatchEvent(new CustomEvent('nex:vtt-token-library-state',{detail:{
   assets:libraryAssets(),
   selectedId:t?.id||null,selectedName:t?.name||'',variation:t?.variation??1,
   tokenCount:scene.tokens.length,isMaster:gm,availableVariations:(selected()?.images||[]).map((img,i)=>img?i:null).filter(i=>i!==null),availableVariations:(t?.images||[]).map((img,i)=>img?i:null).filter(i=>i!==null)
  }}));
 }
 async function save(){
  if(!gm||disposed)return;
  queued=true;localDirty=true;saveBackup();
  if(!remoteReady||uploading||pending)return;
  pending=true;
  while(queued&&!disposed){
   queued=false;
   const data=JSON.parse(JSON.stringify(validScene(scene)));
   try{
    await localSceneStore.save(data);
    peerMedia?.broadcastScene(networkScene(data));
    if(!queued){localDirty=false;clearBackup();}
    clearSync();message('Mesa salva neste dispositivo.');
   }catch(error){
    localDirty=true;
    message('Não foi possível salvar a mesa no Brave.');
    warnSync('Falha no armazenamento local: '+String(error.message||error).slice(0,130));
    console.warn('NEX VTT: salvamento local falhou',error);
   }
  }
  pending=false;
 }
 function networkScene(data=scene){
  const shared=JSON.parse(JSON.stringify(validScene(data)));
  // Transmitir apenas a cena e o mapa exibido, não os mapas guardados.
  shared.library.maps=(shared.library.maps||[]).filter(map=>map.src===shared.map);
  return shared;
 }
 const reader=async(file,max,done)=>{
  if(!remoteReady){message('A mesa ainda está carregando. Tente novamente após carregar.');return;}
  if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type)){message('Escolha uma imagem PNG, JPG, WebP ou GIF.');return;}
  uploading++;
  const readOriginal=()=>new Promise((resolve,reject)=>{
   const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Leitura da imagem falhou'));r.readAsDataURL(file);
  });
  let bitmap;
  try{
   // No arbitrary input-file size cap: automatically encode to a safe size
   // for the existing Firestore scene document instead of rejecting the upload.
   if(file.size*1.38<max){
    const original=await readOriginal();
    if(typeof original==='string'&&original.length<=max){done(original);return;}
   }
   bitmap=await createImageBitmap(file);
   let width=bitmap.width,height=bitmap.height;
   if(!width||!height)throw Error('Imagem inválida');
   const dimension=max>200000?2200:820;
   const scale=Math.min(1,dimension/Math.max(width,height));
   width=Math.max(1,Math.round(width*scale));height=Math.max(1,Math.round(height*scale));
   const canvas=document.createElement('canvas');
   let optimized='';
   for(let attempt=0;attempt<16;attempt++){
    canvas.width=width;canvas.height=height;
    const ctx=canvas.getContext('2d');
    if(!ctx)throw Error('Canvas indisponível');
    ctx.clearRect(0,0,width,height);
    ctx.drawImage(bitmap,0,0,width,height);
    const quality=Math.max(.37,.83-attempt*.055);
    optimized=canvas.toDataURL('image/webp',quality);
    if(!optimized.startsWith('data:image/webp'))optimized=canvas.toDataURL('image/jpeg',quality);
    if(optimized.length<=max)break;
    const reduction=optimized.length>max*1.9?.68:.85;
    width=Math.max(1,Math.round(width*reduction));
    height=Math.max(1,Math.round(height*reduction));
   }
   if(optimized.length>max)throw Error('Imagem não pôde ser otimizada para esta cena');
   if(file.type==='image/gif')message('GIF grande: o NEX salvou uma imagem estática otimizada. Para manter a animação, use um GIF menor.');
   done(optimized);
  }catch(error){
   message('Não foi possível preparar a imagem: '+String(error.message||error));
  }finally{bitmap?.close?.();uploading=Math.max(0,uploading-1);if(queued&&remoteReady&&!pending)save();}
 };
 listen($('nexTabletopAddToken'),'click',()=>{
  if(!gm)return;const name=$('nexTabletopTokenName').value.trim().slice(0,35)||'Token';
  const taken=new Set(scene.tokens.map(t=>t.x+','+t.y));let x=1,y=1;
  outer:for(let row=1;row<H;row++)for(let col=1;col<W;col++)if(!taken.has(col+','+row)){x=col;y=row;break outer;}
  const t={id:'tt_'+crypto.randomUUID(),name,x,y,variation:1,images:[],size:1,widthCells:1.5,heightCells:1.5,rotation:0,pv:0,pe:0,san:0,pvMax:0,peMax:0,sanMax:0,defense:0,hidden:false,locked:false};scene.tokens.push(t);selectedId=t.id;$('nexTabletopTokenName').value='';render();save();
 });
 listen($('nexTabletopClearTokens'),'click',()=>{if(!gm||!confirm('Remover todos os tokens desta cena?'))return;scene.tokens=[];selectedId=null;render();save();});
 function ensureMapCatalog(){
  scene.library||={tokenImages:[],maps:[]};
  scene.library.maps||=[];
  if(scene.map&&!scene.library.maps.some(m=>m.src===scene.map))
   scene.library.maps.unshift({id:'map_legacy_'+crypto.randomUUID(),name:'Mapa anterior',src:scene.map});
 }
 function emitMapState(){
  window.dispatchEvent(new CustomEvent('nex:vtt-map-library-state',{detail:{
   maps:(scene.library?.maps||[]).filter(m=>gm||m.src===scene.map).map(m=>({id:m.id,name:m.name,src:visibleMediaSource(m.src)})),
   activeId:(scene.library?.maps||[]).find(m=>m.src===scene.map)?.id||'',
   gridVisible:scene.gridVisible
  }}));
 }
 listen(window,'nex:vtt-map-library-request',emitMapState);
 listen(window,'nex:vtt-map-library-action',async event=>{
  if(!gm||!remoteReady)return;
  const {action,id,visible}=event.detail||{};
  if(action==='grid'){scene.gridVisible=visible===true;render();void save();emitMapState();return;}
  const maps=scene.library?.maps||[];
  const entry=maps.find(m=>m.id===id);
  if(!entry)return;
  if(action==='select'){scene.map=entry.src;render();void save();emitMapState();}
  if(action==='delete'){
   scene.library.maps=maps.filter(m=>m.id!==id);
   if(scene.map===entry.src)scene.map=scene.library.maps[0]?.src||'';
   render();await save();emitMapState();
   if(!saveFailed&&!scene.library.maps.some(m=>m.src===entry.src))await deleteMediaParts(entry.src);
  }
 });
 listen($('nexTabletopRemoveMap'),'click',()=>{
  if(!gm)return;scene.map='';render();void save();emitMapState();
 });
 listen($('nexTabletopMapFile'),'change',async e=>{
  const files=Array.from(e.target.files||[]);e.target.value='';
  if(!gm||!files.length)return;
  if(!remoteReady){message('Aguarde a mesa carregar.');return;}
  if(uploading){message('Outro envio está em andamento.');return;}
  ensureMapCatalog();
  if(scene.library.maps.length+files.length>30){message('Máximo de 30 mapas por campanha.');return;}
  uploading++;
  let added=0;
  try{
   for(const file of files){
    try{
     const src=await uploadMedia(file,'map');
     scene.library.maps.push({id:'map_'+crypto.randomUUID(),name:String(file.name||'Mapa').slice(0,100),src});
     scene.map=src;added++;
    }catch(error){message('Erro em '+file.name+': '+String(error.message||error).slice(0,90));}
   }
   if(added){render();await save();emitMapState();message(added+' mapa(s) salvo(s) no dispositivo.');}
  }finally{uploading=Math.max(0,uploading-1);if(queued&&remoteReady&&!pending)void save();}
 });
 // Biblioteca compartilhada da cena; tokens referenciam o recurso para evitar cópias duplicadas.
 const libraryBytes=()=>new TextEncoder().encode(JSON.stringify(validScene(scene))).length;
 const libraryState=()=>window.dispatchEvent(new CustomEvent('nex:vtt-token-library-state',{detail:{
  assets:libraryAssets(),
  selectedId:selectedId||null,selectedName:selected()?.name||'',variation:selected()?.variation??1,
  tokenCount:scene.tokens.length,isMaster:gm
 }}));
 const changeTokenAsset=(assetId,variation)=>{
  if(!gm)return;
  const t=selected(),asset=scene.library?.tokenImages?.find(a=>a.id===assetId);
  if(!t||!asset){message('Selecione um token e uma imagem da biblioteca.');return;}
  const v=Math.max(0,Math.min(9,Math.trunc(Number(variation)||0)));
  const oldImages=[...t.images],oldVariation=t.variation;
  t.images[v]='asset:'+asset.id;t.variation=v;
  if(libraryBytes()>12000000){t.images=oldImages;t.variation=oldVariation;message('Não há espaço para esta alteração na cena.');return;}
  render();save();
 };
 const createTokenFromAsset=assetId=>{
  if(!gm)return;
  const asset=scene.library?.tokenImages?.find(a=>a.id===assetId);
  if(!asset||scene.tokens.length>=90){message('Imagem não encontrada ou limite de tokens atingido.');return;}
  const occupied=new Set(scene.tokens.map(t=>t.x+','+t.y));
  let pos=null;for(let y=1;y<H&&!pos;y++)for(let x=1;x<W;x++)if(!occupied.has(x+','+y)){pos={x,y};break;}
  if(!pos){message('Não há espaço disponível para outro token.');return;}
  const token={id:'tt_'+crypto.randomUUID(),name:asset.name.replace(/\.[^.]+$/,'').slice(0,35)||'Token',
   ...pos,variation:1,images:[],size:1,widthCells:1.5,heightCells:1.5,rotation:0,pv:0,pe:0,san:0,pvMax:0,peMax:0,sanMax:0,
   defense:0,hidden:false,locked:false,linkedSheetId:''};
  token.images[1]='asset:'+asset.id;
  const previousSelection=selectedId;scene.tokens.push(token);selectedId=token.id;
  if(libraryBytes()>12000000){scene.tokens.pop();selectedId=previousSelection;message('A cena não tem espaço para esse token.');return;}
  render();save();
 };
 listen(window,'nex:vtt-token-library-request',libraryState);
 listen(window,'nex:vtt-token-library-action',async event=>{
  if(!gm)return;
  const {action,assetId,variation}=event.detail||{};
  if(action==='create')createTokenFromAsset(assetId);
  if(action==='apply')changeTokenAsset(assetId,variation);
  if(action==='set-variation'){
   const t=selected(),v=Math.max(0,Math.min(9,Math.trunc(Number(variation)||0)));
   if(!t||!t.images?.[v])return;
   t.variation=v;render();save();
  }
  if(action==='delete-asset'){
   const asset=scene.library?.tokenImages?.find(a=>a.id===assetId);
   if(!asset)return;
   const derived=libraryAssets();
   const groupId=derived.find(a=>a.id===assetId)?.groupId||'';
   const group=!!event.detail?.deleteGroup&&!!groupId;
   const ids=new Set(derived.filter(a=>group?a.groupId===groupId:a.id===assetId).map(a=>a.id));
   if(!ids.size)return;
   const deletedSources=scene.library.tokenImages.filter(a=>ids.has(a.id)).map(a=>a.src);
   scene.library.tokenImages=scene.library.tokenImages.filter(a=>!ids.has(a.id));
   // Remove tokens that lose their last image, rather than leaving a
   // text-only placeholder (e.g. "MIN") on the board.
   const removedTokenIds=new Set();
   scene.tokens=scene.tokens.filter(token=>{
    let affected=false;
    for(let i=0;i<(token.images||[]).length;i++){
     if(ids.has(String(token.images[i]||'').replace(/^asset:/,''))){
      token.images[i]='';
      affected=true;
     }
    }
    if(!affected)return true;
    const available=token.images.findIndex(image=>typeof image==='string'&&image.length>0);
    if(available<0){
     removedTokenIds.add(token.id);
     return false;
    }
    if(!token.images[token.variation])token.variation=available;
    return true;
   });
   if(removedTokenIds.has(selectedId))selectedId=null;
   if(removedTokenIds.has(resizeSelectedId))resizeSelectedId=null;
   if(removedTokenIds.has(drag?.id))drag=null;
   if(removedTokenIds.size)closeTokenMenu();
   render();await save();
   if(!saveFailed)for(const src of new Set(deletedSources))await deleteMediaParts(src);
  }
 });
 // Multi-image import: separate tokens or numbered images for one token.
 // The existing 20-asset / 850KB document caps are checked before committing.
 listen(window,'nex:vtt-token-library-batch',async event=>{
  if(!gm||!remoteReady){message('Aguarde a mesa carregar antes de adicionar tokens.');return;}
  const files=Array.from(event.detail?.files||[]).filter(file=>file&&/^image\/(png|jpeg|webp|gif)$/.test(file.type));
  const variations=event.detail?.mode==='variations';
  if(!files.length){message('Selecione imagens PNG, JPG, WebP ou GIF.');return;}
  if(variations&&files.length>10){message('Um token pode ter no máximo 10 imagens (variações 0 a 9). Selecione até 10.');return;}
  if(!variations&&scene.tokens.length+files.length>90){message('A mesa aceita no máximo 90 tokens. Selecione menos arquivos.');return;}
  if((scene.library?.tokenImages?.length||0)+files.length>20){message('A biblioteca aceita no máximo 20 imagens por cena. Selecione menos arquivos.');return;}
  if(uploading){message('Outro envio está em andamento.');return;}
  const occupied=new Set(scene.tokens.map(t=>t.x+','+t.y));
  const nextPosition=()=>{
   for(let y=1;y<H;y++)for(let x=1;x<W;x++){
    if(!occupied.has(x+','+y)){occupied.add(x+','+y);return {x,y};}
   }
   return null;
  };
  const createToken=(name,pos)=>({
   id:'tt_'+crypto.randomUUID(),name:String(name||'Token').replace(/\.[^.]+$/,'').slice(0,35)||'Token',
   ...pos,variation:1,images:[],size:1,widthCells:1.5,heightCells:1.5,rotation:0,pv:0,pe:0,san:0,pvMax:0,peMax:0,sanMax:0,
   defense:0,hidden:false,locked:false,linkedSheetId:''
  });
  scene.library??={tokenImages:[]};
  let added=0,group=null,failed=false;
  uploading++;
  try{
   message('Preparando imagens dos tokens...');
   for(const file of files){
    const data=await uploadMedia(file,'asset');
    const pos=variations?(group?null:nextPosition()):nextPosition();
    if(!group&&variations&&!pos || !variations&&!pos){message('Não há espaço disponível para novos tokens.');failed=true;break;}
    const asset={id:'asset_'+crypto.randomUUID(),name:String(file.name||'Imagem').slice(0,90),src:data,groupId:variations?(group?.id||''): '',slot:variations?(added===9?0:added+1):1};
    const token=variations?(group||(group=createToken(asset.name,pos))):createToken(asset.name,pos);
    const variant=variations?(added===9?0:added+1):1;
    if(variations)asset.groupId=token.id;
    const beforeImage=token.images[variant];
    scene.library.tokenImages.unshift(asset);
    token.images[variant]='asset:'+asset.id;
    if(!scene.tokens.includes(token))scene.tokens.push(token);
    if(libraryBytes()>12000000){
     scene.library.tokenImages.shift();await deleteMediaParts(data);
     if(beforeImage===undefined)delete token.images[variant];else token.images[variant]=beforeImage;
     if(!added)scene.tokens=scene.tokens.filter(t=>t!==token);
     message('Limite de armazenamento da cena atingido. As imagens restantes não foram adicionadas.');
     failed=true;break;
    }
    added++;
   }
  }catch(error){
   failed=true;
   message('Erro ao adicionar imagens: '+String(error.message||error).slice(0,110));
  }finally{
   uploading=Math.max(0,uploading-1);
   if(added){
    selectedId=group?.id||scene.tokens[scene.tokens.length-1]?.id||null;
    render();
    await save();
    if(!saveFailed)message(variations?'Token com '+added+' variações adicionado.':'Adicionados '+added+' tokens à mesa.');
   }else if(!failed)message('Nenhum token foi adicionado.');
  }
 });
 listen(window,'nex:vtt-token-library-upload',async event=>{
  const file=event.detail?.file;
  if(!gm||!file||!remoteReady)return;
  if((scene.library?.tokenImages?.length||0)>=20){message('A biblioteca já possui 20 imagens.');return;}
  if(uploading){message('Outro envio está em andamento.');return;}
  uploading++;let src=null;
  try{
   src=await uploadMedia(file,'asset');
   scene.library??={tokenImages:[]};
   const item={id:'asset_'+crypto.randomUUID(),name:String(file.name||'Imagem').slice(0,90),src};
   scene.library.tokenImages.unshift(item);
   if(libraryBytes()>12000000){
    scene.library.tokenImages.shift();await deleteMediaParts(src);src=null;
    message('A cena está cheia.');return;
   }
  }catch(error){message('Erro ao enviar imagem: '+String(error.code||error.message||error).slice(0,100));return;}
  finally{uploading=Math.max(0,uploading-1);}
  render();await save();
 });
 listen($('nexTtVariantFile'),'change',async e=>{
  const file=e.target.files?.[0],id=selectedId,variant=Number(slot.value);
  e.target.value='';
  if(!gm||!id||!file||uploading||!remoteReady)return;
  uploading++;let data;
  try{data=await uploadMedia(file,'asset');}
  catch(error){message('Erro ao adicionar variação: '+String(error.code||error.message||error).slice(0,100));return;}
  finally{uploading=Math.max(0,uploading-1);}
  const t=scene.tokens.find(x=>x.id===id);if(!t){await deleteMediaParts(data);return;}
  const old=t.images[variant],oldVariation=t.variation;
  t.images[variant]=data;t.variation=variant;
  if(libraryBytes()>12000000){
   t.images[variant]=old;t.variation=oldVariation;await deleteMediaParts(data);
   message('A cena está cheia.');return;
  }
  render();await save();
  if(!saveFailed&&old!==data)await deleteMediaParts(old);
 });
 listen(slot,'change',()=>{const t=selected();if(!gm||!t)return;t.variation=Number(slot.value);render();save();});
 listen($('nexTtDelete'),'click',()=>{if(!gm||!selectedId)return;scene.tokens=scene.tokens.filter(t=>t.id!==selectedId);selectedId=null;render();save();});

 // Menu de contexto do token: ações temporárias não alteram a ficha vinculada.
 let copiedToken=null;
 const tokenMenu=document.createElement('div');
 tokenMenu.id='nexVttTokenContextMenu';
 tokenMenu.hidden=true;
 tokenMenu.setAttribute('role','menu');
 tokenMenu.setAttribute('aria-label','Ações do token');
 document.body.append(tokenMenu);
 const menuStyle=document.createElement('style');
 menuStyle.textContent=`
 #nexVttTokenContextMenu[hidden]{display:none!important}
 #nexVttTokenContextMenu{position:fixed;z-index:100000;display:flex;flex-direction:column;
  min-width:158px;padding:5px;border:1px solid #515a72;border-radius:7px;
  background:#202638;color:#f5f2fa;box-shadow:0 12px 28px #000b;font:12px system-ui,sans-serif}
 #nexVttTokenContextMenu button{display:flex;align-items:center;justify-content:space-between;gap:10px;
  border:0;background:transparent;color:inherit;border-radius:4px;min-height:30px;padding:6px 9px;
  font:inherit;text-align:left;cursor:pointer}
 #nexVttTokenContextMenu button:hover,#nexVttTokenContextMenu button:focus-visible{background:#4c3b64}
 #nexVttTokenContextMenu button:disabled{opacity:.4;cursor:not-allowed}
 #nexVttTokenContextMenu .nex-vtt-variation-list{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:3px;
  padding:5px 3px 3px;border-top:1px solid #465067}
 #nexVttTokenContextMenu .nex-vtt-variation-list[hidden]{display:none!important}
 #nexVttTokenContextMenu .nex-vtt-variation-list button{justify-content:center;min-height:27px;padding:3px}
 #nexVttTokenContextMenu button[aria-pressed=true]{background:#654484;color:white}
 `;
 document.head.append(menuStyle);
 function closeTokenMenu(){tokenMenu.hidden=true;tokenMenu.replaceChildren();}
 function pasteTokenAt(source,anchor){
  if(!gm||!source||scene.tokens.length>=90){message('Limite de 90 tokens na mesa.');return;}
  const size=Math.max(1,Math.min(3,Number(source.size)||1));
  const occupied=new Set(scene.tokens.map(t=>t.x+','+t.y));
  let pos=null;
  for(let radius=1;radius<W&& !pos;radius++){
   for(let dy=-radius;dy<=radius&&!pos;dy++){
    for(let dx=-radius;dx<=radius;dx++){
     if(Math.max(Math.abs(dx),Math.abs(dy))!==radius)continue;
     const x=anchor.x+dx,y=anchor.y+dy;
     if(x<0||y<0||x>W-size||y>H-size||occupied.has(x+','+y))continue;
     pos={x,y};break;
    }
   }
  }
  if(!pos){message('Não há espaço disponível para colar este token.');return;}
  const clone={...source,id:'tt_'+crypto.randomUUID(),name:String(source.name||'Token').slice(0,35),
   images:[...(source.images||[])],...pos,linkedSheetId:''};
  scene.tokens.push(clone);selectedId=clone.id;render();save();
 }
 function openTokenMenu(event,token){
  closeTokenMenu();
  const allowed=gm||(!token.locked&&peerMedia?.connected());
  const add=(label,action,disabled=false)=>{
   const b=document.createElement('button');b.type='button';b.textContent=label;
   b.disabled=disabled;b.setAttribute('role','menuitem');
   b.addEventListener('click',action);tokenMenu.append(b);return b;
  };
  add('Excluir',()=>{
   closeTokenMenu();
   if(!gm){peerMedia?.sendTokenAction('delete',token.id);return;}
   scene.tokens=scene.tokens.filter(t=>t.id!==token.id);
   if(selectedId===token.id)selectedId=null;
   render();save();
  },!allowed);
  add('Copiar',()=>{
   copiedToken={...token,images:[...(token.images||[])]};
   closeTokenMenu();
  });
  add('Colar',()=>{
   closeTokenMenu();
   if(!gm){peerMedia?.sendTokenAction('paste',token.id,{sourceId:copiedToken?.id});return;}
   pasteTokenAt(copiedToken,token);
  },!copiedToken||scene.tokens.length>=90||!allowed);
  const availableSlots=(token.images||[]).map((image,index)=>image?index:null).filter(index=>index!==null);
  const variationButton=availableSlots.length>1?add('Variação  ▸',()=>{
   list.hidden=!list.hidden;
   variationButton.setAttribute('aria-expanded',String(!list.hidden));
   const rect=tokenMenu.getBoundingClientRect();
   tokenMenu.style.top=Math.max(5,Math.min(window.innerHeight-rect.height-5,rect.top))+'px';
  }):null;
  if(variationButton)variationButton.setAttribute('aria-expanded','false');
  const list=document.createElement('div');list.className='nex-vtt-variation-list';list.hidden=true;if(variationButton)tokenMenu.append(list);
  for(const i of availableSlots){
   const button=document.createElement('button');button.type='button';button.textContent=String(i);
   button.title='Variação '+i;button.setAttribute('aria-label','Variação '+i);
   button.setAttribute('aria-pressed',String(token.variation===i));
   button.disabled=!allowed;
   button.addEventListener('click',()=>{
    const current=scene.tokens.find(t=>t.id===token.id);if(!current)return closeTokenMenu();
    closeTokenMenu();
    if(!gm){peerMedia?.sendTokenAction('variation',current.id,{variation:i});return;}
    current.variation=i;selectedId=current.id;render();save();
   });list.append(button);
  }
  tokenMenu.style.left='0px';tokenMenu.style.top='0px';tokenMenu.hidden=false;
  const box=tokenMenu.getBoundingClientRect();
  tokenMenu.style.left=Math.max(5,Math.min(window.innerWidth-box.width-5,event.clientX))+'px';
  tokenMenu.style.top=Math.max(5,Math.min(window.innerHeight-box.height-5,event.clientY))+'px';
 }
 listen(board,'contextmenu',event=>{
  const el=event.target.closest('.nex-tabletop-token[data-token]');
  if(!el){closeTokenMenu();return;}
  event.preventDefault();
  const token=scene.tokens.find(t=>t.id===el.dataset.token);
  if(token&&(gm||!token.hidden)){
   selectedId=token.id;
   if(gm)resizeSelectedId=token.locked?null:token.id;
   render();openTokenMenu(event,token);
  }
 });
 listen(document,'pointerdown',event=>{if(!tokenMenu.hidden&&!tokenMenu.contains(event.target))closeTokenMenu();if(event.button===0&&!drag&&!event.target.closest('#nexTabletopBoard .nex-tabletop-token')&&resizeSelectedId!==null){resizeSelectedId=null;render();}});
 listen(document,'keydown',event=>{if(event.key==='Escape')closeTokenMenu();});

 // Alterar apenas as coordenadas visuais evita que o token desapareça durante o arrasto.
 function paintTokenPosition(token){
  const el=Array.from(board.querySelectorAll('.nex-tabletop-token[data-token]')).find(node=>node.dataset.token===token.id);
  if(!el)return;
  el.style.left=(token.x*mapWidth/W)+'px';el.style.top=(token.y*mapHeight/H)+'px';
  const unit=Math.min(mapWidth/W,mapHeight/H);
  el.style.width=((token.widthCells||token.size||1)*unit)+'px';
  el.style.height=((token.heightCells||token.size||1)*unit)+'px';
 }
 let lastLiveDragAt=0;
 listen(board,'pointerdown',e=>{
  const el=e.target.closest('[data-token]');
  if(e.button!==0)return;
  const resizing=!!e.target.closest('[data-resize]');
  if(!resizing&&resizeSelectedId!==null){resizeSelectedId=null;if(!el)render();}
  if(!el)return;
  if(vttCombatTargetMode&&gm){
   const target=scene.tokens.find(t=>t.id===el.dataset.token);
   if(target&&!target.hidden){
     if(vttCombatTargets.has(target.id))vttCombatTargets.delete(target.id);
     else vttCombatTargets.add(target.id);
     render();return;
   }
  }
  const handle=e.target.closest('[data-resize]')?.dataset.resize;
  selectedId=el.dataset.token; // Keep the touched DOM node alive until gesture end.
  const linked=linkedSheet(selected());
  if(linked&&typeof onSelectSheet==='function')onSelectSheet(linked.id);
  if(selected()?.locked||vttMode!=='select'||(!gm&&!peerMedia?.connected()))return;
  const t=selected();
  if(handle&&!gm)return;
  if(handle){
   drag={id:selectedId,pointer:e.pointerId,kind:'resize',handle,
     startX:t.x,startY:t.y,startWidth:t.widthCells||t.size||1,startHeight:t.heightCells||t.size||1,
     originClientX:e.clientX,originClientY:e.clientY};
  }else{
   drag={id:selectedId,pointer:e.pointerId,kind:'move',startX:t.x,startY:t.y,
     originClientX:e.clientX,originClientY:e.clientY};
  }
  // Capture on the stable board, because render() replaces token elements.
  try{board.setPointerCapture(e.pointerId);}catch(_){}
  e.preventDefault();
 });
 listen(document,'pointermove',e=>{
  if(!drag||drag.pointer!==e.pointerId)return;
  const rect=board.getBoundingClientRect(),t=scene.tokens.find(t=>t.id===drag.id);if(!t)return;
  const cellX=rect.width/W,cellY=rect.height/H;
  if(drag.kind==='resize'&&gm){
   const dx=(e.clientX-drag.originClientX)/cellX,dy=(e.clientY-drag.originClientY)/cellY;
   const h=drag.handle,min=.5;
   if(h.includes('e'))t.widthCells=Math.max(min,Math.min(W-drag.startX,Math.round((drag.startWidth+dx)*4)/4));
   if(h.includes('s'))t.heightCells=Math.max(min,Math.min(H-drag.startY,Math.round((drag.startHeight+dy)*4)/4));
   if(h.includes('w')){
    const edgeX=Math.min(drag.startX+drag.startWidth-min,Math.max(0,drag.startX+dx));
    t.x=Math.round(edgeX*4)/4;t.widthCells=Math.max(min,Math.round((drag.startX+drag.startWidth-t.x)*4)/4);
   }
   if(h.includes('n')){
    const edgeY=Math.min(drag.startY+drag.startHeight-min,Math.max(0,drag.startY+dy));
    t.y=Math.round(edgeY*4)/4;t.heightCells=Math.max(min,Math.round((drag.startY+drag.startHeight-t.y)*4)/4);
   }
  }else{
   const dx=(e.clientX-drag.originClientX)/cellX,dy=(e.clientY-drag.originClientY)/cellY;
   t.x=Math.max(0,Math.min(W-(t.widthCells||t.size||1),Math.round((drag.startX+dx)*100)/100));
   t.y=Math.max(0,Math.min(H-(t.heightCells||t.size||1),Math.round((drag.startY+dy)*100)/100));
  }
  paintTokenPosition(t);
  if(drag.kind==='move'&&performance.now()-lastLiveDragAt>=40){
   lastLiveDragAt=performance.now();
   if(gm)peerMedia?.broadcastTokenMove(t.id,t.x,t.y);
   else peerMedia?.sendTokenMove(t.id,t.x,t.y,false);
  }
 });
 listen(document,'pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;
  const token=scene.tokens.find(t=>t.id===drag.id);
  if(token&&vttMeasureMovement){const squares=Math.hypot(token.x-drag.startX,token.y-drag.startY);vttLog.hidden=false;vttLog.textContent=token.name+': '+squares.toFixed(1)+' quadrados';}
  drag=null;
  try{if(board.hasPointerCapture(e.pointerId))board.releasePointerCapture(e.pointerId);}catch(_){}
  render();if(gm){if(token)peerMedia?.broadcastTokenMove(token.id,token.x,token.y);save();}
  else if(token)peerMedia?.sendTokenMove(token.id,token.x,token.y,true);
 });
 listen(document,'pointercancel',e=>{if(drag&&drag.pointer===e.pointerId){const token=scene.tokens.find(t=>t.id===drag.id);drag=null;render();if(gm)save();else if(token)peerMedia?.sendTokenMove(token.id,token.x,token.y,true);}});
 listen(document,'keydown',e=>{
  if(!gm||!selectedId||isTyping(e)||e.altKey||e.ctrlKey||e.metaKey||!(/^[0-9]$/).test(e.key))return;
  const t=selected();if(!t||!t.images?.[Number(e.key)])return;t.variation=Number(e.key);render();save();e.preventDefault();
 });

 // Expanded Roll20-inspired VTT toolbar; all shared changes use the existing campaign document.
 let vttMode='select',vttZoom=.45,vttDraft=null,vttPan=null,vttColor='#3157f5',vttStroke=3,vttTransparent=true,vttFont='Arial',vttFontSize=26,vttTextBold=false,vttTextItalic=false,vttTextBg='#ffffff',vttMeasureShape='line',vttMeasureSnap=true,vttMeasurePersistent=false,vttMeasureMovement=false,vttMeasurePublic=false,vttManualZoom=false,vttTokenInspectorOpen=false;
 const vttBar=document.createElement('nav');vttBar.id='nexVttBar';vttBar.setAttribute('aria-label','Ferramentas da mesa');
 const vttOptions=document.createElement('div');vttOptions.id='nexVttOptions';vttOptions.hidden=true;
 const vttSide=document.createElement('div');vttSide.id='nexVttTokenProperties';vttSide.hidden=true;
 const vttWrap=board.closest('.nex-tabletop-wrap');
 let vttCombatTargetMode=false;
 const vttCombatTargets=new Set();
 let vttCombatAction='damage',vttCombatAmount=0;
 const vttStyle=document.createElement('style');
 vttStyle.id='nex-vtt-layer-style';
 vttStyle.textContent='#nexVttDrawLayer,#nexVttMeasureLayer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'+
 '#nexVttDrawLayer{z-index:1}#nexVttMeasureLayer{z-index:4}'+
 '#nexVttFogLayer{position:absolute;inset:0;z-index:4;pointer-events:none;background:rgba(0,0,0,.9)}'+
 '#nexVttFogLayer[hidden]{display:none!important}.nex-vtt-hide-grid::before{display:none!important}'+
 '#roomTabletopPanel #nexTabletopBoard #nexVttAtmosphereLayer{position:absolute;inset:0;z-index:60!important;pointer-events:none!important;overflow:hidden;isolation:isolate}'+
 '#roomTabletopPanel #nexTabletopBoard #nexVttAtmosphereLayer>.nex-vtt-atmosphere-image{position:absolute;inset:0;width:100%;height:100%;object-fit:fill;pointer-events:none!important}'+
 '#roomTabletopPanel #nexTabletopBoard #nexVttAtmosphereLayer>.nex-vtt-atmosphere-image[hidden]{display:none!important}'+
 '#nexVttAtmosphereLayer[hidden]{display:none!important}'+
 '#nexVttAtmosphereLayer[data-effect="custom"]{background-repeat:no-repeat;background-position:center;background-size:100% 100%;opacity:var(--nex-atmosphere-strength)}'+
 '#nexVttAtmosphereLayer::before,#nexVttAtmosphereLayer::after{content:"";position:absolute;inset:-15%;pointer-events:none}'+
 '#nexVttAtmosphereLayer::after{display:none}'+
 '#nexVttAtmosphereLayer[data-effect="mist"]::before{opacity:calc(var(--nex-atmosphere-strength)*.7);background:radial-gradient(ellipse at 20% 30%,#dfe5f7ad,transparent 45%),radial-gradient(ellipse at 78% 65%,#b9c7d8b8,transparent 50%),radial-gradient(ellipse at 42% 78%,#e2e8f0aa,transparent 44%);background-size:130% 130%}'+
 '#nexVttAtmosphereLayer[data-effect="rain"]::before{opacity:calc(var(--nex-atmosphere-strength)*.8);background:repeating-linear-gradient(104deg,transparent 0px,transparent 16px,#b4cbf0 17px,transparent 19px,transparent 36px);background-size:190px 190px}'+
 '#nexVttAtmosphereLayer[data-effect="snow"]::before{opacity:var(--nex-atmosphere-strength);background-image:radial-gradient(2px 2px at 15px 30px,#fff 95%,transparent),radial-gradient(3px 3px at 80px 90px,#eaf6ff 95%,transparent),radial-gradient(2px 2px at 130px 25px,#fff 95%,transparent);background-size:150px 130px}'+
 '#nexVttAtmosphereLayer[data-effect="dark"]::before{inset:0;background:#050611;opacity:calc(var(--nex-atmosphere-strength)*.85)}'+
 '#nexVttAtmosphereLayer[data-effect="embers"]::before{opacity:var(--nex-atmosphere-strength);background-image:radial-gradient(3px 3px at 10px 30px,#ff8f3e 95%,transparent),radial-gradient(2px 2px at 75px 90px,#fcca6b 95%,transparent),radial-gradient(3px 3px at 130px 50px,#fd592e 95%,transparent);background-size:160px 140px}'+
 '@keyframes nexAtmoDrift{to{background-position:250px 170px}}'+
 '@keyframes nexAtmoRain{to{background-position:-90px 300px}}'+
 '#nexVttAtmosphereLayer[data-animated="true"][data-effect="mist"]::before{animation:nexAtmoDrift 35s linear infinite alternate}'+
 '#nexVttAtmosphereLayer[data-animated="true"][data-effect="rain"]::before{animation:nexAtmoRain 2.8s linear infinite}'+
 '#nexVttAtmosphereLayer[data-animated="true"][data-effect="snow"]::before{animation:nexAtmoRain 18s linear infinite}'+
 '#nexVttAtmosphereLayer[data-animated="true"][data-effect="embers"]::before{animation:nexAtmoDrift 12s linear infinite alternate-reverse}'+
 '@media(prefers-reduced-motion:reduce){#nexVttAtmosphereLayer::before{animation:none!important}}';
 document.head.append(vttStyle);
 const vttSidebar=tools.closest('.nex-vtt-sidebar');
 vttSidebar?.prepend(vttBar);
 const drawMenu=document.createElement('div');
 drawMenu.id='nexVttDrawMenu';drawMenu.hidden=true;
 drawMenu.setAttribute('aria-label','Ferramentas de desenho');
 vttSidebar?.append(drawMenu);
 const drawingModes=new Set(['draw','line','rectangle','circle']);
 const drawModeLabel={draw:'À Mão Livre',line:'Caneta/Linha',rectangle:'Retângulo',circle:'Elipse'};
 function closeDrawMenu(){drawMenu.hidden=true;drawToggle?.setAttribute('aria-expanded','false');}
 let drawToggle=null;
 function showDrawMenu(){
   if(!gm)return;
   drawMenu.hidden=!drawMenu.hidden;
   drawToggle?.setAttribute('aria-expanded',String(!drawMenu.hidden));
 }
 function drawMenuRefresh(){
   drawMenu.replaceChildren();
   const top=document.createElement('div');top.className='nex-vtt-draw-top';
   const color=document.createElement('input');color.type='color';color.value=vttColor;color.title='Escolher cor';color.setAttribute('aria-label','Cor do desenho');
   color.addEventListener('input',()=>{vttColor=color.value;});
   const transparent=document.createElement('button');transparent.type='button';transparent.className='nex-vtt-transparent';
   transparent.title='Alternar preenchimento transparente';transparent.setAttribute('aria-label','Preenchimento transparente');
   transparent.setAttribute('aria-pressed',String(vttTransparent));
   transparent.textContent='▧';
   transparent.addEventListener('click',()=>{vttTransparent=!vttTransparent;transparent.setAttribute('aria-pressed',String(vttTransparent));});
   const widths=document.createElement('select');widths.setAttribute('aria-label','Espessura do traço');
   for(const [value,title] of [['2','Fino'],['3','Normal'],['6','Grosso']]){const option=document.createElement('option');option.value=value;option.textContent=title;widths.append(option);}
   widths.value=String(vttStroke);
   widths.addEventListener('change',()=>{vttStroke=Number(widths.value);});
   top.append(color,transparent,widths);drawMenu.append(top);
   const line=document.createElement('div');line.className='nex-vtt-draw-list';drawMenu.append(line);
   for(const [mode,icon,label,shortcut] of [['draw','✎','À Mão Livre','Ctrl + F'],['line','◩','Caneta/Linha',''],['rectangle','■','Retângulo','Ctrl + D'],['circle','●','Elipse','']]){
     const button=document.createElement('button');button.type='button';
     button.innerHTML='<span class="draw-glyph"></span><span class="draw-label"></span><span class="draw-key"></span>';
     button.querySelector('.draw-glyph').textContent=icon;
     button.querySelector('.draw-label').textContent=label;
     button.querySelector('.draw-key').textContent=shortcut;
     button.setAttribute('aria-pressed',String(vttMode===mode));
     button.addEventListener('click',()=>{vttSetMode(mode);closeDrawMenu();});
     line.append(button);
   }
   const clear=document.createElement('button');clear.type='button';clear.className='nex-vtt-clear-draw';
   clear.textContent='🗑 Limpar desenhos e texto';
   clear.addEventListener('click',()=>{if(!confirm('Apagar todos os desenhos e textos do mapa?'))return;scene.drawings=[];render();save();closeDrawMenu();});
   drawMenu.append(clear);
 }
 drawMenuRefresh();
 const actionDock=$('nexVttActionDock');
 const sceneStatus=$('nexVttSceneStatus');
 const quickToken=$('nexVttQuickToken');
 if(quickToken)quickToken.hidden=!gm;
 const quickClick=(id,action)=>listen($(id),'click',action);
 quickClick('nexVttQuickSheets',()=>{
   const panel=$('nexVttSheetsPanel');
   if(panel?.hidden)$('nexVttSheetsToggle')?.click();
   else if(!panel?.hidden)panel?.querySelector('.nex-vtt-sheet')?.focus();
 });
 quickClick('nexVttQuickCombat',()=>primaryNav.combat?.click());
 quickClick('nexVttQuickDice',()=>vttOpen('dice'));
 quickClick('nexVttQuickGrid',()=>vttOpen('grid'));
 quickClick('nexVttQuickToken',()=>{
   if(!gm)return;
   const name=prompt('Nome do token:','Token');
   if(name===null)return;
   const input=$('nexTabletopTokenName');
   if(input)input.value=name.trim().slice(0,35)||'Token';
   $('nexTabletopAddToken')?.click();
 });
 function refreshSceneStatus(){
   if(!sceneStatus)return;
   const visibleTokens=scene.tokens.filter(t=>gm||!t.hidden);
   const sheetCount=getSheets().filter(t=>gm||!t.isHidden).length;
   const selection=selected();
   sceneStatus.textContent=selection
     ?selection.name+(linkedSheet(selection)?' · Ficha vinculada':' · Token livre')
     :visibleTokens.length+' tokens · '+sheetCount+' fichas';
 }
 const vttStage=board.closest('.nex-vtt-stage');
 vttStage?.append(vttOptions,vttSide);
 const combatDock=document.createElement('section');combatDock.id='nexVttCombatDock';combatDock.hidden=true;
 combatDock.setAttribute('aria-label','Combate integrado');
 vttStage?.append(combatDock);
 const vttPanel=board.closest('#roomTabletopPanel');
 const vttRight=vttPanel?.querySelector('#nexVttSheetsPanel');
 const vttTabs=document.createElement('nav');
 vttTabs.className='nex-vtt-right-tabs';
 vttTabs.setAttribute('aria-label','Seções da mesa NEX');
 const vttTab=(label,title,cb)=>{
   const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.addEventListener('click',cb);vttTabs.append(b);return b;
 };
 vttTab('☷','Mostrar fichas',()=>document.getElementById('nexVttSheetsToggle')?.click());
 vttTab('⚄','Rolagem de dados',()=>vttOpen('dice'));
 vttTab('⚙','Configurações do mapa',()=>vttOpen('grid'));
 vttTab('↩','Voltar à campanha',()=>document.getElementById('nexVttExit')?.click());
 const primaryNav={
   map:document.getElementById('nexVttNavMap'),
   sheets:document.getElementById('nexVttNavSheets'),
   combat:document.getElementById('nexVttNavCombat')
 };
 function activatePrimaryNav(section){
   for(const [id,button] of Object.entries(primaryNav)){
     if(!button)continue;
     if(id===section)button.setAttribute('aria-current','page');
     else button.removeAttribute('aria-current');
   }
 }
 listen(primaryNav.map,'click',()=>{
   activatePrimaryNav('map');
   vttOptions.hidden=true;
   vttTokenInspectorOpen=false;vttSide.hidden=true;
 });
 listen(primaryNav.sheets,'click',()=>{
   activatePrimaryNav('sheets');
   if(vttRight?.hidden)document.getElementById('nexVttSheetsToggle')?.click();
   vttOptions.hidden=true;
 });
 listen(primaryNav.combat,'click',()=>{
   activatePrimaryNav('combat');
   combatDock.hidden=false;
   vttOptions.hidden=true;
   renderCombatDock();
 });

 vttRight?.prepend(vttTabs);
 const vttRoomTag=document.createElement('div');vttRoomTag.className='nex-vtt-room-tag';
 vttRoomTag.textContent='NEX · '+(document.getElementById('nexVttCampaignName')?.textContent||'Campanha');
 vttRight?.insertBefore(vttRoomTag,vttRight.querySelector('.nex-vtt-sheets-title'));
 const vttSVG=(id)=>{const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.id=id;node.setAttribute('viewBox','0 0 '+(GRID*W)+' '+(GRID*H));board.append(node);return node;};
 const vttLayer=vttSVG('nexVttDrawLayer'),vttMeasure=vttSVG('nexVttMeasureLayer');
 const atmosphereLayer=document.createElement('div');
 atmosphereLayer.id='nexVttAtmosphereLayer';atmosphereLayer.hidden=true;atmosphereLayer.setAttribute('aria-hidden','true');
 board.append(atmosphereLayer);
 const vttFog=document.createElement('div');vttFog.id='nexVttFogLayer';vttFog.hidden=true;board.append(vttFog);
 const ATMOSPHERE_CHUNK_SIZE=240000,ATMOSPHERE_FILE_LIMIT=5*1024*1024;
 const mediaDescriptor=src=>{
  const r2=r2Pattern.exec(src||'');
  if(r2)return {id:r2[1],mime:r2[2],r2:true,count:0};
  const match=/^firestore:((?:atmo|map|asset)_[A-Za-z0-9_-]+):([1-9]|[12][0-9]|3[0-2]):(gif|png|jpeg|webp)$/.exec(src||'');
  return match?{id:match[1],count:Number(match[2]),mime:match[3]}:null;
 };
 const mediaChunkRef=(id,i)=>doc(db,'campaigns',campaignId,'tabletopMedia',id,'chunks',String(i).padStart(3,'0'));
 const r2Url=src=>'/api/nex-vtt-media?campaignId='+encodeURIComponent(campaignId)+(src?'&src='+encodeURIComponent(src):'');
 async function r2Request(method,src,body){
  if(typeof getIdToken!=='function')throw Error('Faça login na conta NEX para acessar o R2.');
  const token=await getIdToken();
  if(!token)throw Error('Sessão expirada. Entre novamente na conta NEX.');
  const response=await fetch(r2Url(src),{method,
   headers:{Authorization:'Bearer '+token,...(method==='POST'?{'Content-Type':body.type}:{})},
   ...(body?{body}:{})});
  if(!response.ok){
   let data;try{data=await response.json();}catch(_){}
   throw Error(data?.error||'R2: falha na operação (HTTP '+response.status+').');
  }
  return method==='GET'?response.blob():response.json();
 }

 const blobDataURL=blob=>new Promise((resolve,reject)=>{
  const r=new FileReader();r.onload=()=>resolve(r.result);r.onerror=()=>reject(Error('Falha ao carregar imagem do R2'));r.readAsDataURL(blob);
 });
 if(gm){
  const mediaDestinations=document.createElement('p');
  mediaDestinations.style.cssText='margin:8px 0;color:#c9bfc1;font-size:12px;line-height:1.45';
  mediaDestinations.textContent='Todos os novos arquivos ficam neste dispositivo. Clique em Iniciar sessão para que os jogadores vejam mapas, tokens e GIFs e escutem as músicas ao vivo.';
  (document.getElementById('nexTabletopMapFile')?.parentElement||tools).append(mediaDestinations);
  handlers.push(()=>mediaDestinations.remove());
 }
 function visibleMediaSource(src){
  if(typeof src!=='string')return '';
  if(src.startsWith('data:image/')||src.startsWith('data:video/webm;')||src.startsWith('https://'))return src;
  const local=isLocalMedia(src);
  // Arquivos locais dos jogadores aparecem apenas enquanto o mestre transmite.
  if(local&&!gm&&!peerMedia?.connected())return '';
  const info=local?null:mediaDescriptor(src);
  if((!local&&!info)||mediaFailed.has(src))return '';
  if(mediaMemory.has(src))return mediaMemory.get(src);
  if(!mediaPending.has(src)){
   const task=(async()=>{
    let image=await mediaCache.read(src);
    if(!image&&local&&!gm){
     image=await peerMedia.fetchImage(src);
     if(image)void mediaCache.put(src,image);
    }
    if(!image&&!local){
     if(info.r2){
      const blob=await r2Request('GET',src);
      image=await blobDataURL(blob);
     }else{
      const parts=[];
      for(let i=0;i<info.count;i++){
       const snap=await getDoc(mediaChunkRef(info.id,i));
       if(!snap.exists())throw Error('Parte de imagem não encontrada');
       const chunk=snap.data()?.chunk;
       if(typeof chunk!=='string'||chunk.length>ATMOSPHERE_CHUNK_SIZE)throw Error('Parte inválida');
       parts.push(chunk);
      }
      image='data:image/'+info.mime+';base64,'+parts.join('');
     }
     void mediaCache.put(src,image);
    }
    if(!image&&local)throw Error('Arquivo não encontrado no dispositivo do mestre.');
    if(!disposed){mediaMemory.set(src,image);render();libraryState();}
   })().catch(error=>{
    mediaFailed.add(src);
    if(!disposed)message('Erro ao carregar arquivo: '+String(error.code||error.message||error).slice(0,100));
   }).finally(()=>mediaPending.delete(src));
   mediaPending.set(src,task);
  }
  return '';
 }
 async function uploadMedia(file,prefix){
  if(!/^image\/(gif|png|jpeg|webp)$/.test(file?.type||'')&&!(prefix==='map'&&file?.type==='video/webm'))throw Error('Selecione PNG, JPG, WebP, GIF ou WEBM (mapas).');
  if(!['map','asset','atmo'].includes(prefix))throw Error('Categoria de imagem inválida.');
  const limit=prefix==='atmo'?5*1024*1024:10*1024*1024;
  if(!file.size||file.size>limit)throw Error(prefix==='atmo'?'O limite de GIFs e atmosferas é 5 MB.':'O limite de mapas e tokens locais é 10 MB.');
  const data=await blobDataURL(file);
  const match=/^data:(?:image\/(gif|png|jpeg|webp)|video\/(webm));base64,([A-Za-z0-9+/=]+)$/.exec(data);
  if(!match)throw Error('Imagem inválida.');
  const src='local:'+prefix+'_'+crypto.randomUUID()+':'+(match[1]||match[2]);
  const stored=await mediaCache.put(src,data,true);
  if(!stored)throw Error('Não foi possível salvar a imagem no dispositivo. Verifique espaço e permissões do navegador.');
  mediaMemory.set(src,data);
  return src;
 }
 async function deleteMediaParts(src){
  if(isLocalMedia(src)){
   mediaMemory.delete(src);mediaFailed.delete(src);await mediaCache.remove(src);return;
  }
  const info=mediaDescriptor(src);if(!info)return;
  if(info.r2){
   try{await r2Request('DELETE',src);}
   catch(error){message('Erro ao remover imagem R2: '+String(error.message||error).slice(0,100));return;}
   mediaMemory.delete(src);mediaFailed.delete(src);void mediaCache.remove(src);
   return;
  }
  let errors=0;
  for(let i=0;i<info.count;i++)try{await deleteDoc(mediaChunkRef(info.id,i));}
  catch(error){errors++;console.warn('NEX mídia: falha ao excluir parte',error);}
  mediaMemory.delete(src);mediaFailed.delete(src);void mediaCache.remove(src);
  if(errors)message('Imagem removida, mas '+errors+' parte(s) não foram excluídas do Firestore.');
 }
 const visibleAtmosphereSource=item=>visibleMediaSource(item.src);
 function applyAtmosphere(){
  const layers=scene.atmosphereLayers||[];
  const ids=new Set(layers.map(a=>a.id));
  for(const node of Array.from(atmosphereLayer.children)){
   if(!ids.has(node.dataset.atmoId))node.remove();
  }
  for(let i=0;i<layers.length;i++){
   const item=layers[i];
   let node=Array.from(atmosphereLayer.children).find(n=>n.dataset.atmoId===item.id);
   if(!node){
    node=document.createElement('img');node.dataset.atmoId=item.id;
    node.alt='';node.draggable=false;node.className='nex-vtt-atmosphere-image';
    atmosphereLayer.append(node);
   }
   const src=visibleAtmosphereSource(item);
   if(src&&node.dataset.src!==src){node.src=src;node.dataset.src=src;}
   if(!src&&node.dataset.src){node.removeAttribute('src');delete node.dataset.src;}
   node.style.zIndex=String(i);
   node.style.opacity=String(Math.max(0,Math.min(100,item.opacity))/100);
   node.hidden=!item.enabled||!src;
  }
  atmosphereLayer.hidden=!layers.some(a=>a.enabled&&a.opacity>0&&!!visibleAtmosphereSource(a));
  window.dispatchEvent(new CustomEvent('nex:vtt-atmosphere-state',{detail:{
   layers:layers.map(a=>({id:a.id,name:a.name,src:visibleAtmosphereSource(a),enabled:a.enabled,opacity:a.opacity})),isMaster:gm
  }}));
 }
 listen(window,'nex:vtt-atmosphere-request',()=>applyAtmosphere());
 listen(window,'nex:vtt-atmosphere-layer-action',async event=>{
  if(!gm)return;
  const {action,id,opacity,previewOnly}=event.detail||{};
  const index=(scene.atmosphereLayers||[]).findIndex(a=>a.id===id);
  if(index<0)return;
  const item=scene.atmosphereLayers[index];
  const deletedSource=action==='delete'?item.src:null;
  if(action==='toggle')item.enabled=!item.enabled;
  else if(action==='opacity'&&Number.isFinite(Number(opacity)))item.opacity=Math.max(0,Math.min(100,Math.round(Number(opacity))));
  else if(action==='delete')scene.atmosphereLayers.splice(index,1);
  else return;
  applyAtmosphere();
  if(!previewOnly){
   await save();
   if(deletedSource&&!saveFailed)await deleteMediaParts(deletedSource);
  }
 });
 listen(window,'nex:vtt-atmosphere-upload',async event=>{
  if(!gm||!remoteReady){message('Aguarde a mesa carregar.');return;}
  const files=Array.from(event.detail?.files||(event.detail?.file?[event.detail.file]:[])).filter(Boolean);
  if(!files.length)return;
  if((scene.atmosphereLayers?.length||0)+files.length>8){message('Máximo de 8 atmosferas por cena.');return;}
  if(uploading){message('Outro envio está em andamento.');return;}
  uploading++;let added=0;
  try{
   for(const file of files){
    let src;
    try{message('Preparando atmosfera: '+file.name);src=await uploadMedia(file,'atmo');}
    catch(error){message('Falha no envio: '+String(error.code||error.message||error).slice(0,110));break;}
    const item={id:isLocalMedia(src)?src.split(':')[1]:mediaDescriptor(src).id,name:String(file.name||'Atmosfera').slice(0,90),src,enabled:true,opacity:100};
    scene.atmosphereLayers??=[];scene.atmosphereLayers.push(item);
    if(new TextEncoder().encode(JSON.stringify(validScene(scene))).length>12000000){
     scene.atmosphereLayers.pop();await deleteMediaParts(src);message('Cena cheia.');break;
    }
    added++;
   }
  }finally{uploading=Math.max(0,uploading-1);
   if(added){applyAtmosphere();await save();if(!saveFailed)message(added+' atmosfera(s) salva(s) somente neste dispositivo.');}
  }
 });
 // Compatibilidade com a opção antiga de remover toda a atmosfera.
 listen(window,'nex:vtt-atmosphere-remove',async()=>{
  if(!gm)return;
  const removed=(scene.atmosphereLayers||[]).map(a=>a.src);
  scene.atmosphereLayers=[];
  scene.atmosphere={type:'none',intensity:100,animated:true,image:''};
  applyAtmosphere();await save();
  if(!saveFailed)for(const src of new Set(removed))await deleteMediaParts(src);
 });
 const vttLog=document.createElement('div');vttLog.style.cssText='position:absolute;bottom:6px;right:6px;background:#171015ee;color:#fff;z-index:8;padding:8px;border-radius:5px;pointer-events:none;font-size:12px';vttLog.hidden=true;board.append(vttLog);
 const vttButtons=new Map();
 function vttButton(label,title,callback,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.disabled=disabled;b.addEventListener('click',callback);vttBar.append(b);return b;}
 function vttSetMode(mode){vttMode=mode;for(const [key,button] of vttButtons)button.setAttribute('aria-pressed',String(key===mode));if(drawToggle)drawToggle.setAttribute('aria-pressed',String(drawingModes.has(mode)));vttOptions.hidden=true;board.style.cursor=mode==='select'?'default':mode==='pan'?'grab':'crosshair';}
 vttButton('☰','Abrir ou recolher o painel de fichas',()=>document.getElementById('nexVttSheetsToggle')?.click());
 for(const [mode,symbol,title] of [['select','✋','Move'],['pan','✋','Mover mapa'],['text','T','Texto'],['measure','📏','Medir distância'],['marker','⌖','Marcador'],['fog','◐','Revelar névoa']]){
   vttButtons.set(mode,vttButton(symbol,title,()=>{
     // Clicar na ferramenta ativa novamente fecha suas opções e volta ao Move.
     if(vttMode===mode){
       vttOptions.hidden=true;
       closeDrawMenu();
       if(mode!=='select')vttSetMode('select');
       return;
     }
     closeDrawMenu();
     vttSetMode(mode);
     if(mode==='text')vttOpen('text');
     if(mode==='measure')vttOpen('measure');
   },!gm&&!['select','pan','measure'].includes(mode)));
 }
 drawToggle=vttButton('✎','Desenhar: abrir ferramentas',()=>{
   // O próprio ícone de Desenhar abre e fecha o menu.
   if(!drawMenu.hidden){closeDrawMenu();if(drawingModes.has(vttMode))vttSetMode('select');return;}
   if(drawingModes.has(vttMode)){vttSetMode('select');vttOptions.hidden=true;return;}
   vttOptions.hidden=true;drawMenuRefresh();showDrawMenu();
 },!gm);
 drawToggle.setAttribute('aria-expanded','false');drawToggle.setAttribute('aria-controls','nexVttDrawMenu');
 const textTool=vttButtons.get('text');
 vttBar.insertBefore(drawToggle,textTool);
 listen(document,'pointerdown',event=>{if(!drawMenu.hidden&&!drawMenu.contains(event.target)&&event.target!==drawToggle)closeDrawMenu();});
 listen(document,'keydown',event=>{
   const active=vttPanel?.classList.contains('hide')===false;
   if(!gm||!active||isTyping(event)||event.altKey||event.metaKey)return;
   if(event.key==='Escape'){closeDrawMenu();return;}
   if(event.ctrlKey&&!event.shiftKey){
     if(event.key.toLowerCase()==='f'){event.preventDefault();vttSetMode('draw');closeDrawMenu();}
     if(event.key.toLowerCase()==='d'){event.preventDefault();vttSetMode('rectangle');closeDrawMenu();}
   }
 });
 const vttZoomRail=document.createElement('div');vttZoomRail.id='nexVttZoomRail';
 const vttZoomPlus=vttButton('+','Aumentar zoom',()=>{vttManualZoom=true;vttChangeZoom(.05);});
 const vttZoomText=document.createElement('span');vttZoomText.id='nexVttZoomValue';vttZoomText.style.cssText='color:white;font-size:12px;text-align:center;font-weight:700'; 
 const vttZoomMinus=vttButton('−','Diminuir zoom',()=>{vttManualZoom=true;vttChangeZoom(-.05);});
 const vttZoomSlider=document.createElement('input');vttZoomSlider.type='range';vttZoomSlider.id='nexVttZoomSlider';vttZoomSlider.min='25';vttZoomSlider.max='200';vttZoomSlider.step='1';vttZoomSlider.setAttribute('aria-label','Escala de zoom do mapa');
 vttZoomSlider.addEventListener('input',()=>{vttManualZoom=true;vttChangeZoom(Number(vttZoomSlider.value)/100-vttZoom);});
 const vttZoomFit=vttButton('⊡','Ajustar todo o mapa à tela',()=>{vttManualZoom=false;vttFitZoom();});
 vttZoomRail.append(vttZoomMinus,vttZoomSlider,vttZoomText,vttZoomPlus,vttZoomFit);
 vttWrap.parentElement?.append(vttZoomRail);
 vttButton('＋','Adicionar token',()=>{
   const name=prompt('Nome do token:','Token');
   if(name===null)return;
   const input=document.getElementById('nexTabletopTokenName');
   if(input)input.value=name.trim().slice(0,35)||'Token';
   document.getElementById('nexTabletopAddToken')?.click();
 },!gm);
 vttButton('▧','Enviar imagem do mapa',()=>document.getElementById('nexTabletopMapFile')?.click(),!gm);
 vttButton('▦','Grade e névoa',()=>vttOpen('grid'),!gm);
 vttButton('♟','Token',()=>vttOpen('token'),!gm);
 vttButton('⚄','Dados',()=>vttOpen('dice'));
 vttButton('≡','Iniciativa',()=>{combatDock.hidden=false;renderCombatDock();});
 vttButton('↶','Desfazer desenho',()=>{if(!gm)return;scene.drawings.pop();render();save();},!gm);
 vttButton('✕','Limpar desenhos',()=>{if(!gm||!confirm('Apagar todos os desenhos?'))return;scene.drawings=[];render();save();},!gm);
 vttButton('↩','Voltar à campanha',()=>document.getElementById('nexVttExit')?.click());
 function vttChangeZoom(d){
   const next=Math.min(2,Math.max(.25,Math.round((vttZoom+d)*100)/100));
   // Avoid rewriting the zoom on repeated ResizeObserver / Firestore renders.
   if(next===vttZoom&&board.style.zoom===String(next))return;
   vttZoom=next;
   board.style.zoom=String(vttZoom);
   vttZoomText.textContent=Math.round(vttZoom*100)+'%';
   vttZoomSlider.value=String(Math.round(vttZoom*100));
 }
 function vttFitZoom(){
   if(vttManualZoom||!vttWrap.getClientRects().length)return;
   // Mobile-only: fill the available viewport, avoiding large empty areas.
   // Pan remains available for exploring the cropped edges.
   if(window.matchMedia('(pointer:coarse) and (max-width:900px)').matches){
     const width=vttWrap.clientWidth,height=vttWrap.clientHeight;
     if(width<100||height<100||!mapWidth||!mapHeight)return;
     const target=Math.max((width-20)/mapWidth,(height-20)/mapHeight);
     const next=Math.max(.25,Math.min(2,Math.floor(target*100)/100));
     if(Math.abs(next-vttZoom)>=.01)vttChangeZoom(next-vttZoom);
     requestAnimationFrame(()=>{
       if(disposed||vttManualZoom||!vttWrap.isConnected)return;
       vttWrap.scrollLeft=Math.max(0,(vttWrap.scrollWidth-vttWrap.clientWidth)/2);
       vttWrap.scrollTop=Math.max(0,(vttWrap.scrollHeight-vttWrap.clientHeight)/2);
     });
     return;
   }
   // Desktop: exactly the previous fitting algorithm.
   // offsetWidth/Height do not change when a scrollbar appears.
   const width=vttWrap.offsetWidth-36,height=vttWrap.offsetHeight-36;
   if(width<150||height<150)return;
   const fits=Math.min((width-90)/mapWidth,(height-45)/mapHeight);
   const next=Math.max(.25,Math.min(1.5,Math.floor(fits*100)/100));
   if(Math.abs(next-vttZoom)>=.01)vttChangeZoom(next-vttZoom);
 }
 // Observe the stage, rather than the scrollable map canvas, so zoom itself
 // does not trigger another fit calculation.
 const vttResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>vttFitZoom()):null;
 vttResizeObserver?.observe(vttWrap.parentElement||vttWrap);
 vttChangeZoom(0);vttSetMode('select');
 requestAnimationFrame(()=>vttFitZoom());
 // NEX VTT mobile pinch gesture: zoom the board (not the browser) using two fingers.
 // Apply zoom through the existing controller so slider, percentage and tokens stay in sync.
 let vttPinch=null;
 const vttTouchDistance=(a,b)=>Math.hypot(a.clientX-b.clientX,a.clientY-b.clientY);
 const vttTouchCenter=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
 const vttIsTouchDevice=()=>matchMedia('(pointer:coarse) and (max-width:900px)').matches;
 const vttPinchStart=e=>{
   if(!vttIsTouchDevice()||e.touches.length!==2)return;
   const [a,b]=e.touches;
   vttPinch={distance:Math.max(1,vttTouchDistance(a,b)),center:vttTouchCenter(a,b)};
   vttManualZoom=true;
   vttPan=null;vttDraft=null;drag=null;
   if(e.cancelable)e.preventDefault();
 };
 const vttPinchMove=e=>{
   if(!vttPinch||e.touches.length!==2)return;
   if(e.cancelable)e.preventDefault();
   const [a,b]=e.touches;
   const distance=Math.max(1,vttTouchDistance(a,b));
   const center=vttTouchCenter(a,b);
   const oldZoom=vttZoom;
   // Read board coordinates under the previous midpoint before changing scale.
   const before=board.getBoundingClientRect();
   const anchorX=(vttPinch.center.x-before.left)/oldZoom;
   const anchorY=(vttPinch.center.y-before.top)/oldZoom;
   vttChangeZoom(oldZoom*(distance/vttPinch.distance)-oldZoom);
   const after=board.getBoundingClientRect();
   // Keep the same map location under the moving midpoint, including panning.
   vttWrap.scrollLeft+=after.left+anchorX*vttZoom-center.x;
   vttWrap.scrollTop+=after.top+anchorY*vttZoom-center.y;
   vttPinch={distance,center};
 };
 const vttPinchEnd=e=>{
   if(!vttPinch)return;
   if(e.touches.length!==2)vttPinch=null;
 };
 listen(vttWrap,'touchstart',vttPinchStart,{passive:false});
 listen(vttWrap,'touchmove',vttPinchMove,{passive:false});
 listen(vttWrap,'touchend',vttPinchEnd,{passive:true});
 listen(vttWrap,'touchcancel',vttPinchEnd,{passive:true});

 // Mobile-specific gestures; desktop keeps all of its original event handlers.
 const vttMobile=()=>window.matchMedia('(pointer:coarse) and (max-width:900px)').matches;
 let mobileLongPress=null;
 const clearMobileLongPress=()=>{if(mobileLongPress){clearTimeout(mobileLongPress.timer);mobileLongPress=null;}};
 listen(board,'pointerdown',e=>{
  if(!vttMobile()||e.pointerType!=='touch'||e.button!==0)return;
  const el=e.target.closest('.nex-tabletop-token[data-token]');
  if(el&&gm&&vttMode==='select'){
   clearMobileLongPress();
   const press={id:el.dataset.token,pointer:e.pointerId,x:e.clientX,y:e.clientY,timer:null};
   press.timer=setTimeout(()=>{
    if(mobileLongPress!==press||vttPinch||!gm)return;
    // Long-press opens the existing token menu, without moving the token.
    drag=null;selectedId=press.id;
    const token=scene.tokens.find(t=>t.id===press.id);
    if(token){
     resizeSelectedId=token.locked?null:token.id;
     render();
     openTokenMenu({clientX:press.x,clientY:press.y},token);
    }
    mobileLongPress=null;
   },550);
   mobileLongPress=press;
   return;
  }
  // One-finger panning starts on empty map while Move is selected.
  // The two-finger pinch handler cancels this movement automatically.
  if(!el&&vttMode==='select'&&!vttPinch){
   vttPan={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:vttWrap.scrollLeft,top:vttWrap.scrollTop};
   try{board.setPointerCapture(e.pointerId);}catch(_){}
   e.preventDefault();
  }
 });
 listen(document,'pointermove',e=>{
  if(!vttMobile()||!mobileLongPress||e.pointerId!==mobileLongPress.pointer)return;
  if(Math.hypot(e.clientX-mobileLongPress.x,e.clientY-mobileLongPress.y)>12)clearMobileLongPress();
 });
 listen(document,'pointerup',e=>{
  if(!vttMobile()||e.pointerType!=='touch')return;
  if(mobileLongPress?.pointer===e.pointerId)clearMobileLongPress();
  // A short tap selects only; the blue resize grips are long-press only.
  // Keep active resize handles visible after a resize; do not create them on tap.
  if(!drag&&vttMode==='select'&&!vttPinch&&resizeSelectedId){
   const token=selected();
   if(!token||token.id!==resizeSelectedId||token.locked){resizeSelectedId=null;render();}
  }
 });
 listen(document,'pointercancel',e=>{if(mobileLongPress?.pointer===e.pointerId)clearMobileLongPress();});
 listen(vttWrap,'touchstart',e=>{if(vttMobile()&&e.touches.length>1)clearMobileLongPress();},{passive:true});
 // In ruler mode the board must receive the whole gesture even if the finger
 // leaves the first grid square. Keep the desktop pointer behavior unchanged.
 listen(board,'pointerdown',e=>{
  if(!vttMobile()||e.pointerType!=='touch'||e.button!==0||e.target.closest('[data-token]'))return;
  if(vttMode==='measure'||vttMode==='pan'){
   try{board.setPointerCapture(e.pointerId);}catch(_){}
   if(e.cancelable)e.preventDefault();
  }
 });


 const vttEl=(tag,attrs,parent)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(attrs))n.setAttribute(k,v);parent.append(n);return n;};
 function vttPaint(d,layer){
   const attrs={stroke:d.color||'#3157f5','stroke-width':d.width||3,fill:(d.filled&&['rectangle','circle'].includes(d.type))?(d.color||'#3157f5'):'none','fill-opacity':d.filled?'.3':'1','stroke-linecap':'round'};
   if(d.type==='line'||d.type==='measure')vttEl('line',{...attrs,x1:d.x,y1:d.y,x2:d.x2,y2:d.y2},layer);
   if(d.type==='rectangle')vttEl('rect',{...attrs,x:Math.min(d.x,d.x2),y:Math.min(d.y,d.y2),width:Math.abs(d.x2-d.x),height:Math.abs(d.y2-d.y)},layer);
   if(d.type==='circle')vttEl('circle',{...attrs,cx:d.x,cy:d.y,r:Math.hypot(d.x2-d.x,d.y2-d.y)},layer);
   if(d.type==='draw')vttEl('polyline',{...attrs,points:(d.points||[]).map(p=>p.join(',')).join(' ')},layer);
   if(d.type==='marker')vttEl('circle',{cx:d.x,cy:d.y,r:9,fill:d.color||'#e4677c',stroke:'#fff','stroke-width':2},layer);
   if(d.type==='text'){
     const t=vttEl('text',{x:d.x,y:d.y,fill:d.color||'#111','font-size':Math.max(10,Math.min(72,Number(d.fontSize)||26)),'font-family':d.font||'Arial','font-weight':d.bold?'700':'400','font-style':d.italic?'italic':'normal','paint-order':'stroke',stroke:d.outline||'transparent','stroke-width':d.outline?'.4':'0'},layer);
     t.textContent=String(d.text||'').slice(0,120);
   }
 }
 function renderAdvanced(){
   vttLayer.replaceChildren();for(const d of scene.drawings)vttPaint(d,vttLayer);
   if(vttDraft&&vttMode!=='measure')vttPaint(vttDraft,vttLayer);
   board.classList.toggle('nex-vtt-hide-grid',!scene.gridVisible);
   applyAtmosphere();
   vttFog.hidden=!scene.fogEnabled;
   if(scene.fogEnabled){
     const holes=scene.revealed.map(p=>'radial-gradient(circle 63px at '+p.x+'px '+p.y+'px,transparent 98%,black 100%)');
     vttFog.style.maskImage=holes.length?holes.join(','):'none';vttFog.style.maskComposite='intersect';
   }
   if(vttSide.dataset.token!==selectedId){vttSide.dataset.token=selectedId||'';vttRenderTokenSettings();}
 }
 function vttRenderTokenSettings(){
   const t=selected();vttSide.hidden=!gm||!t||!vttTokenInspectorOpen;vttSide.replaceChildren();
   if(!gm||!t)return;
   const title=document.createElement('strong');title.textContent='Configurar '+t.name;vttSide.append(title);
   const linkLabel=document.createElement('label');linkLabel.textContent='Ficha do NEX';
   const linkSelect=document.createElement('select');
   const emptyOption=document.createElement('option');emptyOption.value='';emptyOption.textContent='Sem ficha vinculada';linkSelect.append(emptyOption);
   for(const sh of getSheets()){const opt=document.createElement('option');opt.value=sh.id;opt.textContent=String(sh.name||'Personagem')+(sh.isHidden?' · Oculta':'');linkSelect.append(opt);}
   linkSelect.value=t.linkedSheetId||'';
   linkSelect.addEventListener('change',()=>{t.linkedSheetId=linkSelect.value;if(linkedSheet(t))t.name=String(linkedSheet(t).name||t.name).slice(0,35);render();save();});
   linkLabel.append(linkSelect);vttSide.append(linkLabel);
   if(linkedSheet(t)){const note=document.createElement('small');note.textContent='PV, PE e SAN sincronizados com a ficha. Os ajustes no combate atualizam a ficha.';vttSide.append(note);}
   const close=document.createElement('button');close.type='button';close.textContent='Fechar ×';close.addEventListener('click',()=>{vttTokenInspectorOpen=false;vttSide.hidden=true;});vttSide.append(close);
   for(const [prop,label,type] of [['name','Nome','text'],['pv','PV atual','number'],['pvMax','PV máximo','number'],['pe','PE atual','number'],['peMax','PE máximo','number'],['san','SAN atual','number'],['sanMax','SAN máximo','number'],['defense','Defesa','number'],['size','Tamanho (1-3)','number'],['rotation','Rotação','number'],['hidden','Oculto aos jogadores','checkbox'],['locked','Bloquear posição','checkbox']]){
     const row=document.createElement('label');row.textContent=label;
     const inp=document.createElement('input');inp.type=type;if(type==='checkbox')inp.checked=!!t[prop];else inp.value=String(['pv','pe','san'].includes(prop)?tokenStat(t,prop):t[prop]??'');
     inp.addEventListener('change',async()=>{
       if(['pv','pe','san'].includes(prop)&&linkedSheet(t)){
         if(!updateResource)return message('Edição da ficha indisponível');
         inp.disabled=true;
         try{await updateResource(t.linkedSheetId,prop,Number(inp.value)||0,'set');}
         catch(error){message('Falha ao editar ficha: '+String(error.message||error));}
         finally{inp.disabled=false;}render();return;
       }
       if(['pvMax','peMax','sanMax'].includes(prop)&&linkedSheet(t)){message('Edite o recurso máximo na ficha completa.');render();return;}
       t[prop]=type==='checkbox'?inp.checked:type==='number'?Number(inp.value)||0:inp.value.slice(0,35);render();save();
     });
     row.append(inp);vttSide.append(row);
   }
 }
 function combatEntry(label){
   scene.combatLog=[...(scene.combatLog||[]),{id:'evt-'+crypto.randomUUID(),label:String(label).slice(0,150),at:Date.now()}].slice(-40);
   renderCombatDock();save();
 }
 function renderCombatDock(){
   if(!combatDock||combatDock.hidden)return;
   combatDock.replaceChildren();
   const header=document.createElement('div');header.className='nex-vtt-combat-header';
   const title=document.createElement('strong');title.textContent='⚔ Combate integrado';
   const close=document.createElement('button');close.type='button';close.textContent='×';close.title='Fechar combate';
   close.addEventListener('click',()=>{combatDock.hidden=true;vttCombatTargetMode=false;vttCombatTargets.clear();if(primaryNav.map)activatePrimaryNav('map');render();});
   header.append(title,close);combatDock.append(header);
   const body=document.createElement('div');body.className='nex-vtt-combat-body';combatDock.append(body);
   const make=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!==undefined)n.textContent=text;return n;};
   const stat=make('div','nex-vtt-combat-stat');
   const actor=selected();
   stat.textContent=actor?'Token selecionado: '+actor.name+' · PV '+tokenStat(actor,'pv')+' · PE '+tokenStat(actor,'pe')+' · SAN '+tokenStat(actor,'san')+(linkedSheet(actor)?' · Ficha vinculada':''):'Selecione um token no mapa para iniciar.';
   body.append(stat);
   if(gm){
     const targetTitle=make('strong','','Alvos');body.append(targetTitle);
     const targeting=make('button','nex-vtt-action-alt',vttCombatTargetMode?'✓ Selecionando alvos no mapa':'◎ Selecionar alvos no mapa');
     targeting.type='button';targeting.setAttribute('aria-pressed',String(vttCombatTargetMode));
     targeting.addEventListener('click',()=>{vttCombatTargetMode=!vttCombatTargetMode;render();});
     body.append(targeting);
     const targets=make('p','nex-vtt-combat-targets','Alvos: '+([...vttCombatTargets].map(id=>scene.tokens.find(t=>t.id===id)?.name).filter(Boolean).join(', ')||'Nenhum'));
     body.append(targets);
     const all=make('button','nex-vtt-action-alt','Limpar seleção');all.addEventListener('click',()=>{vttCombatTargets.clear();render();});body.append(all);
     const actions=make('div','nex-vtt-combat-actions');body.append(actions);
     const actionLabel=make('label','','Efeito');
     const kind=make('select');
     for(const [k,label] of [['damage','Aplicar dano em PV'],['heal','Curar PV'],['pe','Ajustar PE'],['san','Ajustar SAN']]){
       const op=make('option','',label);op.value=k;kind.append(op);
     }
     kind.value=vttCombatAction;kind.addEventListener('change',()=>{vttCombatAction=kind.value;});
     actionLabel.append(kind);actions.append(actionLabel);
     const amountLabel=make('label','','Quantidade (valores negativos reduzem PE/SAN)');
     const amount=make('input');amount.type='number';amount.min='-9999';amount.max='9999';amount.step='1';amount.value=String(vttCombatAmount);
     amount.addEventListener('change',()=>{vttCombatAmount=Math.max(-9999,Math.min(9999,Math.trunc(Number(amount.value)||0)));});
     amountLabel.append(amount);actions.append(amountLabel);
     const apply=make('button','nex-vtt-action-primary','Aplicar aos alvos');
     apply.addEventListener('click',async()=>{
       const chosen=scene.tokens.filter(t=>vttCombatTargets.has(t.id)&&!t.hidden);
       if(!chosen.length)return message('Selecione pelo menos um alvo no mapa.');
       const magnitude=Math.max(-9999,Math.min(9999,Math.trunc(Number(amount.value)||0)));
       if(!magnitude)return message('Informe uma quantidade diferente de zero.');
       const field=vttCombatAction==='damage'||vttCombatAction==='heal'?'pv':vttCombatAction;
       if((vttCombatAction==='damage'||vttCombatAction==='heal')&&magnitude<0)return message('Informe um valor positivo de dano ou cura.');
       const change=vttCombatAction==='damage'?-magnitude:magnitude;
       apply.disabled=true;let updated=0;const failed=[];
       for(const t of chosen){
         try{
           if(linkedSheet(t)){
             if(!updateResource)throw Error('Edição da ficha indisponível');
             await updateResource(t.linkedSheetId,field,change,'delta');
           }else{
             const limit=Number(t[field+'Max'])||0;
             t[field]=Math.max(0,Math.min(limit>0?limit:99999,(Number(t[field])||0)+change));
           }
           updated++;
         }catch(error){failed.push(t.name+': '+String(error.message||error));}
       }
       apply.disabled=false;vttCombatTargetMode=false;
       if(updated)combatEntry((vttCombatAction==='damage'?'Dano':vttCombatAction==='heal'?'Cura':vttCombatAction.toUpperCase())+' '+magnitude+' → '+chosen.map(t=>t.name).join(', '));
       if(failed.length)message('Algumas fichas não foram atualizadas: '+failed.join(' | ').slice(0,190));
       render();
     });
     actions.append(apply);
     const rolls=make('div','nex-vtt-combat-rolls');body.append(rolls);
     const rollTitle=make('strong','','Teste de ataque');rolls.append(rollTitle);
     const bonus=make('input');bonus.type='number';bonus.value='0';bonus.setAttribute('aria-label','Bônus do ataque');
     const roll=make('button','nex-vtt-action-alt','Rolar 1d20 + bônus');
     roll.addEventListener('click',()=>{
       const die=new Uint32Array(1);crypto.getRandomValues(die);
       const result=1+(die[0]%20),added=Math.max(-99,Math.min(99,Math.trunc(Number(bonus.value)||0))),total=result+added;
       const chosen=scene.tokens.filter(t=>vttCombatTargets.has(t.id)&&!t.hidden);
       const comparison=chosen.length?' | '+chosen.map(t=>t.name+': '+(t.defense>0?(total>=t.defense?'Acerto':'Falha')+' (Def '+t.defense+')':'Defesa não definida')).join(', '):'';
       combatEntry((actor?.name||'Ataque')+': d20 '+result+(added>=0?' + ':' - ')+Math.abs(added)+' = '+total+comparison);
       render();
     });
     rolls.append(bonus,roll);
     const next=make('div','nex-vtt-combat-initiative');body.append(next);
     next.append(make('strong','','Iniciativa'));
     next.append(make('p','',scene.turns.join(' → ')||'Nenhuma ordem definida'));
     const add=make('button','nex-vtt-action-alt','Adicionar token selecionado');
     add.addEventListener('click',()=>{const t=selected();if(!t||scene.turns.includes(t.name))return;scene.turns.push(t.name);combatEntry(t.name+' entrou na iniciativa');render();});
     const forward=make('button','nex-vtt-action-alt','Próximo turno');
     forward.addEventListener('click',()=>{if(!scene.turns.length)return;scene.turns.push(scene.turns.shift());combatEntry('Próximo turno: '+scene.turns[0]);render();});
     const clearTurns=make('button','nex-vtt-action-alt','Encerrar combate');
     clearTurns.addEventListener('click',()=>{if(!confirm('Encerrar a iniciativa atual?'))return;scene.turns=[];combatEntry('Iniciativa encerrada');render();});
     next.append(add,forward,clearTurns);
   }else{
     const info=make('p','nex-vtt-combat-stat','Os jogadores acompanham os resultados; somente o mestre pode aplicar efeitos aos tokens por aqui.');
     body.append(info);
   }
   const history=make('div','nex-vtt-combat-history');history.append(make('strong','','Histórico compartilhado'));
   for(const item of [...(scene.combatLog||[])].reverse().slice(0,20)){
     history.append(make('p','',item.label));
   }
   if(!(scene.combatLog||[]).length)history.append(make('p','','As ações da mesa aparecerão aqui.'));
   body.append(history);
 }
 function vttOpen(section){
   if(vttOptions.dataset.section===section&&!vttOptions.hidden){vttOptions.hidden=true;return;}
   vttOptions.dataset.section=section;vttOptions.hidden=false;vttOptions.replaceChildren();
   const control=(label,el)=>{const row=document.createElement('label');row.textContent=label;row.append(el);vttOptions.append(row);return el;};
   const btn=(text,fn)=>{const b=document.createElement('button');b.textContent=text;b.type='button';b.addEventListener('click',fn);vttOptions.append(b);return b;};
   if(section==='text'){
     const title=document.createElement('strong');title.textContent='Texto';vttOptions.append(title);
     const fg=document.createElement('input');fg.type='color';fg.value=vttColor;control('Cor ',fg);fg.oninput=()=>{vttColor=fg.value;};
     const bg=document.createElement('input');bg.type='color';bg.value=vttTextBg;control('Contorno ',bg);bg.oninput=()=>{vttTextBg=bg.value;};
     const font=document.createElement('select');for(const name of ['Arial','Verdana','Georgia','Times New Roman','Courier New']){const opt=document.createElement('option');opt.textContent=name;opt.value=name;font.append(opt);}font.value=vttFont;font.onchange=()=>{vttFont=font.value;};control('Fonte ',font);
     const size=document.createElement('input');size.type='number';size.min='10';size.max='72';size.value=String(vttFontSize);size.onchange=()=>{vttFontSize=Math.max(10,Math.min(72,Number(size.value)||26));};control('Tamanho ',size);
     const bold=btn('B',()=>{vttTextBold=!vttTextBold;bold.setAttribute('aria-pressed',String(vttTextBold));});bold.style.fontWeight='bold';bold.setAttribute('aria-pressed',String(vttTextBold));
     const italic=btn('I',()=>{vttTextItalic=!vttTextItalic;italic.setAttribute('aria-pressed',String(vttTextItalic));});italic.style.fontStyle='italic';italic.setAttribute('aria-pressed',String(vttTextItalic));
     const hint=document.createElement('small');hint.textContent='Clique no mapa para inserir texto.';vttOptions.append(hint);
   }
   if(section==='measure'){
     const heading=document.createElement('strong');heading.textContent='Medir';vttOptions.append(heading);
     const shape=document.createElement('select');for(const [value,label] of [['line','Linha'],['circle','Círculo'],['rectangle','Retângulo']]){const option=document.createElement('option');option.value=value;option.textContent=label;shape.append(option);}
     shape.value=vttMeasureShape;shape.onchange=()=>{vttMeasureShape=shape.value;};control('Forma ',shape);
     const snap=document.createElement('input');snap.type='checkbox';snap.checked=vttMeasureSnap;snap.onchange=()=>{vttMeasureSnap=snap.checked;};control('Ajuste no grid ',snap);
     const duration=document.createElement('select');for(const [value,label] of [['instant','Instantâneo'],['persistent','Permanente']]){const op=document.createElement('option');op.value=value;op.textContent=label;duration.append(op);}duration.value=vttMeasurePersistent?'persistent':'instant';duration.onchange=()=>{vttMeasurePersistent=duration.value==='persistent';};control('Tempo de exibição ',duration);
     const move=document.createElement('input');move.type='checkbox';move.checked=vttMeasureMovement;move.onchange=()=>{vttMeasureMovement=move.checked;};control('Medir movimento dos tokens ',move);
     const show=document.createElement('input');show.type='checkbox';show.checked=vttMeasurePublic;show.disabled=!gm;show.onchange=()=>{vttMeasurePublic=show.checked;};control('Mostrar para outros ',show);
     const unit=document.createElement('small');unit.textContent='1 quadrado = 1 unidade de deslocamento';vttOptions.append(unit);
     btn('Limpar medições',()=>{scene.drawings=scene.drawings.filter(x=>x.type!=='measure');render();save();});
   }
   if(section==='grid'){
     const grid=document.createElement('input');grid.type='checkbox';grid.checked=scene.gridVisible;control('Exibir grade ',grid);grid.onchange=()=>{scene.gridVisible=grid.checked;render();save();};
     const fog=document.createElement('input');fog.type='checkbox';fog.checked=scene.fogEnabled;control('Névoa de guerra ',fog);fog.onchange=()=>{scene.fogEnabled=fog.checked;render();save();};
     btn('Reiniciar névoa',()=>{scene.revealed=[];render();save();});
     const color=document.createElement('input');color.type='color';color.value=vttColor;control('Cor ',color);color.oninput=()=>{vttColor=color.value;};
   }
   if(section==='token'){
     vttTokenInspectorOpen=!vttTokenInspectorOpen;
     vttRenderTokenSettings();
     vttOptions.hidden=true;
   }
   if(section==='dice'){
     const die=document.createElement('select');for(const sides of [4,6,8,10,12,20,100]){const o=document.createElement('option');o.value=sides;o.textContent='d'+sides;die.append(o);}die.value='20';control('Dado ',die);
     const qty=document.createElement('input');qty.type='number';qty.min=1;qty.max=20;qty.value=1;control('Quantidade ',qty);
     btn('Rolar',()=>{const count=Math.max(1,Math.min(20,Number(qty.value)||1)),sides=Number(die.value);const values=Array.from({length:count},()=>Math.floor(Math.random()*sides)+1);vttLog.hidden=false;vttLog.textContent=count+'d'+sides+': '+values.join(' + ')+' = '+values.reduce((a,b)=>a+b,0);});
   }
   if(section==='turn'){
     const text=document.createElement('span');text.textContent='Iniciativa: '+(scene.turns.join(' → ')||'vazia');vttOptions.append(text);
     if(gm){btn('Adicionar token',()=>{const t=selected();if(!t)return;if(!scene.turns.includes(t.name))scene.turns.push(t.name);save();vttOpen('turn');vttOpen('turn');});
       btn('Próximo',()=>{if(scene.turns.length)scene.turns.push(scene.turns.shift());save();vttOpen('turn');vttOpen('turn');});
       btn('Limpar',()=>{scene.turns=[];save();vttOpen('turn');vttOpen('turn');});}
   }
 }
 const vttPoint=e=>{const a=board.getBoundingClientRect();return {x:Math.max(0,Math.min(GRID*W,Math.round((e.clientX-a.left)*GRID*W/Math.max(1,a.width)))),y:Math.max(0,Math.min(GRID*H,Math.round((e.clientY-a.top)*GRID*H/Math.max(1,a.height)))) };};
 listen(board,'pointerdown',e=>{
   if(e.target.closest('[data-token]')||vttMode==='select')return;
   if(vttMode==='pan'){vttPan={pointer:e.pointerId,x:e.clientX,y:e.clientY,left:vttWrap.scrollLeft,top:vttWrap.scrollTop};return;}
   if(!gm&&vttMode!=='measure')return;
   const p=vttPoint(e);
   if(vttMode==='fog'){if(!scene.fogEnabled)return message('Ative a névoa nas opções de grade.');scene.revealed.push(p);render();save();return;}
   if(vttMode==='text'){const text=prompt('Texto no mapa:');if(text&&gm){scene.drawings.push({type:'text',...p,text:text.slice(0,120),color:vttColor,font:vttFont,fontSize:vttFontSize,bold:vttTextBold,italic:vttTextItalic,outline:vttTextBg});render();save();}return;}
   if(vttMode==='marker'){scene.drawings.push({type:'marker',...p,color:vttColor});render();save();return;}
   vttDraft={type:vttMode,...p,x2:p.x,y2:p.y,color:vttColor,width:vttStroke,filled:!vttTransparent,points:[[p.x,p.y]]};
   e.preventDefault();
 });
 listen(board,'pointermove',e=>{
   if(vttPan?.pointer===e.pointerId){vttWrap.scrollLeft=vttPan.left+vttPan.x-e.clientX;vttWrap.scrollTop=vttPan.top+vttPan.y-e.clientY;return;}
   if(!vttDraft)return;const p=vttPoint(e);vttDraft.x2=p.x;vttDraft.y2=p.y;
   if(vttMode==='draw'&&vttDraft.points.length<250)vttDraft.points.push([p.x,p.y]);
   if(vttMode==='measure'){
     const snapValue=vttMeasureSnap?GRID/2:1;
     vttDraft.x2=Math.round(p.x/snapValue)*snapValue;vttDraft.y2=Math.round(p.y/snapValue)*snapValue;
     vttMeasure.replaceChildren();
     vttPaint({...vttDraft,type:vttMeasureShape==='line'?'measure':vttMeasureShape,color:'#bb348c',width:2},vttMeasure);
     vttLog.hidden=false;vttLog.textContent=(Math.hypot(vttDraft.x2-vttDraft.x,vttDraft.y2-vttDraft.y)/GRID).toFixed(1)+' quadrados';
   }
   else renderAdvanced();
 });
 listen(document,'pointerup',e=>{
   if(vttPan?.pointer===e.pointerId){vttPan=null;return;}
   if(!vttDraft)return;const item=vttDraft;vttDraft=null;vttMeasure.replaceChildren();
   if(vttMode==='measure'){
     if(vttMeasurePersistent&&gm){scene.drawings.push({...item,type:vttMeasureShape==='line'?'measure':vttMeasureShape,color:'#bb348c',width:2});scene.drawings=scene.drawings.slice(-160);render();save();}
     else renderAdvanced();
   }else if(gm){scene.drawings.push(item);scene.drawings=scene.drawings.slice(-160);render();save();}else renderAdvanced();
 });

 listen(window,'nex:campaign-sheets-updated',()=>{if(!disposed)render();});
 const liveRoot=document.createElement('div');
 liveRoot.id='nexVttLiveLocalControls';
 liveRoot.style.cssText='margin:4px 0 8px';
 status.insertAdjacentElement('afterend',liveRoot);
 peerMedia=mountNexPeerMedia({
  db,doc,collection,onSnapshot,setDoc,deleteDoc,campaignId,uid,gm,root:liveRoot,
  getAudioStream:()=>localAudioCleanup.getStream?.()||null,
  getScene:()=>gm?networkScene():null,
  onTokenAction:({action,id,sourceId,variation})=>{
   if(!gm||disposed||!remoteReady)return;
   const token=scene.tokens.find(t=>t.id===id);
   if(!token||token.hidden||token.locked)return;
   if(action==='delete'){
    scene.tokens=scene.tokens.filter(t=>t.id!==id);
    if(selectedId===id)selectedId=null;
   }else if(action==='variation'){
    if(!Number.isInteger(variation)||variation<0||variation>9||!token.images?.[variation])return;
    token.variation=variation;
   }else if(action==='paste'){
    const source=scene.tokens.find(t=>t.id===sourceId);
    if(!source||source.hidden||source.locked)return;
    pasteTokenAt(source,token);return;
   }else return;
   render();void save();
  },
  onTokenMove:({id,x,y,final})=>{
   if(!gm||disposed||!remoteReady)return;
   const token=scene.tokens.find(t=>t.id===id);
   if(!token||token.hidden||token.locked)return;
   const maxX=Math.max(0,W-(token.widthCells||token.size||1));
   const maxY=Math.max(0,H-(token.heightCells||token.size||1));
   token.x=Math.round(Math.max(0,Math.min(maxX,x))*100)/100;
   token.y=Math.round(Math.max(0,Math.min(maxY,y))*100)/100;
   paintTokenPosition(token);
   peerMedia?.broadcastTokenMove(token.id,token.x,token.y);
   if(final)void save();
  },
  onTokenPreview:({id,x,y})=>{
   if(gm||disposed)return;
   const token=scene.tokens.find(t=>t.id===id);
   if(!token||token.hidden||drag?.id===id)return;
   token.x=Math.max(0,Math.min(W-(token.widthCells||token.size||1),x));
   token.y=Math.max(0,Math.min(H-(token.heightCells||token.size||1),y));
   paintTokenPosition(token);
  },
  onScene:data=>{
   if(gm||disposed||!data||!Array.isArray(data.tokens))return;
   scene=validScene(data);remoteReady=true;mediaFailed.clear();render();emitMapState();
   message('Mesa sincronizada com o mestre por conexão direta.');
  },
  getAsset:async(src,playerUid)=>{
   if(!gm||!isLocalMedia(src))return null;
   const inScene=scene.map===src||
    (scene.atmosphereLayers||[]).some(x=>x.src===src&&x.enabled!==false)||
    (scene.library?.tokenImages||[]).some(x=>x.src===src)||
    scene.tokens.some(t=>!t.hidden&&Array.isArray(t.images)&&t.images.includes(src));
   if(!inScene)return null;
   return mediaMemory.get(src)||await mediaCache.read(src);
  },
  onConnected:()=>{mediaFailed.clear();if(!disposed)render();},
  onDisconnected:()=>{if(!disposed)render();}
 });
 // Apenas a primeira abertura do mestre lê o documento antigo para migração.
 // Nenhuma nova posição/configuração de mesa é gravada no Firestore.
 const unsubscribe=()=>{};
 if(gm){
  void (async()=>{
   try{
    const saved=await localSceneStore.read();
    if(disposed)return;
    if(saved&&Array.isArray(saved.tokens)){
     scene=validScene(saved);
    }else if(recoveredBackup){
     scene=validScene(recoveredBackup);
     await localSceneStore.save(JSON.parse(JSON.stringify(scene)));
    }else{
     const legacy=await getDoc(ref);
     if(disposed)return;
     if(legacy.exists()&&Array.isArray(legacy.data()?.tokens)){
      scene=validScene(legacy.data());
      await localSceneStore.save(JSON.parse(JSON.stringify(scene)));
      message('Mesa antiga importada do Firebase e salva no Brave.');
     }
    }
    if(disposed)return;
    ensureMapCatalog();remoteReady=true;render();emitMapState();peerMedia?.broadcastScene(networkScene());if(queued)void save();
    else if(!saveFailed)message('Mesa local pronta. Inicie a transmissão para os jogadores.');
   }catch(error){
    if(disposed)return;
    remoteReady=false;
    warnSync('Não foi possível carregar a mesa local. Nada será sobrescrito: '+String(error.message||error).slice(0,100));
    message('Falha ao abrir o armazenamento local.');
   }
  })();
 }else{
  remoteReady=true;render();message('Aguardando o mestre transmitir a mesa.');
 }
 render();
 return ()=>{disposed=true;unsubscribe();peerMedia?.destroy();liveRoot.remove();handlers.forEach(fn=>fn());localAudioCleanup();saveNotice.remove();control.remove();css.remove();tokenResizeCss.remove();tokenMenu.remove();menuStyle.remove();vttResizeObserver?.disconnect();combatDock.remove();drawMenu.remove();vttTabs.remove();vttRoomTag.remove();vttBar.remove();vttZoomRail.remove();vttOptions.remove();vttSide.remove();vttStyle.remove();vttLayer.remove();vttMeasure.remove();vttFog.remove();atmosphereLayer.remove();vttLog.remove();mapVideo.remove();};
}
