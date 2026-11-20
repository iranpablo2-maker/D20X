/* NEX | Escudo do Mestre — dados privados da campanha.
   Usa /campaigns/{id}/masterNotes/shield: somente o mestre tem permissão. */
export function mountGmShield(options){
 'use strict';
 const {root,db,doc,onSnapshot,setDoc,getContext,openTabletop,notify}=options;
 const $=(selector)=>root.querySelector(selector);
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&quot;',"'":'&#39;'}[c]));
 const safeImage=value=>{const v=String(value||'');return /^https:\/\/[^\s<>"']{1,480}$/i.test(v)||/^\.\/assets\/ameacas\/[a-z0-9/_-]+\.webp(?:\?[a-z0-9=_-]+)?$/i.test(v)||/^data:image\/(?:jpeg|png|webp);base64,[a-z0-9+/=]{1,200000}$/i.test(v)?v:'';};
 const kinds=['notes','npcs','threats'];
 const labels={notes:'Anotações',sessions:'Sessões',npcs:'NPCs',threats:'Ameaças',rules:'Regras',secrets:'Segredos'};
 const icons={notes:'▤ ',npcs:'',threats:''};
 const empty=()=>({notes:[],sessions:[],npcs:[],threats:[],secrets:[],timeline:[],favorites:[],rolls:[]});
 const npcSkillNames=['Acrobacia','Adestramento','Artes','Atletismo','Atualidades','Ciências','Crime','Diplomacia','Enganação','Fortitude','Furtividade','Iniciativa','Intimidação','Intuição','Investigação','Luta','Medicina','Ocultismo','Percepção','Pilotagem','Pontaria','Profissão','Reflexos','Religião','Sobrevivência','Tática','Tecnologia','Vontade'];
 const npcAttrNames=[['agi','Agilidade'],['for','Força'],['int','Intelecto'],['pre','Presença'],['vig','Vigor']];
 const npcSheet=raw=>{
  if(!raw||typeof raw!=='object')raw={};
  const num=(value,min,max)=>Math.max(min,Math.min(max,Number(value)||0));
  const trim=(value,len)=>String(value??'').slice(0,len);
  const attributes={};
  for(const [k] of npcAttrNames)attributes[k]=num(raw.attributes?.[k],0,6);
  const npcSkills=(Array.isArray(raw.npcSkills)?raw.npcSkills:raw.skills||[]).slice(0,28).filter(x=>x&&typeof x==='object').map(x=>({name:trim(x.name,60),bonus:num(x.bonus,-99,99)})).filter(x=>npcSkillNames.includes(x.name));
  const actions=(Array.isArray(raw.actions)?raw.actions:[]).slice(0,30).filter(x=>x&&typeof x==='object').map(x=>({
   name:trim(x.name,90),kind:x.kind==='attack'?'attack':'ability',action:trim(x.action||'Padrão',60),
   test:trim(x.test,80),testSkill:trim(x.testSkill,60),damage:trim(x.damage,80),
   secondaryDamage:trim(x.secondaryDamage,80),secondaryType:trim(x.secondaryType,40),
   subtitle:trim(x.subtitle,90),critical:trim(x.critical||'20',8),
   damageType:trim(x.damageType,40),range:trim(x.range,70),
   effect:trim(x.effect||x.description,1300)
  }));
  const rituals=(Array.isArray(raw.rituals)?raw.rituals:[]).slice(0,40).filter(x=>x&&typeof x==='object').map(x=>({
   name:trim(x.name,100),element:trim(x.element,40),circle:num(x.circle,1,4)||1,
   source:trim(x.source,110),description:trim(x.description,1300)
  }));
  // Preserva os campos da ficha Homebrew além dos campos principais.
  const extra={};
  for(const field of ['presencaPerturbadora','sentidos','resistencias','imunidades','vulnerabilidades','enigma','fortitude','reflexos','vontade','iniciativa','percepcao']){
   extra[field]=trim(raw[field],field==='sentidos'?1200:1200);
  }
  return {pv:num(raw.pv,0,99999),defense:num(raw.defense,0,99999),
   deslocamento:trim(raw.deslocamento,90),attributes,npcSkills,actions,rituals,
   notas:trim(raw.notas,4000),habilidades:trim(raw.habilidades,4000),...extra};
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
 let selectedSheet=null,draftNpcId=null,showNpcImport=false,showThreatImport=false;
 function discardNpcDraft(){if(!draftNpcId)return;state.npcs=state.npcs.filter(x=>x.id!==draftNpcId);draftNpcId=null;}
 let homebrew=[],threatCatalog=[],saveStatus='',writeQueue=Promise.resolve(),revision=0,committed=0,pendingReveal=null;
 const id=()=>typeof crypto.randomUUID==='function'?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
 const attr=(name,value)=>' '+name+'="'+escape(value)+'"';
 function dataSafe(raw){
  const result=empty();
  if(!raw||typeof raw!=='object')return result;
  for(const key of listKinds)result[key]=Array.isArray(raw[key])?raw[key].slice(0,100).filter(x=>x&&typeof x==='object').map(x=>({
   id:String(x.id||id()).slice(0,70),title:String(x.title||'').slice(0,110),
   tag:String(x.tag||'').slice(0,150),body:String(x.body||'').slice(0,key==='notes'?18000:4000),richHtml:key==='notes'?String(x.richHtml||'').slice(0,590000):'',
   date:String(x.date||'').slice(0,80),status:String(x.status||'').slice(0,50),
   image:safeImage(x.image),sourceId:String(x.sourceId||'').slice(0,120),sheet:npcSheet(x.sheet),hasFullSheet:!!x.hasFullSheet,revealed:!!x.revealed,
   threatHomebrew:key==='threats'&&x.threatHomebrew&&typeof x.threatHomebrew==='object'?JSON.parse(JSON.stringify(x.threatHomebrew)):null
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
  room='';ready=false;selectedSheet=null;draftNpcId=null;showNpcImport=false;showThreatImport=false;state=empty();writeQueue=Promise.resolve();revision=0;committed=0;editing=null;filter='';saveStatus='';pendingReveal=null;
  clearTimeout(generalSaveTimer);richLastRange=null;richDragging=null;root.replaceChildren();
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
  return writeQueue;
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
   '</div>'+
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
 // Retratos oficiais são lidos do próprio bestiário, sem duplicar imagens no Firebase.
 const portraitCache=new Map();
 const failedDirectPortraits=new Set();
 function directThreatImage(key){
  const path=window.NEX_ARQUIVOS_IMAGES?.[key]||window.NEX_THREAT_PRIMARY_IMAGES?.[key];
  return typeof path==='string'&&/^\.\/assets\/ameacas\/[a-z0-9/_.-]+(?:\?[^\s"'<>]*)?$/i.test(path)?path:'';
 }
 let portraitFrame=null,portraitReady=false;
 function threatSourceKey(entry){
  const raw=String(entry?.sourceId||'');
  if(!raw.startsWith('catalog:')){
   const name=String(entry?.title||'').trim(),tag=String(entry?.tag||'');
   const source=tag.includes(' · ')?tag.split(' · ').slice(1).join(' · ').trim():'';
   return source&&name?source+'::'+name:'';
  }
  if(raw.includes('::'))return raw.slice(8);
  const old=raw.slice(8),index=old.lastIndexOf(':');
  if(index<0)return '';
  const tag=old.slice(index+1);
  return tag.split(' · ').slice(1).join(' · ')+'::'+old.slice(0,index);
 }
 function threatPortraitMarkup(key){
  const portrait=portraitCache.get(key);
  if(!portrait)return '';
  const url=String(portrait.url||'');
  const atlas=String(portrait.atlas||'');
  const valid=value=>/^https:\/\//i.test(value)||value.startsWith('blob:'+location.origin+'/')||/^\.\/assets\//.test(value)||/^data:image\/(?:webp|png|jpeg);base64,/i.test(value);
  if(url&&valid(url)&&url.length<350000){
   return '<img src="'+escape(url)+'" alt="" loading="lazy" onerror="this.remove()">';
  }
  const columns=Math.round(Number(portrait.columns)),rows=Math.round(Number(portrait.rows)),index=Math.round(Number(portrait.index));
  if(atlas&&valid(atlas)&&atlas.length<350000&&columns>=1&&rows>=1&&columns<=8&&rows<=8&&index>=0&&index<columns*rows){
   const left=columns>1?(index%columns)*100/(columns-1):0;
   const top=rows>1?Math.floor(index/columns)*100/(rows-1):0;
   return '<div aria-hidden="true" style="width:100%;height:100%;background-image:url(&quot;'+escape(atlas)+'&quot;);background-size:'+(columns*100)+'% '+(rows*100)+'%;background-position:'+left+'% '+top+'%;background-repeat:no-repeat"></div>';
  }
  return '';
 }
 function refreshThreatPortraits(){
  root.querySelectorAll('[data-gm-threat-portrait]').forEach(node=>{
   const key=node.dataset.gmThreatPortrait;
   const markup=threatPortraitMarkup(key);
   // Nunca substitui o retrato direto por uma miniatura antiga ou URL expirada.
   if(markup&&!node.querySelector('img[data-gm-direct-threat-image]'))node.innerHTML=markup;
  });
 }
 function requestThreatPortraits(){
  const keys=state.threats.map(threatSourceKey).filter(key=>key&&(!directThreatImage(key)||failedDirectPortraits.has(key)));
  if(!keys.length)return;
  if(!portraitFrame){
   portraitFrame=document.createElement('iframe');
   portraitFrame.hidden=true;
   portraitFrame.setAttribute('aria-hidden','true');
   portraitFrame.tabIndex=-1;
   portraitFrame.style.display='none';
   portraitFrame.addEventListener('load',()=>{
    portraitReady=true;requestThreatPortraits();
   },{once:true});
   portraitFrame.src='./ameacas.html?portraitProvider=1&v=20261120ziphires27';
   document.body.appendChild(portraitFrame);
   return;
  }
  if(portraitReady){
   const pending=[...new Set(keys.filter(key=>!portraitCache.has(key)))];
   if(pending.length)portraitFrame.contentWindow?.postMessage({type:'nex-request-threat-portraits',keys:pending},location.origin);
  }
  refreshThreatPortraits();
 }
 window.addEventListener('message',event=>{
  if(!portraitFrame||event.source!==portraitFrame.contentWindow||event.origin!==location.origin)return;
  if(event.data?.type!=='nex-threat-portrait-result')return;
  const {key,portrait}=event.data;
  if(typeof key!=='string'||!portrait||typeof portrait!=='object')return;
  portraitCache.set(key,portrait);
  refreshThreatPortraits();
 });
 root.addEventListener('error',event=>{
  const img=event.target;
  if(!(img instanceof HTMLImageElement)||!img.hasAttribute('data-gm-direct-threat-image'))return;
  const key=img.dataset.gmDirectThreatImage;
  if(!key)return;
  failedDirectPortraits.add(key);
  const holder=img.closest('[data-gm-threat-portrait]');
  if(holder)holder.textContent=(key.split('::').pop()||'?').trim().charAt(0).toUpperCase();
  requestThreatPortraits();
 },true);
 function entityCard(kind,x){
  const title=escape(x.title||'Sem nome'),pic=safeImage(x.image);
  const sourceKey=kind==='threats'?threatSourceKey(x):'';
  // Retratos de backup já incluídos no próprio JS. Não somem mesmo após
  // salvar, recarregar a ficha ou atualizar a campanha no Firebase.
  const embedded=kind==='threats'&&typeof window.NEX_GM_CARD_IMAGES?.[x.title]==='string'
   ?window.NEX_GM_CARD_IMAGES[x.title]:'';
  const storedDirect=pic&&/^\.\/assets\/ameacas\//i.test(pic)?pic:'';
  const direct=embedded||storedDirect||(sourceKey&&!failedDirectPortraits.has(sourceKey)?directThreatImage(sourceKey):'');
  const sourced=sourceKey?threatPortraitMarkup(sourceKey):'';
  const directMarkup=direct?'<img data-gm-direct-threat-image="'+escape(sourceKey)+'" src="'+escape(direct)+'" alt="" loading="eager" decoding="async">':'';
  const thumb=directMarkup|| (pic?'<img src="'+escape(pic)+'" alt="'+title+'">':'')||sourced||escape((x.title||'?').trim().charAt(0).toUpperCase()||'?');
  const portraitAttr=sourceKey?' data-gm-threat-portrait="'+escape(sourceKey)+'"':'';
  const key=escape(x.id);
  return '<article class="nex-gm-entity-card">'+
   '<div class="nex-gm-entity-cover"'+portraitAttr+'>'+thumb+'</div>'+
   '<div class="nex-gm-entity-body"><div class="nex-gm-entity-top"><strong>'+title+'</strong>'+
   '<details class="nex-gm-entity-settings"><summary aria-label="Configurações da ficha" title="Configurações">⚙</summary>'+
   '<div class="nex-gm-entity-settings-actions"><button type="button" data-gm-edit="'+kind+':'+key+'">Editar</button>'+
   '<button type="button" class="nex-gm-danger" data-gm-delete="'+kind+':'+key+'">Excluir</button></div></details></div>'+
   '<button type="button" class="nex-gm-entity-open" data-gm-open-sheet="'+kind+':'+key+'">Acessar Ficha</button>'+
   '</div></article>';
 }
 function npcField(name,label,value,type='text',extra=''){
  return '<label>'+escape(label)+(type==='textarea'?
   '<textarea name="'+name+'" rows="4" maxlength="4000">'+escape(value||'')+'</textarea>':
   '<input name="'+name+'" type="'+type+'" '+extra+' value="'+escape(value??'')+'">')+'</label>';
 }
 function npcSkillRow(value={}){
  const choices=npcSkillNames.map(name=>'<option value="'+escape(name)+'"'+(name===value.name?' selected':'')+'>'+escape(name)+'</option>').join('');
  return '<div class="nex-gm-npc-repeat-row" data-gm-npc-row="skills">'+
   '<label>Perícia<select data-gm-npc-field="name"><option value="">Escolha uma perícia</option>'+choices+'</select></label>'+
   '<label>Bônus<input data-gm-npc-field="bonus" type="number" min="-99" max="99" value="'+escape(value.bonus??0)+'"></label>'+
   '<button type="button" class="alt" data-gm-npc-remove>Remover</button></div>';
 }
 function npcActionRow(value={}){
  const fields=[['name','Nome'],['action','Ação'],['test','Teste / dados'],['testSkill','Perícia do teste'],['damage','Dano'],['secondaryDamage','Dano secundário'],['secondaryType','Tipo secundário'],['subtitle','Subtítulo'],['critical','Crítico'],['damageType','Tipo de dano'],['range','Alcance']];
  return '<fieldset class="nex-gm-npc-repeat-row nex-gm-npc-action" data-gm-npc-row="actions"><legend>Habilidade / Combate</legend>'+
   '<label>Tipo<select data-gm-npc-field="kind"><option value="ability"'+(value.kind!=='attack'?' selected':'')+'>Habilidade</option><option value="attack"'+(value.kind==='attack'?' selected':'')+'>Ataque</option></select></label>'+
   fields.map(([key,label])=>'<label>'+label+'<input data-gm-npc-field="'+key+'" maxlength="1300" value="'+escape(value[key]||'')+'"></label>').join('')+
   '<label class="nex-gm-npc-wide">Descrição / efeito<textarea data-gm-npc-field="effect" rows="3" maxlength="1300">'+escape(value.effect||'')+'</textarea></label>'+
   '<button type="button" class="alt" data-gm-npc-remove>Remover</button></fieldset>';
 }
 function npcRitualRow(value={}){
  return '<fieldset class="nex-gm-npc-repeat-row nex-gm-npc-ritual" data-gm-npc-row="rituals"><legend>Ritual</legend>'+
   [['name','Nome'],['element','Elemento'],['circle','Círculo'],['source','Fonte']].map(([key,label])=>'<label>'+label+'<input data-gm-npc-field="'+key+'" '+(key==='circle'?'type="number" min="1" max="4"':'')+' value="'+escape(value[key]??(key==='circle'?1:''))+'"></label>').join('')+
   '<label class="nex-gm-npc-wide">Descrição<textarea data-gm-npc-field="description" rows="3" maxlength="1300">'+escape(value.description||'')+'</textarea></label>'+
   '<button type="button" class="alt" data-gm-npc-remove>Remover</button></fieldset>';
 }
 function npcCampaignEditor(x){
  const t=npcSheet(x.sheet);
  const image=safeImage(x.image);
  const attrBoxes=npcAttrNames.map(([key,label])=>'<label class="nex-gm-npc-attribute"><span>'+key.toUpperCase()+'</span><input name="attr_'+key+'" aria-label="'+escape(label)+'" type="number" min="0" max="6" value="'+escape(t.attributes[key])+'"></label>').join('');
  return '<form class="nex-gm-npc-form nex-gm-npc-homebrew-look" data-gm-npc-sheet="'+escape(x.id)+'">'+
   '<div class="nex-gm-npc-editor-topbar"><button type="button" class="alt" data-gm-close-sheet>← Voltar aos NPCs</button><span>FICHA EDITÁVEL · CAMPANHA</span><button type="submit" class="nex-gm-npc-save">Salvar na campanha</button></div>'+
   '<section class="nex-gm-npc-sheet-banner"><div class="nex-gm-npc-sheet-photo">'+
   (image?'<img data-gm-npc-preview src="'+escape(image)+'" alt="Foto do NPC">':'<div data-gm-npc-initial>'+escape((x.title||'?').charAt(0).toUpperCase())+'</div>')+
   '<label>+ Foto<input type="file" data-gm-npc-photo accept="image/png,image/jpeg,image/webp"></label>'+
   '<input type="hidden" name="npcImage" value="'+escape(image)+'"></div>'+
   '<div class="nex-gm-npc-banner-info"><small>HOMEBREW · FICHA EDITÁVEL</small>'+
   '<input name="title" aria-label="Nome do NPC" maxlength="110" value="'+escape(x.title)+'" required>'+
   '</div></section>'+
   '<div class="nex-gm-npc-vital-bar"><label><input name="pv" type="number" min="0" max="99999" value="'+escape(t.pv)+'"> PV</label></div>'+
   '<nav class="nex-gm-npc-sheet-tabs" aria-label="Seções da ficha">'+
   '<button type="button" data-gm-npc-tab="status" aria-selected="true">STATUS</button>'+
   '<button type="button" data-gm-npc-tab="combate" aria-selected="false">HABILIDADES/COMBATE</button>'+
   '<button type="button" data-gm-npc-tab="descricao" aria-selected="false">DESCRIÇÃO</button></nav>'+
   '<div data-gm-npc-panel="status" class="nex-gm-npc-tab-panel">'+
   '<div class="nex-gm-npc-attributes">'+attrBoxes+'</div>'+
   '<div class="nex-gm-npc-core-stats">'+npcField('defense','Defesa',t.defense,'number','min="0" max="99999"')+npcField('deslocamento','Deslocamento',t.deslocamento)+npcField('pvDisplay','PV máximos',t.pv,'number','readonly tabindex="-1"')+'</div>'+
   '<div class="nex-gm-npc-editor-section nex-gm-npc-clean-section"><div class="nex-gm-npc-section-head"><h4>Perícias</h4><button type="button" data-gm-npc-add="skills">+ Adicionar perícia</button></div>'+
   (t.npcSkills.length?'<div class="nex-gm-npc-skills-head"><span>Perícia (Atributo)</span><span>Dados</span><span>Bônus</span><span></span></div>':'<p class="nex-gm-npc-empty">Nenhuma perícia selecionada.</p>')+
   '<div data-gm-npc-list="skills">'+t.npcSkills.map(npcSkillRow).join('')+'</div></div></div>'+
   '<div data-gm-npc-panel="combate" class="nex-gm-npc-tab-panel" hidden>'+
   '<div class="nex-gm-npc-editor-section nex-gm-npc-clean-section"><div class="nex-gm-npc-section-head"><h4>Habilidades e ações</h4><div class="nex-gm-npc-add-buttons"><button type="button" data-gm-npc-add="ability">+ Adicionar habilidade</button><button type="button" data-gm-npc-add="attack">+ Adicionar ataque</button></div></div><div data-gm-npc-list="actions">'+t.actions.map(npcActionRow).join('')+'</div></div>'+
   '<div class="nex-gm-npc-editor-section nex-gm-npc-clean-section"><div class="nex-gm-npc-section-head"><h4>Rituais</h4><button type="button" data-gm-npc-add="rituals">+ Adicionar ritual</button></div><div data-gm-npc-list="rituals">'+t.rituals.map(npcRitualRow).join('')+'</div></div></div>'+
   '<div data-gm-npc-panel="descricao" class="nex-gm-npc-tab-panel" hidden>'+
   '<div class="nex-gm-npc-fields"><h4>Descrição do NPC</h4>'+npcField('body','Descrição',x.body,'textarea')+npcField('habilidades','Características adicionais',t.habilidades,'textarea')+npcField('notas','Observações',t.notas,'textarea')+'</div></div>'+
   '<div class="nex-gm-npc-form-footer"><button type="submit" class="nex-gm-npc-save">Salvar na campanha</button></div></form>';
 }
 function saveNpcCampaignForm(form){
  const x=state.npcs.find(n=>n.id===form.dataset.gmNpcSheet);if(!x)return;
  const data=new FormData(form);
  // Preservar campos adicionais importados do Homebrew ao salvar o NPC na campanha.
  const fields={...x.sheet,pv:data.get('pv'),defense:data.get('defense'),deslocamento:data.get('deslocamento'),
   habilidades:data.get('habilidades'),notas:data.get('notas'),attributes:{}};
  npcAttrNames.forEach(([key])=>{fields.attributes[key]=data.get('attr_'+key);});
  for(const kind of ['skills','actions','rituals']){
   fields[kind==='skills'?'npcSkills':kind]=[...form.querySelectorAll('[data-gm-npc-row="'+kind+'"]')].map(row=>{
    const record={};
    row.querySelectorAll('[data-gm-npc-field]').forEach(control=>{record[control.dataset.gmNpcField]=control.value;});
    return record;
   }).filter(row=>row.name);
  }
  const title=String(data.get('title')||'').trim().slice(0,110);
  if(!title){status('Informe o nome do NPC.');form.querySelector('[name="title"]')?.focus();return;}
  const next=npcSheet(fields);
  const previous={title:x.title,body:x.body,sheet:x.sheet,hasFullSheet:x.hasFullSheet,image:x.image};
  x.title=title;x.body=String(data.get('body')||'').slice(0,4000);x.sheet=next;x.hasFullSheet=true;x.image=safeImage(data.get('npcImage'));
  if(JSON.stringify(state).length>670000){Object.assign(x,previous);status('A ficha ultrapassou o limite de armazenamento da campanha.');return;}
  draftNpcId=null;
  npcInlineEditing=false;
  store();render();
 }

 // Abre o editor integral de Ameaças Homebrew, porém salva exclusivamente na campanha.
 let threatEditLoader=null;
 function threatEditorPayload(entry,details,base){
  const d=details&&typeof details==='object'?details:{};
  const text=value=>Array.isArray(value)?value.map(v=>typeof v==='string'?v:JSON.stringify(v)).join('; '):String(value??'');
  const att=d.attributes||{};
  const attributes={};
  for(const a of ['agi','for','int','pre','vig'])attributes[a]=Number(att[a.toUpperCase()]??att[a]??0)||0;
  const actions=[...(Array.isArray(d.actions)?d.actions:[]).map(a=>({...a,kind:'attack'})),
   ...(Array.isArray(d.abilities)?d.abilities:[]).map(a=>({...a,kind:'ability'}))].slice(0,12).map(a=>({
    name:String(a.name||''),kind:a.kind,
    action:String(a.action||a.type||'Padrão'),test:String(a.test||''),
    damage:String(a.damage||''),range:String(a.range||''),
    effect:String(a.effect||a.description||''),
    subtitle:String(a.subtitle||''),critical:String(a.critical||'20')
   })).filter(a=>a.name);
  const parseTests=(items,name)=>{
   if(!items)return '';
   if(typeof items==='string')return items.slice(0,90);
   const entries=Array.isArray(items)?items:Object.entries(items).map(([label,value])=>({name:label,test:value}));
   return text(entries.filter(v=>new RegExp(name,'i').test(String(v.name||v.label||''))).map(v=>v.test||v.expression||v.value||'')).slice(0,90);
  };
  const source=String(entry.sourceId||'').startsWith('catalog:')?String(entry.sourceId).slice(8):'';
  return {
   type:'ameaca',name:entry.title,description:entry.body||d.description||'',
   image:safeImage(entry.image)||safeImage(directThreatImage(threatSourceKey(entry)))||'',vd:Number(d.vd)||0,size:String(d.size||'Médio'),
   creatureType:String(base?.category||'Criatura'),
   sourceId:source,
   threatSheet:{
    element:String(base?.element||entry.tag?.split(' · ')[0]||'Sangue'),
    attributes,pv:Number(d.pv)||0,defense:Number(d.defense)||0,
    deslocamento:text(d.movement||''),
    presencaPerturbadora:text(d.presence||''),
    sentidos:text(d.senses||''),
    resistencias:text(d.resistances||''),
    imunidades:text(d.immunities||''),
    vulnerabilidades:text(d.weaknesses||''),
    fortitude:parseTests(d.saves,'Fortitude'),
    reflexos:parseTests(d.saves,'Reflexos'),
    vontade:parseTests(d.saves,'Vontade'),
    iniciativa:parseTests(d.senses,'Iniciativa'),
    percepcao:parseTests(d.senses,'Percepção'),
    habilidades:text((Array.isArray(d.abilities)?d.abilities:[]).map(a=>a.name)).slice(0,4000),
    enigma:text(d.enigma||''),notas:text(d.notes||''),
    actions
   }
  };
 }
 function editCampaignThreat(entry){
  if(window.parent===window){status('Abra o Escudo pela campanha para editar a ficha.');return;}
  if(threatEditLoader){threatEditLoader.remove();threatEditLoader=null;}
  if(entry.threatHomebrew){
   const originalPhoto=safeImage(entry.threatHomebrew.image)||safeImage(entry.image)||safeImage(directThreatImage(threatSourceKey(entry)));
   window.parent.postMessage({type:'nex-campaign-edit-threat-native',campaignId:room,entryId:entry.id,threat:{...entry.threatHomebrew,image:originalPhoto}},location.origin);
   return;
  }
  const sourceKey=threatSourceKey(entry);
  if(!sourceKey){
   window.parent.postMessage({type:'nex-campaign-edit-threat-native',campaignId:room,entryId:entry.id,
    threat:threatEditorPayload(entry,{},null)},location.origin);
   return;
  }
  const frame=document.createElement('iframe');
  frame.hidden=true;frame.style.display='none';frame.setAttribute('aria-hidden','true');
  frame.dataset.campaignThreatEntry=entry.id;
  threatEditLoader=frame;
  frame.src='./ameaca-ficha.html?id='+encodeURIComponent(sourceKey)+'&embedded=1&campaignEditSource=1&v=20261120threatedit30';
  document.body.appendChild(frame);
  status('Carregando a ficha completa para edição…');
 }
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin||!threatEditLoader||event.source!==threatEditLoader.contentWindow||event.data?.type!=='nex-campaign-threat-source-data')return;
  const loader=threatEditLoader;
  const entry=state.threats.find(x=>x.id===loader.dataset.campaignThreatEntry);
  threatEditLoader=null;loader.remove();
  if(!entry||!ready||!room||event.data.key!==threatSourceKey(entry))return;
  const threat=threatEditorPayload(entry,event.data.details,event.data.threat);
  window.parent.postMessage({type:'nex-campaign-edit-threat-native',campaignId:room,entryId:entry.id,threat},location.origin);
  status('Ficha de Ameaça pronta para edição.');
 });

 function openNpcFullEditor(entry){
  if(!entry)return;
  // Reaproveita a ficha completa do Homebrew, mas salva somente na campanha.
  readHomebrews();
  const source=homebrew.find(x=>String(x.id)===String(entry.sourceId));
  if(source&&!entry.hasFullSheet){
   entry.sheet=npcSheet(source.threatSheet);
   entry.hasFullSheet=true;
   store();
  }
  // Display the NPC inside the currently mounted GM shield, including the Tabletop overlay.
  // No parent navigation, new window or external Homebrew editor.
  selectedSheet={kind:'npcs',id:entry.id};
  npcInlineEditing=false;
  editing=null;
  render();
 }

 // Dados exclusivos da visualização mini do NPC no Escudo do Mestre.

 const gmNpcD20Icon='<img class="nex-dice20-icon" src="./nex-d20-icon.svg?v=20261120user48" alt="d20">';
 function gmNpcDiceExpression(value){
  const text=String(value||'').trim();
  const match=text.match(/(^|[^\w])(\d{1,2})\s*d\s*(100|20|12|10|8|6|4)\s*([+-]\s*\d{1,3})?/i);
  if(!match)return null;
  const count=Number(match[2]),sides=Number(match[3]),bonus=Number((match[4]||'0').replace(/\s+/g,''));
  if(!Number.isInteger(count)||count<1||count>30||!Number.isFinite(bonus)||Math.abs(bonus)>999)return null;
  return {count,sides,bonus};
 }
 function gmNpcRollButton(expression,label){
  if(!gmNpcDiceExpression(expression))return '';
  const pool=label==='Teste'?' data-gm-npc-pool="high"':'';
  return '<button type="button" class="nex-gm-npc-roll"'+pool+' data-gm-npc-dice="'+escape(expression)+'" data-gm-npc-dice-label="'+escape(label)+'" aria-label="Rolar '+escape(label)+'" title="Rolar '+escape(expression)+'">'+gmNpcD20Icon+'<span>'+escape(label)+'</span></button>';
 }
 function gmNpcRollResult(btn){
  const ui=window.NEX_DICE_UI;
  if(!ui){console.warn('NEX: sistema de rolagem ainda não carregado');return;}
  const skill=btn.hasAttribute('data-gm-npc-skill-attr');
  const npc=selectedSheet?.kind==='npcs'?state.npcs.find(x=>x.id===selectedSheet.id):null;
  if(!npc)return;
  const key=btn.dataset.gmNpcSkillAttr;
  const attrs=npcSheet(npc.sheet).attributes;
  const attr=skill?Math.max(0,Math.min(6,Math.trunc(Number(attrs[key])||0))):0;
  const bonus=skill?Math.trunc(Number(btn.dataset.gmNpcSkillBonus)||0):0;
  const expression=skill?null:btn.dataset.gmNpcDice;
  const label=btn.dataset.gmNpcDiceLabel||btn.getAttribute('aria-label')||'Rolagem';
  const isPool=skill||btn.dataset.gmNpcPool==='high';
  if(skill){
   ui.roll({title:label,count:attr||2,sides:20,bonus,pool:true,low:attr===0,detail:'Atributo '+key.toUpperCase()+' '+attr});
  }else if(ui.parse(expression)){
   // Não converter expressões compostas em uma única fórmula: preserva os dados adicionais.
   ui.roll({title:label,expression,pool:isPool});
  }
 }
 function npcCampaignView(x){
  const t=npcSheet(x.sheet),pic=safeImage(x.image),attrs=[['agi','AGI'],['for','FOR'],['int','INT'],['pre','PRE'],['vig','VIG']];
  const skillAttrs={'Acrobacia':'agi','Adestramento':'pre','Artes':'pre','Atletismo':'for','Atualidades':'int','Ciências':'int','Crime':'agi','Diplomacia':'pre','Enganação':'pre','Fortitude':'vig','Furtividade':'agi','Iniciativa':'agi','Intimidação':'pre','Intuição':'pre','Investigação':'int','Luta':'for','Medicina':'int','Ocultismo':'int','Percepção':'pre','Pilotagem':'agi','Pontaria':'agi','Profissão':'int','Reflexos':'agi','Religião':'pre','Sobrevivência':'int','Tática':'int','Tecnologia':'int','Vontade':'pre'};
  const attrHtml=attrs.map(([key,label])=>'<div class="nex-gm-npc-view-attr"><small>'+label+'</small><b>'+escape(t.attributes[key])+'</b><button type="button" class="nex-gm-npc-roll" data-gm-npc-skill-attr="'+key+'" data-gm-npc-skill-bonus="0" data-gm-npc-dice-label="Atributo '+label+'" aria-label="Rolar atributo '+label+'">' + gmNpcD20Icon + '</button></div>').join('');
  const empty='<p class="nex-gm-npc-view-empty">Nenhuma informação cadastrada.</p>';
  const filled=(value)=>String(value??'').trim();
  const details=(items)=>items.filter(([,value])=>filled(value)).map(([label,value])=>'<div class="nex-gm-npc-view-detail"><small>'+escape(label)+'</small><span>'+escape(value)+'</span></div>').join('');
  const blocks=(items)=>items.filter(([,value])=>filled(value)).map(([label,value])=>'<section class="nex-gm-npc-view-textblock"><h4>'+escape(label)+'</h4><p>'+escape(value)+'</p></section>').join('');
  const skills=t.npcSkills.map(s=>{
   const attr=skillAttrs[s.name]||'int',dice=t.attributes[attr],roll=dice===0?'2d20 (menor)':dice+'d20';
   return '<div class="nex-gm-npc-view-skill"><span>'+escape(s.name)+' <small>('+attr.toUpperCase()+')</small></span><strong>'+escape(roll)+(s.bonus>=0?'+':'')+escape(s.bonus)+'</strong><button type="button" class="nex-gm-npc-roll" data-gm-npc-skill-attr="'+attr+'" data-gm-npc-skill-bonus="'+escape(s.bonus)+'" aria-label="Rolar '+escape(s.name)+'" title="Rolar '+escape(s.name)+'">' + gmNpcD20Icon + '</button></div>';
  }).join('');
  const action=(a)=>{
   const heading=escape(a.name||'Habilidade');
   const dice=gmNpcRollButton(a.test,'Teste')+gmNpcRollButton(a.damage,'Dano')+gmNpcRollButton(a.secondaryDamage,'Dano secundário');
   const content=details([['Tipo',a.subtitle],['Perícia do teste',a.testSkill],['Teste',a.test],['Dano',a.damage],['Tipo de dano',a.damageType&&a.damage?a.damageType:''],['Dano secundário',a.secondaryDamage],['Tipo secundário',a.secondaryDamage?a.secondaryType:''],['Crítico',a.kind==='attack'?a.critical:''],['Alcance',a.range]])+
    (filled(a.effect)?'<p>'+escape(a.effect)+'</p>':'');
   return '<article class="nex-gm-npc-view-action"><div class="nex-gm-npc-action-head"><div><strong>'+heading+'</strong><small>'+escape(a.kind==='attack'?'ATAQUE':'HABILIDADE')+' · '+escape(a.action||'Padrão')+'</small></div>'+
    '<button type="button" class="nex-gm-npc-description-toggle" data-gm-npc-description-toggle aria-expanded="false" aria-label="Mostrar descrição de '+heading+'">⌄</button></div>'+
    (dice?'<div class="nex-gm-npc-action-rolls">'+dice+'</div>':'')+
    '<div class="nex-gm-npc-action-description" data-gm-npc-description hidden>'+content+'</div></article>';
  };
  const attacks=t.actions.filter(a=>a.kind==='attack').map(action).join('');
  const abilities=t.actions.filter(a=>a.kind!=='attack').map(action).join('');
  const rituals=t.rituals.map(a=>{
   const name=escape(a.name||'Ritual');
   return '<article class="nex-gm-npc-view-action"><div class="nex-gm-npc-action-head"><strong>'+name+'</strong>'+
    '<button type="button" class="nex-gm-npc-description-toggle" data-gm-npc-description-toggle aria-expanded="false" aria-label="Mostrar descrição de '+name+'">⌄</button></div>'+
    '<div class="nex-gm-npc-action-description" data-gm-npc-description hidden>'+details([['Elemento',a.element],['Círculo',a.circle],['Fonte',a.source]])+
    (filled(a.description)?'<p>'+escape(a.description)+'</p>':'')+'</div></article>';
  }).join('');
  const secondary=blocks([['Sentidos',t.sentidos],['Resistências',t.resistencias],['Imunidades',t.imunidades],['Vulnerabilidades',t.vulnerabilidades],['Presença perturbadora',t.presencaPerturbadora],['Enigma de Medo',t.enigma]]);
  const tests=details([['Fortitude',t.fortitude],['Reflexos',t.reflexos],['Vontade',t.vontade],['Iniciativa',t.iniciativa],['Percepção',t.percepcao]]);
  const description=blocks([['História e descrição',x.body],['Habilidades e características',t.habilidades],['Observações',t.notas]]);
  return '<section class="nex-gm-npc-view" aria-label="Ficha completa do NPC">'+
   '<div class="nex-gm-npc-view-tools"><button type="button" class="alt" data-gm-close-sheet>← Voltar aos NPCs</button><button type="button" class="alt" data-gm-edit="npcs:'+escape(x.id)+'">Editar ficha</button></div>'+
   '<div class="nex-gm-npc-view-card"><div class="nex-gm-npc-roll-result" data-gm-npc-dice-result hidden aria-live="polite"></div><header class="nex-gm-npc-view-header"><div class="nex-gm-npc-view-photo">'+(pic?'<img src="'+escape(pic)+'" alt="Foto de '+escape(x.title)+'">':escape((x.title||'?').charAt(0).toUpperCase()))+'</div>'+
   '<div class="nex-gm-npc-view-heading"><small>NPC · CAMPANHA</small><h3>'+escape(x.title||'Sem nome')+'</h3></div></header>'+
   '<div class="nex-gm-npc-view-pv"><strong>'+escape(t.pv)+' PV</strong><span></span></div>'+
   '<nav class="nex-gm-npc-view-tabs" aria-label="Seções da ficha do NPC"><button type="button" data-gm-npc-view-tab="status" aria-selected="true">STATUS</button><button type="button" data-gm-npc-view-tab="combate" aria-selected="false">COMBATE</button><button type="button" data-gm-npc-view-tab="descricao" aria-selected="false">DESCRIÇÃO</button></nav>'+
   '<section data-gm-npc-view-panel="status"><div class="nex-gm-npc-view-attrs">'+attrHtml+'</div><div class="nex-gm-npc-view-stats"><div><small>Defesa</small><strong>'+escape(t.defense)+'</strong></div><div><small>Deslocamento</small><strong>'+escape(t.deslocamento||'—')+'</strong></div><div><small>PV máximos</small><strong>'+escape(t.pv)+'</strong></div></div>'+
   (skills?'<h4>Perícias</h4>'+skills:'')+(tests?'<h4>Testes e sentidos</h4>'+tests:'')+secondary+'</section>'+
   '<section data-gm-npc-view-panel="combate" hidden><h4>Ataques</h4>'+(attacks||empty)+'<h4>Habilidades</h4>'+(abilities||empty)+'<h4>Rituais</h4>'+(rituals||empty)+'</section>'+
   '<section data-gm-npc-view-panel="descricao" hidden>'+(description||empty)+'</section></div></section>';
 }
 let npcInlineEditing=false;
 function entitySheetView(){
  if(!selectedSheet)return '';
  const kind=selectedSheet.kind,x=state[kind]?.find(entry=>entry.id===selectedSheet.id);
  if(!x)return '';
  const npc=kind==='npcs',sheet=x.sheet;
  if(npc)return npcInlineEditing?npcCampaignEditor(x):npcCampaignView(x);
  if(kind==='threats'&&String(x.sourceId||'').startsWith('catalog:')){
   const source=String(x.sourceId).slice(8);
   const key=source.includes('::')?source:(()=>{const i=source.lastIndexOf(':');return i<0?'':source.slice(i+1).split(' · ').slice(1).join(' · ')+'::'+source.slice(0,i);})();
   if(key)return '<section class="nex-gm-entity-sheet"><div class="nex-gm-entity-sheet-head"><button type="button" class="alt" data-gm-close-sheet>← Voltar às Ameaças</button><h3>'+escape(x.title)+'</h3></div><iframe data-gm-threat-sheet title="Ficha da ameaça" src="./ameaca-ficha.html?id='+encodeURIComponent(key)+'&embedded=1&v=20261119picker23" scrolling="no" style="display:block;width:100%;min-height:900px;border:0;background:#0b0b0e"></iframe></section>';
  }
  const note=(x.body||'').trim();
  const meaningful=note&&!['NPC criado na biblioteca Homebrew','NPC importado da biblioteca Homebrew'].includes(note);
  return '<section class="nex-gm-entity-sheet" aria-label="Ficha de '+(npc?'NPC':'ameaça')+'">'+
   '<div class="nex-gm-entity-sheet-head"><button type="button" class="alt" data-gm-close-sheet>← Voltar</button><h3>'+escape(x.title)+'</h3>'+
   '<div class="nex-gm-entity-sheet-actions"><button type="button" class="alt" data-gm-edit="'+kind+':'+escape(x.id)+'">Editar</button>'+
   '<button type="button" class="alt nex-gm-danger" data-gm-delete="'+kind+':'+escape(x.id)+'">Excluir</button></div></div>'+
   '<p class="nex-gm-entity-sheet-type">'+(npc?'NPC':'Ameaça')+(x.tag&&x.tag!=='Homebrew'?' · '+escape(x.tag):'')+'</p>'+
   (sheet?'<section class="nex-gm-sheet-stats"><h4>Ficha</h4><p>PV '+escape(sheet.pv)+' · Defesa '+escape(sheet.defense)+'</p>'+
   '<div class="nex-gm-sheet-attrs">'+[['agi','AGI'],['for','FOR'],['int','INT'],['pre','PRE'],['vig','VIG']].map(([key,label])=>'<span><b>'+label+'</b> '+escape(sheet.attributes?.[key]??0)+'</span>').join('')+'</div>'+
   (sheet.skills?.length?'<h4>Perícias</h4><ul>'+sheet.skills.map(a=>'<li>'+escape(a.name)+' '+(Number(a.bonus)>=0?'+':'')+escape(a.bonus)+'</li>').join('')+'</ul>':'')+
   (sheet.actions?.length?'<h4>Habilidades e ataques</h4><ul>'+sheet.actions.map(a=>'<li><b>'+escape(a.name)+'</b> '+escape(a.test||'')+' '+escape(a.damage||'')+(a.description?'<p>'+escape(a.description)+'</p>':'')+'</li>').join('')+'</ul>':'')+'</section>':'')+
   (meaningful?'<section class="nex-gm-sheet-description"><h4>Descrição</h4><p>'+escape(note)+'</p></section>':'')+
   (!sheet&&!meaningful?'<p class="room-note">Esta referência ainda não possui dados detalhados. Use Editar para acrescentar informações.</p>':'')+'</section>';
 }
 function cards(kind){
  const arr=state[kind]||[];
  const value=filter.toLocaleLowerCase('pt-BR'),matches=arr.filter(x=>!value||(x.title+' '+x.tag+' '+x.body).toLocaleLowerCase('pt-BR').includes(value));
  if(kind==='npcs'||kind==='threats')return matches.length?'<div class="nex-gm-entity-list">'+matches.map(x=>entityCard(kind,x)).join('')+'</div>':'';
  return matches.length?'<div class="nex-gm-cards">'+matches.map(x=>{
   const key=favKey(kind,x.id),favorite=state.favorites.includes(key);
   const image=kind==='secrets'&&safeImage(x.image)?'<img class="nex-gm-secret-image" src="'+escape(safeImage(x.image))+'" alt="Imagem privada associada ao segredo" loading="lazy">':'';
   return '<article class="nex-gm-card"><div class="nex-gm-card-top"><b>'+escape(x.title)+'</b>'+
    '<button type="button" class="nex-gm-icon-btn" data-gm-fav="'+kind+':'+escape(x.id)+'" title="Favorito" aria-label="'+(favorite?'Remover favorito':'Favoritar')+'">'+(favorite?'★':'☆')+'</button></div>'+
    (x.date?'<small>'+escape(x.date)+'</small>':'')+(x.status?'<small>'+escape(x.status)+'</small>':'')+
    (x.tag&&!(kind==='npcs'&&x.tag==='Homebrew')?'<small>'+escape(x.tag)+'</small>':'')+
    (kind==='npcs'&&['NPC criado na biblioteca Homebrew','NPC importado da biblioteca Homebrew'].includes((x.body||'').trim())?'':'<p>'+escape(x.body||'Sem descrição.')+'</p>')+image+
    (kind==='npcs'?npcPreview(x.sheet):'')+
    (kind==='secrets'&&x.revealed?'<small class="nex-gm-revealed">Marcado como revelado</small>':'')+
    '<div class="nex-gm-row"><button type="button" class="alt" data-gm-edit="'+kind+':'+escape(x.id)+'">Editar</button>'+
    (kind==='secrets'?'<button type="button" class="alt" data-gm-copy="'+escape(x.id)+'">Copiar segredo</button><button type="button" class="alt" data-gm-reveal="'+escape(x.id)+'">Revelar no chat</button>':'')+
    '<button type="button" class="alt nex-gm-danger" data-gm-delete="'+kind+':'+escape(x.id)+'">Excluir</button></div></article>';
  }).join('')+'</div>':'<p class="room-note">Nenhum registro nesta área.</p>';
 }
 function homebrewOptions(){
  const records=homebrew.filter(x=>x&&x.id&&x.name);
  return '<section class="nex-gm-npc-picker" aria-label="Adicionar NPCs dos Homebrews" style="min-height:380px;padding:8px 2px 30px">'+
   '<button type="button" class="alt" data-gm-action="close-import-npc">← Voltar aos NPCs</button>'+
   '<h3 style="text-align:center;margin:26px 0 24px">Escolha um NPC para adicionar à campanha!</h3>'+
   '<p style="margin:0 0 16px">Selecione uma ficha de NPC criada nos Homebrews.</p>'+
   (records.length?'<div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(240px,1fr));gap:14px">'+
    records.map(x=>{
     const already=state.npcs.some(n=>n.sourceId===String(x.id));
     const photo=safeImage(x.image);
     const stats=npcSheet(x.threatSheet);
     return '<article style="border:1px solid #393039;background:#202024;border-radius:7px;padding:16px;min-height:150px;display:flex;flex-direction:column;gap:8px">'+
      (photo?'<img src="'+escape(photo)+'" alt="Foto de '+escape(x.name)+'" style="height:110px;max-width:100%;object-fit:contain;align-self:start;border-radius:5px">':'')+
      '<strong>'+escape(x.name)+'</strong>'+
      '<small>NPC · Homebrew</small><small>PV '+escape(stats.pv)+' · Defesa '+escape(stats.defense)+'</small>'+
      '<div style="margin-top:auto;display:flex;justify-content:flex-end"><button type="button" data-gm-import-id="'+escape(x.id)+'"'+(already?' disabled':'')+'>'+(already?'Adicionado':'Adicionar')+'</button></div></article>';
    }).join('')+'</div>':
    '<p class="room-note">Nenhuma ficha de NPC encontrada nos Homebrews.</p>')+'</section>';
 }
 function threatsControls(){
  return '<div class="nex-gm-row nex-gm-wrap"><button type="button" data-gm-action="bestiary">'+(bestiary?'Fechar bestiário':'Consultar bestiário do NEX')+'</button>'+
   '<a href="./ameacas.html" target="_blank" rel="noopener">Abrir bestiário em outra aba</a></div>'+
   '<datalist id="nexGmThreatNames">'+threatCatalog.slice(0,160).map(x=>'<option value="'+escape(x.title)+'"></option>').join('')+'</datalist>'+
   (bestiary?'<iframe class="nex-gm-bestiary" src="./ameacas.html" title="Bestiário do NEX" loading="lazy"></iframe>':'');
 }
 function threatPicker(){
  return '<section class="nex-gm-threat-picker" style="min-height:400px">'+
   '<button type="button" class="alt" data-gm-action="close-import-threat">← Voltar às Ameaças</button>'+
   '<iframe data-gm-threat-picker title="Biblioteca de Ameaças do NEX" src="./ameacas.html?campaignPicker=1&v=20261119picker23" loading="eager" scrolling="yes" style="display:block;width:100%;height:min(75vh,900px);min-height:440px;background:#0b0b0e;border:0;margin-top:12px;border-radius:8px"></iframe>'+
   '</section>';
 }
 function campaignThreatKeys(){
  return state.threats.map(t=>{
   const key=String(t.sourceId||'');
   if(key.startsWith('catalog:')&&key.includes('::'))return key.slice(8);
   if(key.startsWith('catalog:')){
    const old=key.slice(8),index=old.lastIndexOf(':');
    if(index>=0){
     const title=old.slice(0,index),tag=old.slice(index+1);
     return tag.split(' · ').slice(1).join(' · ')+'::'+title;
    }
   }
   return '';
  }).filter(Boolean);
 }
 function syncThreatPicker(){
  const frame=$('[data-gm-threat-picker]');
  if(frame?.contentWindow)frame.contentWindow.postMessage({type:'nex-campaign-threat-picker-state',keys:campaignThreatKeys()},location.origin);
 }
 function importThreatFromLibrary(msg){
  const source=String(msg.source||''),name=String(msg.name||''),key=source+'::'+name;
  if(msg.key!==key||!name||!source||name.length>110||source.length>120)return;
  if(state.threats.length>=100){status('Limite de ameaças da campanha atingido.');syncThreatPicker();return;}
  if(campaignThreatKeys().includes(key)){status('Esta ameaça já está na campanha.');syncThreatPicker();return;}
  const record={id:id(),title:name,tag:String(msg.element||'').slice(0,40)+' · '+source,body:'',sourceId:'catalog:'+key,image:'',sheet:null,hasFullSheet:true};
  state.threats.unshift(record);
  status('Adicionando '+name+' à campanha…');
  const done=store();
  if(!done){state.threats=state.threats.filter(x=>x!==record);status('Não foi possível adicionar a ameaça.');syncThreatPicker();return;}
  done.then(()=>{status('Ameaça adicionada à campanha.');syncThreatPicker();}).catch(error=>{
   state.threats=state.threats.filter(x=>x!==record);
   status('Erro ao adicionar ameaça: '+String(error?.message||error));syncThreatPicker();
  });
 }
 function generalNote(){
  return state.notes.find(x=>x.id==='nex-general-note')||state.notes.find(x=>x.title==='Geral')||null;
 }
 function sanitizeRich(html){
  const docHtml=new DOMParser().parseFromString(String(html||''),'text/html');
  const sanitizeNode=node=>{
   if(node.nodeType===Node.TEXT_NODE)return escape(node.textContent||'');
   if(node.nodeType!==Node.ELEMENT_NODE)return '';
   const tag=node.tagName.toLowerCase();
   if(tag==='img'){
    const src=safeImage(node.getAttribute('src'));
    const width=Math.max(160,Math.min(690,Number(node.getAttribute('data-width'))||420));
    return src?'<div class="nex-gm-note-image" contenteditable="false" draggable="true"><img src="'+escape(src)+'" data-width="'+width+'" style="width:'+width+'px" alt="Imagem da anotação"></div>':'';
   }
   if(tag==='div'&&node.classList.contains('nex-gm-note-image')){
    const img=node.querySelector('img');
    return img?sanitizeNode(img):'';
   }
   if(['script','style','iframe','object','svg','button'].includes(tag))return '';
   const children=[...node.childNodes].map(sanitizeNode).join('');
   if(tag==='br')return '<br>';
   if(['p','div','ul','ol','li','blockquote'].includes(tag))return '<'+tag+'>'+children+'</'+tag+'>';
   if(['b','strong','i','em','u'].includes(tag))return '<'+tag+'>'+children+'</'+tag+'>';
   return children;
  };
  return [...docHtml.body.childNodes].map(sanitizeNode).join('').slice(0,590000);
 }
 function richEditor(){
  return $('[data-gm-rich-note]');
 }
 function renderGeneralNotes(){
  const item=generalNote(),legacy=item?.body||'',image=safeImage(item?.image);
  const initial=item?.richHtml?sanitizeRich(item.richHtml):('<p>'+escape(legacy).replace(/\\n/g,'<br>')+'</p>'+(image?'<img src="'+escape(image)+'" data-width="420">':''));
  const sanitized=sanitizeRich(initial);
  const editorContent=sanitized.includes('nex-gm-note-image')&&/<\/div>\s*$/.test(sanitized)?sanitized+'<p><br></p>':sanitized;
  return '<div class="nex-gm-general-notes">'+
   '<label class="nex-gm-general-title" for="nexGmRichEditor">Geral</label>'+
   '<div id="nexGmRichEditor" class="nex-gm-rich-editor" data-gm-rich-note contenteditable="true" role="textbox" aria-label="Anotações da sessão" aria-multiline="true" data-placeholder="Informações gerais ao longo da sessão…">'+editorContent+'</div>'+
   '<div class="nex-gm-general-tools"><label class="nex-gm-image-upload">Inserir imagem<input type="file" data-gm-general-file accept="image/png,image/jpeg,image/webp" multiple></label><span class="nex-gm-rich-hint">Arraste imagens para dentro do bloco e escreva entre elas. Arraste uma imagem para mudar sua posição.</span></div></div>';
 }
 function updateGeneralNote(fields){
  let item=generalNote();
  if(!item){item={id:'nex-general-note',title:'Geral',tag:'',body:'',date:'',status:'',image:'',richHtml:''};state.notes.unshift(item);}
  Object.assign(item,fields);store();
 }
 let generalSaveTimer=null;
 let richLastRange=null,richDragging=null;
 function rememberRichRange(){
  const editor=richEditor(),sel=window.getSelection();
  if(editor&&sel?.rangeCount&&editor.contains(sel.anchorNode))richLastRange=sel.getRangeAt(0).cloneRange();
 }
 function insertAtRich(node,point){
  const editor=richEditor();if(!editor)return;
  editor.focus();
  const selection=window.getSelection();
  let range=null;
  if(point&&document.caretRangeFromPoint)range=document.caretRangeFromPoint(point.clientX,point.clientY);
  if(!range&&point&&document.caretPositionFromPoint){const pos=document.caretPositionFromPoint(point.clientX,point.clientY);if(pos){range=document.createRange();range.setStart(pos.offsetNode,pos.offset);range.collapse(true);}}
  if(range&&!editor.contains(range.startContainer))range=null;
  if(!range&&richLastRange&&editor.contains(richLastRange.startContainer))range=richLastRange.cloneRange();
  if(!range&&selection?.rangeCount&&editor.contains(selection.anchorNode))range=selection.getRangeAt(0).cloneRange();
  if(!range){range=document.createRange();range.selectNodeContents(editor);range.collapse(false);}
  // Imagens devem ficar em blocos próprios, para permitir texto antes e depois.
  let block=range.startContainer.nodeType===1?range.startContainer:range.startContainer.parentNode;
  while(block&&block!==editor&&!['P','DIV','LI'].includes(block.nodeName))block=block.parentNode;
  if(block?.classList?.contains('nex-gm-note-image')){block.after(node);}
  else if(block&&block!==editor&&block.parentNode===editor){
   if(range.startOffset===0&&block.textContent?.length===0)block.before(node);
   else block.after(node);
  }else editor.appendChild(node);
  if(!node.nextElementSibling||node.nextElementSibling.classList?.contains('nex-gm-note-image'))node.after(document.createElement('p'));
  const after=node.nextElementSibling,caret=document.createRange();
  caret.selectNodeContents(after);caret.collapse(true);
  selection.removeAllRanges();selection.addRange(caret);richLastRange=caret.cloneRange();
  editor.focus();scheduleRichSave();
 }
 function imageNode(src,width=420){
  const node=document.createElement('div');
  node.className='nex-gm-note-image';node.contentEditable='false';node.draggable=true;
  const img=document.createElement('img');img.src=src;img.alt='Imagem da anotação';img.dataset.width=String(width);img.style.width=width+'px';
  node.append(img);return node;
 }
 async function compressNoteImage(file){
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>12000000)throw Error('Escolha imagens JPG, PNG ou WebP de até 12 MB.');
  const url=URL.createObjectURL(file);
  try{
   const img=new Image();await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=reject;img.src=url;});
   const canvas=document.createElement('canvas'),scale=Math.min(1,960/Math.max(img.width,img.height));
   canvas.width=Math.max(1,Math.round(img.width*scale));canvas.height=Math.max(1,Math.round(img.height*scale));
   canvas.getContext('2d').drawImage(img,0,0,canvas.width,canvas.height);
   let encoded='';
   for(const quality of [.72,.55,.4,.28]){encoded=canvas.toDataURL('image/jpeg',quality);if(encoded.length<=125000)break;}
   if(encoded.length>125000)throw Error('Imagem muito grande; escolha outra imagem.');
   return encoded;
  }finally{URL.revokeObjectURL(url);}
 }
 async function addRichImages(files,point){
  const arr=[...files].filter(f=>f.type.startsWith('image/')).slice(0,8);
  if(!arr.length)return;
  for(const file of arr){
   try{const src=await compressNoteImage(file);insertAtRich(imageNode(src),point);point=null;}
   catch(error){status(error.message||'Falha ao inserir imagem.');}
  }
 }
 function scheduleRichSave(){
  clearTimeout(generalSaveTimer);
  const editor=richEditor(),currentRoom=room;
  if(!editor)return;
  const value=sanitizeRich(editor.innerHTML);
  if(value.length>570000){status('Limite de imagens da anotação atingido. Exclua ou reduza uma imagem.');return;}
  generalSaveTimer=setTimeout(()=>{if(room===currentRoom&&ready)updateGeneralNote({richHtml:value,body:'' ,image:''});},950);
 }
 function renderList(kind){
  const entry=editing?.kind===kind?state[kind].find(x=>x.id===editing.id)||null:null;
  return '<div class="nex-gm-section-head"><div><h4>'+labels[kind]+'</h4><small>'+state[kind].length+' registros</small></div>'+
   (kind==='npcs'?'<div class="nex-gm-row"><button type="button" data-gm-action="create-npc">Criar NPCs</button><button type="button" data-gm-action="show-import-npc">Adicionar NPC</button></div>':kind==='threats'?'<div class="nex-gm-row"><button type="button" data-gm-action="create-threat">Criar Ameaça</button><button type="button" data-gm-action="show-import-threat">Adicionar Ameaça</button></div>':'<button type="button" data-gm-add="'+kind+'">+ Adicionar</button>')+'</div>'+
    
    (editing?.kind===kind?editor(kind,entry):'')+
    
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
  const current=tab==='npcs'&&showNpcImport?homebrewOptions():tab==='threats'&&showThreatImport?threatPicker():(selectedSheet&&selectedSheet.kind===tab?entitySheetView():(tab==='notes'?renderGeneralNotes():renderList(kinds.includes(tab)?tab:'notes')));
  root.innerHTML=menu()+'<div class="nex-gm-status" data-gm-status role="status">'+escape(saveStatus)+'</div>'+
   renderFavourites()+'<div class="nex-gm-content">'+current+'</div>'+
   '';
  if(tab==='threats'&&showThreatImport){const frame=$('[data-gm-threat-picker]');if(frame)frame.addEventListener('load',syncThreatPicker,{once:true});}
  if(tab==='threats'&&!showThreatImport)requestThreatPortraits();
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
  if(selectedSheet?.kind===kind&&selectedSheet.id===key)selectedSheet=null;
  state.favorites=state.favorites.filter(x=>x!==favKey(kind,key));
  if(editing?.id===key)editing=null;
  store();render();
 }
 function importNpc(key){
  readHomebrews();
  const x=homebrew.find(y=>String(y.id)===String(key));if(!x){status('Escolha um NPC da biblioteca.');return;}
  if(state.npcs.some(n=>n.sourceId===String(x.id))){status('Este NPC já está na campanha.');return;}
  const record={id:id(),title:String(x.name).slice(0,110),tag:'Homebrew',body:String(x.description||x.threatSheet?.notas||'NPC criado na biblioteca Homebrew').slice(0,4000),sourceId:String(x.id),sheet:npcSheet(x.threatSheet),hasFullSheet:true,date:'',status:'',image:safeImage(x.image)};
  if(state.npcs.length>=100){status('Limite de NPCs da campanha atingido.');return;}
  state.npcs.unshift(record);showNpcImport=false;store();render();
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
 window.addEventListener('message',event=>{
  if(event.origin!==location.origin)return;
  const picker=$('[data-gm-threat-picker]');
  if(picker&&event.source===picker.contentWindow&&event.data?.type==='nex-library-add-campaign-threat'){
   if(room&&ready&&getContext().gm)importThreatFromLibrary(event.data);
   return;
  }
  const sheet=$('[data-gm-threat-sheet]');
  if(sheet&&event.source===sheet.contentWindow&&event.data?.type==='nex-threat-sheet-height'){
   const h=Number(event.data.height);
   if(Number.isFinite(h)&&h>0&&h<70000)sheet.style.height=Math.ceil(h+16)+'px';
  }
 });
 window.addEventListener('message',event=>{
  if(window.parent===window||event.origin!==location.origin||event.source!==window.parent)return;
  const msg=event.data||{};
  if(msg.type!=='nex-campaign-save-npc-native'||msg.campaignId!==room||!getContext().gm)return;
  if(!ready)return;
  const npc=msg.npc;
  if(!npc||npc.type!=='npc'||!String(npc.name||'').trim()||!npc.threatSheet||typeof npc.threatSheet!=='object')return;
  const existing=msg.entryId?state.npcs.find(x=>x.id===msg.entryId):null;
  if(msg.entryId&&!existing)return;
  if(!existing&&state.npcs.length>=100){
   window.parent.postMessage({type:'nex-campaign-npc-save-result',ok:false,error:'Limite de NPCs atingido',entryId:msg.entryId||''},location.origin);
   return;
  }
  const entry=existing||{id:id(),sourceId:'',tag:'Homebrew'};
  const previous=existing?{...existing}:null;
  entry.title=String(npc.name).slice(0,110);
  entry.body=String(npc.description||'').slice(0,4000);
  entry.image=safeImage(npc.image)||entry.image||'';
  entry.sheet=npcSheet(npc.threatSheet);
  entry.hasFullSheet=true;
  if(!existing)state.npcs.unshift(entry);
  if(JSON.stringify(state).length>670000){
   if(existing)Object.assign(entry,previous);else state.npcs=state.npcs.filter(x=>x!==entry);
   status('Ficha muito grande para a campanha.');
   window.parent.postMessage({type:'nex-campaign-npc-save-result',ok:false,error:'Ficha muito grande',entryId:msg.entryId||''},location.origin);
   return;
  }
  render();
  const done=store();
  if(!done){
   if(existing)Object.assign(entry,previous);else state.npcs=state.npcs.filter(x=>x!==entry);
   render();
   window.parent.postMessage({type:'nex-campaign-npc-save-result',ok:false,error:'Não foi possível iniciar o salvamento',entryId:msg.entryId||''},location.origin);
   return;
  }
  done.then(()=>{
   status('Ficha de NPC salva na campanha.');
   window.parent.postMessage({type:'nex-campaign-npc-save-result',ok:true,entryId:entry.id},location.origin);
  }).catch(error=>{
   if(existing)Object.assign(entry,previous);else state.npcs=state.npcs.filter(x=>x!==entry);
   render();
   status('Erro ao salvar a ficha: '+String(error.message||error));
   window.parent.postMessage({type:'nex-campaign-npc-save-result',ok:false,error:String(error.message||error),entryId:msg.entryId||''},location.origin);
  });
 });
 window.addEventListener('message',event=>{
  if(window.parent===window||event.origin!==location.origin||event.source!==window.parent)return;
  const msg=event.data||{};
  if(msg.type!=='nex-campaign-save-threat-native'||msg.campaignId!==room||!getContext().gm||!ready)return;
  const threat=msg.threat;
  if(!threat||threat.type!=='ameaca'||typeof threat.name!=='string'||!threat.name.trim()||typeof threat.threatSheet!=='object')return;
  const old=msg.entryId?state.threats.find(x=>x.id===msg.entryId):null;
  if(msg.entryId&&!old)return;
  if(!old&&state.threats.length>=100){
   window.parent.postMessage({type:'nex-campaign-threat-save-result',ok:false,error:'Limite de ameaças atingido',entryId:msg.entryId||''},location.origin);return;
  }
  const entry=old||{id:id()};
  const previous=old?{...old}:null;
  const officialKey=threatSourceKey(entry);
  const officialPhoto=safeImage(directThreatImage(officialKey));
  Object.assign(entry,{
   title:threat.name.slice(0,110),tag:threat.threatSheet.element||'Sangue',
   body:String(threat.description||'').slice(0,4000),image:safeImage(threat.image)||safeImage(old?.image)||officialPhoto,
   threatHomebrew:JSON.parse(JSON.stringify(threat)),hasFullSheet:true
  });
  if(!old)state.threats.unshift(entry);
  // Preserva a referência do bestiário e o retrato ao editar uma cópia oficial.
  if(old&&officialKey&&!String(entry.sourceId||'').startsWith('catalog:'))entry.sourceId='catalog:'+officialKey;
  if(JSON.stringify(state).length>670000){
   if(old)Object.assign(entry,previous);else state.threats=state.threats.filter(x=>x!==entry);
   window.parent.postMessage({type:'nex-campaign-threat-save-result',ok:false,error:'Ficha grande demais para a campanha',entryId:msg.entryId||''},location.origin);
   return;
  }
  render();
  const saved=store();
  if(!saved){
   if(old)Object.assign(entry,previous);else state.threats=state.threats.filter(x=>x!==entry);
   render();
   window.parent.postMessage({type:'nex-campaign-threat-save-result',ok:false,error:'Falha ao iniciar salvamento',entryId:msg.entryId||''},location.origin);
   return;
  }
  saved.then(()=>{
   window.parent.postMessage({type:'nex-campaign-threat-save-result',ok:true,entryId:entry.id},location.origin);
  }).catch(error=>{
   if(old)Object.assign(entry,previous);else state.threats=state.threats.filter(x=>x!==entry);
   render();
   window.parent.postMessage({type:'nex-campaign-threat-save-result',ok:false,error:String(error.message||error),entryId:msg.entryId||''},location.origin);
  });
 });
 root.addEventListener('submit',event=>{
  const npcForm=event.target.closest('[data-gm-npc-sheet]');
  if(npcForm){event.preventDefault();if(room&&ready&&getContext().gm)saveNpcCampaignForm(npcForm);return;}
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
  if(btn.hasAttribute('data-gm-npc-description-toggle')){
   const panel=btn.closest('.nex-gm-npc-view-action')?.querySelector('[data-gm-npc-description]');
   if(panel){panel.hidden=!panel.hidden;btn.setAttribute('aria-expanded',String(!panel.hidden));btn.textContent=panel.hidden?'⌄':'⌃';}
   return;
  }
  if(btn.hasAttribute('data-gm-npc-dice')||btn.hasAttribute('data-gm-npc-skill-attr')){
   if(btn.closest('.nex-gm-npc-view'))gmNpcRollResult(btn);
   return;
  }
  if(btn.dataset.gmNpcViewTab){
   const card=btn.closest('.nex-gm-npc-view-card');
   if(!card)return;
   card.querySelectorAll('[data-gm-npc-view-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===btn)));
   card.querySelectorAll('[data-gm-npc-view-panel]').forEach(panel=>{panel.hidden=panel.dataset.gmNpcViewPanel!==btn.dataset.gmNpcViewTab;});
   return;
  }
  if(btn.dataset.gmNpcTab){
   const form=btn.closest('[data-gm-npc-sheet]');
   if(!form)return;
   form.querySelectorAll('[data-gm-npc-tab]').forEach(tab=>tab.setAttribute('aria-selected',String(tab===btn)));
   form.querySelectorAll('[data-gm-npc-panel]').forEach(panel=>{panel.hidden=panel.dataset.gmNpcPanel!==btn.dataset.gmNpcTab;});
   return;
  }
  if(btn.dataset.gmNpcAdd){
   const requested=btn.dataset.gmNpcAdd,kind=(requested==='ability'||requested==='attack')?'actions':requested,list=root.querySelector('[data-gm-npc-list="'+kind+'"]');
   if(!list)return;
   const limit=kind==='skills'?28:kind==='actions'?30:40;
   if(list.children.length>=limit){status('Limite desta seção atingido.');return;}
   const row=kind==='skills'?npcSkillRow():kind==='actions'?npcActionRow({kind:requested==='attack'?'attack':'ability'}):npcRitualRow();
   list.insertAdjacentHTML('beforeend',row);
   const empty=list.parentElement?.querySelector('.nex-gm-npc-empty');if(empty)empty.remove();
   if(kind==='skills'&&!list.parentElement.querySelector('.nex-gm-npc-skills-head'))list.insertAdjacentHTML('beforebegin','<div class="nex-gm-npc-skills-head"><span>Perícia (Atributo)</span><span>Dados</span><span>Bônus</span><span></span></div>');
   return;
  }
  if(btn.hasAttribute('data-gm-npc-remove')){btn.closest('[data-gm-npc-row]')?.remove();return;}
  if(btn.dataset.gmAction==='show-import-npc'){readHomebrews();showNpcImport=true;render();return;}
  if(btn.dataset.gmAction==='close-import-npc'){showNpcImport=false;render();return;}
  if(btn.hasAttribute('data-gm-import-id')){importNpc(btn.dataset.gmImportId);return;}
  if(btn.dataset.gmAction==='show-import-threat'){showThreatImport=true;render();return;}
  if(btn.dataset.gmAction==='close-import-threat'){showThreatImport=false;render();return;}
  if(btn.dataset.gmAction==='create-threat'){
   showThreatImport=false;
   if(window.parent!==window){window.parent.postMessage({type:'nex-campaign-create-threat-native',campaignId:room},location.origin);status('Abrindo a ficha de Ameaça Homebrew…');}
   else status('Abra o Escudo do Mestre pela campanha para criar a ficha.');
   return;
  }
  if(btn.dataset.gmAction==='create-npc'){
   discardNpcDraft();
   if(state.npcs.length>=100){status('Limite de NPCs da campanha atingido.');return;}
   if(window.parent!==window){
    // Usa o componente real da biblioteca Homebrew, não uma ficha recriada.
    window.parent.postMessage({type:'nex-campaign-create-npc-native',campaignId:room},location.origin);
    status('Abrindo a ficha original de NPC do Homebrew no Escudo…');
   }else{
    const newId=id();draftNpcId=newId;
    state.npcs.unshift({id:newId,title:'',body:'',tag:'',image:'',sheet:npcSheet({attributes:{agi:1,for:1,int:1,pre:1,vig:1}}),hasFullSheet:true});
    tab='npcs';editing=null;selectedSheet={kind:'npcs',id:newId};render();
   }
   return;
  }

  if(btn.dataset.gmTab){if(!kinds.includes(btn.dataset.gmTab))return;showNpcImport=false;showThreatImport=false;discardNpcDraft();tab=btn.dataset.gmTab;filter='';editing=null;selectedSheet=null;render();if(tab==='threats')void readThreats();return;}
  if(btn.dataset.gmAdd){editing={kind:btn.dataset.gmAdd,id:null};render();$('[data-gm-form] [name="title"]')?.focus();return;}
  if(btn.hasAttribute('data-gm-close-sheet')){discardNpcDraft();selectedSheet=null;npcInlineEditing=false;render();return;}
  if(btn.dataset.gmOpenSheet){
   const sep=btn.dataset.gmOpenSheet.indexOf(':'),kind=btn.dataset.gmOpenSheet.slice(0,sep),key=btn.dataset.gmOpenSheet.slice(sep+1);
   const entry=state[kind]?.find(x=>x.id===key);
   if(!entry)return;
   if(kind==='threats'&&entry.threatHomebrew&&window.parent!==window){editCampaignThreat(entry);return;}
   if(kind==='npcs'){openNpcFullEditor(entry);return;}
   selectedSheet={kind,id:key};render();return;
  }
  if(btn.dataset.gmEdit){
   const p=btn.dataset.gmEdit.indexOf(':'),kind=btn.dataset.gmEdit.slice(0,p),key=btn.dataset.gmEdit.slice(p+1);
   if(kind==='threats'){
    const entry=state.threats.find(x=>x.id===key);
    if(entry)editCampaignThreat(entry);
    return;
   }
   if(kind==='npcs'){
    const entry=state.npcs.find(x=>x.id===key);
    if(entry){
      selectedSheet={kind:'npcs',id:key};
      npcInlineEditing=true;
      editing=null;
      render();
    }
    return;
   }
   selectedSheet=null;editing={kind,id:key};render();$('[data-gm-form] [name="title"]')?.focus();return;
  }
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
   case 'bestiary':bestiary=!bestiary;render();break;
   case 'tabletop':openTabletop();break;

  }
 });
 root.addEventListener('input',event=>{const pv=event.target.closest('[data-gm-npc-sheet] [name="pv"]');if(pv){const display=pv.closest('form')?.querySelector('[name="pvDisplay"]');if(display)display.value=pv.value;}});
 root.addEventListener('change',async event=>{
  const photo=event.target.closest('[data-gm-npc-photo]');
  if(photo?.files?.[0]){
   try{
    const src=await compressNoteImage(photo.files[0]);
    const container=photo.closest('.nex-gm-npc-sheet-photo'),hidden=container?.querySelector('[name="npcImage"]');
    if(hidden)hidden.value=src;
    const img=container?.querySelector('[data-gm-npc-preview]'),initial=container?.querySelector('[data-gm-npc-initial]');
    if(img)img.src=src;
    else if(initial){initial.outerHTML='<img data-gm-npc-preview alt="Foto do NPC">';container.querySelector('[data-gm-npc-preview]').src=src;}
    status('Foto adicionada. Clique em Salvar na campanha.');
   }catch(error){status(error.message||'Não foi possível carregar a imagem.');}
   return;
  }

  const fileInput=event.target.closest('[data-gm-note-file], [data-gm-general-file]');
  if(!fileInput||!fileInput.files?.length)return;
  if(fileInput.matches('[data-gm-general-file]')){await addRichImages(fileInput.files);fileInput.value='';return;}
  const file=fileInput.files[0];
  try{
   const encoded=await compressNoteImage(file);
   const field=fileInput.closest('form')?.querySelector('[name="image"]');
   if(field){field.value=encoded;field.type='text';field.hidden=true;status('Imagem pronta. Clique em Salvar para guardar a anotação.');}
  }catch(error){status(error.message||'Não foi possível processar esta imagem.');}
 });
 root.addEventListener('drop',event=>{
  const editor=event.target.closest('[data-gm-rich-note]');
  if(!editor)return;
  event.preventDefault();editor.classList.remove('drag-over');
  if(event.dataTransfer?.files?.length){void addRichImages(event.dataTransfer.files,event);return;}
  if(richDragging?.isConnected&&editor.contains(richDragging)){
   const block=event.target.closest('.nex-gm-note-image, p, div:not(.nex-gm-rich-editor)');
   if(block&&block!==richDragging&&editor.contains(block))block.after(richDragging);else editor.appendChild(richDragging);
   richDragging=null;scheduleRichSave();
  }
 });
 root.addEventListener('dragover',event=>{const editor=event.target.closest('[data-gm-rich-note]');if(editor){event.preventDefault();editor.classList.add('drag-over');}});
 root.addEventListener('dragleave',event=>{if(event.target.matches('[data-gm-rich-note]'))event.target.classList.remove('drag-over');});
 root.addEventListener('dragstart',event=>{const node=event.target.closest('.nex-gm-note-image');if(node){richDragging=node;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','nex-note-image');}});
 root.addEventListener('dragend',()=>{richDragging=null;richEditor()?.classList.remove('drag-over');});
 root.addEventListener('paste',event=>{
  const editor=event.target.closest('[data-gm-rich-note]');if(!editor)return;
  const files=[...(event.clipboardData?.items||[])].filter(x=>x.kind==='file'&&x.type.startsWith('image/')).map(x=>x.getAsFile()).filter(Boolean);
  if(files.length){event.preventDefault();void addRichImages(files);return;}
  event.preventDefault();const plain=event.clipboardData?.getData('text/plain')||'';
  document.execCommand('insertText',false,plain);
  scheduleRichSave();
 });
 root.addEventListener('keyup',event=>{if(event.target.closest('[data-gm-rich-note]'))rememberRichRange();});
 root.addEventListener('mouseup',event=>{if(event.target.closest('[data-gm-rich-note]'))rememberRichRange();});
 root.addEventListener('input',event=>{
  if(event.target.closest('[data-gm-rich-note]')){rememberRichRange();scheduleRichSave();return;}
  if(!event.target.matches('[data-gm-search]'))return;
  const el=event.target;
  const at=el.selectionStart;
  filter=el.value.slice(0,100);
  render();
  const input=$('[data-gm-search]');if(input){input.focus();try{input.setSelectionRange(at,at);}catch(error){}}
 });
 return {open,close};
}
