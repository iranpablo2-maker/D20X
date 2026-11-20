/* NEX | Rolagens de ameaças e NPCs: interpretação segura de expressões,
   diferenciação explícita entre testes de d20 e dano, sem eval. */
(function(){
 'use strict';
 const icon='<img class="nex-dice20-icon" src="./nex-d20-icon.svg?v=20261120user48" alt="" aria-hidden="true">';
 const style=document.createElement('style');
 style.textContent=[
 '.nex-roll20-btn{display:inline-flex;gap:5px;align-items:center;justify-content:center;vertical-align:middle;border:1px solid #63414b;border-radius:6px;background:#1b151a;color:#f5e9ee;padding:3px 5px;min-height:27px;cursor:pointer;font-size:11px}',
 '.nex-roll20-btn:hover{border-color:#e36579;background:#3d1b29}',
 '.nex-dice20-icon{width:24px;height:24px;object-fit:contain;display:inline-block;vertical-align:middle;pointer-events:none}',
 '#nex-roll20-stack{position:fixed;right:14px;top:14px;z-index:2147483000;display:flex;flex-direction:column;gap:7px;width:min(320px,calc(100vw - 28px));pointer-events:none}',
 '.nex-roll20-toast{pointer-events:auto;display:grid;grid-template-columns:34px minmax(0,1fr) 45px;align-items:center;gap:8px;min-height:77px;padding:10px;background:#251c20;color:#f8f4f6;border-left:2px solid #c93650;border-radius:5px;box-shadow:0 10px 30px #0009;font:12px/1.35 system-ui,Arial,sans-serif;position:relative}',
 '.nex-roll20-gem{width:24px;height:29px;margin:auto;background:#e53355;clip-path:polygon(50% 0%,94% 22%,94% 77%,50% 100%,6% 77%,6% 22%)}',
 '.nex-roll20-name{font-size:13px;font-weight:750;margin:0 18px 2px 0;overflow-wrap:anywhere}',
 '.nex-roll20-expression{color:#d6c4cd;font-size:11px;line-height:1.25;overflow-wrap:anywhere}',
 '.nex-roll20-breakdown{margin-top:6px;color:#c9b7c1;font-size:10px;overflow-wrap:anywhere}',
 '.nex-roll20-number{font-size:27px;font-weight:850;text-align:center;font-variant-numeric:tabular-nums}',
 '.nex-roll20-close{position:absolute;top:3px;right:7px;color:#eee;border:0;background:none;cursor:pointer;font-size:19px;line-height:1}',
 '.nex-roll20-close:focus-visible,.nex-roll20-btn:focus-visible{outline:2px solid #ff879c;outline-offset:2px}'
 ].join('\n');
 document.head.append(style);
 const escape=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 // Aceita prefixos ("Teste Luta") e descritores de dano ("corte", "Sangue").
 // Termos: 1d8+20 corte +2d8 Sangue. Não executa texto arbitrário.
 function parse(input){
  const text=String(input||'').trim();
  if(!text||text.length>360)return null;
  const dice=/\b(\d{0,2})\s*d\s*(100|20|12|10|8|6|4)\b/gi;
  const found=[...text.matchAll(dice)];
  if(!found.length||found.length>12)return null;
  const start=found[0].index;
  const parts=[];let totalDice=0;
  let lastEnd=start,previousSign=1;
  for(let i=0;i<found.length;i++){
   const item=found[i];
   const between=text.slice(lastEnd,item.index);
   let sign=1;
   if(i>0){
    const prefix=between.match(/([+-])\s*$/);
    if(!prefix)return null; // Múltiplos dados separados por texto sem operador: ambíguo.
    sign=prefix[1]==='-'?-1:1;
   }else if(/-\s*$/.test(text.slice(0,item.index)))sign=-1;
   const count=Number(item[1]||1),sides=Number(item[2]);
   if(count<1||count>30||totalDice+count>80)return null;
   parts.push({kind:'dice',sign,count,sides});
   totalDice+=count;
   lastEnd=item.index+item[0].length;
   const following=text.slice(lastEnd,found[i+1]?.index??text.length);
   // Constantes numéricas adjacentes ao termo, sem capturar "crítico 19/x3".
   const scalar=following.match(/^\s*([+-])\s*(\d{1,3})(?![\ddx])/i);
   if(scalar){
    const value=Number(scalar[2])*(scalar[1]==='-'?-1:1);
    if(Math.abs(value)>999)return null;
    parts.push({kind:'number',value});
    lastEnd+=scalar[0].length;
   }
  }
  if(parts.length>24)return null;
  const diceParts=parts.filter(p=>p.kind==='dice');
  const flatBonus=parts.filter(p=>p.kind==='number').reduce((sum,p)=>sum+p.value,0);
  return {parts,count:diceParts[0].count,sides:diceParts[0].sides,bonus:flatBonus,text};
 }
 function roll(options={}){
  let parsed;
  if(options.count!==undefined&&options.count!==null){
   const count=Number(options.count),sides=Number(options.sides||20),bonus=Number(options.bonus||0);
   if(!Number.isInteger(count)||count<1||count>30||![4,6,8,10,12,20,100].includes(sides)||!Number.isFinite(bonus)||Math.abs(bonus)>999)return false;
   parsed={count,sides,bonus,parts:[{kind:'dice',count,sides,sign:1},...(bonus?[{kind:'number',value:bonus}]:[])]};
  }else parsed=parse(options.expression);
  if(!parsed)return false;
  const diceParts=parsed.parts.filter(p=>p.kind==='dice');
  // d20 com múltiplos dados só é "pool" se for um teste explícito.
  const pool=options.pool===true||(options.pool!==false&&diceParts.length===1&&diceParts[0].sides===20&&!/dano/i.test(String(options.title||'')));
  const usePool=pool&&diceParts.length===1&&diceParts[0].sides===20;
  const rollValues=[];
  let total=0,selection=null;
  for(const term of parsed.parts){
   if(term.kind==='number'){total+=term.value;continue;}
   const nums=Array.from({length:term.count},()=>Math.floor(Math.random()*term.sides)+1);
   const selected=usePool?(options.low?Math.min(...nums):Math.max(...nums)):nums.reduce((a,b)=>a+b,0);
   total+=selected*term.sign;
   if(usePool)selection=selected;
   rollValues.push({term,nums,selected});
  }
  const criticalText=String(options.critical||'').trim();
  const criticalMatch=criticalText.match(/(?:^|\b)(1[5-9]|20)(?:\s*[-–]\s*20)?/);
  const criticalThreshold=criticalMatch?Number(criticalMatch[1]):null;
  const criticalMultiplier=(criticalText.match(/[x×\/]\s*([2-5])\b/i)||[])[1]||'';
  const criticalHit=usePool&&!options.low&&criticalThreshold!==null&&selection>=criticalThreshold;
  const stack=document.getElementById('nex-roll20-stack')||(()=>{
   const node=document.createElement('div');node.id='nex-roll20-stack';node.setAttribute('aria-live','polite');document.body.append(node);return node;
  })();
  const toast=document.createElement('section');toast.className='nex-roll20-toast';
  const emblem=document.createElement('div');emblem.className='nex-roll20-gem';emblem.setAttribute('aria-hidden','true');
  const details=document.createElement('div');
  const heading=document.createElement('div');heading.className='nex-roll20-name';heading.textContent=String(options.title||'Rolagem').slice(0,90);
  const formula=document.createElement('div');formula.className='nex-roll20-expression';
  formula.textContent=parsed.parts.map((term,i)=>term.kind==='dice'
   ?(i&&term.sign>0?'+':'')+(term.sign<0?'-':'')+term.count+'d'+term.sides
   :(term.value>=0?'+':'')+term.value).join(' ').replace(/^\+/,'')+(usePool?' ('+(options.low?'menor':'maior')+')':' (soma)');
  const breakdown=document.createElement('div');breakdown.className='nex-roll20-breakdown';
  breakdown.textContent=rollValues.map(({term,nums,selected})=>
   term.count+'d'+term.sides+' ['+nums.join(', ')+'] → '+(term.sign<0?'-':'')+selected).join(' · ')+
   (parsed.parts.some(x=>x.kind==='number')?' · bônus '+(parsed.parts.filter(x=>x.kind==='number').reduce((sum,x)=>sum+x.value,0)):'')+
   (options.detail?' · '+String(options.detail).slice(0,100):'')+
   (criticalHit?' · CRÍTICO ('+criticalThreshold+'–20'+(criticalMultiplier?' / x'+criticalMultiplier:'')+')':'');
  details.append(heading,formula,breakdown);
  const number=document.createElement('strong');number.className='nex-roll20-number';number.textContent=String(total);
  const close=document.createElement('button');close.type='button';close.className='nex-roll20-close';close.setAttribute('aria-label','Fechar rolagem');close.textContent='×';close.addEventListener('click',()=>toast.remove());
  toast.append(emblem,details,number,close);stack.prepend(toast);
  while(stack.children.length>4)stack.lastElementChild.remove();
  return {total,terms:rollValues.map(x=>({dice:x.nums,selected:x.selected})),pool:usePool,critical:criticalHit};
 }
 const api={roll,parse,icon,button:(expression,label='Rolar',pool)=>{
  if(!parse(expression))return '';
  return '<button type="button" class="nex-roll20-btn" data-nex-roll-expression="'+escape(expression)+'" data-nex-roll-title="'+escape(label)+'"'+(typeof pool==='boolean'?' data-nex-roll-pool="'+pool+'"':'')+'>'+icon+'<span>'+escape(label)+'</span></button>';
 }};
 window.NEX_DICE_UI=api;
 document.addEventListener('click',function(e){
  const button=e.target.closest('[data-nex-roll-expression]');
  if(!button)return;
  e.preventDefault();
  const label=button.dataset.nexRollTitle||'Rolagem';
  roll({title:label,expression:button.dataset.nexRollExpression,pool:button.dataset.nexRollPool==='true'?true:button.dataset.nexRollPool==='false'?false:undefined,low:button.dataset.nexRollLow==='true',critical:button.dataset.nexRollCritical||''});
 });
})();