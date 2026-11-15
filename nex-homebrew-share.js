/* NEX Homebrews: compartilhamento independente. */
import {initializeApp,getApps} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-app.js';
import {getAuth} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-auth.js';
import {getFirestore,doc,getDoc,setDoc,updateDoc,serverTimestamp} from 'https://www.gstatic.com/firebasejs/12.4.0/firebase-firestore.js';
(() => {
 'use strict';
 const mount=document.getElementById('nex51AdvancedMount'),cfg=window.NEX_FIREBASE_CONFIG;
 if(!mount||!cfg)return;
 const app=getApps().find(x=>x.name==='[DEFAULT]')||initializeApp(cfg),auth=getAuth(app),db=getFirestore(app);
 const getItems=()=>window.NEX51?.readLibrary?.()||[];
 const link=id=>{const url=new URL(location.href);url.searchParams.set('hbShare',id);url.hash='';return url.href;};
 const style=document.createElement('style');style.textContent='#nexHbShareAll{margin:8px 0 14px;padding:10px 13px;background:#69232e;color:#fff;border:1px solid #a94855;border-radius:7px;cursor:pointer}#nexHbShareDialog{width:min(94vw,650px);max-height:90vh;overflow:auto;background:#151116;color:#fff;border:1px solid #b34d5a;border-radius:11px;padding:18px}#nexHbShareDialog::backdrop{background:#000b}#nexHbShareDialog .hb-option{display:flex;gap:12px;padding:10px;border-bottom:1px solid #432c33}#nexHbShareDialog .hb-option small{display:block;color:#aaa}#nexHbShareDialog .hb-items{max-height:42vh;overflow:auto;border:1px solid #63414b;margin:10px 0;border-radius:5px}#nexHbShareDialog button{padding:9px 12px;border:1px solid #c55d6a;border-radius:6px;color:white;background:#862d3a;cursor:pointer}#nexHbShareDialog .hb-actions{display:flex;gap:9px;flex-wrap:wrap;margin:12px 0}#nexHbShareDialog input[type=text]{width:100%;box-sizing:border-box;padding:10px;background:#0e0d10;color:white;border:1px solid #66414a}#nexHbShareDialog [hidden]{display:none!important}#nexHbShareStatus{color:#ffbfc7;min-height:20px}';
 style.textContent+='#nexHbShareDialog .hb-option{display:flex!important;align-items:center!important;justify-content:flex-start!important;gap:12px!important}#nexHbShareDialog .hb-option input[type=checkbox]{appearance:auto!important;-webkit-appearance:checkbox!important;display:inline-block!important;flex:0 0 18px!important;width:18px!important;height:18px!important;min-width:18px!important;min-height:18px!important;max-width:18px!important;max-height:18px!important;margin:0!important;padding:0!important;accent-color:#b23848;transform:none!important;position:static!important}#nexHbShareDialog .hb-option div{flex:1;min-width:0}';
 document.head.append(style);
 const modal=document.createElement('dialog');modal.id='nexHbShareDialog';
 modal.innerHTML='<h2 id="nexHbShareHeading">Compartilhar Homebrews</h2><p id="nexHbShareExplain">Escolha o que deseja compartilhar.</p><div class="hb-items" id="nexHbShareItems"></div><div class="hb-actions"><button id="nexHbShareGenerate" type="button">Gerar link</button><button id="nexHbShareImport" type="button" hidden>Importar selecionados</button><button id="nexHbShareClose" type="button">Fechar</button></div><div id="nexHbShareLinkBox" hidden><input type="text" id="nexHbShareLink" readonly aria-label="Link de compartilhamento"><div class="hb-actions"><button id="nexHbShareCopy" type="button">Copiar link</button><button id="nexHbShareDisable" type="button">Desativar link</button></div></div><p id="nexHbShareStatus" role="status"></p>';
 document.body.append(modal);
 const $=id=>document.getElementById(id);
 let mode='create',packet=null,currentShareId=null;
 const tell=t=>{$('nexHbShareStatus').textContent=t;};
 const selected=()=>[...$('nexHbShareItems').querySelectorAll('input:checked')].map(el=>el.value);
 function present(items,locked){
  const container=$('nexHbShareItems');container.replaceChildren();
  for(const item of items){
   const label=document.createElement('label');label.className='hb-option';
   const input=document.createElement('input');input.type='checkbox';input.value=item.id;input.checked=true;input.disabled=locked;
   const div=document.createElement('div');const strong=document.createElement('strong');strong.textContent=item.name;const sub=document.createElement('small');sub.textContent=item.type+(item.type==='item'&&item.category?' · '+item.category:'');
   div.append(strong,sub);label.append(input,div);container.append(label);
  }
 }
 function beginCreate(ids){
  mode='create';packet=null;currentShareId=null;
  $('nexHbShareHeading').textContent=ids?'Compartilhar Homebrew':'Compartilhar vários Homebrews';
  $('nexHbShareExplain').hidden=true;
  const items=getItems().filter(item=>!ids||ids.includes(item.id));present(items,!!ids);
  $('nexHbShareGenerate').hidden=false;$('nexHbShareImport').hidden=true;$('nexHbShareLinkBox').hidden=true;
  tell(items.length?'':'Não há Homebrews disponíveis.');modal.showModal();
 }
 function beginImport(id,data){
  mode='import';currentShareId=id;packet=data;
  $('nexHbShareHeading').textContent='Homebrews compartilhados';
  $('nexHbShareExplain').hidden=false;
  $('nexHbShareExplain').textContent='Selecione quais cópias deseja adicionar. Elas serão independentes do original.';
  present(data.items,false);
  $('nexHbShareGenerate').hidden=true;$('nexHbShareImport').hidden=false;$('nexHbShareLinkBox').hidden=true;
  tell('Nenhum Homebrew foi importado ainda.');if(!modal.open)modal.showModal();
 }
 async function openIncoming(id){
  if(!/^[a-f0-9]{32}$/.test(id))return;
  $('nexHbShareHeading').textContent='Abrindo compartilhamento';$('nexHbShareExplain').textContent='Carregando…';
  $('nexHbShareItems').replaceChildren();$('nexHbShareGenerate').hidden=true;$('nexHbShareImport').hidden=true;$('nexHbShareLinkBox').hidden=true;
  if(!modal.open)modal.showModal();tell('Buscando Homebrews...');
  try{
   const snap=await getDoc(doc(db,'sharedHomebrews',id));if(!snap.exists())throw Error('Link não encontrado');
   const data=snap.data();if(!data.active||data.format!=='nex-hb-share-v1'||!Array.isArray(data.items)||data.items.length<1||data.items.length>20)throw Error('Link indisponível');
   beginImport(id,data);
  }catch(e){tell('Não foi possível abrir o link: '+(e.code==='permission-denied'?'permissões do Firebase ainda não ativadas':e.message));}
 }
 async function generate(){
  const ids=selected(),items=JSON.parse(JSON.stringify(getItems().filter(item=>ids.includes(item.id)))),user=auth.currentUser;
  if(!user)return tell('Entre na sua conta NEX para gerar links.');
  if(!items.length||items.length>20)return tell('Selecione de 1 a 20 Homebrews.');
  if(new TextEncoder().encode(JSON.stringify(items)).length>850000)return tell('Pacote grande demais; compartilhe menos itens ou imagens menores.');
  const id=crypto.randomUUID().replace(/-/g,'');$('nexHbShareGenerate').disabled=true;tell('Criando link no Firebase...');
  try{
   await setDoc(doc(db,'sharedHomebrews',id),{format:'nex-hb-share-v1',ownerUid:user.uid,active:true,items,createdAt:serverTimestamp(),updatedAt:serverTimestamp()});
   currentShareId=id;$('nexHbShareLink').value=link(id);$('nexHbShareLinkBox').hidden=false;tell('Link criado. As cópias poderão ser alteradas e compartilhadas novamente.');
  }catch(e){tell('Não foi possível gerar o link: '+(e.code==='permission-denied'?'as regras do Firebase precisam ser publicadas.':e.message));}
  finally{$('nexHbShareGenerate').disabled=false;}
 }
 async function importItems(){
  if(!auth.currentUser)return tell('Entre na sua conta NEX para importar.');
  if(mode!=='import'||!packet)return;
  const ids=selected(),items=packet.items.filter(item=>ids.includes(item.id));
  if(!items.length)return tell('Selecione pelo menos um Homebrew.');
  try{
   const result=window.NEX51.importHomebrews(items,currentShareId,packet.ownerUid);
   tell('Importados: '+result.added+'. Já importados: '+result.skipped+'. Cada cópia pode ser editada e compartilhada.');
  }catch(e){tell('Falha ao importar: '+e.message);}
 }
 document.addEventListener('click',e=>{const btn=e.target.closest('button[data-nex52-share]');if(btn){e.preventDefault();beginCreate([btn.dataset.nex52Share]);}});
 $('nexHbShareGenerate').onclick=generate;$('nexHbShareImport').onclick=importItems;$('nexHbShareClose').onclick=()=>modal.close();
 $('nexHbShareCopy').onclick=async()=>{try{await navigator.clipboard.writeText($('nexHbShareLink').value);tell('Link copiado.');}catch{tell('Copie o link do campo acima.');}};
 $('nexHbShareDisable').onclick=async()=>{
  if(!auth.currentUser||!currentShareId)return tell('Entre na conta criadora do link.');
  try{await updateDoc(doc(db,'sharedHomebrews',currentShareId),{active:false,updatedAt:serverTimestamp()});$('nexHbShareLinkBox').hidden=true;tell('Link desativado. As cópias já importadas permanecem independentes.');}
  catch(e){tell('Não foi possível desativar: '+e.message);}
 };
 const id=new URL(location.href).searchParams.get('hbShare');
 if(id)openIncoming(id);
})();