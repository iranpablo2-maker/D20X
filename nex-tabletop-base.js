/* NEX Tabletop — base: mapa, grade, tokens, variantes 0-9 e sincronização. */
export function mountNexTabletop({db,doc,onSnapshot,setDoc,campaignId,gm}){
 const $=id=>document.getElementById(id),board=$('nexTabletopBoard'),tools=$('nexTabletopTools'),status=$('nexTabletopMessage');
 if(!board||!tools)return ()=>{};
 const ref=doc(db,'campaigns',campaignId,'tabletop','state');
 const GRID=48,W=16,H=12;
 const empty=()=>({map:'',tokens:[]});
 let scene=empty(),selectedId=null,drag=null,remoteReady=false,pending=false,queued=false,disposed=false;
 const handlers=[];
 const listen=(el,type,fn,opts)=>{el?.addEventListener(type,fn,opts);handlers.push(()=>el?.removeEventListener(type,fn,opts));};
 const message=t=>{status.textContent=t;};
 const selected=()=>scene.tokens.find(t=>t.id===selectedId);
 const isTyping=e=>e.target?.closest?.('input,textarea,select,[contenteditable="true"]');
 tools.hidden=!gm;
 $('nexTabletopRole').textContent=gm?'Mestre':'Jogador';
 const control=document.createElement('div');control.id='nexTtVariants';
 control.innerHTML='<label>Token selecionado <strong id="nexTtSelected">Nenhum</strong></label><label>Variação <select id="nexTtSlot"></select></label><label>Imagem/GIF da variação <input id="nexTtVariantFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><button id="nexTtDelete" type="button" class="alt">Excluir token</button>';
 control.className='nex-tabletop-tools';control.hidden=!gm;
 tools.insertAdjacentElement('afterend',control);
 const help=document.createElement('p');help.className='room-note';help.textContent='Selecione um token e pressione 0–9 para trocar sua aparência. PNG, JPG, WebP e GIF são aceitos.';
 board.insertAdjacentElement('afterend',help);
 const css=document.createElement('style');css.textContent='#nexTtVariants{border:1px solid #4e2f38;border-radius:8px;padding:9px;margin:8px 0}#nexTtVariants select{background:#1a1317;color:white;border:1px solid #6c3b49;border-radius:5px;padding:8px;min-width:130px}#nexTabletopBoard .nex-tabletop-token[data-selected="true"]{outline:3px solid #ffbd6d;outline-offset:3px}#nexTabletopBoard .nex-tabletop-token img{width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none}';document.head.append(css);
 const slot=$('nexTtSlot');for(let k=0;k<10;k++){const o=document.createElement('option');o.value=k;o.textContent=k===0?'0 · Especial':k+' · Variação';slot.append(o);}
 const stateOK=value=>value&&typeof value==='object'&&Array.isArray(value.tokens);
 function validScene(data){
  if(!stateOK(data))return empty();
  return {map:typeof data.map==='string'&&data.map.length<650000?data.map:'',tokens:data.tokens.slice(0,90).filter(t=>t&&typeof t.id==='string'&&typeof t.name==='string').map(t=>({
   id:t.id.slice(0,100),name:t.name.slice(0,35),x:Math.max(0,Math.min(W-1,Math.floor(Number(t.x)||0))),y:Math.max(0,Math.min(H-1,Math.floor(Number(t.y)||0))),
   variation:Math.max(0,Math.min(9,Math.floor(Number(t.variation)||0))),
   images:Array.isArray(t.images)?t.images.slice(0,10).map(url=>typeof url==='string'&&url.length<300000?url:''):[]
  }))};
 }
 function render(){
  if(disposed)return;
  board.replaceChildren();
  board.style.backgroundImage=scene.map?'url("'+scene.map.replace(/"/g,'')+'")':'none';
  for(const t of scene.tokens){
   const el=document.createElement('button');el.type='button';el.className='nex-tabletop-token';el.dataset.token=t.id;el.dataset.master=String(gm);el.dataset.selected=String(t.id===selectedId);
   el.style.left=(t.x*GRID+4)+'px';el.style.top=(t.y*GRID+4)+'px';el.title=t.name+' · Variação '+t.variation;el.setAttribute('aria-label',el.title);
   const img=t.images[t.variation]||'';
   if(img){const image=document.createElement('img');image.src=img;image.alt=t.name;el.appendChild(image);}
   else{const span=document.createElement('span');span.textContent=t.name.slice(0,3).toUpperCase();el.appendChild(span);}
   board.appendChild(el);
  }
  const t=selected();$('nexTtSelected').textContent=t?t.name:'Nenhum';slot.disabled=!t;slot.value=String(t?.variation??1);
  $('nexTtVariantFile').disabled=!t;$('nexTtDelete').disabled=!t;
 }
 async function save(){
  if(!gm||disposed)return;
  queued=true;if(pending)return;
  pending=true;
  while(queued&&!disposed){
   queued=false;
   const data=validScene(scene);
   if(new TextEncoder().encode(JSON.stringify(data)).length>850000){message('Cena muito grande para sincronizar. Reduza o mapa ou as imagens dos tokens.');break;}
   try{await setDoc(ref,{...data,format:'nex-tabletop-v1'},{merge:false});message('Mesa salva na campanha.');}
   catch(e){message('Mesa local: não foi possível sincronizar. '+(e.code==='permission-denied'?'Publique as regras atualizadas do Firestore.':String(e.message||e)));}
  }
  pending=false;
 }
 const reader=(file,max,done)=>{
  if(!file||!/^image\/(png|jpeg|webp|gif)$/.test(file.type))return message('Escolha uma imagem PNG, JPG, WebP ou GIF.');
  if(file.size>max)return message('Arquivo muito grande. Limite: '+Math.round(max/1024)+' KB.');
  const r=new FileReader();r.onload=()=>{if(typeof r.result==='string')done(r.result);};r.onerror=()=>message('Não foi possível ler a imagem.');r.readAsDataURL(file);
 };
 listen($('nexTabletopAddToken'),'click',()=>{
  if(!gm)return;const name=$('nexTabletopTokenName').value.trim().slice(0,35)||'Token';
  const taken=new Set(scene.tokens.map(t=>t.x+','+t.y));let x=1,y=1;
  outer:for(let row=1;row<H;row++)for(let col=1;col<W;col++)if(!taken.has(col+','+row)){x=col;y=row;break outer;}
  const t={id:'tt_'+crypto.randomUUID(),name,x,y,variation:1,images:[]};scene.tokens.push(t);selectedId=t.id;$('nexTabletopTokenName').value='';render();save();
 });
 listen($('nexTabletopClearTokens'),'click',()=>{if(!gm||!confirm('Remover todos os tokens desta cena?'))return;scene.tokens=[];selectedId=null;render();save();});
 listen($('nexTabletopRemoveMap'),'click',()=>{if(!gm)return;scene.map='';render();save();});
 listen($('nexTabletopMapFile'),'change',e=>{
  if(!gm)return;reader(e.target.files?.[0],390000,data=>{scene.map=data;render();save();});e.target.value='';
 });
 listen($('nexTtVariantFile'),'change',e=>{
  const id=selectedId,variant=Number(slot.value);if(!gm||!id)return;
  reader(e.target.files?.[0],190000,data=>{const t=scene.tokens.find(x=>x.id===id);if(!t)return;t.images[variant]=data;t.variation=variant;render();save();});e.target.value='';
 });
 listen(slot,'change',()=>{const t=selected();if(!gm||!t)return;t.variation=Number(slot.value);render();save();});
 listen($('nexTtDelete'),'click',()=>{if(!gm||!selectedId)return;scene.tokens=scene.tokens.filter(t=>t.id!==selectedId);selectedId=null;render();save();});
 listen(board,'pointerdown',e=>{
  const el=e.target.closest('[data-token]');if(!el)return;
  selectedId=el.dataset.token;render();
  if(!gm)return;
  const target=board.querySelector('[data-token="'+selectedId+'"]');target?.setPointerCapture?.(e.pointerId);
  drag={id:selectedId,pointer:e.pointerId};e.preventDefault();
 });
 listen(board,'pointermove',e=>{
  if(!gm||!drag||drag.pointer!==e.pointerId)return;
  const rect=board.getBoundingClientRect(),t=scene.tokens.find(t=>t.id===drag.id);if(!t)return;
  t.x=Math.max(0,Math.min(W-1,Math.floor((e.clientX-rect.left)/GRID)));t.y=Math.max(0,Math.min(H-1,Math.floor((e.clientY-rect.top)/GRID)));render();
 });
 listen(board,'pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;drag=null;save();});
 listen(board,'pointercancel',()=>{if(drag){drag=null;save();}});
 listen(document,'keydown',e=>{
  if(!gm||!selectedId||isTyping(e)||e.altKey||e.ctrlKey||e.metaKey||!(/^[0-9]$/).test(e.key))return;
  const t=selected();if(!t)return;t.variation=Number(e.key);render();save();e.preventDefault();
 });
 const unsubscribe=onSnapshot(ref,snapshot=>{
  if(disposed||drag||pending)return;
  const data=snapshot.data();if(data)scene=validScene(data);
  remoteReady=true;render();message(gm?'Mesa pronta para editar.':'Mesa sincronizada com o mestre.');
 },error=>{message('Tabletop disponível nesta sessão. Para sincronização online, atualize as regras do Firestore.');console.warn('NEX Tabletop',error);remoteReady=true;render();});
 render();
 return ()=>{disposed=true;unsubscribe();handlers.forEach(fn=>fn());control.remove();help.remove();css.remove();};
}
