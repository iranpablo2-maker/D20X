/* NEX | Pop-up de rolagens das fichas de Ameaças e NPCs do Escudo */
(function(){
 'use strict';
 const icon='<img class="nex-dice20-icon" src="./nex-d20-icon.svg?v=1" alt="" aria-hidden="true">';
 const style=document.createElement('style');
 style.textContent=[
 '.nex-roll20-btn{display:inline-flex;gap:5px;align-items:center;justify-content:center;vertical-align:middle;border:1px solid #63414b;border-radius:6px;background:#1b151a;color:#f5e9ee;padding:3px 5px;min-height:27px;cursor:pointer;font-size:11px}',
 '.nex-roll20-btn:hover{border-color:#e36579;background:#3d1b29}',
 '.nex-dice20-icon{width:24px;height:24px;object-fit:contain;display:inline-block;vertical-align:middle;pointer-events:none}',
 '#nex-roll20-stack{position:fixed;right:14px;top:14px;z-index:2147483000;display:flex;flex-direction:column;gap:7px;width:min(300px,calc(100vw - 28px));pointer-events:none}',
 '.nex-roll20-toast{pointer-events:auto;display:grid;grid-template-columns:34px minmax(0,1fr) 45px;align-items:center;gap:8px;min-height:77px;padding:10px;background:#251c20;color:#f8f4f6;border-left:2px solid #c93650;border-radius:5px;box-shadow:0 10px 30px #0009;font:12px/1.35 system-ui,Arial,sans-serif}',
 '.nex-roll20-gem{width:24px;height:29px;margin:auto;background:#e53355;clip-path:polygon(50% 0%,94% 22%,94% 77%,50% 100%,6% 77%,6% 22%)}',
 '.nex-roll20-name{font-size:13px;font-weight:750;margin:0 18px 2px 0;overflow-wrap:anywhere}',
 '.nex-roll20-expression{color:#d6c4cd;font-size:11px;line-height:1.25}',
 '.nex-roll20-breakdown{margin-top:6px;color:#c9b7c1;font-size:10px;overflow-wrap:anywhere}',
 '.nex-roll20-number{font-size:27px;font-weight:850;text-align:center;font-variant-numeric:tabular-nums}',
 '.nex-roll20-close{position:absolute;top:3px;right:7px;color:#eee;border:0;background:none;cursor:pointer;font-size:19px;line-height:1}',
 '.nex-roll20-toast{position:relative}',
 '.nex-roll20-close:focus-visible,.nex-roll20-btn:focus-visible{outline:2px solid #ff879c;outline-offset:2px}'
 ].join('\n');
 document.head.append(style);
 function parse(text){
   const match=String(text||'').match(/(^|[^\w])(\d{1,2})\s*d\s*(100|20|12|10|8|6|4)(?:\s*([+-])\s*(\d{1,3}))?/i);
   if(!match)return null;
   const count=Number(match[2]),sides=Number(match[3]),bonus=Number(match[5]||0)*(match[4]==='-'?-1:1);
   if(count<1||count>30||Math.abs(bonus)>999)return null;
   return {count,sides,bonus};
 }
 function roll(options={}){
   const parsed=options.count?{count:Math.max(1,Math.min(30,Number(options.count)||1)),sides:Number(options.sides)||20,bonus:Number(options.bonus)||0}:parse(options.expression);
   if(!parsed)return false;
   const nums=Array.from({length:parsed.count},()=>Math.floor(Math.random()*parsed.sides)+1);
   const pool=options.pool===true||(options.pool!==false&&parsed.sides===20&&String(options.title||'').toLowerCase()!=='dano');
   const chosen=pool?(options.low?Math.min(...nums):Math.max(...nums)):nums.reduce((a,b)=>a+b,0);
   const total=chosen+parsed.bonus;
   const stack=document.getElementById('nex-roll20-stack')||(()=>{
     const node=document.createElement('div');node.id='nex-roll20-stack';node.setAttribute('aria-live','polite');document.body.append(node);return node;
   })();
   const toast=document.createElement('section');toast.className='nex-roll20-toast';
   const emblem=document.createElement('div');emblem.className='nex-roll20-gem';emblem.setAttribute('aria-hidden','true');
   const details=document.createElement('div');
   const heading=document.createElement('div');heading.className='nex-roll20-name';heading.textContent=String(options.title||'Rolagem').slice(0,90);
   const formula=document.createElement('div');formula.className='nex-roll20-expression';
   formula.textContent=parsed.count+'d'+parsed.sides+' ('+(pool?(options.low?'menor':'maior'):'soma')+')'+(parsed.bonus?(parsed.bonus>0?' + ':' - ')+Math.abs(parsed.bonus):'');
   const breakdown=document.createElement('div');breakdown.className='nex-roll20-breakdown';
   breakdown.textContent='['+nums.join(', ')+'] '+(pool?'→ '+chosen:'→ '+nums.reduce((a,b)=>a+b,0))+(parsed.bonus?(parsed.bonus>0?' + ':' - ')+Math.abs(parsed.bonus):'')+(options.detail?' · '+String(options.detail).slice(0,100):'');
   details.append(heading,formula,breakdown);
   const number=document.createElement('strong');number.className='nex-roll20-number';number.textContent=String(total);
   const close=document.createElement('button');close.type='button';close.className='nex-roll20-close';close.setAttribute('aria-label','Fechar rolagem');close.textContent='×';close.addEventListener('click',()=>toast.remove());
   toast.append(emblem,details,number,close);stack.prepend(toast);
   while(stack.children.length>4)stack.lastElementChild.remove();
   return true;
 }
 const api={roll,parse,icon,button:(expression,label='Rolar')=>
  parse(expression)?'<button type="button" class="nex-roll20-btn" data-nex-roll-expression="'+String(expression).replace(/&/g,'&amp;').replace(/"/g,'&quot;').replace(/</g,'&lt;')+'" data-nex-roll-title="'+String(label).replace(/"/g,'&quot;')+'">'+icon+'<span>'+label+'</span></button>':''};
 window.NEX_DICE_UI=api;
 document.addEventListener('click',function(e){
  const button=e.target.closest('[data-nex-roll-expression]');
  if(!button)return;
  e.preventDefault();
  const label=button.dataset.nexRollTitle||'Rolagem';
  roll({title:label,expression:button.dataset.nexRollExpression,pool:button.dataset.nexRollPool==='true'?true:button.dataset.nexRollPool==='false'?false:undefined});
 });
})();