/* NEX Tabletop - streaming privado durante a sessao.
 * Firestore: apenas sinalizacao de conexao; WebRTC: imagens locais e musica ao vivo.
 * Sem TURN, algumas redes moveis/NATs podem bloquear conexoes diretas.
 */
const ICE_SERVERS=[{urls:'stun:stun.l.google.com:19302'},{urls:'stun:stun1.l.google.com:19302'}];
const LOCAL_REF=/^local:(?:map|asset|atmo)_[A-Za-z0-9_-]+:(?:gif|png|jpeg|webp)$/;
const MAX_IMAGE=11*1024*1024,CHUNK=16*1024,BUFFER_LIMIT=384*1024;
function waitIce(pc){
 if(pc.iceGatheringState==='complete')return Promise.resolve();
 return new Promise(resolve=>{
  let ended=false;
  const finish=()=>{if(ended)return;ended=true;clearTimeout(timer);pc.removeEventListener('icegatheringstatechange',change);resolve();};
  const change=()=>{if(pc.iceGatheringState==='complete')finish();};
  const timer=setTimeout(finish,12000);
  pc.addEventListener('icegatheringstatechange',change);
 });
}
function dataUrlToBlob(src){
 if(typeof src!=='string'||!src.startsWith('data:image/'))throw Error('Imagem invalida');
 const at=src.indexOf(',');
 const meta=src.slice(5,at);
 const raw=atob(src.slice(at+1));
 if(raw.length>MAX_IMAGE)throw Error('Arquivo local excede limite da transmissao');
 const bytes=new Uint8Array(raw.length);
 for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);
 return new Blob([bytes],{type:meta.split(';')[0]});
}
function blobToDataUrl(blob){
 return new Promise((resolve,reject)=>{
  const reader=new FileReader();
  reader.onload=()=>resolve(reader.result);
  reader.onerror=()=>reject(Error('Falha ao interpretar a imagem recebida'));
  reader.readAsDataURL(blob);
 });
}
function waitBuffer(channel){
 if(channel.readyState!=='open')return Promise.reject(Error('Conexao encerrada'));
 if(channel.bufferedAmount<BUFFER_LIMIT)return Promise.resolve();
 return new Promise((resolve,reject)=>{
  let done=false;
  const timer=setTimeout(()=>finish(Error('A transmissao ficou sem resposta')),15000);
  const finish=err=>{if(done)return;done=true;clearTimeout(timer);channel.removeEventListener('bufferedamountlow',onLow);err?reject(err):resolve();};
  const onLow=()=>finish();
  channel.addEventListener('bufferedamountlow',onLow);
 });
}
async function sendFile(channel,ref,data){
 if(channel.readyState!=='open')return;
 const blob=dataUrlToBlob(data);
 if(blob.size>MAX_IMAGE)throw Error('Arquivo muito grande para a sessao');
 channel.send(JSON.stringify({type:'file',ref,mime:blob.type,size:blob.size}));
 for(let offset=0;offset<blob.size;offset+=CHUNK){
  await waitBuffer(channel);
  const bytes=await blob.slice(offset,offset+CHUNK).arrayBuffer();
  if(channel.readyState!=='open')throw Error('Jogador desconectou durante o envio');
  channel.send(bytes);
 }
}
export function mountNexPeerMedia({
 db,doc,collection,onSnapshot,setDoc,deleteDoc,campaignId,uid,gm,
 root,getAsset=async()=>null,getAudioStream=()=>null,getScene=()=>null,onScene=()=>{},onTokenMove=()=>{},onTokenPreview=()=>{},onTokenAction=()=>{},onConnected=()=>{},onDisconnected=()=>{}
}){
 if(!db||!uid||!root||typeof RTCPeerConnection==='undefined')return {
  connected:()=>false,fetchImage:()=>Promise.reject(Error('WebRTC nao disponivel neste navegador')),
  destroy:()=>{}
 };
 const sessionRef=doc(db,'campaigns',campaignId,'vttLive','session');
 const peersRef=collection(db,'campaigns',campaignId,'vttLivePeers');
 const ownRef=doc(db,'campaigns',campaignId,'vttLivePeers',uid);
 let destroyed=false,activeSession='',hosting=false,joinPeer=null,unsubPeers=null,unsubOwn=null;
 let audioStream=null,playbackPending=false;
 // A seleção, início, pausa e troca de áudio pertencem somente ao mestre.
 // Jogadores tentam reproduzir a transmissão automaticamente; navegadores podem exigir interação real.
 const remotePeers=new Map(),pending=new Map();
 let sceneRevision=0;
 async function sendScene(peer,revision,scene){
  const channel=peer.channel;
  if(!channel||channel.readyState!=='open'||!scene)return;
  const json=JSON.stringify(scene);
  if(json.length>900000)throw Error('Cena local excede o limite de sincronização');
  const size=12000,total=Math.ceil(json.length/size);
  await waitBuffer(channel);
  if(channel.readyState!=='open')return;
  channel.send(JSON.stringify({type:'scene-begin',revision,total}));
  for(let i=0;i<total;i++){
   await waitBuffer(channel);
   if(channel.readyState!=='open')return;
   channel.send(JSON.stringify({type:'scene-part',revision,index:i,body:json.slice(i*size,(i+1)*size)}));
  }
  await waitBuffer(channel);
  if(channel.readyState==='open')channel.send(JSON.stringify({type:'scene-end',revision}));
 }
 function queueScene(peer,revision,scene){
  peer.sceneQueue=(peer.sceneQueue||Promise.resolve()).then(()=>sendScene(peer,revision,scene)).catch(error=>{if(!destroyed)say('Erro ao sincronizar mesa: '+String(error.message).slice(0,100));});
 }
 function broadcastTokenMove(id,x,y,exceptUid=''){
  if(!gm||!hosting||destroyed||typeof id!=='string')return;
  const payload=JSON.stringify({type:'token-preview',id,x,y});
  for(const peer of remotePeers.values()){
   if(peer.uid!==exceptUid&&peer.open&&peer.channel?.readyState==='open'&&peer.channel.bufferedAmount<BUFFER_LIMIT){
    peer.channel.send(payload);
   }
  }
 }
 function broadcastScene(scene){
  if(!gm||!hosting||destroyed)return;
  const revision=++sceneRevision;
  for(const peer of remotePeers.values())if(peer.open)queueScene(peer,revision,scene);
 }
 // A transmissão acompanha a abertura e saída da mesa, sem botão manual.
 const panel=document.createElement('div');
 panel.style.cssText='display:none!important';
 panel.hidden=true;
 const status=document.createElement('div');
 status.setAttribute('role','status');
 status.textContent=gm?'Aguardando abertura do Tabletop.':'Aguardando o mestre.';
 panel.append(status);root.append(panel);
 const say=s=>{if(!destroyed)status.textContent=s;};
 async function tryPlayReceivedAudio(){
  if(gm||destroyed||!audioStream||!audioStream.paused||playbackPending)return;
  playbackPending=true;
  try{
   audioStream.muted=false;
   await audioStream.play();
   say('O mestre controla a música e os efeitos sonoros da sessão.');
  }catch(error){
   say('Aguardando permissão de áudio do navegador. Toque na mesa para liberar o som; quem controla a música é o mestre.');
  }finally{playbackPending=false;}
 }
 const retryPlayOnInteraction=()=>{if(!gm)void tryPlayReceivedAudio();};
 if(!gm){
  document.addEventListener('pointerdown',retryPlayOnInteraction,true);
  document.addEventListener('keydown',retryPlayOnInteraction,true);
 }
 function cleanupPending(message){
  for(const p of pending.values()){clearTimeout(p.timer);p.reject(Error(message));}
  pending.clear();
 }
 function teardown(){
  cleanupPending('Transmissao interrompida');
  if(unsubPeers){unsubPeers();unsubPeers=null;}
  if(unsubOwn){unsubOwn();unsubOwn=null;}
  try{joinPeer?.dc?.close();joinPeer?.pc?.close();}catch(_){}
  joinPeer=null;
  for(const p of remotePeers.values()){try{p.channel?.close();p.pc.close();}catch(_){}}
  remotePeers.clear();
  if(audioStream){audioStream.pause();audioStream.srcObject=null;audioStream=null;}
  onDisconnected();
 }
 function attachChannel(peer,channel){
  peer.channel=channel;
  channel.binaryType='arraybuffer';
  channel.bufferedAmountLowThreshold=128*1024;
  channel.onopen=()=>{
   if(destroyed)return;
   peer.open=true;
   if(gm){say('Transmissao ativa: '+Array.from(remotePeers.values()).filter(p=>p.open).length+' jogador(es) conectado(s).');queueScene(peer,++sceneRevision,getScene());}
   else{
    say('Conectado ao mestre. Imagens locais disponiveis.');
    window.dispatchEvent(new CustomEvent('nex:vtt-session-state',{detail:{campaignId,active:true}}));
    onConnected();
   }
  };
  channel.onclose=()=>{
   peer.open=false;
   if(destroyed)return;
   if(!gm){
    window.dispatchEvent(new CustomEvent('nex:vtt-session-state',{detail:{campaignId,active:false}}));
    cleanupPending('O mestre desconectou');say('Conexao ao mestre encerrada.');onDisconnected();
   }
   else say('Um jogador desconectou. Os demais continuam na sessao.');
  };
  channel.onerror=()=>{if(!destroyed)say('Problema de conexao direta. Algumas redes precisam de um servidor TURN.');};
  peer.queue=Promise.resolve();
  channel.onmessage=event=>{
   if(typeof event.data==='string'){
    let msg;
    try{msg=JSON.parse(event.data);}catch(_){return;}
    if(gm&&msg.type==='token-action'&&['delete','paste','variation'].includes(msg.action)&&typeof msg.id==='string'&&msg.id.length<=100){
      onTokenAction({action:msg.action,id:msg.id,sourceId:typeof msg.sourceId==='string'?msg.sourceId:'',variation:msg.variation},peer.uid);
     }else if(gm&&msg.type==='token-move'&&typeof msg.id==='string'&&msg.id.length<=100&&Number.isFinite(msg.x)&&Number.isFinite(msg.y)){
      onTokenMove({id:msg.id,x:msg.x,y:msg.y,final:msg.final===true},peer.uid);
     }else if(!gm&&msg.type==='token-preview'&&typeof msg.id==='string'&&msg.id.length<=100&&Number.isFinite(msg.x)&&Number.isFinite(msg.y)){
      onTokenPreview({id:msg.id,x:msg.x,y:msg.y});
     }else if(!gm&&msg.type==='scene-begin'&&Number.isSafeInteger(msg.revision)&&msg.total>0&&msg.total<=100){
      peer.sceneReceiving={revision:msg.revision,total:msg.total,parts:[]};
     }else if(!gm&&msg.type==='scene-part'&&peer.sceneReceiving?.revision===msg.revision&&Number.isInteger(msg.index)&&msg.index>=0&&msg.index<peer.sceneReceiving.total&&typeof msg.body==='string'&&msg.body.length<=12000){
      peer.sceneReceiving.parts[msg.index]=msg.body;
     }else if(!gm&&msg.type==='scene-end'&&peer.sceneReceiving?.revision===msg.revision){
      const transfer=peer.sceneReceiving;peer.sceneReceiving=null;
      if(transfer.parts.length===transfer.total&&transfer.parts.every(x=>typeof x==='string')){
       try{onScene(JSON.parse(transfer.parts.join('')));}catch(error){say('Falha ao atualizar mesa: '+String(error.message).slice(0,100));}
      }
     }else if(gm&&msg.type==='get'&&typeof msg.ref==='string'&&LOCAL_REF.test(msg.ref)){
     peer.queue=peer.queue.then(async()=>{
      const data=await getAsset(msg.ref,peer.uid);
      if(typeof data!=='string'){
       if(channel.readyState==='open')channel.send(JSON.stringify({type:'error',ref:msg.ref,text:'Imagem nao encontrada no dispositivo do mestre'}));
       return;
      }
      await sendFile(channel,msg.ref,data);
     }).catch(err=>{if(channel.readyState==='open')channel.send(JSON.stringify({type:'error',ref:msg.ref,text:String(err.message).slice(0,120)}));});
    }else if(!gm&&msg.type==='file'&&LOCAL_REF.test(msg.ref||'')&&Number.isInteger(msg.size)&&msg.size>0&&msg.size<=MAX_IMAGE){
     const req=pending.get(msg.ref);
     if(req&&!peer.receiving)peer.receiving={ref:msg.ref,mime:msg.mime,size:msg.size,total:0,parts:[],reported:-1};
    }else if(!gm&&msg.type==='error'&&typeof msg.ref==='string'){
     const req=pending.get(msg.ref);
     if(req){clearTimeout(req.timer);pending.delete(msg.ref);req.reject(Error(msg.text||'Erro ao receber imagem')); }
    }
    return;
   }
   if(gm||!peer.receiving)return;
   const transfer=peer.receiving;
   const data=event.data;
   if(!(data instanceof ArrayBuffer))return;
   transfer.parts.push(data);
   transfer.total+=data.byteLength;
   const percent=Math.min(100,Math.floor(transfer.total/transfer.size*100));
   if(percent===100||percent>=transfer.reported+10){transfer.reported=percent;say('Recebendo imagem do mestre: '+percent+'%');}
   if(transfer.total>transfer.size){peer.receiving=null;return;}
   if(transfer.total===transfer.size){
    peer.receiving=null;
    const req=pending.get(transfer.ref);
    if(!req)return;
    const blob=new Blob(transfer.parts,{type:transfer.mime});
    void blobToDataUrl(blob).then(img=>{
     if(destroyed)return;
     clearTimeout(req.timer);pending.delete(transfer.ref);say('Imagem recebida e disponível no mapa.');req.resolve(img);
    }).catch(error=>{clearTimeout(req.timer);pending.delete(transfer.ref);req.reject(error);});
   }
  };
 }
 async function answerPlayer(peerId,offer,sess){
  if(destroyed||!hosting||activeSession!==sess)return;
  const old=remotePeers.get(peerId);
  if(old?.offer===offer)return;
  if(old){try{old.channel?.close();old.pc.close();}catch(_){} remotePeers.delete(peerId);}
  const pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
  const peer={uid:peerId,offer,pc,open:false,channel:null,queue:Promise.resolve()};
  remotePeers.set(peerId,peer);
  try{
   pc.ondatachannel=event=>attachChannel(peer,event.channel);
   pc.onconnectionstatechange=()=>{
    if(destroyed)return;
    if(pc.connectionState==='failed')say('Conexao com jogador falhou. Tente outra rede ou configure TURN.');
   };
   await pc.setRemoteDescription({type:'offer',sdp:offer});
   let stream=null;
   try{stream=getAudioStream();}catch(err){console.warn('NEX live audio indisponivel',err);}
   if(stream?.getAudioTracks()?.length){
    pc.addTrack(stream.getAudioTracks()[0],stream);
   }
   await pc.setLocalDescription(await pc.createAnswer());
   await waitIce(pc);
   if(!hosting||activeSession!==sess||destroyed){pc.close();return;}
   const answer=pc.localDescription?.sdp;
   if(!answer)throw Error('Resposta de conexao vazia');
   await setDoc(doc(db,'campaigns',campaignId,'vttLivePeers',peerId),{answer},{merge:true});
  }catch(error){
   if(!destroyed)say('Falha ao conectar jogador: '+String(error.message).slice(0,100));
   pc.close();remotePeers.delete(peerId);
  }
 }
 function watchPeers(){
  if(unsubPeers)unsubPeers();
  unsubPeers=onSnapshot(peersRef,snap=>{
   if(!hosting||!activeSession)return;
   for(const d of snap.docs){
    const v=d.data();
    if(d.id===uid||v?.uid!==d.id||v.session!==activeSession||typeof v.offer!=='string'||v.offer.length>45000)continue;
    void answerPlayer(d.id,v.offer,activeSession);
   }
  },error=>say('Falha no sinal da campanha: '+String(error.message).slice(0,110)));
 }
 async function start(){
  if(destroyed||hosting)return;
  hosting=true;activeSession=crypto.randomUUID();
  say('Conectando aos jogadores...');
  try{
   await setDoc(sessionRef,{active:true,session:activeSession,gmUid:uid,updatedAt:Date.now()});
   watchPeers();say('Mesa online. Compartilhamento local ativo.');
  }catch(error){
   hosting=false;activeSession='';
   say('Nao foi possivel iniciar. Publique as regras de transmissao do Firestore. '+String(error.message).slice(0,100));
  }
 }
 async function stop(){
  if(!hosting)return;
  hosting=false;activeSession='';teardown();
  try{await setDoc(sessionRef,{active:false,session:'',gmUid:uid,updatedAt:Date.now()});say('Transmissao encerrada. Seus arquivos continuam locais.');}
  catch(error){say('Falha ao encerrar no Firestore: '+String(error.message).slice(0,120));}
  finally{say('Transmissão encerrada ao sair do Tabletop.');}
 }
 function connectToHost(sess){
  if(destroyed||gm||joinPeer?.session===sess)return;
  window.dispatchEvent(new CustomEvent('nex:vtt-session-state',{detail:{campaignId,active:false}}));
  teardown();
  const pc=new RTCPeerConnection({iceServers:ICE_SERVERS});
  const peer={pc,session:sess,open:false,receiving:null,channel:null,uid};
  joinPeer=peer;activeSession=sess;
  const channel=pc.createDataChannel('nex-files',{ordered:true});
  attachChannel(peer,channel);
  pc.addTransceiver('audio',{direction:'recvonly'});
  pc.ontrack=event=>{
   if(destroyed)return;
   const stream=event.streams?.[0]||new MediaStream([event.track]);
   if(!audioStream){
    audioStream=document.createElement('audio');
    audioStream.autoplay=true;audioStream.playsInline=true;
    audioStream.style.cssText='width:100%;margin:5px 0';
    panel.append(audioStream);
   }
   audioStream.srcObject=stream;
   audioStream.muted=false;
   void tryPlayReceivedAudio();
  };
  pc.onconnectionstatechange=()=>{
   if(destroyed)return;
   if(pc.connectionState==='failed')say('Conexao direta falhou nesta rede. Pode ser necessario servidor TURN.');
   else if(pc.connectionState==='disconnected')say('Conexao instavel. Verifique se o mestre continua conectado.');
  };
  say('Conectando ao mestre...');
  (async()=>{
   await pc.setLocalDescription(await pc.createOffer());
   await waitIce(pc);
   if(destroyed||joinPeer!==peer)return;
   const offer=pc.localDescription?.sdp;
   if(!offer)throw Error('Nao foi possivel criar a conexao');
   unsubOwn=onSnapshot(ownRef,docSnap=>{
    const data=docSnap.data();
    if(data?.session===sess&&data.answer&&pc.signalingState==='have-local-offer'){
     void pc.setRemoteDescription({type:'answer',sdp:data.answer}).catch(error=>say('Erro de sinalizacao: '+error.message));
    }
   },err=>say('Sem acesso ao sinal da sessao: '+String(err.message).slice(0,100)));
   await setDoc(ownRef,{uid,session:sess,offer,answer:''});
   setTimeout(()=>{if(!destroyed&&joinPeer===peer&&!peer.open)say('Sem conexao direta ainda. Verifique se o mestre esta online e se a rede permite WebRTC.');},18000);
  })().catch(error=>{if(!destroyed)say('Falha na conexao: '+String(error.message).slice(0,130));});
 }
 const unsubscribe=onSnapshot(sessionRef,snapshot=>{
  if(destroyed||gm)return;
  const s=snapshot.data();
  // O botão só será liberado quando a conexão direta com o mestre abrir.
  if(!(s?.active&&typeof s.session==='string'&&s.session&&s.gmUid!==uid))
   window.dispatchEvent(new CustomEvent('nex:vtt-session-state',{detail:{campaignId,active:false}}));
  if(s?.active&&typeof s.session==='string'&&s.session&&s.gmUid!==uid){
   if(joinPeer?.session!==s.session)connectToHost(s.session);
  }else{
   if(joinPeer)teardown();
   activeSession='';
   say('Aguardando o mestre iniciar a sessao.');
  }
 },error=>{
  if(!gm)window.dispatchEvent(new CustomEvent('nex:vtt-session-state',{detail:{campaignId,active:false}}));
  say('Nao foi possivel acompanhar o inicio da campanha: '+String(error.message).slice(0,120));
 });
 const onTabletopView=event=>{
   if(!gm||destroyed||event.detail?.campaignId!==campaignId)return;
   if(event.detail.open)void start();else void stop();
  };
  window.addEventListener('nex:vtt-view',onTabletopView);

 function sendTokenAction(action,id,extra={}){
  if(gm||!joinPeer?.open||joinPeer.channel?.readyState!=='open')return false;
  if(!['delete','paste','variation'].includes(action)||typeof id!=='string'||id.length>100)return false;
  joinPeer.channel.send(JSON.stringify({type:'token-action',action,id,
   sourceId:typeof extra.sourceId==='string'?extra.sourceId.slice(0,100):'',variation:extra.variation}));
  return true;
 }
 function sendTokenMove(id,x,y,final=false){
  if(gm||!joinPeer?.open||joinPeer.channel?.readyState!=='open')return false;
  if(typeof id!=='string'||id.length>100||!Number.isFinite(x)||!Number.isFinite(y))return false;
  if(!final&&joinPeer.channel.bufferedAmount>BUFFER_LIMIT)return false;
  joinPeer.channel.send(JSON.stringify({type:'token-move',id,x,y,final:!!final}));
  return true;
 }
 function fetchImage(src){
  if(gm||!LOCAL_REF.test(src||''))return Promise.reject(Error('Imagem invalida'));
  if(!joinPeer?.open||joinPeer.channel?.readyState!=='open')return Promise.reject(Error('Aguardando o mestre iniciar a transmissao'));
  if(pending.has(src))return pending.get(src).promise;
  let resolve,reject;
  const promise=new Promise((a,b)=>{resolve=a;reject=b;});
  const timer=setTimeout(()=>{pending.delete(src);reject(Error('Imagem nao chegou. Verifique conexao direta.'));},90000);
  pending.set(src,{promise,resolve,reject,timer});
  joinPeer.channel.send(JSON.stringify({type:'get',ref:src}));
  return promise;
 }
 return {
  connected:()=>Boolean(!gm&&joinPeer?.open&&joinPeer.channel?.readyState==='open'),
  fetchImage,
  broadcastScene,
  broadcastTokenMove,
  sendTokenMove,
  sendTokenAction,
  destroy(){
   if(destroyed)return;
   const shouldStop=gm&&hosting;
   destroyed=true;unsubscribe();window.removeEventListener('nex:vtt-view',onTabletopView);
   if(!gm){document.removeEventListener('pointerdown',retryPlayOnInteraction,true);document.removeEventListener('keydown',retryPlayOnInteraction,true);}
   teardown();panel.remove();
   if(shouldStop)void setDoc(sessionRef,{active:false,session:'',gmUid:uid,updatedAt:Date.now()}).catch(()=>{});
   if(!gm)void deleteDoc(ownRef).catch(()=>{});
  }
 };
}
