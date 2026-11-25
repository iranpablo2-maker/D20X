/* NEX: referências resumidas dos NPCs oficiais do pacote Setembro/2026.
   O suplemento original contém as fichas completas. */
(function(){
 'use strict';
 function init(){
  const data=window.NEX_ARQUIVOS;
  const section=document.getElementById('threatsPanel');
  if(!section||!data?.members?.length||document.getElementById('nexSeptemberRosterOpen'))return;
  const september=data.members.filter(x=>x.month==='Setembro');
  if(!september.length)return;
  const css=document.createElement('style');css.id='nex-september-roster-style';
  css.textContent=`
    #nexSeptemberRosterOpen{display:inline-flex;gap:9px;align-items:center;margin:12px 14px 8px;padding:11px 15px;border-radius:9px;border:1px solid #a34451;background:#29171c;color:#fff;font-weight:750;cursor:pointer}
    #nexSeptemberRosterOpen:hover{background:#52252e}
    #nexSeptemberRosterDialog{width:min(92vw,850px);max-height:87vh;overflow:auto;background:#121115;color:#f7f1f3;border:1px solid #75333e;border-radius:12px;padding:22px;box-shadow:0 24px 80px #000b}
    #nexSeptemberRosterDialog::backdrop{background:#000c}
    #nexSeptemberRosterDialog .nex-sept-header{display:flex;justify-content:space-between;align-items:start;gap:12px}
    #nexSeptemberRosterDialog h2{font-size:22px;margin:0}
    #nexSeptemberRosterDialog .nex-sept-close{border:1px solid #76404b;background:#25171c;color:#fff;font-size:24px;width:36px;height:36px;border-radius:8px;cursor:pointer}
    #nexSeptemberRosterDialog p{font-size:12px;color:#c2b5bd;line-height:1.6;margin:9px 0 18px}
    #nexSeptemberRosterDialog .nex-sept-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:11px}
    #nexSeptemberRosterDialog .nex-sept-card{padding:15px;border:1px solid #4c3039;border-radius:10px;background:linear-gradient(150deg,#251b22,#161419)}
    #nexSeptemberRosterDialog .nex-sept-card h3{font-size:15px;margin:0 0 8px}
    #nexSeptemberRosterDialog .nex-sept-stats{display:flex;gap:5px;flex-wrap:wrap}
    #nexSeptemberRosterDialog .nex-sept-stats span{background:#3c2029;border-radius:5px;padding:4px 7px;font-size:12px}
    #nexSeptemberRosterDialog .nex-sept-card small{display:block;color:#c9bac1;margin-top:10px;line-height:1.5}
  `;document.head.append(css);
  const trigger=document.createElement('button');trigger.type='button';trigger.id='nexSeptemberRosterOpen';trigger.textContent='Hell Hunters · Setembro 2026';trigger.title='Consultar NPCs de Arquivos Secretos de Setembro';
  section.insertBefore(trigger,section.firstChild);
  const dlg=document.createElement('dialog');dlg.id='nexSeptemberRosterDialog';
  const header=document.createElement('div');header.className='nex-sept-header';
  const title=document.createElement('h2');title.textContent='Hell Hunters · Setembro';
  const close=document.createElement('button');close.type='button';close.className='nex-sept-close';close.setAttribute('aria-label','Fechar');close.textContent='×';close.onclick=()=>dlg.close();
  header.append(title,close);
  const description=document.createElement('p');
  description.textContent='Referência rápida das 8 fichas de NPC do pacote oficial v1.1. Ações, ataques e demais habilidades permanecem no suplemento original.';
  const grid=document.createElement('div');grid.className='nex-sept-grid';
  for(const npc of september){
    const card=document.createElement('article');card.className='nex-sept-card';
    const heading=document.createElement('h3');heading.textContent=npc.name;
    const stats=document.createElement('div');stats.className='nex-sept-stats';
    for(const value of ['VD '+npc.vd,'Defesa '+npc.defense,'PV '+npc.pv,'p. '+npc.page]){
      const tag=document.createElement('span');tag.textContent=value;stats.append(tag);
    }
    const sub=document.createElement('small');sub.textContent=npc.role;
    card.append(heading,stats,sub);grid.append(card);
  }
  dlg.append(header,description,grid);document.body.append(dlg);
  trigger.onclick=()=>{if(!dlg.open)dlg.showModal();};
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
