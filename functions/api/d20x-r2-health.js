// Public configuration check for NEX Cloudflare R2. No bucket contents or secrets exposed.
export function onRequestGet({env}){
 const binding=env?.NEX_MEDIA;
 const configured=Boolean(binding&&typeof binding.get==='function'&&typeof binding.put==='function'&&typeof binding.delete==='function');
 return new Response(JSON.stringify({
  service:'NEX R2 status',
  r2Configured:configured,
  d1Configured:Boolean(env?.NEX_D1&&typeof env.NEX_D1.prepare==='function'),
  firebaseProjectConfigured:Boolean(env?.FIREBASE_PROJECT_ID),
  nextStep:configured?'O bucket R2 esta conectado. Teste uma imagem na mesa.':'Crie o bucket nex-vtt-media, vincule como NEX_MEDIA no Pages e adicione ao wrangler.toml antes da nova implantacao.'
 }),{headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'}});
}
