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
  return {pv:num(raw.pv,0,99999),defense:num(raw.defense,0,99999),
   deslocamento:trim(raw.deslocamento,90),attributes,npcSkills,actions,rituals,
   notas:trim(raw.notas,4000),habilidades:trim(raw.habilidades,4000)};
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
 let selectedSheet=null;
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
   image:safeImage(x.image),sourceId:String(x.sourceId||'').slice(0,120),sheet:npcSheet(x.sheet),hasFullSheet:!!x.hasFullSheet,revealed:!!x.revealed
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
  room='';ready=false;selectedSheet=null;state=empty();writeQueue=Promise.resolve();revision=0;committed=0;editing=null;filter='';saveStatus='';pendingReveal=null;
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
 function entityCard(kind,x){
  const title=escape(x.title||'Sem nome'),pic=safeImage(x.image);
  const thumb=pic?'<img src="'+escape(pic)+'" alt="'+title+'">':escape((x.title||'?').trim().charAt(0).toUpperCase()||'?');
  const key=escape(x.id);
  return '<article class="nex-gm-entity-card">'+
   '<div class="nex-gm-entity-cover">'+thumb+'</div>'+
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
  return '<form class="nex-gm-npc-form" data-gm-npc-sheet="'+escape(x.id)+'">'+
   '<header class="nex-gm-npc-form-header"><button type="button" class="alt" data-gm-close-sheet>← Voltar aos NPCs</button><h3>Ficha de '+escape(x.title)+'</h3><button type="submit" class="nex-gm-npc-save">Salvar na campanha</button></header>'+
   '<p class="nex-gm-npc-form-hint">Esta ficha é uma cópia da campanha. Alterações aqui não modificam o Homebrew original.</p>'+
   '<div class="nex-gm-npc-fields">'+npcField('title','Nome do NPC',x.title)+npcField('body','Descrição / História',x.body,'textarea')+'</div>'+
   '<h4>Atributos</h4><div class="nex-gm-npc-fields">'+npcAttrNames.map(([key,label])=>npcField('attr_'+key,label,t.attributes[key],'number','min="0" max="6"')).join('')+'</div>'+
   '<h4>Dados de combate</h4><div class="nex-gm-npc-fields">'+npcField('pv','Pontos de vida',t.pv,'number','min="0" max="99999"')+npcField('defense','Defesa',t.defense,'number','min="0" max="99999"')+npcField('deslocamento','Deslocamento',t.deslocamento)+'</div>'+
   '<div class="nex-gm-npc-editor-section"><div class="nex-gm-npc-section-head"><h4>Perícias</h4><button type="button" data-gm-npc-add="skills">+ Adicionar perícia</button></div><div data-gm-npc-list="skills">'+t.npcSkills.map(npcSkillRow).join('')+'</div></div>'+
   '<div class="nex-gm-npc-editor-section"><div class="nex-gm-npc-section-head"><h4>Habilidades e combate</h4><button type="button" data-gm-npc-add="actions">+ Adicionar habilidade / ataque</button></div><div data-gm-npc-list="actions">'+t.actions.map(npcActionRow).join('')+'</div></div>'+
   '<div class="nex-gm-npc-editor-section"><div class="nex-gm-npc-section-head"><h4>Rituais</h4><button type="button" data-gm-npc-add="rituals">+ Adicionar ritual</button></div><div data-gm-npc-list="rituals">'+t.rituals.map(npcRitualRow).join('')+'</div></div>'+
   '<div class="nex-gm-npc-fields">'+npcField('habilidades','Características adicionais',t.habilidades,'textarea')+npcField('notas','Observações',t.notas,'textarea')+'</div>'+
   '<div class="nex-gm-npc-form-footer"><button type="submit" class="nex-gm-npc-save">Salvar na campanha</button></div></form>';
 }
 function saveNpcCampaignForm(form){
  const x=state.npcs.find(n=>n.id===form.dataset.gmNpcSheet);if(!x)return;
  const data=new FormData(form);
  const fields={pv:data.get('pv'),defense:data.get('defense'),deslocamento:data.get('deslocamento'),
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
  const previous={title:x.title,body:x.body,sheet:x.sheet,hasFullSheet:x.hasFullSheet};
  x.title=title;x.body=String(data.get('body')||'').slice(0,4000);x.sheet=next;x.hasFullSheet=true;
  if(JSON.stringify(state).length>670000){Object.assign(x,previous);status('A ficha ultrapassou o limite de armazenamento da campanha.');return;}
  store();render();
 }
 function entitySheetView(){
  if(!selectedSheet)return '';
  const kind=selectedSheet.kind,x=state[kind]?.find(entry=>entry.id===selectedSheet.id);
  if(!x)return '';
  const npc=kind==='npcs',sheet=x.sheet;
  if(npc)return npcCampaignEditor(x);
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
  if(kind==='npcs'||kind==='threats')return matches.length?'<div class="nex-gm-entity-list">'+matches.map(x=>entityCard(kind,x)).join('')+'</div>':'<p class="room-note">Nenhum registro nesta área.</p>';
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
  return '<div class="nex-gm-section-head"><div><h4>'+labels[kind]+'</h4><small>'+state[kind].length+' registros</small></div><button type="button" '+(kind==='npcs'?'data-gm-action="create-npc"':'data-gm-add="'+kind+'"')+'>'+(kind==='npcs'?'Criar NPCs':'+ Adicionar')+'</button></div>'+
    (kind==='npcs'?homebrewOptions():'')+
    (kind==='threats'?threatsControls():'')+
    (editing?.kind===kind?editor(kind,entry):'')+
    (kind==='npcs'?'':'<label class="nex-gm-search">Pesquisar nesta área<input type="search" data-gm-search placeholder="Buscar por nome ou descrição" value="'+escape(filter)+'"></label>')+
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
  const current=selectedSheet&&selectedSheet.kind===tab?entitySheetView():(tab==='notes'?renderGeneralNotes():renderList(kinds.includes(tab)?tab:'notes'));
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
  if(selectedSheet?.kind===kind&&selectedSheet.id===key)selectedSheet=null;
  state.favorites=state.favorites.filter(x=>x!==favKey(kind,key));
  if(editing?.id===key)editing=null;
  store();render();
 }
 function importNpc(){
  readHomebrews();const key=$('[data-gm-homebrew]')?.value;
  const x=homebrew.find(y=>String(y.id)===String(key));if(!x){status('Escolha um NPC da biblioteca.');return;}
  if(state.npcs.some(n=>n.sourceId===String(x.id))){status('Este NPC já está na campanha.');return;}
  const record={id:id(),title:String(x.name).slice(0,110),tag:'Homebrew',body:String(x.description||x.threatSheet?.notas||'NPC criado na biblioteca Homebrew').slice(0,4000),sourceId:String(x.id),sheet:npcSheet(x.threatSheet),hasFullSheet:true,date:'',status:'',image:safeImage(x.image)};
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
  if(btn.dataset.gmNpcAdd){
   const kind=btn.dataset.gmNpcAdd,list=root.querySelector('[data-gm-npc-list="'+kind+'"]');
   if(!list)return;
   const limit=kind==='skills'?28:kind==='actions'?30:40;
   if(list.children.length>=limit){status('Limite desta seção atingido.');return;}
   const row=kind==='skills'?npcSkillRow():kind==='actions'?npcActionRow():npcRitualRow();
   list.insertAdjacentHTML('beforeend',row);return;
  }
  if(btn.hasAttribute('data-gm-npc-remove')){btn.closest('[data-gm-npc-row]')?.remove();return;}
  if(btn.dataset.gmAction==='create-npc'){if(window.parent!==window){window.parent.postMessage({type:'nex-campaign-create-homebrew-npc'},location.origin);}else{window.location.assign('./index.html?createNpc=1');}return;}

  if(btn.dataset.gmTab){if(!kinds.includes(btn.dataset.gmTab))return;tab=btn.dataset.gmTab;filter='';editing=null;selectedSheet=null;render();if(tab==='threats')void readThreats();return;}
  if(btn.dataset.gmAdd){editing={kind:btn.dataset.gmAdd,id:null};render();$('[data-gm-form] [name="title"]')?.focus();return;}
  if(btn.hasAttribute('data-gm-close-sheet')){selectedSheet=null;render();return;}
  if(btn.dataset.gmOpenSheet){
   const sep=btn.dataset.gmOpenSheet.indexOf(':'),kind=btn.dataset.gmOpenSheet.slice(0,sep),key=btn.dataset.gmOpenSheet.slice(sep+1);
   const entry=state[kind]?.find(x=>x.id===key);
   if(!entry)return;
   if(kind==='npcs'&&entry.sourceId&&!entry.hasFullSheet){
    readHomebrews();const source=homebrew.find(x=>String(x.id)===entry.sourceId);
    if(source){entry.sheet=npcSheet(source.threatSheet);entry.hasFullSheet=true;store();}
   }
   selectedSheet={kind,id:key};render();return;
  }
  if(btn.dataset.gmEdit){selectedSheet=null;const p=btn.dataset.gmEdit.indexOf(':'),kind=btn.dataset.gmEdit.slice(0,p),key=btn.dataset.gmEdit.slice(p+1);editing={kind,id:key};render();$('[data-gm-form] [name="title"]')?.focus();return;}
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
