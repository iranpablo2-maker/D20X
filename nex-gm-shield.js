/* NEX | Escudo do Mestre — dados privados da campanha.
   Usa /campaigns/{id}/masterNotes/shield: somente o mestre tem permissão. */
export function mountGmShield(options){
 'use strict';
 const {root,db,doc,onSnapshot,setDoc,getContext,openTabletop,notify}=options;
 const $=(selector)=>root.querySelector(selector);
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const safeImage=value=>{const v=String(value||'');return /^https:\/\/[^\s<>"']{1,480}$/i.test(v)||/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]{1,200000}$/i.test(v)?v:'';};
 const kinds=['notes','npcs','threats'];
 const labels={notes:'Anotações',sessions:'Sessões',npcs:'NPCs',threats:'Ameaças',rules:'Regras',secrets:'Segredos'};
 const icons={notes:'▤ ',npcs:'',threats:''};
 const empty=()=>({notes:[],sessions:[],npcs:[],threats:[],secrets:[],timeline:[],favorites:[],rolls:[]});
 const npcSheet=(raw)=>{
  if(!raw||typeof raw!=='object')return null;
  const vals={};
  for(const k of ['agi','for','int','pre','vig'])vals[k]=Math.max(0,Math.min(6,Number(raw.attributes?.[k])||0));
  const skills=(Array.isArray(raw.npcSkills)?raw.npcSkills:[]).slice(0,28).map(x=>({name:String(x.name||'').slice(0,50),bonus:Number(x.bonus)||0}));
  const actions=(Array.isArray(raw.actions)?raw.actions:[]).slice(0,12).map(x=>({name:String(x.name||'').slice(0,90),test:String(x.test||'').slice(0,70),damage:String(x.damage||'').slice(0,70),description:String(x.description||'').slice(0,300)}));
  return {pv:Math.max(0,Number(raw.pv)||0),defense:Math.max(0,Number(raw.defense)||0),attributes:vals,skills,actions};
 };
 const listKinds=['notes','sessions','npcs','threats','secrets','timeline'];
 const schema={
  notes:[['title','Título','text'],['tag','Categoria','text'],['body','Anotação','textarea'],['image','URL HTTPS da imagem (opcional)','url']],
  sessions:[['title','Título da sessão','text'],['date','Data','date'],['status','Situação (Preparada / Concluída)','text'],['body','Resumo e planejamento','textarea']],
  npcs:[['title','Nome do NPC','text'],['tag','Relação (Aliado / Neutro / Inimigo)','text'],['body','Descrição, objetivos e segredos','textarea']],
  threats:[['title','Nome da ameaça','text'],['tag','Origem / elemento','text'],['body','Observações para a campanha','textarea']],
  secrets:[['title','Nome do segredo','text'],['tag','Categoria','text'],['body','Texto da revelação / pista','textarea'],['image','URL HTTPS da imagem (opcional)','url']],
  timeline:[['title','Acontecimento','text'],['date','Data no universo ou sessão','text'],['body','Descrição','textarea']]
 };
 const rules=[
  ['Testes de perícia','Atributos e grau de treinamento participam do teste; aplique bônus e penalidades correspondentes à situação.'],
  ['Ações em combate','Confira os limites e as diferenças entre ações padrão, de movimento, livres e reações.'],
  ['Fortitude, Reflexos e Vontade','Resistências usadas em situações físicas, evasivas e mentais, respectivamente.'],
  ['PV, PE e Sanidade','Acompanhe separadamente valores atuais, máximos, temporários e recursos gastos.'],
  ['Conjuração','Verifique círculo, custo em PE, tipo de ação, alcance, alvo, duração e possíveis testes de resistência.'],
  ['Cobertura e camuflagem','Aplique as condições de visibilidade e posicionamento à situação da cena.'],
  ['Condições','Uma condição pode modificar ações, deslocamento, ataques ou testes. Consulte sua duração e remoção.'],
  ['Interlúdios','Entre cenas, é possível realizar atividades de preparação, descanso e recuperação conforme as regras.'],
  ['Carga e equipamentos','Confira espaços ocupados, proficiência, categoria, patente e equipamento efetivamente vestido.'],
  ['Iniciativa','Determine a ordem de ação no confronto, considerando as habilidades específicas dos participantes.']
 ];
  let room='',unsubscribe=null,ready=false,state=empty(),tab='notes',editing=null,filter='',bestiary=false;
 let homebrew=[],threatCatalog=[],saveStatus='',writeQueue=Promise.resolve(),revision=0,committed=0,pendingReveal=null;
 const id=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 const attr=(name,value)=>' '+name+'="'+escape(value)+'"';
 function dataSafe(raw){
  const result=empty();
  if(!raw||typeof raw!=='object')return result;
  for(const key of listKinds)result[key]=Array.isArray(raw[key])?raw[key].slice(0,100).filter(x=>x&&typeof x==='object').map(x=>({
   id:String(x.id||id()).slice(0,70),title:String(x.title||'').slice(0,110),
   tag:String(x.tag||'').slice(0,150),body:String(x.body||'').slice(0,key==='notes'?18000:4000),
   date:String(x.date||'').slice(0,80),status:String(x.status||'').slice(0,50),
   image:safeImage(x.image),sourceId:String(x.sourceId||'').slice(0,120),sheet:npcSheet(x.sheet),revealed:!!x.revealed
  })):[]; 
  result.favorites=Array.isArray(raw.favorites)?raw.favorites.slice(0,120).map(x=>String(x).slice(0,130)):[];
  result.rolls=Array.isArray(raw.rolls)?raw.rolls.slice(0,30).filter(x=>x&&typeof x==='object').map(x=>({expression:String(x.expression||'').slice(0,60),result:String(x.result||'').slice(0,220),at:String(x.at||'').slice(0,30)})):[];
  return result;
 }
 function status(message){saveStatus=message;const node=$('[data-gm-status]');if(node)node.textContent=message;}
 function readHomebrews(){
  try{const data=JSON.parse(localStorage.getItem('nex_homebrew_advanced_v2051')||'[]');homebrew=Array.isArray(data)?data.filter(x=>x&&x.type==='npc'&&x.name).slice(0,150):[];}
  catch(error){homebrew=[];}
 }
 async function readThreats(){
  if(threatCatalog.length)return;
  try{
   const response=await fetch('./ameacas.html',{cache:'force-cache'});
   if(!response.ok)return;
   const text=await response.text(),match=text.match(/const records=(\[[^\n]+\]);/);
   if(!match)return;
   const records=JSON.parse(match[1]);
   threatCatalog=records.filter(x=>x&&x.name&&!['Doppelganger Monstruoso','O Verdadeiro Raziel'].includes(x.name)).map(x=>({title:String(x.name),tag:String(x.element||'')+' · '+String(x.source||'')}));
   if(room&&tab==='threats')render();
  }catch(error){console.warn('NEX: catálogo de ameaças não pôde ser carregado',error);}
 }
 function close(){
  if(unsubscribe){unsubscribe();unsubscribe=null;}
  room='';ready=false;state=empty();writeQueue=Promise.resolve();revision=0;committed=0;editing=null;filter='';saveStatus='';pendingReveal=null;
  clearTimeout(generalSaveTimer);root.replaceChildren();
 }
 function open(){
  const ctx=getContext();
  if(!ctx.gm||!ctx.roomId){root.textContent='O Escudo do Mestre é exclusivo do dono da campanha.';return;}
  if(room===ctx.roomId){render();return;}
  close();room=ctx.roomId;root.innerHTML='<p class="room-note">Carregando Escudo do Mestre…</p>';
  const current=room;
  unsubscribe=onSnapshot(doc(db,'campaigns',room,'masterNotes','shield'),snap=>{
   if(room!==current)return;
   if(revision>committed)return;
   state=dataSafe(snap.exists()?snap.data():null);ready=true;render();
  },error=>{if(room!==current)return;ready=false;root.textContent='Não foi possível carregar o Escudo do Mestre: '+String(error.message||error);});
  readHomebrews();
 }
 function store(){
  if(!ready||!room||!getContext().gm)return;
  const payload={...state,version:1,updatedAt:Date.now()};
  if(JSON.stringify(payload).length>680000){status('Limite de dados da campanha atingido. Reduza algumas anotações.');return;}
  const current=room,number=++revision;
  status('Salvando na conta…');
  writeQueue=writeQueue.catch(()=>{}).then(()=>{
   if(current!==room)return;
   return setDoc(doc(db,'campaigns',current,'masterNotes','shield'),payload);
  });
  writeQueue.then(()=>{
   if(room!==current)return;
   committed=Math.max(committed,number);
   if(number===revision)status('Salvo na campanha.');
  }).catch(error=>{
   if(room===current){committed=Math.max(committed,number);status('Falha ao salvar: '+String(error.message||error));}
  });
 }
 const favKey=(kind,value)=>kind+':'+value;
 const favored=(kind,value)=>state.favorites.includes(favKey(kind,value));
 function toggleFavorite(kind,value){
  const key=favKey(kind,value);
  state.favorites=favored(kind,value)?state.favorites.filter(x=>x!==key):[...state.favorites,key].slice(0,120);
  store();render();
 }
 function menu(){
  return '<div class="nex-gm-head"><div><h3>◈ ESCUDO DO MESTRE</h3><small>Painel privado · informações salvas nesta campanha</small></div>'+
   '<div class="nex-gm-head-actions"><button type="button" data-gm-action="tabletop">Abrir Tabletop</button></div></div>'+
   '<nav class="nex-gm-tabs" aria-label="Áreas do Escudo do Mestre">'+kinds.map(k=>'<button type="button" data-gm-tab="'+k+'" aria-pressed="'+(tab===k)+'">'+icons[k]+' '+labels[k]+'</button>').join('')+'</nav>';
 }
 function editor(kind,entry){
  const fields=schema[kind]||[];
  return '<form class="nex-gm-editor" data-gm-form="'+kind+'"><h4>'+(entry?'Editar':'Adicionar')+' '+(kind==='timeline'?'acontecimento':labels[kind]||kind)+'</h4>'+
   fields.map(([key,label,type])=>'<label>'+escape(label)+(type==='textarea'?'<textarea name="'+key+'" maxlength="4000" rows="4">'+escape(entry?.[key]||'')+'</textarea>':
   '<input name="'+key+'" type="'+(key==='image'&&String(entry?.[key]||'').startsWith('data:image/')?'text':type)+'" '+(key==='image'&&String(entry?.[key]||'').startsWith('data:image/')?'hidden ':'')+'maxlength="'+(key==='image'?200000:150)+'" '+(key==='title'?'required ':'')+'value="'+escape(entry?.[key]||'')+'"'+(kind==='threats'&&key==='title'?' list="nexGmThreatNames"':'')+'>')+'</label>').join('')+
   (kind==='notes'?'<label>Adicionar imagem do dispositivo<input type="file" accept="image/png,image/jpeg,image/webp" data-gm-note-file></label><small>Imagens compactadas para salvar junto com a anotação.</small>':'')+ '<div class="nex-gm-row"><button type="submit">Salvar</button><button type="button" class="alt" data-gm-action="cancel">Cancelar</button></div></form>';
 }
 function npcPreview(sheet){
  if(!sheet)return '';
  const attr=sheet.attributes||{};
  const attrs=[['AGI','agi'],['FOR','for'],['INT','int'],['PRE','pre'],['VIG','vig']].map(([name,key])=>name+' '+(Number(attr[key])||0)).join(' · ');
  const skills=(sheet.skills||[]).map(x=>escape(x.name)+' '+(Number(x.bonus)>=0?'+':'')+escape(x.bonus)).join(' · ');
  const actions=(sheet.actions||[]).map(x=>'<li><b>'+escape(x.name)+'</b> · '+escape(x.test||'')+' · '+escape(x.damage||'')+(x.description?' · '+escape(x.description):'')+'</li>').join('');
  return '<details class="nex-gm-npc-sheet"><summary>Ver ficha do NPC</summary><p>PV '+escape(sheet.pv)+' · Defesa '+escape(sheet.defense)+'</p>'+
   '<p>'+escape(attrs)+'</p>'+(skills?'<p><b>Perícias:</b> '+skills+'</p>':'')+
   (actions?'<ul>'+actions+'</ul>':'')+'</details>';
 }
 function cards(kind){
  const arr=state[kind]||[];
  const value=filter.toLocaleLowerCase('pt-BR'),matches=arr.filter(x=>!value||(x.title+' '+x.tag+' '+x.body).toLocaleLowerCase('pt-BR').includes(value));
  return matches.length?'<div class="nex-gm-cards">'+matches.map(x=>{
   const key=favKey(kind,x.id),favorite=state.favorites.includes(key);
   const image=kind==='secrets'&&safeImage(x.image)?'<img class="nex-gm-secret-image" src="'+escape(safeImage(x.image))+'" alt="Imagem privada associada ao segredo" loading="lazy">':'';
   return '<article class="nex-gm-card"><div class="nex-gm-card-top"><b>'+escape(x.title)+'</b>'+
    '<button type="button" class="nex-gm-icon-btn" data-gm-fav="'+kind+':'+escape(x.id)+'" title="Favorito" aria-label="'+(favorite?'Remover favorito':'Favoritar')+'">'+(favorite?'★':'☆')+'</button></div>'+
    (x.date?'<small>'+escape(x.date)+'</small>':'')+(x.status?'<small>'+escape(x.status)+'</small>':'')+
    (x.tag?'<small>'+escape(x.tag)+'</small>':'')+
    '<p>'+escape(x.body||'Sem descrição.')+'</p>'+image+
    (kind==='npcs'&&x.sourceId?'<small>NPC importado da biblioteca Homebrew</small>':'')+
    (kind==='npcs'?npcPreview(x.sheet):'')+
    (kind==='secrets'&&x.revealed?'<small class="nex-gm-revealed">Marcado como revelado</small>':'')+
    '<div class="nex-gm-row"><button type="button" class="alt" data-gm-edit="'+kind+':'+escape(x.id)+'">Editar</button>'+
    (kind==='secrets'?'<button type="button" class="alt" data-gm-copy="'+escape(x.id)+'">Copiar segredo</button><button type="button" class="alt" data-gm-reveal="'+escape(x.id)+'">Revelar no chat</button>':'')+
    '<button type="button" class="alt nex-gm-danger" data-gm-delete="'+kind+':'+escape(x.id)+'">Excluir</button></div></article>';
  }).join('')+'</div>':'<p class="room-note">Nenhum registro nesta área.</p>';
 }
 function homebrewOptions(){
  return '<div class="nex-gm-import"><label>Importar NPC criado nos Homebrews<select data-gm-homebrew><option value="">Escolha um NPC…</option>'+
   homebrew.map(x=>'<option value="'+escape(x.id)+'">'+escape(x.name)+'</option>').join('')+'</select></label>'+
   '<button type="button" data-gm-action="import-npc">Adicionar NPC da biblioteca</button></div>'+
   (!homebrew.length?'<p class="room-note">Nenhum NPC Homebrew disponível neste navegador. Você também pode cadastrar um NPC manualmente.</p>':'');
 }
 function threatsControls(){
  return '<div class="nex-gm-row nex-gm-wrap"><button type="button" data-gm-action="bestiary">'+(bestiary?'Fechar bestiário':'Consultar bestiário do NEX')+'</button>'+
   '<a href="./ameacas.html" target="_blank" rel="noopener">Abrir bestiário em outra aba</a></div>'+
   '<datalist id="nexGmThreatNames">'+threatCatalog.slice(0,160).map(x=>'<option value="'+escape(x.title)+'"></option>').join('')+'</datalist>'+
   (bestiary?'<iframe class="nex-gm-bestiary" src="./ameacas.html" title="Bestiário do NEX" loading="lazy"></iframe>':'');
 }
 function generalNote(){
  return state.notes.find(x=>x.id==='nex-general-note')||state.notes.find(x=>x.title==='Geral')||null;
 }
 function renderGeneralNotes(){
  const item=generalNote(),value=item?.body||'',image=safeImage(item?.image);
  return '<div class="nex-gm-general-notes">'+
   '<label class="nex-gm-general-title" for="nexGmGeneralText">Geral</label>'+
   '<textarea id="nexGmGeneralText" data-gm-general-note maxlength="18000" placeholder="Informações gerais ao longo da sessão…">'+escape(value)+'</textarea>'+
   '<div class="nex-gm-general-tools"><label class="nex-gm-image-upload">Adicionar imagem<input type="file" data-gm-general-file accept="image/png,image/jpeg,image/webp"></label>'+
   (image?'<button type="button" class="alt" data-gm-action="remove-general-image">Remover imagem</button>':'')+'</div>'+
   (image?'<img class="nex-gm-general-image" src="'+escape(image)+'" alt="Imagem da anotação Geral">':'')+
   '</div>';
 }
 function updateGeneralNote(fields){
  let item=generalNote();
  if(!item){item={id:'nex-general-note',title:'Geral',tag:'',body:'',date:'',status:'',image:''};state.notes.unshift(item);}
  Object.assign(item,fields);store();
 }
 let generalSaveTimer=null;
 function renderList(kind){
  const entry=editing?.kind===kind?state[kind].find(x=>x.id===editing.id)||null:null;
  return '<div class="nex-gm-section-head"><div><h4>'+labels[kind]+'</h4><small>'+state[kind].length+' registros</small></div><button type="button" '+(kind==='npcs'?'data-gm-action="create-npc"':'data-gm-add="'+kind+'"')+'>'+(kind==='npcs'?'Criar NPCs':'+ Adicionar')+'</button></div>'+
    (kind==='npcs'?homebrewOptions():'')+
    (kind==='threats'?threatsControls():'')+
    (editing?.kind===kind?editor(kind,entry):'')+
    '<label class="nex-gm-search">Pesquisar nesta área<input type="search" data-gm-search placeholder="Buscar por nome ou descrição" value="'+escape(filter)+'"></label>'+
    cards(kind);
 }
 function renderSessions(){
  const current=editing?.kind==='timeline'?state.timeline.find(x=>x.id===editing.id)||null:null;
  return renderList('sessions')+'<div class="nex-gm-timeline"><div class="nex-gm-section-head"><h4>Linha do tempo</h4><button type="button" data-gm-add="timeline">+ Acontecimento</button></div>'+
   (editing?.kind==='timeline'?editor('timeline',current):'')+
   cards('timeline')+'</div>';
 }
 function renderRules(){
  const q=filter.toLocaleLowerCase('pt-BR');
  const arr=rules.filter(([title,description])=>(title+' '+description).toLocaleLowerCase('pt-BR').includes(q));
  return '<div class="nex-gm-section-head"><div><h4>Consulta rápida</h4><small>Resumos de orientação; confira os valores exatos no livro.</small></div></div>'+
   '<label class="nex-gm-search">Buscar regra<input type="search" data-gm-search placeholder="Ações, perícias, condições…" value="'+escape(filter)+'"></label>'+
   '<div class="nex-gm-cards">'+arr.map(([title,description])=>'<article class="nex-gm-card"><div class="nex-gm-card-top"><b>'+escape(title)+'</b><button type="button" class="nex-gm-icon-btn" data-gm-fav="rules:'+escape(title)+'" title="Favorito">'+(favored('rules',title)?'★':'☆')+'</button></div><p>'+escape(description)+'</p></article>').join('')+'</div>'+
   (!arr.length?'<p>Nenhuma regra encontrada.</p>':'');
 }
 function renderFavourites(){
  if(!state.favorites.length)return '';
  const titles=state.favorites.filter(key=>kinds.includes(key.slice(0,key.indexOf(':')))).slice(-15).map(key=>{
   const p=key.indexOf(':'),kind=key.slice(0,p),entryId=key.slice(p+1);
   if(kind==='rules')return {kind,title:entryId};
   const item=state[kind]?.find(x=>x.id===entryId);
   return item?{kind,title:item.title}:null;
  }).filter(Boolean);
  return '<details class="nex-gm-favorites"><summary>★ Favoritos ('+titles.length+')</summary><div class="nex-gm-chip-list">'+titles.map(x=>'<span>'+escape(labels[x.kind]||x.kind)+' · '+escape(x.title)+'</span>').join('')+'</div></details>';
 }
 function render(){
  if(!room||!getContext().gm)return;
  if(!ready){root.innerHTML='<p class="room-note">Carregando dados privados da campanha…</p>';return;}
  const current=tab==='notes'?renderGeneralNotes():renderList(kinds.includes(tab)?tab:'notes');
  root.innerHTML=menu()+'<div class="nex-gm-status" data-gm-status role="status">'+escape(saveStatus)+'</div>'+
   renderFavourites()+'<div class="nex-gm-content">'+current+'</div>'+
   '<p class="nex-gm-footer">Somente o mestre pode ler e alterar estes dados. NPCs e ameaças são referências privadas; a biblioteca de fichas do NEX continua separada.</p>';
 }
 function makeRecord(form,kind){
  const raw=Object.fromEntries(new FormData(form).entries());
  return {title:String(raw.title||'').trim().slice(0,110),tag:String(raw.tag||'').trim().slice(0,150),
   body:String(raw.body||'').trim().slice(0,4000),date:String(raw.date||'').slice(0,80),
   status:String(raw.status||'').trim().slice(0,50),image:safeImage(raw.image)};
 }
 function submitRecord(kind,form){
  if(!listKinds.includes(kind))return;
  const record=makeRecord(form,kind);if(!record.title){status('Preencha o título.');return;}
  const arr=state[kind],old=editing?.kind===kind?arr.find(x=>x.id===editing.id):null;
  if(old)Object.assign(old,record);
  else{if(arr.length>=100){status('O limite é de 100 registros nesta área.');return;}arr.unshift({id:id(),...record});}
  editing=null;store();render();
 }
 function deleteRecord(kind,key){
  if(!state[kind]?.some(x=>x.id===key))return;
  if(!window.confirm('Excluir este registro do Escudo do Mestre?'))return;
  state[kind]=state[kind].filter(x=>x.id!==key);
  state.favorites=state.favorites.filter(x=>x!==favKey(kind,key));
  if(editing?.id===key)editing=null;
  store();render();
 }
 function importNpc(){
  readHomebrews();const key=$('[data-gm-homebrew]')?.value;
  const x=homebrew.find(y=>String(y.id)===String(key));if(!x){status('Escolha um NPC da biblioteca.');return;}
  if(state.npcs.some(n=>n.sourceId===String(x.id))){status('Este NPC já está na campanha.');return;}
  const record={id:id(),title:String(x.name).slice(0,110),tag:'Homebrew',body:String(x.description||x.threatSheet?.notas||'NPC criado na biblioteca Homebrew').slice(0,4000),sourceId:String(x.id),sheet:npcSheet(x.threatSheet),date:'',status:'',image:''};
  state.npcs.unshift(record);store();render();
 }
 function addThreatInfo(record){
  const match=threatCatalog.find(x=>x.title.toLocaleLowerCase('pt-BR')===record.title.toLocaleLowerCase('pt-BR'));
  if(match&&!record.tag)record.tag=match.tag;
 }
 function reveal(key){
  const secret=state.secrets.find(x=>x.id===key);if(!secret)return;
  if(!window.confirm('Enviar este segredo para o chat da sessão? Os jogadores conectados poderão ler.'))return;
  if(secret.image){status('Imagens permanecem privadas; o chat envia somente o texto.');}
  const message=('REVELAÇÃO — '+secret.title+': '+secret.body).slice(0,500);
  if(!message.trim()){status('O segredo não possui texto para revelar.');return;}
  const ctx=getContext();
  const success=options.revealToChat?.(message,ctx.roomId);
  if(!success){status('Inicie o Tabletop antes de revelar no chat, ou use Copiar segredo.');return;}
  pendingReveal={roomId:ctx.roomId,id:key};
  status('Enviando revelação para o chat…');
 }
 window.addEventListener('nex:vtt-chat-send-result',event=>{
  if(!pendingReveal||!room||event.detail?.campaignId!==pendingReveal.roomId)return;
  const request=pendingReveal;pendingReveal=null;
  if(event.detail?.ok){
   const secret=state.secrets.find(x=>x.id===request.id);
   if(secret){secret.revealed=true;store();render();}
   status('Revelação confirmada no chat da sessão.');
  }else status('A revelação não foi enviada. Você pode copiar o segredo e tentar novamente.');
 });
 root.addEventListener('submit',event=>{
  const form=event.target.closest('[data-gm-form]');if(!form)return;
  event.preventDefault();
  if(!room||!ready||!getContext().gm)return;
  if(form.dataset.gmForm){
   const kind=form.dataset.gmForm;
   if(kind==='threats'){const r=makeRecord(form,kind);addThreatInfo(r);const arr=state.threats;const old=editing?.kind===kind?arr.find(x=>x.id===editing.id):null;
    if(!r.title){status('Informe uma ameaça.');return;}
    if(old)Object.assign(old,r);else if(arr.length<100)arr.unshift({id:id(),...r});
    editing=null;store();render();
   }else submitRecord(kind,form);
  }
 });
 root.addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn||!room||!ready||!getContext().gm)return;
  if(btn.dataset.gmAction==='create-npc'){if(window.parent!==window){window.parent.postMessage({type:'nex-campaign-create-homebrew-npc'},location.origin);}else{window.location.assign('./index.html?createNpc=1');}return;}
  if(btn.dataset.gmAction==='remove-general-image'){updateGeneralNote({image:''});render();return;}
  if(btn.dataset.gmTab){if(!kinds.includes(btn.dataset.gmTab))return;tab=btn.dataset.gmTab;filter='';editing=null;render();if(tab==='threats')void readThreats();return;}
  if(btn.dataset.gmAdd){editing={kind:btn.dataset.gmAdd,id:null};render();$('[data-gm-form] [name="title"]')?.focus();return;}
  if(btn.dataset.gmEdit){const p=btn.dataset.gmEdit.indexOf(':'),kind=btn.dataset.gmEdit.slice(0,p),key=btn.dataset.gmEdit.slice(p+1);editing={kind,id:key};render();$('[data-gm-form] [name="title"]')?.focus();return;}
  if(btn.dataset.gmDelete){const p=btn.dataset.gmDelete.indexOf(':'),kind=btn.dataset.gmDelete.slice(0,p),key=btn.dataset.gmDelete.slice(p+1);deleteRecord(kind,key);return;}
  if(btn.dataset.gmFav){const p=btn.dataset.gmFav.indexOf(':'),kind=btn.dataset.gmFav.slice(0,p),key=btn.dataset.gmFav.slice(p+1);toggleFavorite(kind,key);return;}
  if(btn.dataset.gmReveal){reveal(btn.dataset.gmReveal);return;}
  if(btn.dataset.gmCopy){
   const secret=state.secrets.find(x=>x.id===btn.dataset.gmCopy);
   if(!secret)return;
   const text=secret.title+'\n'+secret.body+(secret.image?'\n'+secret.image:'');
   if(navigator.clipboard?.writeText)navigator.clipboard.writeText(text).then(()=>status('Segredo copiado.')).catch(()=>status('Não foi possível copiar. Selecione e copie o texto da descrição.'));
   else status('Cópia indisponível neste navegador.');
   return;
  }
  switch(btn.dataset.gmAction){
   case 'cancel':editing=null;render();break;
   case 'import-npc':importNpc();break;
   case 'bestiary':bestiary=!bestiary;render();break;
   case 'tabletop':openTabletop();break;

  }
 });
 root.addEventListener('change',async event=>{
  if(event.target.matches('[data-gm-general-note]')){clearTimeout(generalSaveTimer);updateGeneralNote({body:event.target.value.slice(0,18000)});return;}
  const fileInput=event.target.closest('[data-gm-note-file], [data-gm-general-file]');
  if(!fileInput||!fileInput.files?.length)return;
  const file=fileInput.files[0];
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12000000){status('Escolha uma imagem JPG, PNG ou WebP de até 12 MB.');return;}
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
   const canvas=document.createElement('canvas'),scale=Math.min(1,720/Math.max(img.width,img.height));
   canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   let encoded='';
   for(const quality of [.72,.55,.4,.28]){encoded=canvas.toDataURL('image/jpeg',quality);if(encoded.length<=190000)break;}
   if(encoded.length>190000){status('Imagem muito grande para a anotação. Tente outra menor.');return;}
   if(fileInput.matches('[data-gm-general-file]')){updateGeneralNote({image:encoded});render();return;}
   const field=fileInput.closest('form')?.querySelector('[name="image"]');
   if(field){field.value=encoded;field.type='text';field.hidden=true;status('Imagem pronta. Clique em Salvar para guardar a anotação.');}
  }catch(error){status('Não foi possível processar esta imagem.');}
  finally{URL.revokeObjectURL(url);}
 });
 root.addEventListener('input',event=>{
  if(event.target.matches('[data-gm-general-note]')){
   clearTimeout(generalSaveTimer);const value=event.target.value.slice(0,18000),currentRoom=room;
   generalSaveTimer=setTimeout(()=>{if(room===currentRoom&&ready)updateGeneralNote({body:value});},900);
   return;
  }
  if(!event.target.matches('[data-gm-search]'))return;
  const el=event.target;
  const at=el.selectionStart;
  filter=el.value.slice(0,100);
  render();
  const input=$('[data-gm-search]');if(input){input.focus();try{input.setSelectionRange(at,at);}catch(error){}}
 });
 return {open,close};
}
