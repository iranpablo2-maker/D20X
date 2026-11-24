/* NEX: tema de cores local, sem alterar imagens/mapas ou elementos de rituais. */
(function(){
 'use strict';
 if(window.NEX_APPEARANCE_READY)return;
 window.NEX_APPEARANCE_READY=true;
 const KEY='nex_appearance_color_v1';
 const options={
  vermelho:'#c52e38',azul:'#3987db',verde:'#3bab79',
  roxo:'#9a58d2',laranja:'#dd8732',rosa:'#da568c'
 };
 const validHex=value=>/^#[\da-f]{6}$/i.test(String(value||''));
 const presets=Object.entries(options);
 function read(){
  try{const raw=localStorage.getItem(KEY);return raw&&validHex(raw)?raw.toLowerCase():options.vermelho;}
  catch{return options.vermelho;}
 }
 let selected=read();
 function apply(value,persist){
  if(!validHex(value))return;
  selected=value.toLowerCase();
  const root=document.documentElement;
  root.style.setProperty('--nex-theme-choice',selected);
  root.style.setProperty('--nex-theme-light','color-mix(in srgb, '+selected+' 72%, white)');
  root.style.setProperty('--nex-theme-dark','color-mix(in srgb, '+selected+' 36%, #111)');
  root.style.setProperty('--accent','var(--nex-theme-light)');
  root.style.setProperty('--red',selected);
  root.dataset.nexCustomTheme=(selected===options.vermelho?'default':'custom');
  const meta=document.querySelector('meta[name="theme-color"]');
  if(meta)meta.content='#0b0b0e';
  if(persist)try{localStorage.setItem(KEY,selected);}catch{}
  const color=document.getElementById('nexThemeCustom');
  if(color)color.value=selected;
  document.querySelectorAll('[data-nex-palette-color]').forEach(b=>{
    b.setAttribute('aria-pressed',String(b.dataset.nexPaletteColor===selected));
  });
 }
 const css=document.createElement('style');
 css.id='nex-appearance-styles';
 css.textContent=`
 /* Tema não interfere em imagens do mapa, tokens ou fundos elementais. */
 html[data-nex-custom-theme="custom"] .topbar,
 html[data-nex-custom-theme="custom"] #room .room-hero{border-bottom-color:var(--nex-theme-choice)!important}
 html[data-nex-custom-theme="custom"] .btn.primary,
 html[data-nex-custom-theme="custom"] .wizard-choose,
 html[data-nex-custom-theme="custom"] #nexAccountOpen,
 html[data-nex-custom-theme="custom"] .n17-menu-button[aria-expanded="true"],
 html[data-nex-custom-theme="custom"] #roomTabletopPanel #nexVttMainMenu .nex-vtt-main-tabs button[aria-pressed="true"]{
  background:var(--nex-theme-dark)!important;border-color:var(--nex-theme-choice)!important;color:#fff!important
 }
 html[data-nex-custom-theme="custom"] :is(.home-tile,.home-agent,.btn):hover{border-color:var(--nex-theme-choice)!important}
 html[data-nex-custom-theme="custom"] :is(.brand-mark,.home-tile .symbol){color:var(--nex-theme-light)!important;border-color:var(--nex-theme-choice)!important}
 html[data-nex-custom-theme="custom"] #roomTabletopPanel .nex-vtt-main-tabs,
 html[data-nex-custom-theme="custom"] #roomTabletopPanel .nex-vtt-sidebar{
  border-color:var(--nex-theme-choice)!important
 }
 html[data-nex-custom-theme="custom"] #roomTabletopPanel #nexVttBar button[aria-pressed="true"]{
  box-shadow:inset 0 0 0 1px var(--nex-theme-choice)!important
 }
 #nexThemeOpen{
  display:inline-flex;align-items:center;justify-content:center;gap:6px;
  min-height:36px;padding:6px 11px;border:1px solid #6f4048;border-radius:7px;
  background:#21171b;color:#fff;cursor:pointer;white-space:nowrap;font-weight:650
 }
 #nexThemeOpen:hover{border-color:var(--nex-theme-choice,#c52e38)}
 #nexThemeDialog{
  width:min(94vw,420px);max-height:86vh;overflow:auto;box-sizing:border-box;
  padding:20px;background:#131316;color:#f6f3f5;border:1px solid #63434c;
  border-radius:12px;box-shadow:0 18px 60px #000b
 }
 #nexThemeDialog::backdrop{background:#000c}
 #nexThemeDialog header{display:flex;justify-content:space-between;align-items:center;gap:12px}
 #nexThemeDialog h2{font-size:19px;margin:0}
 #nexThemeDialog .nex-theme-close{background:transparent;color:white;border:0;font-size:26px;cursor:pointer}
 #nexThemeDialog p{font-size:12px;line-height:1.5;color:#c4b8c0;margin:11px 0 16px}
 #nexThemeDialog .nex-theme-swatches{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:9px}
 #nexThemeDialog [data-nex-palette-color]{
  color:white;background:#211f24;border:1px solid #55434a;border-radius:8px;
  padding:10px 5px;min-height:76px;display:flex;flex-direction:column;align-items:center;gap:7px;cursor:pointer
 }
 #nexThemeDialog .nex-theme-dot{height:29px;width:29px;border-radius:50%;background:var(--swatch);border:2px solid #fff8}
 #nexThemeDialog [aria-pressed="true"]{outline:2px solid var(--nex-theme-choice,#c52e38);outline-offset:1px}
 #nexThemeDialog .nex-theme-custom{display:flex;align-items:center;justify-content:space-between;gap:10px;margin-top:18px}
 #nexThemeDialog input[type="color"]{width:60px;height:40px;cursor:pointer;background:#1c1b20;border:1px solid #67616b;border-radius:6px}
 #nexThemeDialog .nex-theme-reset{margin-top:16px;min-height:36px;padding:7px 12px;background:#211c20;border:1px solid #75636a;color:white;border-radius:7px;cursor:pointer}
 @media(max-width:650px){#nexThemeOpen{padding:7px 9px;font-size:12px}#nexThemeDialog{padding:16px}}
 `;
 document.head.append(css);
 apply(selected,false);
 function init(){
  if(document.getElementById('nexThemeOpen'))return;
  const actions=document.querySelector('.topinner .actions');
  if(!actions)return; // A mesa embutida não possui cabeçalho: recebe apenas as cores.
  const open=document.createElement('button');
  open.type='button';open.id='nexThemeOpen';open.textContent='🎨 Cores';
  open.title='Personalizar cor do NEX';
  const account=document.getElementById('nexAccountOpen');
  if(account&&account.parentElement===actions)actions.insertBefore(open,account);
  else actions.append(open);
  const dialog=document.createElement('dialog');dialog.id='nexThemeDialog';
  const header=document.createElement('header');
  const title=document.createElement('h2');title.textContent='Aparência do NEX';
  const close=document.createElement('button');close.type='button';close.className='nex-theme-close';
  close.textContent='×';close.setAttribute('aria-label','Fechar');
  header.append(title,close);
  const description=document.createElement('p');
  description.textContent='Escolha a cor dos destaques e botões do site. Os símbolos e os fundos dos rituais não mudam.';
  const swatches=document.createElement('div');swatches.className='nex-theme-swatches';
  for(const [name,color] of presets){
   const b=document.createElement('button');b.type='button';b.dataset.nexPaletteColor=color;b.setAttribute('aria-label','Tema '+name);
   const dot=document.createElement('span');dot.className='nex-theme-dot';dot.style.setProperty('--swatch',color);
   const label=document.createElement('span');label.textContent=name[0].toUpperCase()+name.slice(1);
   b.append(dot,label);b.onclick=()=>apply(color,true);swatches.append(b);
  }
  const custom=document.createElement('label');custom.className='nex-theme-custom';
  custom.textContent='Escolher outra cor';
  const picker=document.createElement('input');picker.type='color';picker.id='nexThemeCustom';
  picker.value=selected;picker.oninput=()=>apply(picker.value,true);
  custom.append(picker);
  const reset=document.createElement('button');reset.type='button';reset.className='nex-theme-reset';reset.textContent='Restaurar vermelho original';reset.onclick=()=>apply(options.vermelho,true);
  dialog.append(header,description,swatches,custom,reset);
  document.body.append(dialog);
  open.onclick=()=>{apply(selected,false);if(!dialog.open)dialog.showModal();};
  close.onclick=()=>dialog.close();
  apply(selected,false);
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
 else init();
 window.addEventListener('storage',event=>{if(event.key===KEY)apply(read(),false);});
 window.NEX_SET_APPEARANCE_COLOR=value=>apply(value,true);
})();
