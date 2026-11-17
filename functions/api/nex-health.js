// Exposes only boolean configuration checks; never exposes credentials or user data.
export function onRequestGet({env}) {
 const hasD1=Boolean(env?.NEX_D1&&typeof env.NEX_D1.prepare==='function');
 const names=Object.keys(env||{});
 const response={
  service:'NEX database diagnostics',
  bindingD1:hasD1,
  firebaseProjectConfigured:typeof env?.FIREBASE_PROJECT_ID==='string'&&env.FIREBASE_PROJECT_ID.length>0,
  bindingSimilarNames:names.filter(n=>/NEX|D1|DATABASE/i.test(n)).map(n=>n==='NEX_D1'?'NEX_D1':n),
  hint:hasD1?'D1 está acessível no runtime':'D1 não aparece para esta Pages Function. Confira o nome exato NEX_D1 e ambiente Produção.'
 };
 return new Response(JSON.stringify(response),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
