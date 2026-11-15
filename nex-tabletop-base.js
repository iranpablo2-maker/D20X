/* NEX Tabletop — base: mapa, grade, tokens, variantes 0-9 e sincronização. */
export function mountNexTabletop({db,doc,onSnapshot,setDoc,campaignId,gm}){
 const $=id=>document.getElementById(id),board=$('nexTabletopBoard'),tools=$('nexTabletopTools'),status=$('nexTabletopMessage');
 if(!board||!tools)return ()=>{};
 const ref=doc(db,'campaigns',campaignId,'tabletop','state');
 const GRID=48,W=25,H=25;
 board.style.width=(GRID*W)+'px';board.style.height=(GRID*H)+'px';
 const empty=()=>({map:'',tokens:[],drawings:[],fogEnabled:false,revealed:[],gridVisible:true,turns:[]});
 let scene=empty(),selectedId=null,drag=null,remoteReady=false,pending=false,queued=false,disposed=false;
 const handlers=[];
 const listen=(el,type,fn,opts)=>{el?.addEventListener(type,fn,opts);handlers.push(()=>el?.removeEventListener(type,fn,opts));};
 const message=t=>{status.textContent=t;status.classList.toggle('vtt-silent-status',/^Mesa (pronta|sincronizada|salva)/.test(t));};
 const selected=()=>scene.tokens.find(t=>t.id===selectedId);
 const isTyping=e=>e.target?.closest?.('input,textarea,select,[contenteditable="true"]');
 tools.hidden=!gm;
 $('nexTabletopRole').textContent=gm?'Mestre':'Jogador';
 const control=document.createElement('div');control.id='nexTtVariants';
 control.innerHTML='<label>Token selecionado <strong id="nexTtSelected">Nenhum</strong></label><label>Variação <select id="nexTtSlot"></select></label><label>Imagem/GIF da variação <input id="nexTtVariantFile" type="file" accept="image/png,image/jpeg,image/webp,image/gif"></label><button id="nexTtDelete" type="button" class="alt">Excluir token</button>';
 control.className='nex-tabletop-tools';control.hidden=!gm;
 tools.insertAdjacentElement('afterend',control);

 const css=document.createElement('style');css.textContent='#nexTabletopTools[hidden],#nexTtVariants[hidden]{display:none!important}#nexTtVariants{border:1px solid #4e2f38;border-radius:8px;padding:9px;margin:8px 0}#nexTtVariants select{background:#1a1317;color:white;border:1px solid #6c3b49;border-radius:5px;padding:8px;min-width:130px}#nexTabletopBoard .nex-tabletop-token[data-selected="true"]{outline:3px solid #ffbd6d;outline-offset:3px}#nexTabletopBoard .nex-tabletop-token img{width:100%;height:100%;object-fit:cover;border-radius:50%;pointer-events:none}';document.head.append(css);
 const slot=$('nexTtSlot');for(let k=0;k<10;k++){const o=document.createElement('option');o.value=k;o.textContent=k===0?'0 · Especial':k+' · Variação';slot.append(o);}
 const stateOK=value=>value&&typeof value==='object'&&Array.isArray(value.tokens);
 function validScene(data){
  if(!stateOK(data))return empty();
  return {map:typeof data.map==='string'&&data.map.length<650000?data.map:'',drawings:Array.isArray(data.drawings)?data.drawings.slice(-160):[],fogEnabled:!!data.fogEnabled,revealed:Array.isArray(data.revealed)?data.revealed.slice(-150):[],gridVisible:data.gridVisible!==false,turns:Array.isArray(data.turns)?data.turns.slice(0,90).map(x=>String(x).slice(0,35)):[],tokens:data.tokens.slice(0,90).filter(t=>t&&typeof t.id==='string'&&typeof t.name==='string').map(t=>({
   id:t.id.slice(0,100),name:t.name.slice(0,35),x:Math.max(0,Math.min(W-1,Math.floor(Number(t.x)||0))),y:Math.max(0,Math.min(H-1,Math.floor(Number(t.y)||0))),
   variation:Math.max(0,Math.min(9,Math.floor(Number(t.variation)||0))),
   images:Array.isArray(t.images)?t.images.slice(0,10).map(url=>typeof url==='string'&&url.length<300000?url:''):[],pv:Number(t.pv)||0,pe:Number(t.pe)||0,san:Number(t.san)||0,size:Math.max(1,Math.min(3,Number(t.size)||1)),rotation:Number(t.rotation)||0,hidden:!!t.hidden,locked:!!t.locked
  }))};
 }
 function render(){
  if(disposed)return;
  board.querySelectorAll('.nex-tabletop-token').forEach(n=>n.remove());
  board.style.backgroundImage=scene.map?'url("'+scene.map.replace(/"/g,'')+'")':'none';
  for(const t of scene.tokens){
   if(t.hidden&&!gm)continue;
   const el=document.createElement('button');el.type='button';el.className='nex-tabletop-token';el.dataset.token=t.id;el.dataset.master=String(gm);el.dataset.selected=String(t.id===selectedId);
   el.style.left=(t.x*GRID+4)+'px';el.style.top=(t.y*GRID+4)+'px';el.style.width=((t.size||1)*GRID-8)+'px';el.style.height=((t.size||1)*GRID-8)+'px';el.style.transform='rotate('+t.rotation+'deg)';el.title=t.name+' · Variação '+t.variation;el.setAttribute('aria-label',el.title);
   const img=t.images[t.variation]||'';
   if(img){const image=document.createElement('img');image.src=img;image.alt=t.name;el.appendChild(image);}
   else{const span=document.createElement('span');span.textContent=t.name.slice(0,3).toUpperCase();el.appendChild(span);}
   board.appendChild(el);
  }
  renderAdvanced();
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
  const t={id:'tt_'+crypto.randomUUID(),name,x,y,variation:1,images:[],size:1,rotation:0,pv:0,pe:0,san:0,hidden:false,locked:false};scene.tokens.push(t);selectedId=t.id;$('nexTabletopTokenName').value='';render();save();
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
  if(!gm||selected()?.locked||vttMode!=='select')return;
  drag={id:selectedId,pointer:e.pointerId,startX:selected().x,startY:selected().y};e.preventDefault();
 });
 listen(document,'pointermove',e=>{
  if(!gm||!drag||drag.pointer!==e.pointerId)return;
  const rect=board.getBoundingClientRect(),t=scene.tokens.find(t=>t.id===drag.id);if(!t)return;
  t.x=Math.max(0,Math.min(W-(t.size||1),Math.floor((e.clientX-rect.left)/(GRID*vttZoom))));t.y=Math.max(0,Math.min(H-(t.size||1),Math.floor((e.clientY-rect.top)/(GRID*vttZoom))));render();
 });
 listen(document,'pointerup',e=>{if(!drag||drag.pointer!==e.pointerId)return;
  const token=scene.tokens.find(t=>t.id===drag.id);
  if(token&&vttMeasureMovement){const squares=Math.hypot(token.x-drag.startX,token.y-drag.startY);vttLog.hidden=false;vttLog.textContent=token.name+': '+squares.toFixed(1)+' quadrados';}
  drag=null;save();
 });
 listen(document,'pointercancel',()=>{if(drag){drag=null;save();}});
 listen(document,'keydown',e=>{
  if(!gm||!selectedId||isTyping(e)||e.altKey||e.ctrlKey||e.metaKey||!(/^[0-9]$/).test(e.key))return;
  const t=selected();if(!t)return;t.variation=Number(e.key);render();save();e.preventDefault();
 });

 // Expanded Roll20-inspired VTT toolbar; all shared changes use the existing campaign document.
 let vttMode='select',vttZoom=.45,vttDraft=null,vttPan=null,vttColor='#3157f5',vttStroke=3,vttTransparent=true,vttFont='Arial',vttFontSize=26,vttTextBold=false,vttTextItalic=false,vttTextBg='#ffffff',vttMeasureShape='line',vttMeasureSnap=true,vttMeasurePersistent=false,vttMeasureMovement=false,vttMeasurePublic=false,vttManualZoom=false,vttTokenInspectorOpen=false;
 const vttBar=document.createElement('nav');vttBar.id='nexVttBar';vttBar.setAttribute('aria-label','Ferramentas da mesa');
 const vttOptions=document.createElement('div');vttOptions.id='nexVttOptions';vttOptions.hidden=true;
 const vttSide=document.createElement('div');vttSide.id='nexVttTokenProperties';vttSide.hidden=true;
 const vttWrap=board.closest('.nex-tabletop-wrap');
 const vttStyle=document.createElement('style');
 vttStyle.id='nex-vtt-layer-style';
 vttStyle.textContent='#nexVttDrawLayer,#nexVttMeasureLayer{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}'+
 '#nexVttDrawLayer{z-index:1}#nexVttMeasureLayer{z-index:4}'+
 '#nexVttFogLayer{position:absolute;inset:0;z-index:4;pointer-events:none;background:rgba(0,0,0,.9)}'+
 '#nexVttFogLayer[hidden]{display:none!important}.nex-vtt-hide-grid::before{display:none!important}';
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
 const vttStage=board.closest('.nex-vtt-stage');
 vttStage?.append(vttOptions,vttSide);
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
   vttOpen('turn');
 });

 vttRight?.prepend(vttTabs);
 const vttRoomTag=document.createElement('div');vttRoomTag.className='nex-vtt-room-tag';
 vttRoomTag.textContent='NEX · '+(document.getElementById('nexVttCampaignName')?.textContent||'Campanha');
 vttRight?.insertBefore(vttRoomTag,vttRight.querySelector('.nex-vtt-sheets-title'));
 const vttSVG=(id)=>{const node=document.createElementNS('http://www.w3.org/2000/svg','svg');node.id=id;node.setAttribute('viewBox','0 0 '+(GRID*W)+' '+(GRID*H));board.append(node);return node;};
 const vttLayer=vttSVG('nexVttDrawLayer'),vttMeasure=vttSVG('nexVttMeasureLayer');
 const vttFog=document.createElement('div');vttFog.id='nexVttFogLayer';vttFog.hidden=true;board.append(vttFog);
 const vttLog=document.createElement('div');vttLog.style.cssText='position:absolute;bottom:6px;right:6px;background:#171015ee;color:#fff;z-index:8;padding:8px;border-radius:5px;pointer-events:none;font-size:12px';vttLog.hidden=true;board.append(vttLog);
 const vttButtons=new Map();
 function vttButton(label,title,callback,disabled=false){const b=document.createElement('button');b.type='button';b.textContent=label;b.title=title;b.setAttribute('aria-label',title);b.disabled=disabled;b.addEventListener('click',callback);vttBar.append(b);return b;}
 function vttSetMode(mode){vttMode=mode;for(const [key,button] of vttButtons)button.setAttribute('aria-pressed',String(key===mode));if(drawToggle)drawToggle.setAttribute('aria-pressed',String(drawingModes.has(mode)));vttOptions.hidden=true;board.style.cursor=mode==='select'?'default':mode==='pan'?'grab':'crosshair';}
 vttButton('☰','Abrir ou recolher o painel de fichas',()=>document.getElementById('nexVttSheetsToggle')?.click());
 for(const [mode,symbol,title] of [['select','➤','Selecionar'],['pan','✋','Mover mapa'],['text','T','Texto'],['measure','⌁','Medir distância'],['marker','⌖','Marcador'],['fog','◐','Revelar névoa']]){
   vttButtons.set(mode,vttButton(symbol,title,()=>{vttSetMode(mode);if(mode==='text')vttOpen('text');if(mode==='measure')vttOpen('measure');},!gm&&!['select','pan','measure'].includes(mode)));
 }
 drawToggle=vttButton('✎','Desenhar: abrir ferramentas',()=>{drawMenuRefresh();showDrawMenu();},!gm);
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
 vttZoomRail.append(vttZoomFit,vttZoomPlus,vttZoomSlider,vttZoomText,vttZoomMinus);
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
 vttButton('≡','Iniciativa',()=>vttOpen('turn'));
 vttButton('↶','Desfazer desenho',()=>{if(!gm)return;scene.drawings.pop();render();save();},!gm);
 vttButton('✕','Limpar desenhos',()=>{if(!gm||!confirm('Apagar todos os desenhos?'))return;scene.drawings=[];render();save();},!gm);
 vttButton('↩','Voltar à campanha',()=>document.getElementById('nexVttExit')?.click());
 function vttChangeZoom(d){
   vttZoom=Math.min(2,Math.max(.25,Math.round((vttZoom+d)*100)/100));
   board.style.zoom=String(vttZoom);
   vttZoomText.textContent=Math.round(vttZoom*100)+'%';
   vttZoomSlider.value=String(Math.round(vttZoom*100));
 }
 function vttFitZoom(){
   if(vttManualZoom)return;
   const width=vttWrap.clientWidth, height=vttWrap.clientHeight;
   if(width<150||height<150)return;
   const fits=Math.min((width-90)/(GRID*W),(height-45)/(GRID*H));
   vttChangeZoom(Math.max(.25,Math.min(1.5,Math.floor(fits*100)/100))-vttZoom);
 }
 const vttResizeObserver=typeof ResizeObserver==='function'?new ResizeObserver(()=>vttFitZoom()):null;
 vttResizeObserver?.observe(vttWrap);
 vttChangeZoom(0);vttSetMode('select');
 requestAnimationFrame(()=>vttFitZoom());
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
   const close=document.createElement('button');close.type='button';close.textContent='Fechar ×';close.addEventListener('click',()=>{vttTokenInspectorOpen=false;vttSide.hidden=true;});vttSide.append(close);
   for(const [prop,label,type] of [['name','Nome','text'],['pv','PV','number'],['pe','PE','number'],['san','SAN','number'],['size','Tamanho (1-3)','number'],['rotation','Rotação','number'],['hidden','Oculto aos jogadores','checkbox'],['locked','Bloquear posição','checkbox']]){
     const row=document.createElement('label');row.textContent=label;
     const inp=document.createElement('input');inp.type=type;if(type==='checkbox')inp.checked=!!t[prop];else inp.value=String(t[prop]??'');
     inp.addEventListener('change',()=>{t[prop]=type==='checkbox'?inp.checked:type==='number'?Number(inp.value)||0:inp.value.slice(0,35);render();save();});
     row.append(inp);vttSide.append(row);
   }
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
 const vttPoint=e=>{const a=board.getBoundingClientRect();return {x:Math.max(0,Math.min(GRID*W,Math.round((e.clientX-a.left)/vttZoom))),y:Math.max(0,Math.min(GRID*H,Math.round((e.clientY-a.top)/vttZoom))) };};
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

 const unsubscribe=onSnapshot(ref,snapshot=>{
  if(disposed||drag||pending)return;
  const data=snapshot.data();if(data)scene=validScene(data);
  remoteReady=true;render();message(gm?'Mesa pronta para editar.':'Mesa sincronizada com o mestre.');
 },error=>{message('Tabletop disponível nesta sessão. Para sincronização online, atualize as regras do Firestore.');console.warn('NEX Tabletop',error);remoteReady=true;render();});
 render();
 return ()=>{disposed=true;unsubscribe();handlers.forEach(fn=>fn());control.remove();css.remove();vttResizeObserver?.disconnect();drawMenu.remove();vttTabs.remove();vttRoomTag.remove();vttBar.remove();vttZoomRail.remove();vttOptions.remove();vttSide.remove();vttStyle.remove();vttLayer.remove();vttMeasure.remove();vttFog.remove();vttLog.remove();};
}
