// NEX Pages Functions diagnostic. Never reveal binding values or credentials.
export function onRequestGet({env}) {
 const binding=env?.NEX_D1;
 const bindingPresent=Object.prototype.hasOwnProperty.call(env||{},'NEX_D1');
 const bindingValueType=typeof binding;
 const bindingPrepareType=binding==null?'missing':typeof binding.prepare;
 const hasD1=bindingPresent&&bindingPrepareType==='function';
 const response={
  service:'NEX database diagnostics',
  bindingD1:hasD1,
  bindingPresent,
  bindingValueType,
  bindingPrepareType,
  firebaseProjectConfigured:typeof env?.FIREBASE_PROJECT_ID==='string'&&env.FIREBASE_PROJECT_ID.length>0,
  hint:hasD1?'D1 está acessível no runtime':bindingPresent?'NEX_D1 existe, mas não é uma associação D1 válida. Verifique se foi cadastrado como Banco de dados D1 em Associações, não como Texto em Variáveis e segredos.':'A associação NEX_D1 não existe no ambiente de produção.'
 };
 return new Response(JSON.stringify(response),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
}
