/* Preserve the uploaded high-resolution logo. Remove only its near-black background when needed. */
(()=>{
 const source='./d20x-logo.png?v=20261126originalHD';
 const imgs=[...document.querySelectorAll('img[src*="d20x-logo.png"]')];
 if(!imgs.length)return;
 const original=new Image();
 original.onload=()=>{
  try{
   const w=original.naturalWidth,h=original.naturalHeight;
   if(!w||!h||w*h>12000000)return;
   const canvas=document.createElement('canvas');canvas.width=w;canvas.height=h;
   const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(original,0,0);
   const pixels=ctx.getImageData(0,0,w,h),d=pixels.data;
   const corners=[0,w-1,(h-1)*w,w*h-1];
   if(corners.some(i=>d[i*4+3]<128)){imgs.forEach(img=>img.src=source);return;}
   if(!corners.every(i=>Math.max(d[i*4],d[i*4+1],d[i*4+2])<=30))return;
   const seen=new Uint8Array(w*h),q=new Int32Array(w*h);let head=0,tail=0;
   function visit(i){
    if(seen[i])return;seen[i]=1;
    const o=i*4;if(Math.max(d[o],d[o+1],d[o+2])>16)return;
    q[tail++]=i;d[o+3]=0;
   }
   for(let x=0;x<w;x++){visit(x);visit((h-1)*w+x);}
   for(let y=0;y<h;y++){visit(y*w);visit(y*w+w-1);}
   while(head<tail){
    const i=q[head++],x=i%w;
    if(x>0)visit(i-1);if(x<w-1)visit(i+1);if(i>=w)visit(i-w);if(i<w*(h-1))visit(i+w);
   }
   ctx.putImageData(pixels,0,0);
   canvas.toBlob(blob=>{
    if(!blob)return;
    const url=URL.createObjectURL(blob);
    imgs.forEach(img=>{img.src=url;});
    document.querySelectorAll('link[rel="icon"][type="image/png"]').forEach(link=>link.href=url);
   },'image/png');
  }catch(error){console.warn('D20X: original logo retained',error);}
 };
 original.src=source;
})();
