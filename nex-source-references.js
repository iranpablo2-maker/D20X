/* Local source references. No PDF content is hosted or extracted here. */
(function(){
"use strict";
const norm=s=>String(s||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
const base={
134:"Alterar Destino|Alterar Memória|Amaldiçoar Arma|Amaldiçoar Tecnologia|Âncora Temporal",
135:"Aprimorar Físico|Aprimorar Mente|Arma Atroz|Armadura de Sangue|Canalizar o Medo|Capturar o Coração",
136:"Chamas do Caos|Cicatrização|Cinerária|Coincidência Forçada|Compreensão Paranormal",
137:"Conhecendo o Medo|Consumir Manancial|Contato Paranormal|Contenção Fantasmagórica",
138:"Controle Mental|Convocação Instantânea|Convocar o Algoz|Corpo Adaptado",
139:"Decadência|Definhar|Deflagração de Energia|Desacelerar Impacto|Descarnar",
140:"Detecção de Ameaças|Dissipar Ritual|Dissonância Acústica|Distorção Temporal|Distorcer Aparência",
141:"Eco Espiral|Eletrocussão|Embaralhar|Enfeitiçar",
142:"Esconder dos Olhos|Espirais da Perdição|Ferver Sangue|Fim Inevitável",
143:"Flagelo de Sangue|Forma Monstruosa|Fortalecimento Sensorial|Hemofagia",
144:"Inexistir|Invadir Mente|Invólucro de Carne",
145:"Lâmina do Medo|Localização|Luz|Medo Tangível",
146:"Mergulho Mental|Miasma Entrópico|Nuvem de Cinzas|Ódio Incontrolável",
147:"Ouvir os Sussurros|Paradoxo|Perturbação",
148:"Poeira da Podridão|Polarização Caótica|Possessão",
149:"Presença do Medo|Proteção contra Rituais|Purgatório|Rejeitar Névoa|Salto Fantasma",
150:"Sopro do Caos|Tecer Ilusão",
151:"Tela de Ruído|Teletransporte|Tentáculos de Lodo|Terceiro Olho",
152:"Transfigurar Água|Transfigurar Terra|Transfusão Vital|Velocidade Mortal",
153:"Vidência|Vínculo de Sangue|Vomitar Pestes|Zerar Entropia"};
const horror={49:"Esfolar",50:"Sede de Adrenalina|Odor da Caçada",51:"Martírio de Sangue|Apagar as Luzes",52:"Língua Morta",53:"Fedor Pútrido|Singularidade Temporal",54:"Desfazer Sinapses|Aurora da Verdade",55:"Relembrar Fragmento|Pronunciar Sigilo",56:"Overclock|Tremeluzir",57:"Mutar|Milagre Ionizante"};
const map=(rows)=>Object.fromEntries(Object.entries(rows).flatMap(([page,names])=>names.split("|").map(name=>[norm(name),Number(page)])));
const rituals={basico:map(base),sah:map(horror)};
const months=["janeiro","fevereiro","marco","abril","maio","junho","julho","setembro"];
const sectionPages={
basico:{ritual:134,origin:26,ability:34,power:124,threat:188,item:61,curse:154,modifier:70},
sah:{ritual:49,origin:8,ability:15,power:47,threat:125,item:38,curse:58}
};
const allSah=()=>{const s=window.NEX_SAH||{};return [s.origins,s.generalPowers,s.paranormal,s.items,s.rituals].flatMap(x=>Array.isArray(x)?x:[]);};
const allArchives=()=>{const s=window.NEX_ARQUIVOS||{};return [s.origins,s.powers,s.items,s.rituals].flatMap(x=>Array.isArray(x)?x:[]);};
function reference(name,source,kind,extra={}){
const n=norm(name);let src=String(source||"");let s=norm(src);if(/homebrew|personalizado|mundano/.test(s)||extra.isHomebrew)return null;
let book=months.find(m=>s.includes("arquivos secretos")&&s.includes(m))||(/sobrevivendo|horror/.test(s)?"sah":"basico");
const explicitSource=/livro basico|livro de regras|ordem paranormal|sobrevivendo|arquivos secretos/.test(s);
if(!explicitSource&&kind!=="threat"){
 const same=x=>[x?.name,x?.ability].some(v=>norm(v)===n);
 const a=allArchives().find(same),h=allSah().find(same);
 if(a?.source){src=a.source;s=norm(src);book=months.find(m=>s.includes(m))||book;}
 else if(h){book="sah";src="Sobrevivendo ao Horror";s=norm(src);}
}
if(/arquivos secretos/.test(s)&&!months.some(m=>s.includes(m)))return {name,book:"basico",page:0,exact:false};
if(kind==="ritual"){const direct=rituals[book]?.[n];if(direct)return {name,book,page:direct,exact:true};}
const pageMatch=src.match(/(?:\bp\.?|página|pagina)\s*[:.]?\s*(\d+)/i);
if(Number(extra.pdfPage)>0)return {name,book,page:Number(extra.pdfPage),exact:true};
let p=Number(extra.page||pageMatch?.[1]||0);
if(p>0){p+=book==="basico"?10:book==="sah"?1:book==="fevereiro"?-1:0;return {name,book,page:p,exact:true};}
if(kind==="ability"){if(s.startsWith("origem:"))kind="origin";else if(s.includes("paranormal"))kind="power";}
if(kind==="item"&&/amaldi[cç]oad/.test(norm(extra.section)))kind="curse";
return {name,book,page:sectionPages[book]?.[kind]||0,exact:false};
}
window.NEX_SOURCE_REFERENCE=reference;
window.NEX_SOURCE_LINK=(name,source,kind,extra)=>{const r=reference(name,source,kind,extra);if(!r)return "";const q=new URLSearchParams({name:String(r.name||""),book:r.book,page:String(r.page||""),exact:r.exact?"1":"0"});return '<a class="nex-source-link" style="display:inline-block;margin-top:8px;color:#ef8a94;font-size:12px;text-decoration:underline" target="_blank" rel="noopener" href="./nex-fontes.html?'+q.toString().replace(/&/g,"&amp;")+'">Consultar texto original (PDF)</a>';};
})();