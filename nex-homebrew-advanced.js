/* NEX 2.0.55 - Editores de habilidades por categoria; origens com duas perícias treinadas. */
(()=>{
 'use strict';
 const KEY='nex_homebrew_advanced_v2051';
 const LABEL={ameaca:'Ameaça',npc:'NPC',origem:'Origem',poder_paranormal:'Poder Paranormal',poder_geral:'Poder Geral',poder:'Poder',trilha:'Trilha',habilidade:'Habilidade',ritual:'Ritual',item:'Item',melhoria:'Melhoria',maldicao:'Maldição'};
 const TABS={ameacas:['ameaca'],npcs:['npc'],habilidades:['origem','poder_paranormal','poder_geral','poder','habilidade','trilha'],rituais:['ritual'],itens:['item'],melhorias:['melhoria'],paranormal:['item','maldicao']};
 const SKILL_TABS={origens:['origem'],paranormais:['poder_paranormal'],gerais:['poder_geral','poder','habilidade'],trilhas:['trilha']};
 const TRAIL_NEX=[10,40,65,99];
 const ITEM_CATEGORIES=['Armas','Munições','Proteções','Geral','Itens Amaldiçoados'];
 const CURSED_KINDS=['Armas Amaldiçoadas','Proteções Amaldiçoadas','Munições Amaldiçoadas','Itens Paranormais'];
 const IMPROVEMENT_TARGETS=['Armas','Munições','Proteções','Geral'];
 const EFFECT_TYPES=[['','Sem bônus automático'],['pv','PV máximo'],['pe','PE máximo'],['san','SAN máxima'],['ataque','Ataque'],['dano','Dano'],['defesa','Defesa'],['resistencia','Redução de dano'],['pericia','Perícia'],['bloqueio','Bloqueio'],['esquiva','Esquiva'],['carga','Capacidade de carga'],['pv_temp','PV temporários'],['pe_temp','PE temporários']];
 const parseEffects=(items,type,value,skill)=>{const src=Array.isArray(items)?items:(type?[{type,value,skill}]:[]);return src.slice(0,20).map(b=>{if(!b)return null;const legacy={iniciativa:'Iniciativa',fortitude:'Fortitude',reflexos:'Reflexos',vontade:'Vontade'}[b.type];const id=legacy?'pericia':b.type;if(![...EFFECT_TYPES,...CURSED_EXTRA_BONUSES].some(([key])=>key&&key===id))return null;return {type:id,value:Number.isFinite(Number(b.value))?Math.max(-999,Math.min(999,Number(b.value))):0,skill:id==='pericia'?cut(legacy||b.skill||'',60):'',scaling:b.scaling==='nex'?'nex':'fixed',nexInterval:[5,10,15,20].includes(Number(b.nexInterval))?Number(b.nexInterval):5};}).filter(Boolean);};
 const IMPROVEMENT_NO_SKILL=['Armas','Munições','Proteções'];
 const CURSED_NO_SKILL=['Armas Amaldiçoadas','Munições Amaldiçoadas','Proteções Amaldiçoadas'];
 const CURSED_EXTRA_BONUSES=[['critico','Margem de crítico'],['multiplicador','Multiplicador crítico'],['espacos','Espaços ocupados']];
 const isCursedEditor=()=>tab==='paranormal'&&paranormalSection==='itens'&&$('nex51Type')?.value==='item';
 const cursedNoSkill=()=>isCursedEditor()&&CURSED_NO_SKILL.includes(cursedKind);
 const parseImprovementBonuses=(items,type,value,skill)=>{
  const src=Array.isArray(items)?items:(type?[{type,value,skill}]:[]);
  return src.slice(0,20).filter(b=>b&&BONUS_TYPES.some(([id])=>id===b.type)).map(b=>({type:b.type,value:Number.isFinite(Number(b.value))?Math.max(-999,Math.min(999,Number(b.value))):0,skill:b.type==='pericia'?cut(b.skill||'',60):'',scaling:b.scaling==='nex'?'nex':'fixed',nexInterval:[5,10,15,20].includes(Number(b.nexInterval))?Number(b.nexInterval):5}));
 };
 const effectApplicable=x=>['origem','poder_paranormal','poder_geral','poder','habilidade','trilha','maldicao'].includes(x.type)||(x.type==='ritual'&&['Dano','Suporte','Cura'].includes(x.ritualType))||(x.type==='item');
 const BONUS_TYPES=[['ataque','Bônus de ataque'],['dano','Bônus de dano'],['critico','Margem de crítico'],['multiplicador','Multiplicador crítico'],['defesa','Defesa'],['resistencia','Redução de dano'],['espacos','Espaços ocupados'],['carga','Capacidade de carga'],['bloqueio','Bloqueio'],['esquiva','Esquiva'],['pericia','Testes de perícia']];
 let customItemImprovements=[];
 let effectRows=[];
 let improvementRows=[];
 const trailRows={};
 const $=id=>document.getElementById(id);
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','"':'&#39;'}[c]));
 const cut=(v,max)=>String(v??'').trim().slice(0,max);
 const num=(v,min,max,def)=>{if(v===''||v===null||v===undefined)return def;const n=Number(v);return Number.isFinite(n)?Math.max(min,Math.min(max,Math.floor(n))):def;};

 const isThreatType=type=>type==='ameaca'||type==='npc';
 const THREAT_ELEMENTS=['Sangue','Morte','Conhecimento','Energia','Medo','Transmissão','Realidade'];
 const THREAT_ATTRS=[['agi','Agilidade'],['for','Força'],['int','Intelecto'],['pre','Presença'],['vig','Vigor']];
 const THREAT_NUMERIC=[['defense','Defesa'],['pv','Pontos de Vida']];
 const THREAT_TESTS=[['fortitude','Fortitude'],['reflexos','Reflexos'],['vontade','Vontade'],['iniciativa','Iniciativa'],['percepcao','Percepção']];
 const THREAT_TEXT=[['deslocamento','Deslocamento'],['presencaPerturbadora','Presença perturbadora'],['sentidos','Sentidos'],['resistencias','Resistências a dano'],['imunidades','Imunidades'],['vulnerabilidades','Vulnerabilidades'],['habilidades','Habilidades e características'],['enigma','Enigma de Medo'],['notas','Observações']];
 function normalizeThreat(x){
  const raw=x?.threatSheet&&typeof x.threatSheet==='object'?x.threatSheet:{};
  const attributes={};
  THREAT_ATTRS.forEach(([k])=>{attributes[k]=num(raw.attributes?.[k],0,6,1);});
  const out={element:THREAT_ELEMENTS.includes(raw.element)?raw.element:'Sangue',attributes};
  THREAT_NUMERIC.forEach(([k])=>{out[k]=num(raw[k],0,99999,0);});
  THREAT_TESTS.forEach(([k])=>{out[k]=cut(raw[k]??'',90);});
  THREAT_TEXT.forEach(([k])=>{out[k]=cut(raw[k]||'',k==='habilidades'?4000:1200);});
  out.actions=Array.isArray(raw.actions)?raw.actions.slice(0,12).map(a=>({
    name:cut(a?.name||'',90),action:cut(a?.action||'Padrão',60),
    test:cut(a?.test||'',80),damage:cut(a?.damage||'',80),secondaryDamage:cut(a?.secondaryDamage||'',80),secondaryType:cut(a?.secondaryType||'Normal',40),
    range:cut(a?.range||'',70),effect:cut(a?.effect||'',1000)
  })).filter(a=>a.name):[];
  return out;
 }
 const valid=x=>x&&typeof x==='object'&&!Array.isArray(x)&&typeof x.id==='string'&&/^[\w-]{3,100}$/.test(x.id)&&Object.hasOwn(LABEL,x.type)&&typeof x.name==='string'&&x.name.trim().length>0;
 const normalize=x=>({
   id:x.id,type:x.type,name:cut(x.name,90),description:cut(x.description,2000),
   originShareId:cut(x.originShareId||'',100),originItemId:cut(x.originItemId||'',100),originalCreatorUid:cut(x.originalCreatorUid||'',150),
   requirements:cut(x.requirements,650),minNex:num(x.minNex,0,99,5),
   className:['Livre','Geral','Combatente','Especialista','Ocultista'].includes(x.className)?(x.className==='Livre'&&['poder_geral','poder','habilidade'].includes(x.type)?'Geral':x.className):(['poder_geral','poder','habilidade'].includes(x.type)?'Geral':'Livre'),
   ritualType:['Dano','Suporte','Cura'].includes(x.ritualType)?x.ritualType:(x.ritualDice||x.discenteDice||x.verdadeiroDice?'Dano':'Suporte'),
   discenteCircle:num(x.discenteCircle,1,4,Math.min(4,num(x.circle,1,4,1)+1)),
   verdadeiroCircle:num(x.verdadeiroCircle,1,4,Math.min(4,num(x.circle,1,4,1)+2)),
   circle:num(x.circle,1,4,1),element:['Conhecimento','Energia','Morte','Sangue','Medo','Personalizado'].includes(x.element)?x.element:'Conhecimento',
   execution:['Padrão','Movimento','Completa','Reação','Livre'].includes(x.execution)?x.execution:'Padrão',
   range:['Pessoal','Toque','Curto','Médio','Longo','Extremo','Ilimitado'].includes(x.range)?x.range:'Pessoal',
   area:cut(x.area,150),target:cut(x.target,150),duration:cut(x.duration,150),
   effect:cut(x.effect,700),resistance:cut(x.resistance,150),
   ritualDice:cut(x.ritualDice,120),discenteDice:cut(x.discenteDice,120),verdadeiroDice:cut(x.verdadeiroDice,120),
   image:typeof x.image==='string' && (/^https:\/\//i.test(x.image)||/^data:image\/(?:png|jpeg|webp);base64,/i.test(x.image))?x.image.slice(0,650000):'',
   cost:num(x.cost,0,99,0),vd:num(x.vd,0,9999,0),
   threatSheet:isThreatType(x.type)?normalizeThreat(x):undefined,
   size:['Minúsculo','Pequeno','Médio','Grande','Enorme','Colossal'].includes(x.size)?x.size:'Médio',
   creatureType:cut(x.creatureType||'Criatura',70),
   category:cut(x.category||'Geral',70),
   paranormalActivation:cut(x.paranormalActivation||'',120),
   paranormalEffect:cut(x.paranormalEffect||'',220),
   cursedAmmoType:cut(x.cursedAmmoType||'Balas curtas',80),
   cursedAmmoBonus:cut(x.cursedAmmoBonus||'',60),
   cursedAccessoryType:cut(x.cursedAccessoryType||'Anel',80),
   cursedAccessoryBenefit:cut(x.cursedAccessoryBenefit||'',100),
   cursedArtifactRequirement:cut(x.cursedArtifactRequirement||'',120),
    cursedKind:CURSED_KINDS.includes(x.cursedKind)?x.cursedKind:'Itens Paranormais',
   curseTarget:cut(x.curseTarget||'Armas',50),
   improvementTarget:IMPROVEMENT_TARGETS.includes(x.improvementTarget)?x.improvementTarget:'Armas',
   bonusType:BONUS_TYPES.some(([id])=>id===x.bonusType)?x.bonusType:'ataque',
   bonusValue:Number.isFinite(Number(x.bonusValue))?Math.max(0,Math.min(10,Number(x.bonusValue))):0,
   bonusSkill:cut(x.bonusSkill||'',60),
   improvementBonuses:x.type==='melhoria'?parseImprovementBonuses(x.improvementBonuses,x.bonusType,x.bonusValue,x.bonusSkill):[],
   effectBonusType:EFFECT_TYPES.some(([k])=>k===x.effectBonusType)?x.effectBonusType:'',
   effectBonusValue:Number.isFinite(Number(x.effectBonusValue))?Math.max(-999,Math.min(999,Number(x.effectBonusValue))):0,
   effectBonuses:parseEffects(x.effectBonuses,x.effectBonusType,x.effectBonusValue,x.effectBonusSkill),
   accessoryBonus:num(x.accessoryBonus,0,10,0),
   accessorySkill:cut(x.accessorySkill||'',60),
   itemTier:['0','I','II','III','IV'].includes(String(x.itemTier||''))?String(x.itemTier):'0',
   itemSpaces:num(x.itemSpaces,0,100,1),
   protectionDefense:num(x.protectionDefense,0,100,1),
   weaponProficiency:cut(x.weaponProficiency||'Armas Simples',70),
   weaponKind:cut(x.weaponKind||'Corpo a Corpo',70),
   weaponWield:cut(x.weaponWield||'Uma Mão',50),
   weaponDamage:cut(x.weaponDamage||'',90),
   weaponSecondary:cut(x.weaponSecondary||'',90),
   weaponSecondaryType:cut(x.weaponSecondaryType||'Normal',40),
   weaponCritical:cut(x.weaponCritical||'20',16),
   weaponMultiplier:cut(x.weaponMultiplier||'2',10),
   weaponDamageType:cut(x.weaponDamageType||'Corte',60),
   weaponRange:cut(x.weaponRange||'—',60),
   weaponQuantity:num(x.weaponQuantity,1,9999,1),
   itemTag:['Acessórios','Explosivos','Itens Operacionais'].includes(x.itemTag)?x.itemTag:'Acessórios',
   cursedExplosiveDamage:cut(x.cursedExplosiveDamage||'',90),
   cursedExplosiveSecondary:cut(x.cursedExplosiveSecondary||'',90),
   cursedExplosiveSecondaryType:['Normal','Sangue','Morte','Energia','Conhecimento','Medo'].includes(x.cursedExplosiveSecondaryType)?x.cursedExplosiveSecondaryType:'Normal',
   cursedExplosiveMultiplier:cut(x.cursedExplosiveMultiplier||'2',10),
   cursedExplosiveRange:cut(x.cursedExplosiveRange||'',60),
   customImprovements:x.type==='item'&&Array.isArray(x.customImprovements)?[...new Set(x.customImprovements.filter(v=>typeof v==='string').map(v=>cut(v,80)).filter(Boolean))].slice(0,30):[],
   skills:x.type==='origem'&&Array.isArray(x.skills)?[...new Set(x.skills.filter(v=>typeof v==='string').map(v=>cut(v,60)))].slice(0,2):[],
   trailAbilities:x.type==='trilha'?TRAIL_NEX.map((n,i)=>{
     const list=Array.isArray(x.trailAbilities)?x.trailAbilities:[];
     const saved=list.find(item=>item&&Number(item.nex)===n)||list[i]||{};
     return {nex:n,name:cut(saved.name,90),description:cut(saved.description,1600),bonusType:'',bonusValue:0,bonuses:parseEffects(saved.bonuses,saved.bonusType,saved.bonusValue,saved.bonusSkill)};
   }):[]
 });
 const DELETED_KEY=KEY+'_deleted_ids_v1';
 function readDeletedIds(){
  try{const entries=JSON.parse(localStorage.getItem(DELETED_KEY)||'[]');return new Set(Array.isArray(entries)?entries.filter(x=>typeof x==='string'&&/^[\w-]{3,100}$/.test(x)).slice(-2000):[]);}
  catch{return new Set();}
 }
 function markDeletedId(id){
  const deleted=readDeletedIds();deleted.add(id);
  const data=JSON.stringify([...deleted].slice(-2000));localStorage.setItem(DELETED_KEY,data);
  if(localStorage.getItem(DELETED_KEY)!==data)throw Error('Exclusão não confirmada');
 }
 function read(){
   try{const list=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(list)?list.filter(valid).filter(x=>!readDeletedIds().has(x.id)).map(normalize):[];}
   catch(error){console.warn('NEX: falha ao ler homebrews',error);return [];}
 }
 function write(items){
   if(!Array.isArray(items)||items.length>300||!items.every(valid))throw Error('Biblioteca inválida');
   const deleted=readDeletedIds();
   const value=JSON.stringify(items.filter(x=>!deleted.has(x.id)).map(normalize));
   localStorage.setItem(KEY,value);
   if(localStorage.getItem(KEY)!==value)throw Error('Gravação não confirmada');
 }
 const mount=$('nex51AdvancedMount'),sheet=$('nex51SheetMount');
 if(!mount||!sheet)return;

 const threatStyle=document.createElement('style');
 threatStyle.id='nex-homebrew-threat-sheet-style';
 threatStyle.textContent=`
  .nex-hb-threat-editor{display:block;max-width:100%;grid-column:1/-1}
  .nex-hb-threat-editor[hidden]{display:none}
  .nex-hb-threat-editor fieldset{border:1px solid #4a3338;border-radius:8px;margin:10px 0;padding:12px;min-width:0;background:rgba(20,13,16,.42)}
  .nex-hb-threat-editor legend{padding:0 7px;color:#efc0c3;font-weight:700;letter-spacing:.03em}
  .nex-hb-threat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(155px,1fr));gap:10px}
  .nex-hb-threat-grid label{display:flex;flex-direction:column;gap:4px;min-width:0;color:#d6c9cb}
  .nex-hb-threat-grid input,.nex-hb-threat-grid textarea,.nex-hb-threat-grid select{min-width:0;width:100%;box-sizing:border-box}
  #nexHbThreatActions>fieldset{margin-top:12px}
  .nex-hb-threat-sheet{border:1px solid #9a424c;border-radius:10px;overflow:hidden;background:#140f12;margin:10px 0 14px;padding:0 13px 12px}
  .nex-hb-threat-sheet-head{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:8px;margin:0 -13px 11px;padding:13px;background:#47191f;color:#fff}
  .nex-hb-threat-sheet-head strong{font-size:18px}
  .nex-hb-threat-sheet h4{margin:12px 0 6px;color:#f4a9b1;font-size:11px;letter-spacing:.08em}
  .nex-hb-threat-sheet p{white-space:normal;overflow-wrap:anywhere;line-height:1.5}
  .nex-hb-threat-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:6px}
  .nex-hb-threat-stat{border:1px solid #54373c;background:#23191d;border-radius:5px;padding:8px;display:flex;flex-direction:column;gap:4px}
  .nex-hb-threat-stat small{font-size:10px;color:#d0afb4}
  .nex-hb-threat-stat strong{font-size:17px}
  .nex-hb-threat-action{padding:10px;margin:7px 0;border:1px solid #594045;border-radius:5px;background:#22171a}

  [data-threat-editor-panel][hidden],[data-threat-preview-panel][hidden]{display:none!important}
  .nex-hb-threat-nav,.nex-hb-threat-tabs{display:flex;gap:4px;align-items:center;justify-content:center;border-bottom:1px solid #62404b;margin:8px 0 16px;grid-column:1/-1}
  .nex-hb-threat-nav button,.nex-hb-threat-tabs button{border:0;border-bottom:2px solid transparent;padding:12px 14px;background:transparent;color:#c1acb7;font-size:12px;cursor:pointer}
  .nex-hb-threat-nav button[aria-selected="true"],.nex-hb-threat-tabs button[aria-selected="true"]{color:#fff;border-bottom-color:#e43c54}
  .nex-hb-threat-editor [data-threat-editor-panel]{grid-column:1/-1;min-width:0}
  .nex-hb-threat-preview{width:130px;height:130px;object-fit:cover;display:block;margin:8px 0;border:1px solid #9c4b5a;border-radius:8px}
  .nex-hb-threat-preview[hidden]{display:none}
  .nex-hb-threat-sheet{padding:0;border-color:#71404c}
  .nex-hb-threat-sheet-head{margin:0;min-height:132px;justify-content:flex-start;background:linear-gradient(100deg,#261219,#140b0e);gap:17px}
  .nex-hb-threat-avatar{width:115px;height:115px;object-fit:cover;border:1px solid #824858;border-radius:7px;flex-shrink:0}
  .nex-hb-threat-sheet-head h2{margin:5px 0;font-size:22px;color:white}
  .nex-hb-threat-sheet-head p{margin:2px 0;color:#ddc4ca}
  .nex-hb-threat-sheet-head span{display:inline-block;margin-top:5px;padding:4px 8px;border:1px solid #a04c5b;border-radius:4px;font-size:12px}
  .nex-hb-threat-pv{background:#a52539;text-align:center;color:#fff;font-weight:800;font-size:16px;padding:10px;margin:14px 14px 0;border-radius:5px}
  .nex-hb-threat-tabs{margin:0;padding-top:10px}
  .nex-hb-threat-panel{padding:16px 18px 26px}
  .nex-hb-threat-attribute-bar{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;text-align:center;margin-bottom:20px}
  .nex-hb-threat-attribute-bar .nex-hb-threat-stat{border:0;background:transparent}
  .nex-hb-threat-attribute-bar strong{font-size:24px}
  .nex-hb-threat-main-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px;margin-bottom:18px}
  .nex-hb-threat-skill-line{display:flex;align-items:center;justify-content:space-between;border:1px solid #47313d;border-radius:5px;padding:9px 12px;margin:5px 0;font-size:13px}
  .nex-hb-threat-info{margin:14px 0}
  .nex-hb-threat-info h4{font-size:14px;letter-spacing:0;color:#fff}
  .nex-hb-threat-info p{font-size:13px;margin:5px 0}
  @media(max-width:500px){.nex-hb-threat-main-stats{grid-template-columns:1fr}.nex-hb-threat-avatar{width:84px;height:84px}.nex-hb-threat-sheet-head h2{font-size:18px}.nex-hb-threat-attribute-bar strong{font-size:19px}}

  /* Edição diretamente sobre o desenho da ficha, sem os fieldsets do formulário. */
  #nex52Editor.nex-hb-editing-threat{width:100%;max-width:100%;background:#141014;border-color:#613440}
  .nex-hb-editing-threat #nex51Form{display:flex;flex-direction:column;gap:0}
  .nex-hb-editing-threat #nex52ThreatFields{width:100%;padding:0;margin:0;max-width:none;background:#120f13;border:1px solid #61313c;border-radius:8px;overflow:hidden}
  .nex-hb-editing-threat #nex52ThreatFields input,.nex-hb-editing-threat #nex52ThreatFields select,.nex-hb-editing-threat #nex52ThreatFields textarea{background:transparent;color:#fff;border:1px solid transparent;border-radius:5px;outline:none;font:inherit;box-shadow:none}
  .nex-hb-editing-threat #nex52ThreatFields input:hover,.nex-hb-editing-threat #nex52ThreatFields select:hover,.nex-hb-editing-threat #nex52ThreatFields textarea:hover{border-color:#6b3f4c;background:#ffffff08}
  .nex-hb-editing-threat #nex52ThreatFields input:focus,.nex-hb-editing-threat #nex52ThreatFields select:focus,.nex-hb-editing-threat #nex52ThreatFields textarea:focus{border-color:#d74b64;background:#24191e}
  .nex-hb-threat-edit-header{display:flex;gap:20px;min-height:168px;padding:22px;background:linear-gradient(100deg,#210e15,#351219 52%,#180c12)}
  .nex-hb-threat-photo{display:flex;position:relative;flex:0 0 145px;height:145px;border:1px solid #884656;border-radius:9px;overflow:hidden;align-items:center;justify-content:center;background:linear-gradient(135deg,#371920,#160f15)}
  .nex-hb-threat-photo img{display:block;width:100%;height:100%;object-fit:cover}
  .nex-hb-threat-photo img[hidden]{display:none}
  .nex-hb-threat-photo .nex-hb-threat-upload{position:absolute;inset:0;display:grid;place-items:center;background:#08060982;color:white;text-align:center;cursor:pointer;font-size:12px;opacity:0;transition:opacity .12s}
  .nex-hb-threat-photo:hover .nex-hb-threat-upload,.nex-hb-threat-photo:focus-within .nex-hb-threat-upload{opacity:1}
  .nex-hb-threat-photo:has(img[hidden]) .nex-hb-threat-upload{opacity:1}
  .nex-hb-threat-upload input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}
  .nex-hb-threat-photo #nexHbThreatRemovePhoto{position:absolute;bottom:3px;right:3px;font-size:10px;padding:4px;background:#591c29}
  .nex-hb-threat-heading-fields{flex:1;min-width:0;display:flex;flex-direction:column;gap:5px;justify-content:center}
  .nex-hb-threat-overline{font-size:10px;letter-spacing:.16em;color:#e4a6b5;font-weight:700}
  .nex-hb-threat-heading-fields #nex53NameField{display:block;margin:0}
  .nex-hb-threat-heading-fields #nex53NameField>input{font-size:25px;font-weight:800;line-height:1.2;padding:6px 0;width:100%;height:auto;border:0;border-bottom:1px dashed #5e3a44;border-radius:0}
  .nex-hb-threat-heading-fields #nex53NameField{font-size:0}
  .nex-hb-threat-heading-info,.nex-hb-threat-heading-badges{display:flex;align-items:center;gap:8px;flex-wrap:wrap}
  .nex-hb-threat-heading-info label,.nex-hb-threat-heading-badges label{display:flex;gap:5px;align-items:center;font-size:10px;color:#dabac2}
  .nex-hb-threat-heading-info select,.nex-hb-threat-heading-badges select,.nex-hb-threat-heading-badges input{width:auto;max-width:185px;padding:5px!important;font-size:12px!important;min-height:29px}
  .nex-hb-threat-heading-badges label{border:1px solid #8e3e51;border-radius:5px;padding:0 5px}
  .nex-hb-threat-heading-badges input{width:70px!important}
  .nex-hb-threat-vital-editor{margin:18px 18px 8px;background:#ae253c;border-radius:6px;text-align:center;padding:5px}
  .nex-hb-threat-vital-editor label{display:inline-flex!important;align-items:center;justify-content:center;color:#fff;font-size:17px;font-weight:800;gap:6px}
  .nex-hb-threat-vital-editor input{width:90px!important;text-align:right;font-weight:800;font-size:17px;border:0!important;background:transparent!important;padding:5px 0!important}
  .nex-hb-threat-edit-attributes{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:5px;text-align:center;padding:25px 18px}
  .nex-hb-threat-edit-attributes label{display:flex;flex-direction:column;align-items:center;font-size:12px;color:#cbb3be}
  .nex-hb-threat-edit-attributes input{text-align:center;font-size:28px!important;font-weight:800!important;max-width:90px;padding:4px!important}
  .nex-hb-threat-edit-major{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px;padding:0 18px 8px}
  .nex-hb-threat-edit-major label{display:flex;flex-direction:column;border:1px solid #503441;border-radius:7px;padding:9px 12px;color:#bfa2ad;font-size:11px}
  .nex-hb-threat-edit-major input{font-weight:800!important;font-size:17px!important;width:100%;padding:4px 0!important}
  .nex-hb-threat-inline-section{padding:12px 18px;margin:0}
  .nex-hb-threat-inline-section h4{margin:0 0 9px;font-size:16px;font-weight:700;color:#fff}
  .nex-hb-threat-inline-section textarea{display:block;width:100%;min-height:38px;resize:vertical;padding:9px!important;border:1px solid #443039!important;font-size:13px!important}
  .nex-hb-threat-edit-line{display:flex!important;align-items:center;justify-content:space-between;gap:9px;margin:5px 0;padding:5px 12px;border:1px solid #433039;border-radius:5px;font-size:13px}
  .nex-hb-threat-edit-line input{width:min(210px,55%)!important;text-align:right;font-size:13px!important;padding:5px!important}
  .nex-hb-threat-status-edit,.nex-hb-threat-combat-edit,.nex-hb-threat-description-edit{padding-bottom:20px}
  .nex-hb-editing-threat #nex55DescriptionField{margin:0!important;width:100%;display:block}
  .nex-hb-editing-threat #nex55DescriptionField textarea{width:100%;min-height:115px;border:1px solid #443039}
  .nex-hb-threat-combat-edit #nexHbThreatActions>fieldset{border:1px solid #553240;border-radius:7px;padding:12px;background:#1a1117}
  .nex-hb-threat-combat-edit #nexHbThreatActions .nex-hb-threat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}

  .nex-hb-threat-action-editor{border:1px solid #553240;border-radius:6px;margin:9px 0;background:#21161c;overflow:hidden}
  .nex-hb-threat-action-summary{display:flex;align-items:center;gap:8px;justify-content:space-between;padding:6px 9px;min-height:45px}
  .nex-hb-threat-action-toggle{display:flex;align-items:center;justify-content:space-between;gap:12px;flex:1;min-width:0;border:0!important;background:transparent!important;text-align:left;color:#f7edf0;cursor:pointer;padding:7px 4px;font-size:13px}
  .nex-hb-threat-action-toggle strong{overflow-wrap:anywhere}
  .nex-hb-threat-action-toggle span{font-size:17px;color:#ed627b}
  .nex-hb-threat-action-controls{display:flex;gap:7px;align-items:center;flex-wrap:wrap}
  .nex-hb-threat-action-controls .btn{font-size:12px;padding:6px 10px}
  .nex-hb-threat-action-fields{padding:8px 12px 12px;border-top:1px solid #533640}
  .nex-hb-threat-action-fields .nex-hb-threat-action-controls{justify-content:flex-end;margin-top:12px}
  #homebrewScreen .nex52-form #nexHbThreatActions .nex-hb-threat-grid{display:grid!important;grid-template-columns:repeat(2,minmax(0,1fr))!important}
  @media(max-width:510px){#homebrewScreen .nex52-form #nexHbThreatActions .nex-hb-threat-grid{grid-template-columns:1fr!important}.nex-hb-threat-action-summary{flex-wrap:wrap}.nex-hb-threat-action-controls .btn{padding:5px 8px}}

  @media(max-width:610px){.nex-hb-threat-edit-header{padding:12px;gap:11px}.nex-hb-threat-photo{flex-basis:90px;height:100px}.nex-hb-threat-heading-fields #nex53NameField>input{font-size:19px}.nex-hb-threat-heading-info label,.nex-hb-threat-heading-badges label{font-size:9px}.nex-hb-threat-edit-major{grid-template-columns:1fr}.nex-hb-threat-edit-attributes input{font-size:21px!important}}

  /* Sobrepõe o grid genérico de 3 colunas do editor Homebrew. */
  #homebrewScreen .nex52-form #nex52ThreatFields.nex-hb-threat-editor{display:block!important;width:100%!important;max-width:none!important;grid-template-columns:none!important;grid-column:1/-1!important;gap:0!important;overflow:hidden!important}
  #homebrewScreen .nex52-form #nex52ThreatFields[hidden]{display:none!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-header{display:flex!important;flex-direction:row!important;align-items:center!important;min-width:0!important;width:100%!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-heading-fields{display:flex!important;flex:1 1 0!important;min-width:0!important;width:auto!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-photo{flex:0 0 145px!important;width:145px!important;max-width:145px!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-vital-editor{display:block!important;position:static!important;grid-column:auto!important;width:auto!important;height:auto!important;min-height:0!important;margin:16px 18px 8px!important;padding:7px!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-vital-editor label{display:flex!important;flex-direction:row!important;justify-content:center!important;align-items:center!important;width:100%!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-nav{display:flex!important;width:100%!important;grid-column:auto!important}
  #homebrewScreen .nex52-form #nex52ThreatFields [data-threat-editor-panel]{display:block!important;width:100%!important;min-width:0!important}
  #homebrewScreen .nex52-form #nex52ThreatFields [data-threat-editor-panel][hidden]{display:none!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-line{display:grid!important;grid-template-columns:minmax(0,1fr) minmax(135px,210px)!important;align-items:center!important;gap:12px!important;min-height:45px!important;padding:6px 12px!important;width:100%!important;flex-direction:row!important;text-align:left!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-line span{justify-self:start!important;text-align:left!important;font-size:13px!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-line input{justify-self:end!important;display:block!important;width:100%!important;min-width:0!important;max-width:210px!important;padding:5px 6px!important;text-align:right!important;font-size:13px!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-attributes{display:grid!important;grid-template-columns:repeat(5,minmax(0,1fr))!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-major{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-heading-info label,#homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-heading-badges label{display:flex!important;flex-direction:row!important;align-items:center!important;gap:6px!important;min-width:0!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-heading-info select,#homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-heading-badges select{flex:1 1 auto!important;width:auto!important;min-width:0!important}
  @media(max-width:610px){
    #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-photo{flex:0 0 90px!important;width:90px!important;max-width:90px!important;height:100px!important}
    #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-major{grid-template-columns:1fr!important}
    #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-line{grid-template-columns:minmax(0,1fr) minmax(110px,48%)!important}
  }





  /* Cartas da biblioteca Homebrew com o fundo do respectivo elemento. */
  #homebrewScreen .nex52-card-threat{
    background-color:#170f15!important;
    background-image:linear-gradient(100deg,rgba(12,8,13,.9) 0%,rgba(18,9,15,.78) 62%,rgba(11,9,14,.70)),var(--nex-threat-card-bg)!important;
    background-size:cover!important;background-position:center!important;
    border-color:var(--nex-threat-card-accent,#a43d51)!important;
    min-height:122px;
  }
  #homebrewScreen .nex52-card-threat::before{background:linear-gradient(90deg,rgba(10,7,11,.2),transparent)!important}
  #homebrewScreen .nex52-card-threat .nex-hb-threat-card-element{display:inline-flex;align-self:flex-start;font-size:11px;padding:3px 8px;margin-bottom:5px;border:1px solid var(--nex-threat-card-accent,#a43d51);border-radius:5px;color:#fff;background:#120e12ab}
  #homebrewScreen .nex52-card-threat .nex-hb-threat-card-portrait{position:relative;z-index:1;flex:0 0 90px;width:90px;height:90px;max-width:90px;object-fit:cover;border:1px solid var(--nex-threat-card-accent,#a43d51);border-radius:6px;align-self:center}
  #homebrewScreen .nex52-card-threat .nex52-open{background:#9b2533;border:1px solid var(--nex-threat-card-accent,#a43d51)}
  @media(max-width:550px){#homebrewScreen .nex52-card-threat .nex-hb-threat-card-portrait{flex-basis:65px;width:65px;height:65px}#homebrewScreen .nex52-card-threat{gap:8px}}

  /* O fundo do editor e da ficha é atualizado conforme o elemento escolhido. */
  #homebrewScreen .nex52-form #nex52ThreatFields.nex-hb-threat-editor{
    background-color:#130e12!important;
    background-image:linear-gradient(180deg,rgba(13,8,13,.80),rgba(13,8,13,.94) 58%),var(--nex-threat-bg)!important;
    background-size:cover!important;background-position:center top!important;
  }
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-edit-header{
    background-image:linear-gradient(90deg,rgba(12,8,13,.58),rgba(18,10,17,.82)),var(--nex-threat-bg)!important;
    background-size:cover!important;background-position:center!important;
    border-bottom:1px solid var(--nex-threat-accent,#943949)!important;
  }
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-vital-editor{box-shadow:0 0 0 1px var(--nex-threat-accent,#bd3344)!important}
  #homebrewScreen .nex52-form #nex52ThreatFields .nex-hb-threat-nav button[aria-selected="true"]{border-bottom-color:var(--nex-threat-accent,#e43c54)!important}
  .nex-hb-threat-sheet{background-image:linear-gradient(180deg,rgba(13,9,14,.9),rgba(13,9,14,.97)),var(--nex-threat-bg)!important;background-size:cover!important;background-position:center!important}
  .nex-hb-threat-sheet .nex-hb-threat-sheet-head{background-image:linear-gradient(90deg,rgba(16,9,14,.65),rgba(19,10,16,.78)),var(--nex-threat-bg)!important;background-size:cover!important;background-position:center!important}
  .nex-hb-threat-sheet .nex-hb-threat-tabs button[aria-selected="true"]{border-color:var(--nex-threat-accent,#e43c54)!important}

  @media(max-width:600px){.nex-hb-threat-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.nex-hb-threat-sheet-head strong{font-size:15px}}
 `;
 document.head.appendChild(threatStyle);

 let tab='ameacas',skillTab='origens',ritualFilter='Todas',itemTab='Armas',paranormalSection='itens',cursedKind='Itens Paranormais',opened=null;
 const titleFor=t=>t==='ameacas'?'Ameaças':t==='npcs'?'NPCs':t==='habilidades'?'Habilidades':t==='rituais'?'Rituais':t==='paranormal'?'Paranormal':'Itens';
 const currentTypes=()=>tab==='habilidades'?SKILL_TABS[skillTab]:tab==='paranormal'?(paranormalSection==='maldicoes'?['maldicao']:['item']):TABS[tab];
 const defaultType=()=>({ameacas:'ameaca',npcs:'npc',habilidades:({origens:'origem',paranormais:'poder_paranormal',gerais:'poder_geral',trilhas:'trilha'})[skillTab],rituais:'ritual',itens:'item',melhorias:'melhoria',paranormal:paranormalSection==='maldicoes'?'maldicao':'item'})[tab];
 const api=()=>window.NEX51_BRIDGE;
 function message(text){const box=$('nex52Message');if(box)box.textContent=text;}
 mount.innerHTML=
 '<div class="nex52-tabs" role="tablist" aria-label="Tipos de homebrew">'+
 '<button type="button" data-nex52-tab="ameacas" role="tab" aria-selected="true">AMEAÇAS</button>'+ 
 '<button type="button" data-nex52-tab="npcs" role="tab" aria-selected="false">NPC</button>'+
 '<button type="button" data-nex52-tab="habilidades" role="tab" aria-selected="false">HABILIDADES</button>'+
 '<button type="button" data-nex52-tab="rituais" role="tab" aria-selected="false">RITUAIS</button>'+
 '<button type="button" data-nex52-tab="itens" role="tab" aria-selected="false">ITENS</button>'+ 
 '<button type="button" data-nex52-tab="melhorias" role="tab" aria-selected="false">MELHORIAS</button>'+ 
 '<button type="button" data-nex52-tab="paranormal" role="tab" aria-selected="false">PARANORMAL</button></div>'+
 '<div class="nex53-subtabs" id="nex53SkillTabs" role="tablist" aria-label="Categorias de habilidades" hidden>'+
 '<button type="button" data-nex53-skill="origens" role="tab" aria-selected="true">Origens</button>'+
 '<button type="button" data-nex53-skill="paranormais" role="tab" aria-selected="false">Poderes Paranormais</button>'+
 '<button type="button" data-nex53-skill="gerais" role="tab" aria-selected="false">Poderes Gerais</button>'+
 '<button type="button" data-nex53-skill="trilhas" role="tab" aria-selected="false">Trilhas</button></div>'+
 '<div class="nex53-ritual-filter" id="nex53RitualFilter" hidden aria-label="Tipos de ritual"></div>'+ 
 '<div class="nex-hb-item-tabs" id="nexHbItemTabs" role="tablist" aria-label="Tipos de itens homebrew" hidden>'+ITEM_CATEGORIES.map(c=>'<button type="button" role="tab" data-nex-hb-item-tab="'+esc(c)+'" aria-selected="false">'+esc(c)+'</button>').join('')+'</div>'+ 
 '<div id="nexHbParanormalNav" class="nex-hb-paranormal-nav" hidden><div class="nex-hb-paranormal-sections"><button type="button" data-nex-psection="itens">Itens Amaldiçoados</button><button type="button" data-nex-psection="maldicoes">Maldições</button></div><div id="nexHbCursedKinds" class="nex-hb-paranormal-kinds">'+CURSED_KINDS.map(k=>'<button type="button" data-nex-ckind="'+esc(k)+'">'+esc(k)+'</button>').join('')+'</div></div>'+ 
 '<div class="nex52-toolbar"><strong id="nex52Count">Homebrew 0/50</strong><button type="button" id="nex52Add">Adicionar</button></div>'+
 '<label class="nex52-search" for="nex51Search"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true"><circle cx="10.7" cy="10.7" r="7.2"/><path d="m16 16 5 5"/></svg><input type="search" id="nex51Search" placeholder="Buscar" autocomplete="off" aria-label="Buscar homebrew"></label>'+
 '<section id="nex52Editor" class="nex52-editor" hidden><div class="nex52-editor-head"><strong id="nex52EditorTitle">Adicionar homebrew</strong><button type="button" id="nex52CloseEditor" aria-label="Fechar editor">×</button></div>'+
 '<form id="nex51Form" class="nex52-form"><input id="nex51Edit" type="hidden">'+
 '<label id="nex55TypeField">Categoria<select id="nex51Type"><option value="ameaca">Ameaça</option></select></label>'+
 '<label id="nex53NameField">Nome<input id="nex51Name" maxlength="90" placeholder="Nome do homebrew" required></label>'+
 '<div class="nex53-paranormal-fields nex52-full" id="nex53ParanormalElementField" hidden><label>Elemento<select id="nex53ParanormalElement" required><option value="Sangue">Sangue</option><option value="Morte">Morte</option><option value="Energia">Energia</option><option value="Conhecimento">Conhecimento</option><option value="Medo">Medo</option></select></label></div>'+
 '<div class="nex52-specific nex52-full nex-hb-threat-editor" id="nex52ThreatFields" hidden>'+
 '<section class="nex-hb-threat-edit-header"><div class="nex-hb-threat-photo"><img id="nexHbThreatPreview" alt="Imagem da ameaça" hidden><label class="nex-hb-threat-upload">+ Foto<input id="nexHbThreatFile" type="file" accept="image/png,image/jpeg,image/webp"></label><button id="nexHbThreatRemovePhoto" type="button" class="btn sm" hidden>Remover foto</button></div>'+
 '<div class="nex-hb-threat-heading-fields"><div class="nex-hb-threat-overline">HOMEBREW · FICHA EDITÁVEL</div><div id="nexHbThreatNameSlot"></div><div class="nex-hb-threat-heading-info"><label>Tipo de ameaça<select id="nex52CreatureType"><option>Criatura</option><option>Ameaça</option><option>Ameaça da Realidade</option><option>Humanoide</option><option>Animal</option><option>Outra</option></select></label><label>Tamanho<select id="nex52Size"><option>Minúsculo</option><option>Pequeno</option><option selected>Médio</option><option>Grande</option><option>Enorme</option><option>Colossal</option></select></label></div><div class="nex-hb-threat-heading-badges"><label>Elemento<select id="nexHbThreatElement">'+THREAT_ELEMENTS.map(x=>'<option>'+esc(x)+'</option>').join('')+'</select></label><label>VD<input id="nex52VD" type="number" min="0" max="9999" value="0"></label></div></div></section>'+
 '<div class="nex-hb-threat-vital-editor"><label><input id="nexHbThreatPvAlias" type="number" min="0" max="99999" value="0" aria-label="PV máximos"> PV</label></div>'+
 '<div class="nex-hb-threat-nav" role="tablist" aria-label="Editar ficha da ameaça"><button type="button" data-threat-editor-tab="status" role="tab" aria-selected="true">STATUS</button><button type="button" data-threat-editor-tab="combate" role="tab" aria-selected="false">COMBATE</button><button type="button" data-threat-editor-tab="descricao" role="tab" aria-selected="false">DESCRIÇÃO</button></div>'+
 '<div data-threat-editor-panel="status" class="nex-hb-threat-status-edit">'+
 '<div class="nex-hb-threat-edit-attributes">'+THREAT_ATTRS.map(([id,label])=>'<label><span>'+id.toUpperCase()+'</span><input type="number" data-nex-threat-attr="'+id+'" aria-label="'+label+'" min="0" max="6" value="1"></label>').join('')+'</div>'+
 '<div class="nex-hb-threat-edit-major">'+
 '<label><span>Defesa</span><input type="number" data-nex-threat-number="defense" min="0" max="99999" value="0"></label>'+
 '<label><span>Deslocamento</span><input data-nex-threat-text="deslocamento" maxlength="1200" placeholder="Ex.: 9m"></label>'+
 '<label><span>PV máximos</span><input type="number" data-nex-threat-number="pv" min="0" max="99999" value="0"></label></div>'+
 '<section class="nex-hb-threat-inline-section"><h4>Presença perturbadora</h4><textarea data-nex-threat-text="presencaPerturbadora" maxlength="1200" rows="2" placeholder="DT 15 · 3d6 mental · imunidade NEX 30%+"></textarea></section>'+
 '<section class="nex-hb-threat-inline-section"><h4>Testes de resistência</h4>'+THREAT_TESTS.filter(([id])=>['fortitude','reflexos','vontade'].includes(id)).map(([id,label])=>'<label class="nex-hb-threat-edit-line"><span>'+label+'</span><input data-nex-threat-test="'+id+'" maxlength="90" placeholder="Ex.: 3d20+10"></label>').join('')+'</section>'+
 '<section class="nex-hb-threat-inline-section"><h4>Sentidos</h4>'+THREAT_TESTS.filter(([id])=>['percepcao','iniciativa'].includes(id)).map(([id,label])=>'<label class="nex-hb-threat-edit-line"><span>'+label+'</span><input data-nex-threat-test="'+id+'" maxlength="90" placeholder="Ex.: 1d20+5"></label>').join('')+'<textarea data-nex-threat-text="sentidos" maxlength="1200" rows="2" placeholder="Sentidos especiais, ex.: percepção às cegas"></textarea></section>'+
 '<section class="nex-hb-threat-inline-section"><h4>Resistências</h4><textarea data-nex-threat-text="resistencias" maxlength="1200" rows="2" placeholder="Ex.: Sangue 10"></textarea></section>'+
 '<section class="nex-hb-threat-inline-section"><h4>Vulnerabilidades</h4><textarea data-nex-threat-text="vulnerabilidades" maxlength="1200" rows="2" placeholder="Ex.: Morte"></textarea></section>'+
 '<section class="nex-hb-threat-inline-section"><h4>Imunidades</h4><textarea data-nex-threat-text="imunidades" maxlength="1200" rows="2"></textarea></section>'+
 '</div>'+
 '<div data-threat-editor-panel="combate" class="nex-hb-threat-combat-edit" hidden><section class="nex-hb-threat-inline-section"><h4>Ações e ataques</h4><button type="button" class="btn sm" id="nexHbThreatAddAction">+ Adicionar ação</button><div id="nexHbThreatActions"></div></section></div>'+
 '<div data-threat-editor-panel="descricao" class="nex-hb-threat-description-edit" hidden><section class="nex-hb-threat-inline-section"><h4>Descrição da ameaça</h4><div id="nexHbThreatDescriptionSlot"></div></section>'+THREAT_TEXT.filter(([id])=>id==='enigma').map(([id,label])=>'<section class="nex-hb-threat-inline-section"><h4>'+label+'</h4><textarea data-nex-threat-text="'+id+'" maxlength="1200" rows="4"></textarea></section>').join('')+'<div hidden aria-hidden="true"><textarea data-nex-threat-text="habilidades"></textarea><textarea data-nex-threat-text="notas"></textarea></div></div>'+
 '</div>'+
 '<div class="nex52-specific" id="nex52AbilityFields" hidden><label id="nex55ClassField">Classe<select id="nex51Class"><option>Livre</option><option>Combatente</option><option>Especialista</option><option>Ocultista</option></select></label>'+
 '<label id="nex51NexField">NEX mínimo<input id="nex51Nex" type="number" min="0" max="99" value="5"></label></div>'+
 
 '<div class="nex52-specific nex53-ritual-fields" id="nex52RitualFields" hidden>'+
 '<label class="nex53-ritual-category">Categoria do ritual<select id="nex53RitualType"><option>Dano</option><option>Suporte</option><option>Cura</option></select></label>'+
 '<label>Elemento<select id="nex51Element"><option>Conhecimento</option><option>Energia</option><option>Medo</option><option>Morte</option><option>Sangue</option></select></label>'+
 '<label>Círculo<select id="nex51Circle"><option value="1">1</option><option value="2">2</option><option value="3">3</option><option value="4">4</option></select></label>'+
 '<label>Execução<select id="nex53Execution"><option>Padrão</option><option>Movimento</option><option>Completa</option><option>Reação</option><option>Livre</option></select></label>'+
 '<label>Alcance<select id="nex53Range"><option>Pessoal</option><option>Toque</option><option>Curto</option><option>Médio</option><option>Longo</option><option>Extremo</option><option>Ilimitado</option></select></label>'+
 '<label>Área<input id="nex53Area" maxlength="150" placeholder="Ex.: Esfera de 3m"></label>'+
 '<label>Alvo<input id="nex53Target" maxlength="150" placeholder="Ex.: Uma criatura"></label>'+
 '<label>Duração<input id="nex53Duration" maxlength="150" placeholder="Ex.: Cena"></label>'+
 '<label>Efeito<input id="nex53Effect" maxlength="700" placeholder="Efeito do ritual"></label>'+
 '<label>Resistência<input id="nex53Resistance" maxlength="150" placeholder="Ex.: Fortitude parcial"></label>'+
 '<label class="nex53-damage-field">Dados<input id="nex53Dice" maxlength="120" placeholder="Ex.: 2d6"></label>'+
 '<label class="nex53-damage-field">Dados Discente<input id="nex53DiscenteDice" maxlength="120" placeholder="Ex.: 4d6"></label>'+
 '<label class="nex53-damage-field">Dados Verdadeiro<input id="nex53VerdadeiroDice" maxlength="120" placeholder="Ex.: 6d6"></label>'+
 '<label class="nex53-damage-field nex53-advanced-req">Círculo necessário (Discente)<select id="nex53DiscenteCircle"><option value="1">1º</option><option value="2">2º</option><option value="3">3º</option><option value="4">4º</option></select></label>'+
 '<label class="nex53-damage-field nex53-advanced-req">Círculo necessário (Verdadeiro)<select id="nex53VerdadeiroCircle"><option value="1">1º</option><option value="2">2º</option><option value="3">3º</option><option value="4">4º</option></select></label>'+
 '<div class="nex53-ritual-image"><label>Imagem (opcional)<input id="nex53RitualImage" type="url" maxlength="2000" placeholder="https://..."></label>'+
 '<label>Ou escolher imagem<input id="nex53RitualFile" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<img id="nex53RitualPreview" alt="Prévia da imagem do ritual" hidden></div>'+
 '</div>'+
 '<div class="nex52-specific nex52-full" id="nex52ItemFields" hidden>'+
 '<select id="nex52Category" hidden aria-label="Categoria definida pela aba">'+ITEM_CATEGORIES.map(c=>'<option value="'+esc(c)+'">'+esc(c)+'</option>').join('')+'</select>'+
 '<div class="nex-hb-hidden-item-values" hidden><select id="nexHbElement"><option>Conhecimento</option><option>Energia</option><option>Medo</option><option>Morte</option><option>Sangue</option></select><select id="nexHbTier"><option value="0">0</option><option>I</option><option>II</option><option>III</option><option>IV</option></select><input type="number" id="nexHbSpaces" value="1"><select id="nexHbTag"><option>Acessórios</option><option>Explosivos</option><option>Itens Operacionais</option></select></div>'+
 '<section class="nex-hb-special-form" id="nexHbCursedForm" hidden><div class="nex-hb-cursed-fields"><label>Elemento<select data-hb-sync="nexHbElement"><option>Conhecimento</option><option>Energia</option><option>Medo</option><option>Morte</option><option>Sangue</option></select></label><label>Categoria<select data-hb-sync="nexHbTier"><option value="0">0</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></label><label>Espaços<input type="number" min="0" max="100" data-hb-sync="nexHbSpaces" value="1"></label><label id="nexHbCursedTagField">Tag<select data-hb-sync="nexHbTag"><option>Acessórios</option><option>Explosivos</option><option>Itens Operacionais</option></select></label></div><div id="nexHbCursedExplosion" class="nex-hb-paranormal-extra-fields" hidden><label>Dano<input id="nexHbCursedExplosionDamage" maxlength="90" placeholder="Ex.: 2d6"></label><label>Dano secundário<input id="nexHbCursedExplosionSecondary" maxlength="90" placeholder="Opcional"></label><label>Tipo do dano secundário<select id="nexHbCursedExplosionType"><option>Normal</option><option>Sangue</option><option>Morte</option><option>Energia</option><option>Conhecimento</option><option>Medo</option></select></label><label>Multiplicador<input id="nexHbCursedExplosionMultiplier" type="number" min="1" max="20" value="2"></label><label>Alcance<input id="nexHbCursedExplosionRange" maxlength="60" placeholder="Curto, Médio..."></label></div></section>'+
 '<section class="nex-hb-special-form" id="nexHbGeneralForm" hidden><div class="nex-hb-general-fields"><label>Categoria<select data-hb-sync="nexHbTier"><option value="0">0</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></label><label>Espaços<input type="number" min="0" max="100" data-hb-sync="nexHbSpaces" value="1"></label><label>Tag<select data-hb-sync="nexHbTag"><option>Acessórios</option><option>Explosivos</option><option>Itens Operacionais</option></select></label></div></section>'+
 '<section class="nex-hb-special-form" id="nexHbWeaponForm" hidden><div class="nex-hb-weapon-fields">'+
 '<label>Proficiência<select id="nexHbWeaponProficiency"><option>Armas Simples</option><option>Armas Táticas</option><option>Armas Pesadas</option></select></label>'+
 '<label>Tipo<select id="nexHbWeaponKind"><option>Corpo a Corpo</option><option>Arma de Disparo</option><option>Arma de Fogo</option><option>Arremesso</option></select></label>'+
 '<label>Empunhadura<select id="nexHbWeaponWield"><option>Uma Mão</option><option>Duas Mãos</option><option>Leve</option></select></label>'+
 '<label>Dano<input id="nexHbWeaponDamage" maxlength="90" placeholder="1d8" required></label>'+
 '<label>Dano secundário<input id="nexHbWeaponSecondary" maxlength="90" placeholder="Opcional"></label>'+
 '<label>Tipo do dano secundário<select id="nexHbWeaponSecondaryType"><option>Normal</option><option>Sangue</option><option>Morte</option><option>Energia</option><option>Conhecimento</option><option>Medo</option></select></label>'+
 '<label>Crítico<input id="nexHbWeaponCritical" maxlength="16" value="20" required></label>'+
 '<label>Multiplicador<input id="nexHbWeaponMultiplier" maxlength="10" value="2" required></label>'+
 '<label>Tipo de Dano<select id="nexHbWeaponDamageType"><option>Corte</option><option>Perfuração</option><option>Impacto</option><option>Balístico</option><option>Fogo</option><option>Energia</option><option>Morte</option><option>Sangue</option><option>Conhecimento</option><option>Medo</option></select></label>'+
 '<label>Alcance<input id="nexHbWeaponRange" maxlength="60" placeholder="Toque, Curto, Médio..."></label>'+
 '<label>Categoria base<select data-hb-sync="nexHbTier"><option value="0">0</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></label>'+
 '<label>Espaços<input type="number" min="0" max="100" data-hb-sync="nexHbSpaces" value="1"></label>'+
 '<label>Quantidade<input id="nexHbWeaponQuantity" type="number" min="1" max="9999" value="1"></label></div></section>'+
 '<section class="nex-hb-special-form" id="nexHbProtectionForm" hidden><div class="nex-hb-protection-fields">'+
 '<label>Defesa<input type="number" id="nexHbProtectionDefense" min="0" max="100" value="1" required></label>'+
 '<label>Categoria<select data-hb-sync="nexHbTier"><option value="0">0</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></label>'+
 '<label>Espaços<input type="number" min="0" max="100" data-hb-sync="nexHbSpaces" value="1"></label></div></section>'+
 '<section class="nex-hb-special-form" id="nexHbOtherForm" hidden><div class="nex-hb-general-fields"><label>Categoria<select data-hb-sync="nexHbTier"><option value="0">0</option><option>I</option><option>II</option><option>III</option><option>IV</option></select></label><label>Espaços<input type="number" min="0" max="100" data-hb-sync="nexHbSpaces" value="1"></label></div></section>'+
 '<section id="nexHbSharedImprovements" class="nex52-full nex-hb-item-improvements" hidden><div class="nex-hb-improvement-heading"><strong>Melhorias</strong><button type="button" id="nex52ImprovementAdd">Adicionar</button></div><input type="text" id="nex52ImprovementName" maxlength="80" placeholder="Nome da melhoria" aria-label="Nome da melhoria"><div id="nex52ImprovementList" class="nex-hb-improvement-list" aria-live="polite"></div></section>'+
 '<section class="nex-hb-special-form" id="nexHbParanormalExtras" hidden><strong id="nexHbParanormalKindLabel">Itens Paranormais</strong>'+
 '<div id="nexHbAmmoExtras" class="nex-hb-paranormal-extra-fields" hidden><label>Tipo de munição<select id="nexHbCursedAmmoType"><option>Balas curtas</option><option>Balas longas</option><option>Cartuchos</option><option>Flechas</option><option>Foguete</option><option>Combustível</option></select></label><label>Dano ou efeito adicional<input id="nexHbCursedAmmoBonus" maxlength="60" placeholder="Ex.: 1d6 de Energia"></label></div>'+
 '<div id="nexHbAccessoryExtras" class="nex-hb-paranormal-extra-fields" hidden><label>Tipo de acessório<input id="nexHbCursedAccessoryType" maxlength="80" placeholder="Ex.: Anel"></label><label>Benefício passivo<input id="nexHbCursedAccessoryBenefit" maxlength="100" placeholder="Descreva o benefício"></label><label>Bônus de perícia (opcional)<input id="nexHbAccessoryBonus" type="text" maxlength="3" inputmode="numeric" placeholder="+1 até +10"></label><label>Perícia beneficiada<select id="nexHbAccessorySkill"><option value="">Selecione a perícia</option></select></label></div>'+
 '<div id="nexHbArtifactExtras" class="nex-hb-paranormal-extra-fields" hidden><label>Condição de uso<input id="nexHbCursedArtifactRequirement" maxlength="120" placeholder="Ex.: Apenas em uma cena"></label></div>'+
 '</section>'+ 
 '<div class="nex-hb-image-area nex52-full"><input id="nexHbImageUrl" type="hidden">'+
 '<label>Imagem<input id="nexHbImageFile" type="file" accept="image/png,image/jpeg,image/webp"></label>'+
 '<img id="nexHbImagePreview" alt="Prévia da imagem do item" hidden></div>'+
 '</div>'+
 '<div class="nex52-specific nex52-full" id="nexHbImprovementFields" hidden>'+
 '<label>Aplicável a<select id="nexHbImprovementTarget">'+IMPROVEMENT_TARGETS.map(value=>'<option value="'+esc(value)+'">'+esc(value)+'</option>').join('')+'</select></label>'+
 '<div hidden><select id="nexHbBonusType">'+BONUS_TYPES.map(([id,name])=>'<option value="'+esc(id)+'">'+esc(name)+'</option>').join('')+'</select><input id="nexHbBonusValue" value="+2"><select id="nexHbBonusSkill"><option value="">Selecione a perícia</option></select><span id="nexHbBonusSkillField"></span></div>'+ 
 '<div class="nex52-full"><button type="button" class="btn" data-effect-add="improvement">+ Adicionar bônus</button><div id="nexHbImprovementBonusList"></div></div></div>'+ 
 '<div id="nexHbCurseFields" class="nex52-specific nex52-full" hidden><label>Elemento<select id="nexHbCurseElement"><option>Sangue</option><option>Morte</option><option>Energia</option><option>Conhecimento</option><option>Medo</option></select></label><label>Aplicável a<select id="nexHbCurseTarget"><option>Armas</option><option>Proteções</option><option>Munições</option><option>Itens Gerais</option></select></label></div>'+ 
 '<div id="nexHbEffectBonusHome" class="nex52-full"><div id="nexHbEffectBonusFields" class="nex52-full" hidden><button type="button" class="btn" data-effect-add="main">+ Adicionar bônus</button><div id="nexHbEffectBonusList"></div></div></div>'+
 '<div id="nex53TrailFields" class="nex53-trail-fields nex52-full" hidden><p>Configure o nome e o efeito de cada marco de NEX.</p>'+
 TRAIL_NEX.map((n,i)=>'<fieldset class="nex53-trail-step"><legend>NEX '+n+'% · Habilidade '+(i+1)+'</legend>'+
 '<label>Nome da habilidade<input type="text" id="nex53TrailName'+n+'" maxlength="90" placeholder="Nome da habilidade de '+n+'%"></label>'+
 '<label>Descrição e efeitos<textarea id="nex53TrailDescription'+n+'" maxlength="1600" rows="3"></textarea></label><button type="button" class="btn" data-effect-add="'+n+'">+ Adicionar bônus</button><div id="nex53TrailBonusList'+n+'"></div></fieldset>').join('')+'</div>'+
 '<div class="nex55-origin-skills nex52-full" id="nex55OriginSkills" hidden><label>Primeira perícia<select id="nex55Skill1"><option value="">Escolha a primeira perícia</option></select></label>'+
 '<label>Segunda perícia<select id="nex55Skill2"><option value="">Escolha a segunda perícia</option></select></label>'+
 '<p>Ao aplicar esta origem, as duas perícias ficam treinadas (+5) automaticamente na ficha, sem reduzir treinamentos existentes.</p></div>'+
 '<div id="nexHbDescHome" hidden></div><label class="nex52-full" id="nex55DescriptionField"><span id="nex55DescriptionLabel">Descrição e efeitos</span><div id="nexHbDescriptionToolbar" class="nex-hb-text-toolbar" hidden><button type="button" data-hb-format="**" aria-label="Negrito"><b>B</b></button><button type="button" data-hb-format="*" aria-label="Itálico"><i>I</i></button><button type="button" data-hb-format="__" aria-label="Sublinhado"><u>U</u></button></div><textarea id="nex51Description" maxlength="2000" rows="4" placeholder="Descreva seu homebrew"></textarea></label>'+
 '<label class="nex52-full" id="nex55RequirementsField">Pré-requisitos ou observações<textarea id="nex51Requirements" maxlength="650" rows="2"></textarea></label>'+
 '<div class="nex52-form-actions"><button type="submit" class="btn primary" id="nex52Save">Salvar</button><button type="button" class="btn" id="nex52Cancel">Cancelar</button></div></form></section>'+
 '<div id="nex51List" class="nex52-list" role="tabpanel" aria-label="Lista de homebrews"></div>'+
 '<p id="nex52Message" role="status" aria-live="polite" class="nex52-message"></p>'+
 '<dialog id="nex52Detail" class="nex52-dialog" aria-label="Ficha do homebrew"><div id="nex52DetailBody"></div>'+
 '<div class="nex52-dialog-actions"><label>Personagem<select id="nex51Target"><option value="">Selecione um personagem</option></select></label>'+
 '<button type="button" class="btn primary" id="nex52Apply">Adicionar à ficha</button><button type="button" class="btn" id="nex52Close">Fechar</button></div></dialog>';
 sheet.innerHTML='<details class="nex51-sheet"><summary>Homebrews associados à ficha (<span id="nex51SheetCount">0</span>)</summary><div id="nex51SheetItems" class="nex52-sheet-list"></div></details>';
 function toggleRitualDamageFields(){
   const hasDice=$('nex51Type').value==='ritual'&&['Dano','Cura'].includes($('nex53RitualType').value);
   mount.querySelectorAll('.nex53-damage-field').forEach(el=>{el.hidden=!hasDice;});
   if($('nex51Type').value==='ritual'){
     $('nexHbEffectBonusFields').hidden=false;
     $('nexHbEffectBonusHome').hidden=false;
     renderEffects('main');
   }
 }
 function editorFields(){
   const type=$('nex51Type').value;
   const isTrail=type==='trilha',isOrigin=type==='origem',isGeneral=['poder_geral','poder','habilidade'].includes(type);
   const isParanormal=type==='poder_paranormal';
   // Ao escolher a subcategoria, não é preciso selecionar "Categoria" novamente.
   $('nex55TypeField').hidden=tab==='habilidades'||type==='item'||type==='melhoria'||type==='maldicao'||isThreatType(type);
   const classSelect=$('nex51Class'),oldClass=classSelect.value;
   const choices=isTrail?['Combatente','Especialista','Ocultista']:isGeneral?['Geral','Combatente','Especialista','Ocultista']:['Livre','Combatente','Especialista','Ocultista'];
   classSelect.innerHTML=choices.map(name=>'<option value="'+name+'">'+name+'</option>').join('');
   classSelect.value=choices.includes(oldClass)?oldClass:(isTrail?'Combatente':isGeneral?'Geral':'Livre');
   $('nex55ClassField').hidden=isOrigin||isParanormal;
   $('nex51NexField').hidden=isTrail||isOrigin||isGeneral||type==='poder_paranormal';
   $('nex53ParanormalElementField').hidden=type!=='poder_paranormal';
   $('nex52ThreatFields').hidden=!isThreatType(type);
   if(isThreatType(type)){$('nexHbThreatNameSlot').appendChild($('nex53NameField'));$('nex52Editor').classList.add('nex-hb-editing-threat');}else{$('nex55TypeField').after($('nex53NameField'));$('nex52Editor').classList.remove('nex-hb-editing-threat');}
   $('nex52AbilityFields').hidden=!['origem','poder_geral','poder','trilha','habilidade'].includes(type);
   $('nex53TrailFields').hidden=!isTrail;
   $('nex55OriginSkills').hidden=!isOrigin;
   $('nex55DescriptionField').hidden=isTrail||type==='ritual';
   if(isThreatType(type))$('nexHbThreatDescriptionSlot').appendChild($('nex55DescriptionField'));
   else $('nexHbDescHome').after($('nex55DescriptionField'));
   if(isThreatType(type))showThreatEditorTab('status');
   $('nex55DescriptionLabel').textContent=type==='item'?'Descrição (use B, I ou U para formatar)':'Descrição';
   $('nexHbDescriptionToolbar').hidden=true;
   $('nex55RequirementsField').hidden=isTrail||isOrigin||isGeneral||type==='poder_paranormal'||type==='ritual'||type==='item'||type==='melhoria'||type==='maldicao'||isThreatType(type);
   $('nex55DescriptionLabel').textContent=type==='item'||type==='melhoria'||type==='maldicao'?'Descrição':isOrigin||isGeneral||isParanormal?'Descrição':'Descrição e efeitos';
   $('nex51Name').placeholder=type==='ritual'?'Novo Ritual':isParanormal||isGeneral?'Nome do homebrew':'Nome';
   $('nex51Name').parentElement.classList.toggle('nex53-ritual-name',type==='ritual');
   $('nex51Description').placeholder=isParanormal?'Descreva o poder paranormal...':isGeneral?'Descreva o poder geral...':'Descreva seu homebrew';
   $('nex51Description').required=isParanormal||type==='item'||type==='melhoria'||type==='maldicao';
   $('nex51Element').disabled=false;
   $('nex51Element').required=type==='ritual';
   $('nex53ParanormalElement').disabled=!isParanormal;
   $('nex52RitualFields').hidden=type!=='ritual';
   toggleRitualDamageFields();
   $('nex52ItemFields').hidden=type!=='item';
   $('nexHbImprovementFields').hidden=type!=='melhoria';
   $('nexHbBonusSkillField').hidden=type!=='melhoria'||$('nexHbBonusType').value!=='pericia';
   $('nexHbCurseFields').hidden=type!=='maldicao';
   $('nexHbEffectBonusFields').hidden=!effectApplicable({type,ritualType:$('nex53RitualType').value,category:tab==='paranormal'?'Itens Amaldiçoados':$('nex52Category').value})||type==='trilha';
   $('nexHbEffectBonusHome').hidden=$('nexHbEffectBonusFields').hidden;
   // O botão permanece fora dos painéis que podem ser ocultados.
   if($('nexHbEffectBonusFields').parentElement!==$('nexHbEffectBonusHome'))$('nexHbEffectBonusHome').appendChild($('nexHbEffectBonusFields'));
   if(type==='item'||type==='maldicao')renderEffects('main');
   if(type==='item')$('nex52Category').value=tab==='paranormal'?'Itens Amaldiçoados':$('nex51Edit').value?$('nex52Category').value:itemTab;
   $('nex52Category').hidden=true;
   const cursed=type==='item'&&(tab==='paranormal'||itemTab==='Itens Amaldiçoados');
   const general=type==='item'&&tab!=='paranormal'&&itemTab==='Geral';
   const weapon=type==='item'&&(tab==='paranormal'?cursedKind==='Armas Amaldiçoadas':itemTab==='Armas');
   const protection=type==='item'&&(tab==='paranormal'?cursedKind==='Proteções Amaldiçoadas':itemTab==='Proteções');
   $('nexHbCursedForm').hidden=!cursed;
   $('nexHbCursedForm').querySelectorAll('[data-hb-sync="nexHbTier"],[data-hb-sync="nexHbSpaces"]').forEach(el=>el.closest('label').hidden=weapon||protection);
   if(type==='item'&&tab==='paranormal')$('nexHbParanormalKindLabel').textContent=cursedKind;
   $('nexHbGeneralForm').hidden=!general;
   const explosion=$('nexHbCursedExplosion');
   const explosionHost=general?$('nexHbGeneralForm'):$('nexHbCursedForm');
   if(explosion.parentElement!==explosionHost)explosionHost.appendChild(explosion);
   $('nexHbWeaponForm').hidden=!weapon;
   $('nexHbProtectionForm').hidden=!protection;
   $('nexHbOtherForm').hidden=type!=='item'||general||weapon||protection||cursed;
   $('nexHbParanormalExtras').hidden=type!=='item'||tab!=='paranormal'||weapon||protection;
   $('nexHbAmmoExtras').hidden=cursedKind!=='Munições Amaldiçoadas';
   $('nexHbAccessoryExtras').hidden=true;
   $('nexHbCursedTagField').hidden=!(cursed&&cursedKind==='Itens Paranormais');
   $('nexHbCursedExplosion').hidden=!((general||(cursed&&cursedKind==='Itens Paranormais'))&&$('nexHbTag').value==='Explosivos');
   $('nexHbCursedExplosionType').closest('label').hidden=general;
   $('nexHbArtifactExtras').hidden=cursedKind!=='Itens Paranormais';
   $('nexHbSharedImprovements').hidden=true;
   ['nexHbProtectionDefense','nexHbWeaponDamage','nexHbWeaponCritical','nexHbWeaponMultiplier'].forEach(id=>{ $(id).required=protection&&id==='nexHbProtectionDefense'||weapon&&id!=='nexHbProtectionDefense'; });
   $('nex52Editor').dataset.itemKind=type==='item'?(cursed?'cursed':general?'general':'other'):'';
   syncItemCategoryFields();
   syncCursedWeaponElement();
   syncParanormalWeaponTier();
 }
 const effectEditing=Object.create(null);
 function getEffects(scope){return scope==='main'?effectRows:scope==='improvement'?improvementRows:(trailRows[scope]||(trailRows[scope]=[]));}
 function compactEffectLabel(b){
  const name=({pv:'PV',pe:'PE',san:'SAN',pv_temp:'PV temporários',pe_temp:'PE temporários',pericia:b.skill||'Perícia',ataque:'Ataque',dano:'Dano',defesa:'Defesa',resistencia:'Redução de dano',critico:'Margem de crítico',multiplicador:'Multiplicador crítico',espacos:'Espaços',iniciativa:'Iniciativa',fortitude:'Fortitude',reflexos:'Reflexos',vontade:'Vontade',bloqueio:'Bloqueio',esquiva:'Esquiva',carga:'Carga'})[b.type]||b.type;
  return (Number(b.value)>=0?'+':'')+Number(b.value||0)+' '+name+(b.scaling==='nex'?' a cada '+(b.nexInterval||5)+'% de NEX':'');
 }
 function isAbilityBonusScope(scope){
  return scope!=='improvement'&&(scope!=='main'||['origem','habilidade','poder','poder_geral','poder_paranormal'].includes($('nex51Type').value));
 }
 function isGeneralBonusScope(scope){return scope==='main'&&$('nex51Type').value==='item'&&tab==='itens'&&itemTab==='Geral';}
 const OFFENSIVE_BONUSES=['dano','ataque','carga','critico','multiplicador'];
 const PROTECTION_BONUSES=['bloqueio','esquiva','resistencia','defesa','espacos'];
 const STANDARD_ITEM_BONUSES=['ataque','dano','defesa','resistencia','pericia','bloqueio','esquiva','carga','critico','multiplicador','espacos'];
 const RITUAL_SUPPORT_BONUSES=['ataque','defesa','resistencia','pericia','bloqueio','esquiva','carga','critico','multiplicador'];
 const RITUAL_HEAL_BONUSES=['pv_temp','pe_temp'];
 function allowedBonusTypes(scope){
  const kind=$('nex51Type').value;
  if(scope==='improvement'){
   const target=$('nexHbImprovementTarget').value;
   if(['Armas','Munições'].includes(target))return OFFENSIVE_BONUSES;
   if(target==='Proteções')return PROTECTION_BONUSES;
   return null;
  }
  if(scope!=='main')return null;
  if(kind==='ritual'){
   const ritualType=$('nex53RitualType').value;
   if(ritualType==='Dano')return ['dano'];
   if(ritualType==='Suporte')return RITUAL_SUPPORT_BONUSES;
   if(ritualType==='Cura')return RITUAL_HEAL_BONUSES;
   return [];
  }
  if(kind==='maldicao'){
   const target=$('nexHbCurseTarget').value;
   if(['Armas','Munições'].includes(target))return OFFENSIVE_BONUSES;
   if(target==='Proteções')return PROTECTION_BONUSES;
   if(target==='Itens Gerais')return STANDARD_ITEM_BONUSES;
   return null;
  }
  if(kind!=='item')return null;
  const target=tab==='paranormal'?cursedKind:itemTab;
  if(['Armas','Munições','Armas Amaldiçoadas','Munições Amaldiçoadas'].includes(target))return OFFENSIVE_BONUSES;
  if(['Proteções','Proteções Amaldiçoadas'].includes(target))return PROTECTION_BONUSES;
  if(target==='Geral'||target==='Itens Paranormais')return $('nexHbTag').value==='Explosivos'?OFFENSIVE_BONUSES:STANDARD_ITEM_BONUSES;
  return null;
 }
 function bonusOptions(scope){
  const allowed=allowedBonusTypes(scope);
  const all=scope==='improvement'?BONUS_TYPES:scope==='main'&&isCursedEditor()?[...EFFECT_TYPES,...CURSED_EXTRA_BONUSES]:EFFECT_TYPES;
  const choices=allowed?[...EFFECT_TYPES,...BONUS_TYPES,...CURSED_EXTRA_BONUSES]:all;
  const noSkill=scope==='improvement'&&IMPROVEMENT_NO_SKILL.includes($('nexHbImprovementTarget').value)||scope==='main'&&cursedNoSkill();
  const options=choices.filter(([id],i,arr)=>id&&(!allowed||allowed.includes(id))&&(!noSkill||id!=='pericia')&&arr.findIndex(([key])=>key===id)===i);
  return allowed?options.sort((a,b)=>allowed.indexOf(a[0])-allowed.indexOf(b[0])):options;
 }
 function renderEffects(scope){
  const list=getEffects(scope),id=scope==='main'?'nexHbEffectBonusList':scope==='improvement'?'nexHbImprovementBonusList':'nex53TrailBonusList'+scope;
  const allowProgression=isAbilityBonusScope(scope);
  if(!allowProgression)list.forEach(b=>{b.scaling='fixed';b.nexInterval=5;});
  const skills=api()?.skillNames?.()||FALLBACK_SKILLS;
  const types=bonusOptions(scope);
  $(id).innerHTML=list.map((b,i)=>{
   const editing=effectEditing[scope]===i;
   return '<div class="nex-hb-effect-card" style="border-bottom:1px solid #38383d;padding:7px 0" data-effect-scope="'+esc(scope)+'" data-effect-index="'+i+'">'+
     '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;justify-content:space-between">'+
       '<strong style="font-size:12px">'+esc(compactEffectLabel(b))+'</strong>'+
       '<span style="display:flex;gap:5px"><button type="button" class="btn sm" data-effect-edit="'+i+'">'+(editing?'Fechar':'Editar')+'</button><button type="button" class="btn sm" data-effect-remove="'+i+'">Remover</button></span></div>'+
     (editing?'<div class="nex-hb-bonus-grid" style="padding:9px 0;gap:8px">'+
       '<label>Tipo de bônus<select data-effect-type>'+types.map(([t,label])=>'<option value="'+esc(t)+'"'+(t===b.type?' selected':'')+'>'+esc(label)+'</option>').join('')+'</select></label>'+
       '<label>Valor do bônus<input data-effect-value type="number" min="-999" max="999" step="1" value="'+esc(b.value)+'"></label>'+ 
       (allowProgression?'<label>Progressão do bônus<select data-effect-scaling><option value="fixed"'+(b.scaling!=='nex'?' selected':'')+'>Fixo</option><option value="nex"'+(b.scaling==='nex'?' selected':'')+'>A cada X% de NEX</option></select></label>':'')+ 
       (allowProgression&&b.scaling==='nex'?'<label>Intervalo de NEX<select data-effect-nex-interval>'+[5,10,15,20].map(n=>'<option value="'+n+'"'+(Number(b.nexInterval||5)===n?' selected':'')+'>A cada '+n+'% de NEX</option>').join('')+'</select></label>':'')+
       (b.type==='pericia'?'<label>Perícia beneficiada<select data-effect-skill><option value="">Escolha a perícia</option>'+skills.map(name=>'<option value="'+esc(name)+'"'+(name===b.skill?' selected':'')+'>'+esc(name)+'</option>').join('')+'</select></label>':'')+
       '<button type="button" class="btn primary sm" data-effect-done>Concluir</button></div>':'')+
     '</div>';
  }).join('');
 }
 mount.addEventListener('click',e=>{
  const add=e.target.closest('[data-effect-add]');
  if(add){
   const scope=add.dataset.effectAdd,items=getEffects(scope);
   if(items.length>=20){message('Limite de 20 bônus.');return;}
   items.push({type:bonusOptions(scope)[0]?.[0]||'pv',value:1,skill:'',scaling:'fixed',nexInterval:5});effectEditing[scope]=items.length-1;renderEffects(scope);return;
  }
  const row=e.target.closest('[data-effect-scope]');if(!row)return;
  const scope=row.dataset.effectScope,index=Number(row.dataset.effectIndex);
  if(e.target.closest('[data-effect-remove]')){
   getEffects(scope).splice(index,1);
   if(effectEditing[scope]===index)delete effectEditing[scope];
   else if(effectEditing[scope]>index)effectEditing[scope]--;
   renderEffects(scope);return;
  }
  if(e.target.closest('[data-effect-edit]')){
   effectEditing[scope]=effectEditing[scope]===index?null:index;renderEffects(scope);return;
  }
  if(e.target.closest('[data-effect-done]')){
   const item=getEffects(scope)[index];
   if(item.type==='pericia'&&!(api()?.skillNames?.()||FALLBACK_SKILLS).includes(item.skill)){message('Escolha a perícia beneficiada.');return;}
   effectEditing[scope]=null;renderEffects(scope);return;
  }
 });
 mount.addEventListener('change',e=>{
  const row=e.target.closest('[data-effect-scope]');if(!row)return;
  const scope=row.dataset.effectScope,item=getEffects(scope)[Number(row.dataset.effectIndex)];if(!item)return;
  if(e.target.matches('[data-effect-type]')){if(!bonusOptions(scope).some(([type])=>type===e.target.value))return;if((scope==='improvement'&&IMPROVEMENT_NO_SKILL.includes($('nexHbImprovementTarget').value)||scope==='main'&&cursedNoSkill())&&e.target.value==='pericia')return;item.type=e.target.value;item.skill='';renderEffects(scope);}
  else if(e.target.matches('[data-effect-value]')){item.value=Math.max(-999,Math.min(999,Number(e.target.value)||0));renderEffects(scope);}
  else if(e.target.matches('[data-effect-skill]')){item.skill=e.target.value;renderEffects(scope);}
  else if(e.target.matches('[data-effect-scaling]')){item.scaling=isAbilityBonusScope(scope)&&e.target.value==='nex'?'nex':'fixed';renderEffects(scope);}
  else if(e.target.matches('[data-effect-nex-interval]')&&isAbilityBonusScope(scope)){item.nexInterval=[5,10,15,20].includes(Number(e.target.value))?Number(e.target.value):5;renderEffects(scope);}
 });
 const effectsValid=items=>items.every(b=>b.type!=='pericia'||(api()?.skillNames?.()||FALLBACK_SKILLS).includes(b.skill));
 const effectsLabel=items=>items.map(b=>esc([...EFFECT_TYPES,...CURSED_EXTRA_BONUSES].find(([id])=>id===b.type)?.[1]||b.type)+(b.skill?' ('+esc(b.skill)+')':'')+': '+esc((b.value>=0?'+':'')+b.value)+(b.scaling==='nex'?' a cada '+esc(b.nexInterval||5)+'% de NEX':'')).join(' · ');
 const FALLBACK_SKILLS=['Acrobacia','Adestramento','Artes','Atletismo','Atualidades','Ciências','Crime','Diplomacia','Enganação','Fortitude','Furtividade','Iniciativa','Intimidação','Intuição','Investigação','Luta','Medicina','Ocultismo','Percepção','Pilotagem','Pontaria','Profissão','Reflexos','Religião','Sobrevivência','Tática','Tecnologia','Vontade'];
 function loadSkillChoices(){
   const skills=api()?.skillNames?.()||FALLBACK_SKILLS;
   const options=skills.filter(name=>typeof name==='string').map(name=>'<option value="'+esc(name)+'">'+esc(name)+'</option>').join('');
   ['nexHbBonusSkill','nexHbAccessorySkill'].forEach(id=>{$(id).innerHTML='<option value="">Selecione a perícia</option>'+options;});
   $('nex55Skill1').innerHTML='<option value="">Escolha a primeira perícia</option>'+options;
   $('nex55Skill2').innerHTML='<option value="">Escolha a segunda perícia</option>'+options;
 }
 function syncItemCategoryFields(){
   $('nex52ItemFields').querySelectorAll('[data-hb-sync]').forEach(control=>{const hidden=$(control.dataset.hbSync);if(hidden)control.value=hidden.value;});
 }
 function syncParanormalWeaponTier(){
   const cursedWeapon=tab==='paranormal'&&paranormalSection==='itens'&&cursedKind==='Armas Amaldiçoadas'&&$('nex51Type').value==='item';
   $('nex52ItemFields').querySelectorAll('[data-hb-sync="nexHbTier"],#nexHbTier').forEach(select=>{
     const zero=select.querySelector('option[value="0"]');
     if(zero){zero.hidden=cursedWeapon;zero.disabled=cursedWeapon;}
   });
   if(cursedWeapon&&$('nexHbTier').value==='0'){$('nexHbTier').value='I';syncItemCategoryFields();}
 }
 function syncCursedWeaponElement(){
   const isCursedWeapon=tab==='paranormal'&&paranormalSection==='itens'&&cursedKind==='Armas Amaldiçoadas'&&$('nex51Type').value==='item';
   const secondary=$('nexHbWeaponSecondaryType');
   secondary.disabled=isCursedWeapon;
   const normal=[...secondary.options].find(option=>option.value==='Normal');
   if(normal){normal.hidden=isCursedWeapon;normal.disabled=isCursedWeapon;}
   if(isCursedWeapon)secondary.value=$('nexHbElement').value;
 }
  $('nex52ItemFields').addEventListener('input',event=>{const el=event.target.closest('[data-hb-sync]');if(el&&$(el.dataset.hbSync)){$(el.dataset.hbSync).value=el.value;if(el.dataset.hbSync==='nexHbElement')syncCursedWeaponElement();if(el.dataset.hbSync==='nexHbTag'){if($('nex51Type').value==='item'){effectRows=[];effectEditing.main=null;renderEffects('main');}$('nexHbCursedExplosion').hidden=!((isCursedEditor()&&cursedKind==='Itens Paranormais'||$('nex51Type').value==='item'&&tab==='itens'&&itemTab==='Geral')&&el.value==='Explosivos');$('nexHbCursedExplosionType').closest('label').hidden=$('nex51Type').value==='item'&&tab==='itens'&&itemTab==='Geral';}}});
  $('nex52ItemFields').addEventListener('change',event=>{const el=event.target.closest('[data-hb-sync]');if(el&&$(el.dataset.hbSync)){$(el.dataset.hbSync).value=el.value;if(el.dataset.hbSync==='nexHbElement')syncCursedWeaponElement();if(el.dataset.hbSync==='nexHbTag'){if($('nex51Type').value==='item'){effectRows=[];effectEditing.main=null;renderEffects('main');}$('nexHbCursedExplosion').hidden=!((isCursedEditor()&&cursedKind==='Itens Paranormais'||$('nex51Type').value==='item'&&tab==='itens'&&itemTab==='Geral')&&el.value==='Explosivos');$('nexHbCursedExplosionType').closest('label').hidden=$('nex51Type').value==='item'&&tab==='itens'&&itemTab==='Geral';}}});
 function renderItemImprovements(){
   const list=$('nex52ImprovementList');if(!list)return;
   list.innerHTML=customItemImprovements.length?customItemImprovements.map((name,i)=>'<span class="nex-hb-improvement-chip">'+esc(name)+' <button type="button" data-nex52-improvement-remove="'+i+'" aria-label="Remover '+esc(name)+'">×</button></span>').join(''):'<small>Nenhuma melhoria homebrew adicionada.</small>';
 }
 function canonicalCategory(value){return ITEM_CATEGORIES.includes(value)?value:({'Arma':'Armas','Munição':'Munições','Proteção':'Proteções','Item Amaldiçoado':'Itens Amaldiçoados'}[value]||'Geral');}

 const THREAT_BG={
  Sangue:{file:'sangue-fundo.svg',color:'#c43850'},
  Morte:{file:'morte-fundo.svg',color:'#a4a5ae'},
  Conhecimento:{file:'conhecimento-fundo.svg',color:'#d4b450'},
  Energia:{file:'energia-fundo.svg',color:'#b282db'},
  Medo:{file:'medo-fundo.svg',color:'#e3e3e9'},
  'Transmissão':{file:'energia-fundo.svg',color:'#67bf94'},
  Realidade:{file:'conhecimento-fundo.svg',color:'#c3a9a6'}
 };
 function updateThreatBackground(){
  const key=$('nexHbThreatElement').value;
  const bg=THREAT_BG[key]||THREAT_BG.Medo;
  const panel=$('nex52ThreatFields');
  panel.style.setProperty('--nex-threat-bg','url("./assets/rituais/'+bg.file+'")');
  panel.style.setProperty('--nex-threat-accent',bg.color);
  panel.dataset.threatElement=key;
 }
 $('nexHbThreatElement').addEventListener('change',updateThreatBackground);
 let threatImage='';
 function showThreatEditorTab(tabId){
  mount.querySelectorAll('[data-threat-editor-tab]').forEach(btn=>btn.setAttribute('aria-selected',String(btn.dataset.threatEditorTab===tabId)));
  mount.querySelectorAll('[data-threat-editor-panel]').forEach(panel=>{panel.hidden=panel.dataset.threatEditorPanel!==tabId;});
 }
 $('nex52ThreatFields').addEventListener('click',event=>{
  const button=event.target.closest('[data-threat-editor-tab]');
  if(button)showThreatEditorTab(button.dataset.threatEditorTab);
 });
 $('nexHbThreatFile').addEventListener('change',event=>{
  const file=event.target.files?.[0];if(!file)return;
  if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>450000){message('Use uma imagem PNG, JPG ou WebP de até 450 KB.');event.target.value='';return;}
  const reader=new FileReader();
  reader.onload=()=>{const src=String(reader.result||'');if(src.length>650000){message('Imagem muito grande.');return;}threatImage=src;$('nexHbThreatPreview').src=src;$('nexHbThreatPreview').hidden=false;$('nexHbThreatRemovePhoto').hidden=false;};
  reader.readAsDataURL(file);
 });
 $('nexHbThreatRemovePhoto').addEventListener('click',()=>{threatImage='';$('nexHbThreatPreview').hidden=true;$('nexHbThreatPreview').removeAttribute('src');$('nexHbThreatFile').value='';$('nexHbThreatRemovePhoto').hidden=true;});
 let threatActions=[];
 let openThreatActionIndex=null;
 function renderThreatActions(){
  const el=$('nexHbThreatActions');if(!el)return;
  el.innerHTML=threatActions.map((a,i)=>{
   const expanded=openThreatActionIndex===i;
   const title=[a.action||'Ação',a.name||'Sem nome'].filter(Boolean).join(' — ');
   return '<div class="nex-hb-threat-action-editor" data-threat-row="'+i+'">'+
    '<div class="nex-hb-threat-action-summary">'+
      '<button type="button" class="nex-hb-threat-action-toggle" data-threat-toggle="'+i+'" aria-expanded="'+expanded+'"><strong>'+esc(title)+'</strong><span aria-hidden="true">'+(expanded?'⌃':'⌄')+'</span></button>'+
      (!expanded?'<div class="nex-hb-threat-action-controls"><button type="button" class="btn sm" data-threat-edit="'+i+'">Editar</button><button type="button" class="btn sm" data-threat-delete="'+i+'">Excluir</button></div>':'')+
    '</div>'+
    (expanded?'<div class="nex-hb-threat-action-fields"><div class="nex-hb-threat-grid">'+
     [['name','Nome'],['action','Tipo de ação'],['test','Teste'],['damage','Dano'],['secondaryDamage','Dano secundário'],['secondaryType','Tipo do dano secundário'],['range','Alcance'],['effect','Efeito']].map(([k,label])=>'<label>'+label+(k==='effect'?'<textarea data-threat-key="'+k+'" maxlength="1000" rows="2">'+esc(a[k]||'')+'</textarea>':'<input data-threat-key="'+k+'" maxlength="90" value="'+esc(a[k]||'')+'">')+'</label>').join('')+
     '</div><div class="nex-hb-threat-action-controls"><button type="button" class="btn primary sm" data-threat-save="'+i+'">Salvar ação</button><button type="button" class="btn sm" data-threat-delete="'+i+'">Excluir</button></div></div>':'')+
    '</div>';
  }).join('');
 }
 function readThreatSheet(){
  const attributes={};THREAT_ATTRS.forEach(([k])=>{attributes[k]=num(mount.querySelector('[data-nex-threat-attr="'+k+'"]').value,0,6,1);});
  const out={element:$('nexHbThreatElement').value,attributes,actions:threatActions.map(a=>({...a}))};
  THREAT_NUMERIC.forEach(([k])=>{out[k]=Number(mount.querySelector('[data-nex-threat-number="'+k+'"]').value)||0;});
  out.pv=Number($('nexHbThreatPvAlias').value)||0;
  THREAT_TESTS.forEach(([k])=>{out[k]=mount.querySelector('[data-nex-threat-test="'+k+'"]').value;});
  THREAT_TEXT.forEach(([k])=>{out[k]=mount.querySelector('[data-nex-threat-text="'+k+'"]').value;});
  return out;
 }
 function populateThreatSheet(x){
  const data=normalizeThreat({threatSheet:x||{}});
  $('nexHbThreatElement').value=data.element;
  updateThreatBackground();
  THREAT_ATTRS.forEach(([k])=>{mount.querySelector('[data-nex-threat-attr="'+k+'"]').value=data.attributes[k];});
  THREAT_NUMERIC.forEach(([k])=>{mount.querySelector('[data-nex-threat-number="'+k+'"]').value=data[k];});
  $('nexHbThreatPvAlias').value=data.pv;
  THREAT_TESTS.forEach(([k])=>{mount.querySelector('[data-nex-threat-test="'+k+'"]').value=data[k];});
  THREAT_TEXT.forEach(([k])=>{mount.querySelector('[data-nex-threat-text="'+k+'"]').value=data[k];});
  threatActions=data.actions.map(a=>({...a}));openThreatActionIndex=null;renderThreatActions();
 }
 $('nexHbThreatPvAlias').addEventListener('input',()=>{mount.querySelector('[data-nex-threat-number="pv"]').value=$('nexHbThreatPvAlias').value;});
 mount.querySelector('[data-nex-threat-number="pv"]').addEventListener('input',event=>{$('nexHbThreatPvAlias').value=event.target.value;});
 $('nexHbThreatAddAction').addEventListener('click',()=>{
  if(threatActions.length>=12){message('Limite de 12 ações para esta ficha.');return;}
  threatActions.push({name:'Nova ação',action:'Padrão',test:'',damage:'',secondaryDamage:'',secondaryType:'Normal',range:'',effect:''});openThreatActionIndex=threatActions.length-1;renderThreatActions();
 });
 $('nexHbThreatActions').addEventListener('input',event=>{
  const row=event.target.closest('[data-threat-row]'),field=event.target.closest('[data-threat-key]');
  if(row&&field&&threatActions[Number(row.dataset.threatRow)])threatActions[Number(row.dataset.threatRow)][field.dataset.threatKey]=field.value;
 });
 $('nexHbThreatActions').addEventListener('click',event=>{
  const btn=event.target.closest('button');if(!btn)return;
  if(btn.hasAttribute('data-threat-delete')){
    const index=Number(btn.dataset.threatDelete);
    threatActions.splice(index,1);
    if(openThreatActionIndex===index)openThreatActionIndex=null;
    else if(openThreatActionIndex!==null&&openThreatActionIndex>index)openThreatActionIndex--;
    renderThreatActions();return;
  }
  if(btn.hasAttribute('data-threat-save')){
    const index=Number(btn.dataset.threatSave);
    const action=threatActions[index];
    if(!action||!cut(action.name,90)){message('Informe um nome para a ação.');return;}
    openThreatActionIndex=null;renderThreatActions();return;
  }
  if(btn.hasAttribute('data-threat-edit')||btn.hasAttribute('data-threat-toggle')){
    const index=Number(btn.dataset.threatEdit??btn.dataset.threatToggle);
    openThreatActionIndex=openThreatActionIndex===index?null:index;
    renderThreatActions();
  }
 });
 function threatDetails(item){
  const t=normalizeThreat(item);
  const threatBg=THREAT_BG[t.element]||THREAT_BG.Medo;
  const block=(label,value)=>'<div class="nex-hb-threat-stat"><small>'+esc(label)+'</small><strong>'+esc(value)+'</strong></div>';
  const note=(label,value)=>value?'<section class="nex-hb-threat-info"><h4>'+esc(label)+'</h4><p>'+esc(value).replace(/\n/g,'<br>')+'</p></section>':'';
  const statPanel='<div class="nex-hb-threat-attribute-bar">'+THREAT_ATTRS.map(([k,label])=>block(k.toUpperCase(),t.attributes[k])).join('')+'</div>'+
    '<div class="nex-hb-threat-main-stats">'+block('Defesa',t.defense)+block('Deslocamento',t.deslocamento||'—')+block('PV máximos',t.pv)+'</div>'+
    note('Presença perturbadora',t.presencaPerturbadora)+
    '<h4>Testes de resistência</h4>'+[['Fortitude',t.fortitude],['Reflexos',t.reflexos],['Vontade',t.vontade]].map(([label,v])=>'<div class="nex-hb-threat-skill-line"><span>'+label+'</span><strong>'+esc(v)+'</strong></div>').join('')+
    '<h4>Sentidos</h4>'+[['Percepção',t.percepcao],['Iniciativa',t.iniciativa]].map(([label,v])=>'<div class="nex-hb-threat-skill-line"><span>'+label+'</span><strong>'+esc(v)+'</strong></div>').join('')+
    note('Sentidos especiais',t.sentidos)+note('Resistências',t.resistencias)+note('Imunidades',t.imunidades)+note('Vulnerabilidades',t.vulnerabilidades);
  const combatPanel=(t.actions.length?t.actions.map(a=>'<div class="nex-hb-threat-action"><strong>'+esc(a.name)+'</strong><p>'+esc([a.action,a.test,a.damage&&'Dano: '+a.damage,a.secondaryDamage&&'Dano secundário: '+a.secondaryDamage,a.secondaryDamage&&'Tipo: '+a.secondaryType,a.range&&'Alcance: '+a.range].filter(Boolean).join(' · '))+'</p>'+(a.effect?'<p>'+esc(a.effect)+'</p>':'')+'</div>').join(''):'<p>Nenhuma ação cadastrada.</p>');
  const descriptionPanel=note('Descrição',item.description)+note('Enigma de Medo',t.enigma);
  return '<section class="nex-hb-threat-sheet" data-nex-threat-preview style="--nex-threat-bg:url(&quot;./assets/rituais/'+esc(threatBg.file)+'&quot;);--nex-threat-accent:'+esc(threatBg.color)+'">'+
   '<div class="nex-hb-threat-sheet-head">'+(item.image?'<img class="nex-hb-threat-avatar" src="'+esc(item.image)+'" alt="Imagem de '+esc(LABEL[item.type])+'">':'')+
     '<div><small>'+esc(item.type==='npc'?'NPC HOMEBREW':'AMEAÇA HOMEBREW')+'</small><h2>'+esc(item.name)+'</h2><p>'+esc(item.creatureType)+' · '+esc(item.size)+'</p><span>'+esc(t.element)+' · VD '+esc(item.vd)+'</span></div></div>'+
   '<div class="nex-hb-threat-pv">'+esc(t.pv)+' PV</div>'+
   '<nav class="nex-hb-threat-tabs" role="tablist" aria-label="Seções da ficha"><button type="button" data-threat-preview-tab="status" aria-selected="true">STATUS</button><button type="button" data-threat-preview-tab="combate" aria-selected="false">COMBATE</button><button type="button" data-threat-preview-tab="descricao" aria-selected="false">DESCRIÇÃO</button></nav>'+
   '<div class="nex-hb-threat-panel" data-threat-preview-panel="status">'+statPanel+'</div>'+
   '<div class="nex-hb-threat-panel" data-threat-preview-panel="combate" hidden>'+combatPanel+'</div>'+
   '<div class="nex-hb-threat-panel" data-threat-preview-panel="descricao" hidden>'+descriptionPanel+'</div></section>';
 }
 $('nex52DetailBody').addEventListener('click',event=>{
  const button=event.target.closest('[data-threat-preview-tab]');if(!button)return;
  const root=button.closest('[data-nex-threat-preview]');if(!root)return;
  const tab=button.dataset.threatPreviewTab;
  root.querySelectorAll('[data-threat-preview-tab]').forEach(b=>b.setAttribute('aria-selected',String(b.dataset.threatPreviewTab===tab)));
  root.querySelectorAll('[data-threat-preview-panel]').forEach(panel=>{panel.hidden=panel.dataset.threatPreviewPanel!==tab;});
 });
 function resetForm(){
   $('nex51Form').reset();$('nex51Edit').value='';
   populateThreatSheet(null);
   threatImage='';$('nexHbThreatFile').value='';$('nexHbThreatPreview').hidden=true;$('nexHbThreatPreview').removeAttribute('src');$('nexHbThreatRemovePhoto').hidden=true;
   customItemImprovements=[];renderItemImprovements();
   loadSkillChoices();
   $('nex51Type').innerHTML=currentTypes().map(type=>'<option value="'+type+'">'+LABEL[type]+'</option>').join('');
   $('nex51Type').value=defaultType();$('nex52EditorTitle').textContent='Adicionar '+LABEL[defaultType()].toLocaleLowerCase('pt-BR');
   $('nex53ParanormalElement').value='Sangue';
   $('nex53RitualType').value='Suporte';
   $('nex53DiscenteCircle').value='2';$('nex53VerdadeiroCircle').value='3';
   $('nex53RitualImage').value='';$('nex53RitualFile').value='';$('nex53RitualPreview').hidden=true;
   $('nex52Category').value=tab==='paranormal'?'Itens Amaldiçoados':itemTab;
   $('nexHbCurseElement').value='Sangue';$('nexHbCurseTarget').value='Armas';
   $('nexHbCursedAmmoType').value='Balas curtas';$('nexHbCursedAmmoBonus').value='';
   $('nexHbCursedAccessoryType').value='Anel';$('nexHbCursedAccessoryBenefit').value='';
   $('nexHbAccessoryBonus').value='';$('nexHbAccessorySkill').value='';$('nexHbBonusSkill').value='';
   $('nexHbCursedArtifactRequirement').value='';
   $('nexHbImprovementTarget').value='Armas';
   $('nexHbBonusType').value='ataque';$('nexHbBonusValue').value='+2';
   $('nexHbCursedExplosionDamage').value='';$('nexHbCursedExplosionSecondary').value='';$('nexHbCursedExplosionType').value='Normal';$('nexHbCursedExplosionMultiplier').value='2';$('nexHbCursedExplosionRange').value='';
   improvementRows=[];renderEffects('improvement');
   Object.keys(effectEditing).forEach(scope=>delete effectEditing[scope]);
   effectRows=[];renderEffects('main');TRAIL_NEX.forEach(n=>{trailRows[n]=[];renderEffects(String(n));});

   $('nexHbProtectionDefense').value='1';
   $('nexHbWeaponProficiency').value='Armas Simples';$('nexHbWeaponKind').value='Corpo a Corpo';$('nexHbWeaponWield').value='Uma Mão';
   $('nexHbWeaponDamage').value='';$('nexHbWeaponSecondary').value='';$('nexHbWeaponSecondaryType').value='Normal';
   $('nexHbWeaponCritical').value='20';$('nexHbWeaponMultiplier').value='2';$('nexHbWeaponDamageType').value='Corte';
   $('nexHbWeaponRange').value='';$('nexHbWeaponQuantity').value='1';
   $('nexHbTier').value='0';$('nexHbSpaces').value='1';$('nexHbElement').value='Conhecimento';$('nexHbTag').value='Acessórios';
   $('nexHbImageUrl').value='';$('nexHbImageFile').value='';$('nexHbImagePreview').hidden=true;$('nexHbImagePreview').removeAttribute('src');
   editorFields();
 }
 function closeEditor(){$('nex52Editor').hidden=true;resetForm();}
 function openEditor(item){
   resetForm();
   if(item){
     $('nex51Edit').value=item.id;$('nex51Type').value=item.type;
     $('nex51Name').value=item.name;$('nex51Description').value=item.description;
     $('nex51Requirements').value=item.requirements;$('nex51Class').value=item.className;
     $('nex51Nex').value=item.minNex;$('nex51Circle').value=item.circle;
     $('nex51Element').value=item.element;
     $('nex53RitualType').value=item.ritualType;
     $('nex53DiscenteCircle').value=String(item.discenteCircle);
     $('nex53VerdadeiroCircle').value=String(item.verdadeiroCircle);
     $('nex53Execution').value=item.execution;
     $('nex53Range').value=item.range;
     $('nex53Area').value=item.area; $('nex53Target').value=item.target;
     $('nex53Duration').value=item.duration;$('nex53Effect').value=item.effect;
     $('nex53Resistance').value=item.resistance;$('nex53Dice').value=item.ritualDice;
     $('nex53DiscenteDice').value=item.discenteDice;$('nex53VerdadeiroDice').value=item.verdadeiroDice;
     $('nex53RitualImage').value=item.image?.startsWith('https://')?item.image:'';
     $('nex53RitualPreview').hidden=!item.image;
     if(item.image)$('nex53RitualPreview').src=item.image;
     $('nex53ParanormalElement').value=['Sangue','Morte','Energia','Conhecimento','Medo'].includes(item.element)?item.element:'Sangue';if($('nex51Cost'))$('nex51Cost').value=item.cost;
     $('nex52VD').value=item.vd;$('nex52Size').value=item.size;
     if(isThreatType(item.type)){populateThreatSheet(item.threatSheet);threatImage=item.image||'';if(threatImage){$('nexHbThreatPreview').src=threatImage;$('nexHbThreatPreview').hidden=false;$('nexHbThreatRemovePhoto').hidden=false;}}
     $('nex52CreatureType').value=item.creatureType;
     $('nex52Category').value=canonicalCategory(item.category);
     $('nexHbCurseElement').value=item.element||'Sangue';$('nexHbCurseTarget').value=item.curseTarget||'Armas';
     $('nexHbCursedAmmoType').value=item.cursedAmmoType||'Balas curtas';if(!$('nexHbCursedAmmoType').value){const option=document.createElement('option');option.value=item.cursedAmmoType;option.textContent=item.cursedAmmoType;$('nexHbCursedAmmoType').append(option);$('nexHbCursedAmmoType').value=item.cursedAmmoType;}$('nexHbCursedAmmoBonus').value=item.cursedAmmoBonus||'';
     $('nexHbCursedAccessoryType').value=item.cursedAccessoryType||'Anel';$('nexHbCursedAccessoryBenefit').value=item.cursedAccessoryBenefit||'';
     $('nexHbAccessoryBonus').value=item.accessoryBonus?'+'+item.accessoryBonus:'';$('nexHbAccessorySkill').value=item.accessorySkill||'';
     $('nexHbCursedArtifactRequirement').value=item.cursedArtifactRequirement||'';
     $('nexHbImprovementTarget').value=item.improvementTarget||'Armas';
     effectRows=parseEffects(item.effectBonuses,item.effectBonusType,item.effectBonusValue,item.effectBonusSkill);
     if(item.type==='item'&&item.category==='Itens Amaldiçoados'&&CURSED_NO_SKILL.includes(item.cursedKind))effectRows=effectRows.filter(b=>b.type!=='pericia');
     renderEffects('main');
     $('nexHbBonusType').value=item.bonusType||'ataque';$('nexHbBonusValue').value='+'+Math.max(1,Math.min(10,item.bonusValue||2));$('nexHbBonusSkill').value=item.bonusSkill||'';
     improvementRows=parseImprovementBonuses(item.improvementBonuses,item.bonusType,item.bonusValue,item.bonusSkill);if(IMPROVEMENT_NO_SKILL.includes($('nexHbImprovementTarget').value))improvementRows=improvementRows.filter(b=>b.type!=='pericia');renderEffects('improvement');
     customItemImprovements=Array.isArray(item.customImprovements)?[...item.customImprovements]:[];renderItemImprovements();
     $('nexHbProtectionDefense').value=String(item.protectionDefense??1);
     $('nexHbWeaponProficiency').value=item.weaponProficiency||'Armas Simples';
     $('nexHbWeaponKind').value=item.weaponKind||'Corpo a Corpo';
     $('nexHbWeaponWield').value=item.weaponWield||'Uma Mão';
     $('nexHbWeaponDamage').value=item.weaponDamage||'';
     $('nexHbWeaponSecondary').value=item.weaponSecondary||'';
     $('nexHbWeaponSecondaryType').value=item.weaponSecondaryType||'Normal';
     $('nexHbWeaponCritical').value=item.weaponCritical||'20';
     $('nexHbWeaponMultiplier').value=item.weaponMultiplier||'2';
     $('nexHbWeaponDamageType').value=item.weaponDamageType||'Corte';
     $('nexHbWeaponRange').value=item.weaponRange==='—'?'':(item.weaponRange||'');
     $('nexHbWeaponQuantity').value=String(item.weaponQuantity??1);
     $('nexHbTier').value=item.itemTier||'0';$('nexHbSpaces').value=String(item.itemSpaces??1);
     $('nexHbElement').value=['Conhecimento','Energia','Medo','Morte','Sangue'].includes(item.element)?item.element:'Conhecimento';
     $('nexHbTag').value=item.itemTag||'Acessórios';
      $('nexHbCursedExplosionDamage').value=item.cursedExplosiveDamage||'';
      $('nexHbCursedExplosionSecondary').value=item.cursedExplosiveSecondary||'';
      $('nexHbCursedExplosionType').value=item.cursedExplosiveSecondaryType||'Normal';
      $('nexHbCursedExplosionMultiplier').value=item.cursedExplosiveMultiplier||'2';
      $('nexHbCursedExplosionRange').value=item.cursedExplosiveRange||'';
     syncItemCategoryFields();
     syncCursedWeaponElement();
     syncParanormalWeaponTier();
     $('nexHbImageUrl').value=item.image?.startsWith('https://')?item.image:'';
     $('nexHbImagePreview').hidden=!item.image;if(item.image)$('nexHbImagePreview').src=item.image;
     if(item.type==='origem'){$('nex55Skill1').value=item.skills?.[0]||'';$('nex55Skill2').value=item.skills?.[1]||'';}
     if(item.type==='trilha')TRAIL_NEX.forEach((n,i)=>{const step=(item.trailAbilities||[])[i]||{};$('nex53TrailName'+n).value=step.name||'';$('nex53TrailDescription'+n).value=step.description||'';trailRows[n]=parseEffects(step.bonuses,step.bonusType,step.bonusValue,step.bonusSkill);renderEffects(String(n));});
     $('nex52EditorTitle').textContent='Editar '+item.name;
   }
   editorFields();$('nex52Editor').hidden=false;
   $('nex52Editor').scrollIntoView({block:'start',behavior:'smooth'});
 }
 function meta(item){
   if(isThreatType(item.type))return ['VD: '+item.vd,item.creatureType+' - '+item.size];
   if(item.type==='ritual')return [item.ritualType+' · '+item.circle+'º círculo · '+item.element,item.execution+' · '+item.range];
   if(item.type==='maldicao')return ['Elemento '+item.element,'Aplicável a '+item.curseTarget];
   if(item.type==='melhoria')return ['Aplicável a '+item.improvementTarget, ...(item.improvementBonuses?.length?[item.improvementBonuses.map(b=>(BONUS_TYPES.find(([id])=>id===b.type)?.[1]||b.type)+': '+(b.value>=0?'+':'')+b.value).join(' · ')]:[])];
   if(item.type==='item')return [item.category,(item.category==='Proteções'?'Defesa '+item.protectionDefense+' · ':item.category==='Armas'?'Dano '+(item.weaponDamage||'—')+' · ':'')+'Categoria '+item.itemTier+' · '+item.itemSpaces+' espaço(s)',item.category==='Itens Amaldiçoados'?item.element:item.category==='Geral'?item.itemTag:''];
   if(item.type==='trilha')return ['Trilha · '+item.className,'4 marcos · NEX 10%, 40%, 65% e 99%'];
   if(item.type==='origem')return ['Origem personalizada',(item.skills||[]).join(' · ')||'Duas perícias'];
   if(['poder_geral','poder','habilidade'].includes(item.type))return ['Poder Geral · '+(item.className==='Livre'?'Geral':item.className),'Homebrew'];
   if(item.type==='poder_paranormal')return ['Poder Paranormal · '+item.element,'Homebrew'];
   return [LABEL[item.type]+' · '+item.className,'NEX '+item.minNex+'%'];
 }
 function trailDetails(item){
   if(item.type!=='trilha')return '';
   const stages=Array.isArray(item.trailAbilities)?item.trailAbilities:[];
   return '<section class="nex53-trail-details"><h4>Habilidades da trilha</h4>'+
      TRAIL_NEX.map((n,i)=>{const stage=stages[i]||{};
        return '<div class="nex53-trail-detail"><strong>NEX '+n+'% · '+esc(stage.name||'Habilidade não configurada')+'</strong>'+
          '<p>'+esc(stage.description||'Sem descrição.')+'</p></div>';
      }).join('')+'</section>';
 }
 function card(item){
   const details=meta(item);
   const threat=isThreatType(item.type);
   const bg=threat?(THREAT_BG[item.threatSheet?.element]||THREAT_BG.Sangue):null;
   const theme=bg?' style="--nex-threat-card-bg:url(&quot;./assets/rituais/'+esc(bg.file)+'&quot;);--nex-threat-card-accent:'+esc(bg.color)+'"':'';
   const portrait=threat&&item.image?'<img class="nex-hb-threat-card-portrait" src="'+esc(item.image)+'" alt="" loading="lazy">':'';
   const tag=threat?'<span class="nex-hb-threat-card-element">'+esc(item.threatSheet?.element||'Sangue')+'</span>':'';
   return '<article class="nex52-card nex52-card-'+(threat?'threat':item.type==='ritual'?'ritual':item.type==='item'?'item':'ability')+'"'+theme+'>'+
    portrait+'<div class="nex52-card-data"><strong>'+esc(item.name)+'</strong>'+tag+'<span>'+esc(details[0])+'</span><span>'+esc(details[1])+'</span></div>'+
    '<div class="nex52-card-controls"><button type="button" data-nex52-settings="'+esc(item.id)+'" class="nex52-gear" aria-label="Opções para '+esc(item.name)+'" aria-expanded="false">⚙</button>'+
    '<div class="nex52-settings" data-nex52-menu="'+esc(item.id)+'" hidden><button type="button" data-nex52-share="'+esc(item.id)+'">Compartilhar</button><button type="button" data-nex52-delete="'+esc(item.id)+'">Excluir</button></div>'+
    '<button type="button" class="nex52-open" data-nex52-edit="'+esc(item.id)+'">Editar</button></div></article>';
 }
 function targetOptions(){
   const sel=$('nex51Target');const previous=sel.value;
   const agents=api()?.ready()?api().listAgents():[];
   const power=opened?read().find(x=>x.id===opened):null;
   const limited=power&&['poder_geral','poder','habilidade'].includes(power.type)&&!['Geral','Livre'].includes(power.className);
   sel.innerHTML='<option value="">Selecione um personagem</option>'+agents.map(a=>{
     const locked=limited&&a.className!==power.className;
     return '<option value="'+esc(a.id)+'"'+(locked?' disabled':'')+'>'+esc(a.name||'Personagem')+' · '+esc(a.className||'Classe não definida')+(locked?' (classe incompatível)':'')+'</option>';
   }).join('');
   const active=api()?.ready()?api().current()?.id:null;
   const chosen=agents.some(x=>x.id===previous)?previous:active;
   if(chosen&&agents.some(x=>x.id===chosen)&&![...sel.options].find(x=>x.value===chosen)?.disabled)sel.value=chosen;
 }
 function renderLibrary(){
   const records=read(),types=currentTypes();
   $('nex53SkillTabs').hidden=tab!=='habilidades';
   mount.querySelectorAll('[data-nex53-skill]').forEach(button=>{const selected=tab==='habilidades'&&button.dataset.nex53Skill===skillTab;button.setAttribute('aria-selected',String(selected));button.classList.toggle('active',selected);});
   const visible=records.filter(x=>types.includes(x.type)&&(tab!=='itens'||canonicalCategory(x.category)===itemTab&&itemTab!=='Itens Amaldiçoados')&&(tab!=='paranormal'||paranormalSection==='maldicoes'||(x.category==='Itens Amaldiçoados'&&x.cursedKind===cursedKind)));
   $('nexHbItemTabs').hidden=tab!=='itens';
   $('nexHbParanormalNav').hidden=tab!=='paranormal';
   $('nexHbCursedKinds').hidden=tab!=='paranormal'||paranormalSection!=='itens';
   mount.querySelectorAll('[data-nex-psection]').forEach(b=>b.classList.toggle('active',b.dataset.nexPsection===paranormalSection));
   mount.querySelectorAll('[data-nex-ckind]').forEach(b=>b.classList.toggle('active',b.dataset.nexCkind===cursedKind));
   mount.querySelectorAll('[data-nex-hb-item-tab="Itens Amaldiçoados"]').forEach(b=>b.hidden=true);
   mount.querySelectorAll('[data-nex-hb-item-tab]').forEach(button=>{const active=tab==='itens'&&button.dataset.nexHbItemTab===itemTab;button.classList.toggle('active',active);button.setAttribute('aria-selected',String(active));});
   $('nex53RitualFilter').hidden=tab!=='rituais';
   if(tab==='rituais')$('nex53RitualFilter').innerHTML=['Todas','Dano','Suporte','Cura'].map(t=>'<button type="button" data-ritual-filter="'+t+'" aria-pressed="'+String(t===ritualFilter)+'">'+t+'</button>').join('');
   const query=$('nex51Search').value.trim().toLocaleLowerCase('pt-BR');
   const filtered=visible.filter(x=>(tab!=='rituais'||ritualFilter==='Todas'||x.ritualType===ritualFilter)&&(!query||[x.name,x.description,x.requirements,x.className,x.creatureType,x.category,x.element,x.ritualType,x.improvementTarget].join(' ').toLocaleLowerCase('pt-BR').includes(query)));
   $('nex52Count').textContent='Homebrew '+visible.length+'/50';
   mount.querySelectorAll('[data-nex52-tab]').forEach(button=>{
     const selected=button.dataset.nex52Tab===tab;
     button.setAttribute('aria-selected',String(selected));button.classList.toggle('active',selected);
   });
   $('nex51List').innerHTML=filtered.length?filtered.map(card).join(''):
    '<div class="nex52-empty">Nenhum '+(tab==='habilidades'?({origens:'origem',paranormais:'poder paranormal',gerais:'poder geral',trilhas:'trilha'})[skillTab]:titleFor(tab).toLocaleLowerCase('pt-BR'))+' cadastrado'+(query?' para esta busca':'')+'. Use <strong>Adicionar</strong> para criar um.</div>';
   renderSheet();
 }
 // NEX por círculo do Ocultista: 1º=5%, 2º=25%, 3º=55%, 4º=85%.
 // Aprimoramentos ainda exigem PE, afinidade e condições específicas do ritual.
 const nexForCircle=[0,5,25,55,85];
 function ritualUnlocked(circle,character){
   const required=nexForCircle[Number(circle)]??Infinity;
   return character?.className==='Ocultista'&&Number(character?.nex)>=required;
 }
 function sheetRitualDetails(ritual,character){
   if(ritual.type!=='ritual')return '';
   let html='<details class="nex53-attached-ritual"><summary>Ver ritual e versões disponíveis</summary><p>'+esc(ritual.ritualType)+' · '+esc(ritual.circle)+'º círculo · '+esc(ritual.element)+'</p>';
   if(['Dano','Cura'].includes(ritual.ritualType)){
     if(ritualUnlocked(ritual.circle,character)&&ritual.ritualDice)html+='<p><strong>Dados:</strong> '+esc(ritual.ritualDice)+'</p>';
     else html+='<p class="nex53-advanced-status">Forma básica: exige acesso ao '+esc(ritual.circle)+'º círculo.</p>';
     if(ritual.discenteDice&&ritualUnlocked(ritual.discenteCircle,character))html+='<p><strong>Discente:</strong> '+esc(ritual.discenteDice)+'</p>';
     if(ritual.verdadeiroDice&&ritualUnlocked(ritual.verdadeiroCircle,character))html+='<p><strong>Verdadeiro:</strong> '+esc(ritual.verdadeiroDice)+'</p>';
     if(ritual.discenteDice&&!ritualUnlocked(ritual.discenteCircle,character))html+='<p class="nex53-advanced-status">Discente: exige '+esc(ritual.discenteCircle)+'º círculo.</p>';
     if(ritual.verdadeiroDice&&!ritualUnlocked(ritual.verdadeiroCircle,character))html+='<p class="nex53-advanced-status">Verdadeiro: exige '+esc(ritual.verdadeiroCircle)+'º círculo.</p>';
   }
   html+='<p class="nex53-advanced-status">A liberação por NEX não dispensa custo de PE, afinidade ou outros pré-requisitos do ritual.</p></details>';
   return html;
 }
 function renderSheet(){
   const current=api()?.ready()?api().current():null;
   const items=Array.isArray(current?.items)?current.items.filter(valid).map(normalize):[];
   $('nex51SheetCount').textContent=String(items.length);
   $('nex51SheetItems').innerHTML=items.length?items.map(item=>
     '<div class="nex52-attached"><span><strong>'+esc(item.name)+'</strong><small>'+esc(LABEL[item.type])+'</small>'+(item.type==='trilha'?'<details class="nex53-attached-trail"><summary>Ver as 4 habilidades</summary>'+trailDetails(item)+'</details>':'')+sheetRitualDetails(item,current)+'</span>'+
     '<button type="button" class="btn sm" data-nex52-detach="'+esc(item.id)+'">Remover</button></div>').join(''):
     '<p class="nex52-empty">Nenhum homebrew associado a esta ficha.</p>';
 }
 function closeDialog(){const d=$('nex52Detail');if(typeof d.close==='function')d.close();else d.removeAttribute('open');opened=null;}
 function ritualDetails(item,character=null){
   if(item.type!=='ritual')return '';
   const fields=[['Categoria',item.ritualType],['Execução',item.execution],['Alcance',item.range],['Área',item.area],['Alvo',item.target],['Duração',item.duration],['Efeito',item.effect],['Resistência',item.resistance]];
   if(['Dano','Cura'].includes(item.ritualType)){
      if(!character||ritualUnlocked(item.circle,character))fields.push(['Dados',item.ritualDice]);
      if(!character||ritualUnlocked(item.discenteCircle,character))fields.push(['Dados Discente',item.discenteDice]);
      if(!character||ritualUnlocked(item.verdadeiroCircle,character))fields.push(['Dados Verdadeiro',item.verdadeiroDice]);
   }
   return '<div class="nex53-ritual-details">'+fields.filter(([label,value])=>value).map(([label,value])=>'<div><strong>'+esc(label)+'</strong><p>'+esc(value)+'</p></div>').join('')+'</div>';
 }
 function formattedDescription(value){
   return esc(value).replace(/\*\*([^*\n]+)\*\*/g,'<strong class="nex-hb-highlight">$1</strong>')
     .replace(/__([^_\n]+)__/g,'<u>$1</u>')
     .replace(/\*([^*\n]+)\*/g,'<em>$1</em>')
     .replace(/\n/g,'<br>');
 }
 function view(item){
   opened=item.id;const info=meta(item);
   $('nex52DetailBody').innerHTML=(isThreatType(item.type)?'':'<div class="nex52-detail-top"><span>'+esc(LABEL[item.type])+'</span><h3>'+esc(item.name)+'</h3></div>'+
     '<p class="nex52-detail-meta">'+esc(info.join(' · '))+'</p>')+
     (isThreatType(item.type)?threatDetails(item):'')+
     (isThreatType(item.type)?'':item.description?'<h4>Descrição</h4><p>'+(item.type==='item'?formattedDescription(item.description):esc(item.description))+'</p>':'<p>Sem descrição.</p>')+
     (item.requirements?'<h4>Pré-requisitos</h4><p>'+esc(item.requirements)+'</p>':'')+
     (effectApplicable(item)&&item.type!=='trilha'&&item.effectBonuses?.length?'<h4>Bônus configurados</h4><p>'+effectsLabel(item.effectBonuses)+'</p>':'')+
     (item.type==='trilha'?'<h4>Bônus por NEX</h4>'+item.trailAbilities.map(a=>'<p>NEX '+esc(a.nex)+'% · '+esc(a.name)+': '+(a.bonuses?.length?effectsLabel(a.bonuses):'Sem bônus')+'</p>').join(''):'')+
     (item.type==='melhoria'&&item.improvementBonuses?.length?'<h4>Bônus configurados</h4><p>'+item.improvementBonuses.map(b=>esc(BONUS_TYPES.find(([id])=>id===b.type)?.[1]||b.type)+(b.skill?' ('+esc(b.skill)+')':'')+': '+esc((b.value>=0?'+':'')+b.value)).join(' · ')+'</p>':'')+
     (item.type==='origem'?'<h4>Perícias treinadas</h4><p>'+esc((item.skills||[]).join(' e ')||'Não configuradas')+'</p>':'')+
     (item.type==='item'&&item.image?'<img class="nex-hb-preview-detail" src="'+esc(item.image)+'" alt="Imagem de '+esc(item.name)+'">':'')+
     (item.type==='item'&&item.category==='Proteções'?'<h4>Defesa</h4><p>'+esc(item.protectionDefense)+'</p>':'')+
     (item.type==='item'&&item.category==='Armas'?'<h4>Características da arma</h4><p>'+esc([item.weaponProficiency,item.weaponKind,item.weaponWield,'Dano '+item.weaponDamage,'Dano secundário '+(item.weaponSecondary||'—'),'Crítico '+item.weaponCritical+' ×'+item.weaponMultiplier,'Tipo de dano '+item.weaponDamageType,'Alcance '+item.weaponRange,'Quantidade '+item.weaponQuantity].join(' · '))+'</p>':'')+
     (item.type==='item'&&item.category==='Itens Amaldiçoados'?'<h4>Tipo paranormal</h4><p>'+esc(item.cursedKind)+'</p>':'')+
      (item.type==='item'&&item.category==='Itens Amaldiçoados'&&item.cursedKind==='Itens Paranormais'?'<h4>Tag</h4><p>'+esc(item.itemTag||'Acessórios')+'</p>':'')+
      (item.type==='item'&&(item.category==='Geral'||item.category==='Itens Amaldiçoados'&&item.cursedKind==='Itens Paranormais')&&item.itemTag==='Explosivos'?'<h4>Dados do explosivo</h4><p>'+esc('Dano '+(item.cursedExplosiveDamage||'—')+' · Dano secundário '+(item.cursedExplosiveSecondary||'—')+(item.category==='Geral'?'':' · Tipo secundário '+item.cursedExplosiveSecondaryType)+' · Multiplicador ×'+item.cursedExplosiveMultiplier+' · Alcance '+(item.cursedExplosiveRange||'—'))+'</p>':'')+
     (item.type==='item'&&item.category==='Itens Amaldiçoados'&&item.cursedKind==='Munições Amaldiçoadas'?'<p>'+esc(item.cursedAmmoType)+' · '+esc(item.cursedAmmoBonus)+'</p>':'')+
     (item.type==='item'&&item.category==='Itens Amaldiçoados'&&item.cursedKind==='Acessórios Amaldiçoados'?'<p>'+esc(item.cursedAccessoryType)+' · '+esc(item.cursedAccessoryBenefit)+'</p>':'')+
     (item.type==='item'&&item.customImprovements?.length?'<h4>Melhorias</h4><p>'+item.customImprovements.map(esc).join(' · ')+'</p>':'')+ritualDetails(item)+trailDetails(item);
   targetOptions();$('nex52Apply').hidden=(item.type==='melhoria'||item.type==='maldicao'||isThreatType(item.type));$('nex51Target').closest('label').hidden=item.type==='melhoria'||item.type==='maldicao'||isThreatType(item.type);const d=$('nex52Detail');if(typeof d.showModal==='function')d.showModal();else d.setAttribute('open','');
 }
 $('nex51Type').addEventListener('change',editorFields);
  $('nexHbBonusType').addEventListener('change',()=>{$('nexHbBonusSkillField').hidden=$('nexHbBonusType').value!=='pericia';});
  $('nexHbCurseTarget').addEventListener('change',()=>{
   // Trocar o alvo apenas altera os tipos permitidos; nenhum bônus é criado automaticamente.
   effectRows=[];
   effectEditing.main=null;
   renderEffects('main');
  });
  $('nexHbImprovementTarget').addEventListener('change',()=>{
   // A categoria nova começa sem bônus; somente o botão cria um bônus.
   improvementRows=[];
   effectEditing.improvement=null;
   renderEffects('improvement');
  });
 ['nexHbBonusValue','nexHbAccessoryBonus'].forEach(id=>$(id).addEventListener('input',e=>{let digits=e.target.value.replace(/\D/g,'').slice(0,2);if(Number(digits)>10)digits='10';e.target.value=digits?'+'+digits:'';}));
 $('nex53RitualType').addEventListener('change',()=>{
  // Alterar a categoria não cria bônus e descarta os bônus da categoria anterior.
  effectRows=[];
  effectEditing.main=null;
  toggleRitualDamageFields();
 });
 $('nex51Circle').addEventListener('change',()=>{
   const circle=Number($('nex51Circle').value);
   $('nex53DiscenteCircle').value=String(Math.min(4,circle+1));
   $('nex53VerdadeiroCircle').value=String(Math.min(4,circle+2));
 });
 $('nex53RitualImage').addEventListener('input',e=>{
   const src=e.target.value.trim();
   const preview=$('nex53RitualPreview');preview.hidden=!/^https:\/\//i.test(src);
   if(!preview.hidden)preview.src=src;
 });
 $('nex53RitualFile').addEventListener('change',e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>400000){
     message('Escolha PNG, JPG ou WebP com até 400 KB.');e.target.value='';return;
   }
   const reader=new FileReader();
   reader.onload=()=>{const preview=$('nex53RitualPreview');preview.src=String(reader.result||'');preview.hidden=false;$('nex53RitualImage').value='';message('Imagem carregada. Salve o ritual para manter a imagem.');};
   reader.readAsDataURL(file);
 });
 $('nexHbDescriptionToolbar').addEventListener('click',e=>{
   const button=e.target.closest('[data-hb-format]');if(!button)return;
   const box=$('nex51Description'),marker=button.dataset.hbFormat,start=box.selectionStart,end=box.selectionEnd;
   const selected=box.value.slice(start,end)||'texto';
   const replacement=marker+selected+marker;
   if(box.value.length+replacement.length-selected.length>2000)return;
   box.setRangeText(replacement,start,end,'select');box.focus();
 });
 $('nexHbImageUrl').addEventListener('input',e=>{
   const url=e.target.value.trim(),image=$('nexHbImagePreview');
   image.hidden=!/^https:\/\//i.test(url);if(!image.hidden)image.src=url;
 });
 $('nexHbImageFile').addEventListener('change',e=>{
   const file=e.target.files?.[0];if(!file)return;
   if(!['image/png','image/jpeg','image/webp'].includes(file.type)||file.size>400000){message('Escolha PNG, JPG ou WebP com até 400 KB.');e.target.value='';return;}
   const reader=new FileReader();
   reader.onload=()=>{const image=$('nexHbImagePreview');image.src=String(reader.result||'');image.hidden=false;$('nexHbImageUrl').value='';};
   reader.readAsDataURL(file);
 });
 $('nex52Add').addEventListener('click',()=>openEditor(null));
 $('nex52CloseEditor').addEventListener('click',closeEditor);
 $('nex52Cancel').addEventListener('click',closeEditor);
 $('nex52Close').addEventListener('click',closeDialog);
 $('nex52Detail').addEventListener('close',()=>{opened=null;});
 $('nex51Search').addEventListener('input',renderLibrary);
 $('nex53RitualFilter').addEventListener('click',e=>{const t=e.target.closest('[data-ritual-filter]');if(!t)return;ritualFilter=t.dataset.ritualFilter;renderLibrary();});
 $('nexHbParanormalNav').addEventListener('click',e=>{
   const section=e.target.closest('[data-nex-psection]'),kind=e.target.closest('[data-nex-ckind]');if(!section&&!kind)return;
   if(section)paranormalSection=section.dataset.nexPsection;
   if(kind)cursedKind=kind.dataset.nexCkind;
   $('nex51Search').value='';closeEditor();renderLibrary();
 });
 $('nexHbItemTabs').addEventListener('click',e=>{
   const button=e.target.closest('[data-nex-hb-item-tab]');if(!button)return;
   itemTab=button.dataset.nexHbItemTab;
   $('nex51Search').value='';closeEditor();renderLibrary();
 });
 mount.querySelector('.nex52-tabs').addEventListener('click',e=>{
   const btn=e.target.closest('[data-nex52-tab]');if(!btn)return;
   tab=btn.dataset.nex52Tab;ritualFilter='Todas';$('nex51Search').value='';closeEditor();renderLibrary();
 });
 $('nex53SkillTabs').addEventListener('click',e=>{
   const btn=e.target.closest('[data-nex53-skill]');
   if(!btn||!Object.hasOwn(SKILL_TABS,btn.dataset.nex53Skill))return;
   skillTab=btn.dataset.nex53Skill;$('nex51Search').value='';closeEditor();renderLibrary();
 });
 $('nex52ImprovementAdd').addEventListener('click',()=>{
   const input=$('nex52ImprovementName'),name=cut(input.value,80);
   if(!name){input.focus();return;}
   if(customItemImprovements.some(x=>x.toLocaleLowerCase('pt-BR')===name.toLocaleLowerCase('pt-BR'))){message('Esta melhoria já foi adicionada.');return;}
   if(customItemImprovements.length>=30){message('Limite de 30 melhorias homebrew por item.');return;}
   customItemImprovements.push(name);input.value='';renderItemImprovements();input.focus();
 });
 $('nex52ImprovementName').addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();$('nex52ImprovementAdd').click();}});
 $('nex52ImprovementList').addEventListener('click',e=>{
   const button=e.target.closest('[data-nex52-improvement-remove]');if(!button)return;
   const index=Number(button.dataset.nex52ImprovementRemove);
   if(Number.isInteger(index)&&index>=0&&index<customItemImprovements.length){customItemImprovements.splice(index,1);renderItemImprovements();}
 });
 // Desativa bloqueios silenciosos de validação em campos escondidos; o editor valida os campos ativos.
 $('nex51Form').noValidate=true;
 $('nex51Form').addEventListener('submit',e=>{
   e.preventDefault();
   try{const type=$('nex51Type').value,name=cut($('nex51Name').value,90);
   if(!Object.hasOwn(LABEL,type)||!name){message('Informe um nome e um tipo.');return;}
   const all=read(),editing=$('nex51Edit').value,old=all.find(x=>x.id===editing);
   if(editing&&!old){message('O conteúdo original não foi encontrado.');return;}
   const count=all.filter(x=>currentTypes().includes(x.type)&&(tab!=='paranormal'||paranormalSection==='maldicoes'||x.category==='Itens Amaldiçoados')).length;
   if(!editing&&count>=50){message('Limite de 50 homebrews para esta categoria.');return;}
   if(type==='trilha'&&TRAIL_NEX.some(n=>!cut($('nex53TrailName'+n).value,90))){message('Informe o nome das quatro habilidades da trilha: 10%, 40%, 65% e 99%.');return;}
    if((type==='trilha'&&!TRAIL_NEX.every(n=>effectsValid(getEffects(String(n)))))||(type!=='trilha'&&effectApplicable({type,ritualType:$('nex53RitualType').value,category:tab==='paranormal'?'Itens Amaldiçoados':$('nex52Category').value})&&!effectsValid(effectRows))){message('Escolha a perícia para todos os bônus de perícia.');return;}
    if(type==='item'&&isCursedEditor()&&cursedNoSkill()&&effectRows.some(b=>b.type==='pericia')){message('Armas, Munições e Proteções amaldiçoadas não podem ter bônus de perícia.');return;}
    if(type==='melhoria'&&IMPROVEMENT_NO_SKILL.includes($('nexHbImprovementTarget').value)&&improvementRows.some(b=>b.type==='pericia')){message('Armas, Munições e Proteções não podem ter bônus de perícia.');return;}
    if(type==='melhoria'&&!improvementRows.every(b=>BONUS_TYPES.some(([id])=>id===b.type))){message('Tipo de bônus inválido.');return;}
   if(type==='item'&&tab==='paranormal'&&cursedKind==='Acessórios Amaldiçoados'&&$('nexHbAccessoryBonus').value&&!/^\+(?:[1-9]|10)$/.test($('nexHbAccessoryBonus').value)){message('Digite um bônus no formato +1 até +10.');return;}
    if(type==='melhoria'&&!effectsValid(improvementRows)){message('Escolha a perícia beneficiada.');return;}
   if(type==='item'&&tab==='paranormal'&&cursedKind==='Acessórios Amaldiçoados'&&$('nexHbAccessoryBonus').value!==''&&!FALLBACK_SKILLS.includes($('nexHbAccessorySkill').value)){message('Selecione a perícia beneficiada.');return;}
   if(type==='maldicao'&&!cut($('nex51Description').value,2000)){message('Preencha a descrição da maldição.');return;}
   if(type==='melhoria'&&!cut($('nex51Description').value,2000)){message('Preencha a descrição da melhoria.');return;}
   if(type==='item'&&(tab==='paranormal'?cursedKind==='Armas Amaldiçoadas':itemTab==='Armas')&&(!$('nexHbWeaponDamage').value.trim()||!/^([1-9]|1\d|20)(?:[-–]20)?$/.test($('nexHbWeaponCritical').value.trim())||!/^\d+$/.test($('nexHbWeaponMultiplier').value.trim())||Number($('nexHbWeaponMultiplier').value)<1)){message('Confira dano, crítico e multiplicador da arma.');return;}
   if(type==='item'&&(tab==='paranormal'?cursedKind==='Proteções Amaldiçoadas':itemTab==='Proteções')&&(!/^\d+$/.test($('nexHbProtectionDefense').value)||Number($('nexHbProtectionDefense').value)>100)){message('Informe defesa válida entre 0 e 100.');return;}
   if(type==='item'&&!cut($('nex51Description').value,2000)){message('Preencha a descrição do item.');return;}
   if(type==='item'&&tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'&&$('nexHbTier').value==='0'){message('Escolha uma categoria entre I e IV.');return;}
    if(type==='item'&&(tab==='itens'&&itemTab==='Geral'||isCursedEditor()&&cursedKind==='Itens Paranormais')&&$('nexHbTag').value==='Explosivos'){
      if(!$('nexHbCursedExplosionDamage').value.trim()||!Number.isInteger(Number($('nexHbCursedExplosionMultiplier').value))||Number($('nexHbCursedExplosionMultiplier').value)<1||Number($('nexHbCursedExplosionMultiplier').value)>20){message('Confira o dano e o multiplicador do explosivo.');return;}
    }
   if(type==='item'&&(!['0','I','II','III','IV'].includes($('nexHbTier').value)||!/^\d+$/.test($('nexHbSpaces').value)||Number($('nexHbSpaces').value)>100)){message('Categoria ou espaços inválidos.');return;}
   if(type==='poder_paranormal' && !cut($('nex51Description').value,2000)){message('Preencha a descrição do poder paranormal.');return;}
   if(type==='ritual'&&['Dano','Cura'].includes($('nex53RitualType').value)&&(Number($('nex53DiscenteCircle').value)<Number($('nex51Circle').value)||Number($('nex53VerdadeiroCircle').value)<Number($('nex53DiscenteCircle').value))){message('O círculo Discente deve ser igual ou superior ao básico; o Verdadeiro não pode ser menor que o Discente.');return;}
   if(type==='origem'){
     const first=$('nex55Skill1').value,second=$('nex55Skill2').value,available=api()?.skillNames?.()||FALLBACK_SKILLS;
     if(!first||!second||first===second||!available.includes(first)||!available.includes(second)){
       message('Escolha duas perícias diferentes para a origem.');return;
     }
   }
   if(!editing&&all.length>=300){message('Limite total da biblioteca atingido.');return;}
   if(type==='item')$('nex52Category').value=tab==='paranormal'?'Itens Amaldiçoados':itemTab;
   const record=normalize({
     id:editing||'hb51_'+Date.now().toString(36)+'_'+Math.random().toString(36).slice(2,9),
     type,name,description:$('nex51Description').value,requirements:$('nex51Requirements').value,
     className:$('nex51Class').value,minNex:['trilha','origem','poder_geral','poder','habilidade'].includes(type)?(old?.minNex??(type==='trilha'?10:5)):$('nex51Nex').value,circle:$('nex51Circle').value,
     element:type==='maldicao'?$('nexHbCurseElement').value:type==='item'&&tab==='paranormal'?$('nexHbElement').value:type==='poder_paranormal'?$('nex53ParanormalElement').value:$('nex51Element').value,cost:($('nex51Cost')?.value||old?.cost||0),vd:$('nex52VD').value,
     ritualType:type==='ritual'?$('nex53RitualType').value:(old?.ritualType||'Suporte'),
     discenteCircle:type==='ritual'?$('nex53DiscenteCircle').value:old?.discenteCircle,
     verdadeiroCircle:type==='ritual'?$('nex53VerdadeiroCircle').value:old?.verdadeiroCircle,
     execution:type==='ritual'?$('nex53Execution').value:(old?.execution||'Padrão'),
     range:type==='ritual'?$('nex53Range').value:(old?.range||'Pessoal'),
     area:type==='ritual'?$('nex53Area').value:old?.area,
     target:type==='ritual'?$('nex53Target').value:old?.target,
     duration:type==='ritual'?$('nex53Duration').value:old?.duration,
     effect:type==='ritual'?$('nex53Effect').value:old?.effect,
     resistance:type==='ritual'?$('nex53Resistance').value:old?.resistance,
     ritualDice:type==='ritual'?$('nex53Dice').value:old?.ritualDice,
     discenteDice:type==='ritual'?$('nex53DiscenteDice').value:old?.discenteDice,
     verdadeiroDice:type==='ritual'?$('nex53VerdadeiroDice').value:old?.verdadeiroDice,
     image:isThreatType(type)?threatImage:type==='item'?($('nexHbImageUrl').value.trim()||(!$('nexHbImagePreview').hidden?$('nexHbImagePreview').src:'')||old?.image||''):type==='ritual'?($('nex53RitualFile').files.length?(! $('nex53RitualPreview').hidden ?$('nex53RitualPreview').src:''):($('nex53RitualImage').value||(! $('nex53RitualPreview').hidden?$('nex53RitualPreview').src:''))):(old?.image||''),
     size:$('nex52Size').value,creatureType:$('nex52CreatureType').value,category:$('nex52Category').value,
     threatSheet:isThreatType(type)?readThreatSheet():(old?.threatSheet||undefined),
     cursedKind:type==='item'&&tab==='paranormal'?cursedKind:(old?.cursedKind||'Itens Paranormais'),
     paranormalActivation:old?.paranormalActivation||'',
     paranormalEffect:old?.paranormalEffect||'',
     cursedAmmoType:type==='item'&&tab==='paranormal'?$('nexHbCursedAmmoType').value:(old?.cursedAmmoType||'Balas curtas'),
     cursedAmmoBonus:type==='item'&&tab==='paranormal'?$('nexHbCursedAmmoBonus').value:(old?.cursedAmmoBonus||''),
     cursedAccessoryType:type==='item'&&tab==='paranormal'?$('nexHbCursedAccessoryType').value:(old?.cursedAccessoryType||'Anel'),
     cursedAccessoryBenefit:type==='item'&&tab==='paranormal'?$('nexHbCursedAccessoryBenefit').value:(old?.cursedAccessoryBenefit||''),
     accessoryBonus:type==='item'&&tab==='paranormal'?Number($('nexHbAccessoryBonus').value.slice(1)):(old?.accessoryBonus??0),
     accessorySkill:type==='item'&&tab==='paranormal'?$('nexHbAccessorySkill').value:(old?.accessorySkill||''),
     cursedArtifactRequirement:type==='item'&&tab==='paranormal'?$('nexHbCursedArtifactRequirement').value:(old?.cursedArtifactRequirement||''),
     curseTarget:type==='maldicao'?$('nexHbCurseTarget').value:(old?.curseTarget||'Armas'),
     improvementTarget:type==='melhoria'?$('nexHbImprovementTarget').value:(old?.improvementTarget||'Armas'),
     bonusType:type==='melhoria'?(improvementRows[0]?.type||'ataque'):(old?.bonusType||'ataque'),
     bonusValue:type==='melhoria'?(improvementRows[0]?.value||0):(old?.bonusValue??0),
     bonusSkill:type==='melhoria'?(improvementRows[0]?.skill||''):(old?.bonusSkill||''),
     improvementBonuses:type==='melhoria'?improvementRows:(old?.improvementBonuses||[]),
     effectBonusType:'',
     effectBonusValue:0,
     effectBonuses:type!=='trilha'&&effectApplicable({type,ritualType:$('nex53RitualType').value,category:tab==='paranormal'?'Itens Amaldiçoados':$('nex52Category').value})?effectRows:(old?.effectBonuses||[]),
     protectionDefense:type==='item'&&(tab==='paranormal'&&cursedKind==='Proteções Amaldiçoadas'||itemTab==='Proteções'&&tab!=='paranormal')?Number($('nexHbProtectionDefense').value):(old?.protectionDefense??1),
     weaponProficiency:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponProficiency').value:(old?.weaponProficiency||'Armas Simples'),
     weaponKind:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponKind').value:(old?.weaponKind||'Corpo a Corpo'),
     weaponWield:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponWield').value:(old?.weaponWield||'Uma Mão'),
     weaponDamage:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponDamage').value:(old?.weaponDamage||''),
     weaponSecondary:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponSecondary').value:(old?.weaponSecondary||''),
     weaponSecondaryType:type==='item'&&tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'?$('nexHbElement').value:type==='item'&&itemTab==='Armas'&&tab!=='paranormal'?$('nexHbWeaponSecondaryType').value:(old?.weaponSecondaryType||'Normal'),
     weaponCritical:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponCritical').value:(old?.weaponCritical||'20'),
     weaponMultiplier:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponMultiplier').value:(old?.weaponMultiplier||'2'),
     weaponDamageType:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponDamageType').value:(old?.weaponDamageType||'Corte'),
     weaponRange:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponRange').value:(old?.weaponRange||'—'),
     weaponQuantity:type==='item'&&(tab==='paranormal'&&cursedKind==='Armas Amaldiçoadas'||itemTab==='Armas'&&tab!=='paranormal')?$('nexHbWeaponQuantity').value:(old?.weaponQuantity??1),
     itemTier:type==='item'?$('nexHbTier').value:(old?.itemTier||'0'),
     itemSpaces:type==='item'?$('nexHbSpaces').value:(old?.itemSpaces??1),
      itemTag:type==='item'&&(tab==='paranormal'||itemTab==='Geral')?$('nexHbTag').value:(old?.itemTag||'Acessórios'),
      cursedExplosiveDamage:type==='item'&&(tab==='paranormal'||itemTab==='Geral')?$('nexHbCursedExplosionDamage').value:(old?.cursedExplosiveDamage||''),
      cursedExplosiveSecondary:type==='item'&&(tab==='paranormal'||itemTab==='Geral')?$('nexHbCursedExplosionSecondary').value:(old?.cursedExplosiveSecondary||''),
      cursedExplosiveSecondaryType:type==='item'&&(tab==='paranormal'||itemTab==='Geral')?(tab==='paranormal'?$('nexHbCursedExplosionType').value:'Normal'):(old?.cursedExplosiveSecondaryType||'Normal'),
      cursedExplosiveMultiplier:type==='item'&&(tab==='paranormal'||itemTab==='Geral')?$('nexHbCursedExplosionMultiplier').value:(old?.cursedExplosiveMultiplier||'2'),
      cursedExplosiveRange:type==='item'&&(tab==='paranormal'||itemTab==='Geral')?$('nexHbCursedExplosionRange').value:(old?.cursedExplosiveRange||''),
     customImprovements:type==='item'?customItemImprovements:(old?.customImprovements||[]),
     trailAbilities:type==='trilha'?TRAIL_NEX.map(n=>({nex:n,name:$('nex53TrailName'+n).value,description:$('nex53TrailDescription'+n).value,bonusType:'',bonusValue:0,bonuses:getEffects(String(n))})):(old?.trailAbilities||[]),
     skills:type==='origem'?[$('nex55Skill1').value,$('nex55Skill2').value]:(old?.skills||[])
   });
   const group=record.type==='maldicao'||record.type==='item'&&record.category==='Itens Amaldiçoados'?'paranormal':Object.keys(TABS).find(key=>TABS[key].includes(record.type))||tab;
   if(!editing&&group!==tab){message('Selecione a categoria correta antes de salvar.');return;}
   try{
     write(editing?all.map(x=>x.id===editing?record:x):[record,...all]);
     tab=group;
     if(group==='paranormal'){paranormalSection=record.type==='maldicao'?'maldicoes':'itens';cursedKind=record.cursedKind||'Itens Paranormais';}
     if(group==='habilidades'){const category=Object.keys(SKILL_TABS).find(k=>SKILL_TABS[k].includes(record.type));if(category)skillTab=category;}
     closeEditor();renderLibrary();
     if(record.type==='origem')document.dispatchEvent(new Event('nex-advanced-homebrew-library-changed'));
     message(editing?'Homebrew atualizado. Fichas já associadas continuam com a versão anterior.':'Homebrew salvo!');
   }catch(error){console.error(error);message('Falha ao salvar o homebrew neste dispositivo.');}
   }catch(error){
     console.error('NEX: falha ao processar salvamento de homebrew',error);
     message('Não foi possível salvar: '+String(error?.message||error));
   }
 });
 $('nex51List').addEventListener('click',e=>{
   const btn=e.target.closest('button');if(!btn)return;
   const id=btn.dataset.nex52Settings||btn.dataset.nex52Edit||btn.dataset.nex52Delete||btn.dataset.nex52View;
   if(!id)return;const item=read().find(x=>x.id===id);if(!item)return;
   if(btn.dataset.nex52Settings){
     const menu=mount.querySelector('[data-nex52-menu="'+id+'"]');
     const show=menu?.hidden;mount.querySelectorAll('.nex52-settings').forEach(x=>x.hidden=true);
     mount.querySelectorAll('[data-nex52-settings]').forEach(x=>x.setAttribute('aria-expanded','false'));
     if(menu){menu.hidden=!show;btn.setAttribute('aria-expanded',String(show));}
     return;
   }
   if(btn.dataset.nex52Edit){if(item.type==='maldicao'){tab='paranormal';paranormalSection='maldicoes';}else if(item.type==='item'&&item.category==='Itens Amaldiçoados'){tab='paranormal';paranormalSection='itens';cursedKind=item.cursedKind||'Itens Paranormais';}else if(item.type==='item')itemTab=canonicalCategory(item.category);openEditor(item);return;}
   if(btn.dataset.nex52Delete){
     if(!confirm('Excluir "'+item.name+'" da biblioteca? As fichas que já receberam este conteúdo não serão alteradas.'))return;
     try{markDeletedId(id);write(read().filter(x=>x.id!==id));if(read().some(x=>x.id===id))throw Error('Ameaça ainda presente após a exclusão');renderLibrary();if(item.type==='origem')document.dispatchEvent(new Event('nex-advanced-homebrew-library-changed'));message('Homebrew excluído da biblioteca.');}
     catch(error){console.error(error);message('Falha ao salvar a exclusão.');}
     return;
   }
   if(btn.dataset.nex52View)view(item);
 });
 $('nex52Apply').addEventListener('click',()=>{
   const item=read().find(x=>x.id===opened),agentId=$('nex51Target').value;
   if(!item||!agentId){message('Selecione um personagem antes de adicionar.');return;}
   try{
     const result=api().attach(agentId,item);closeDialog();renderSheet();
     message(result?'Homebrew adicionado à ficha escolhida.':'Esse homebrew já está na ficha.');
   }catch(error){console.error(error);message('Falha ao adicionar homebrew: '+String(error.message||error));}
 });
 sheet.addEventListener('click',e=>{
   const b=e.target.closest('[data-nex52-detach]');if(!b)return;
   if(!confirm('Remover esse homebrew da ficha atual?'))return;
   try{api().detach(b.dataset.nex52Detach);renderSheet();message('Homebrew removido da ficha.');}
   catch(error){console.error(error);message('Não foi possível remover o homebrew.');}
 });
 window.NEX51={renderLibrary,renderSheet,readLibrary:read,
  importHomebrews:(items,shareId,authorUid)=>{
   if(!Array.isArray(items)||!items.length||items.length>20||typeof shareId!=='string')throw Error('Pacote inválido');
   const current=read(),next=current.slice(),deleted=readDeletedIds(),added=[];
   for(const incoming of items){
    if(!incoming||!valid(incoming))throw Error('Homebrew compartilhado inválido');
    if(current.some(x=>x.originShareId===shareId&&x.originItemId===incoming.id))continue;
    let newId='';
    do{newId='hb_'+crypto.randomUUID().replace(/-/g,'');}while(deleted.has(newId)||next.some(x=>x.id===newId));
    const copy=normalize({...incoming,id:newId,originShareId:shareId,originItemId:incoming.id,originalCreatorUid:incoming.originalCreatorUid||authorUid||''});
    next.push(copy);added.push(copy);
   }
   if(added.length){
    write(next);
    renderLibrary();
    document.dispatchEvent(new Event('nex-advanced-homebrew-library-changed'));
    window.dispatchEvent(new Event('nex-auto-local-change'));
   }
   return {added:added.length,skipped:items.length-added.length};
  }
 };
 document.addEventListener('nex51-ready',renderLibrary);
 resetForm();renderLibrary();
})();