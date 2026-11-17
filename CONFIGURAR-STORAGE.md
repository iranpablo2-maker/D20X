# NEX Tabletop — todos os novos arquivos locais, compartilhados ao iniciar a sessão

## Como funciona

1. O mestre adiciona mapas, tokens estáticos/animados, GIFs de atmosfera e músicas ao NEX.
2. **Tudo fica somente no IndexedDB do navegador do mestre**. Não há novos uploads ao R2, D1 ou Firestore.
3. Quando quiser jogar, o mestre abre a campanha e clica em **Iniciar sessão e compartilhar**.
4. Os jogadores da campanha conectam automaticamente ao mestre por **WebRTC**. O mestre envia mapas, tokens e GIFs diretamente pela conexão, em vez de dividir os arquivos no Firebase.
5. Para músicas, o mestre toca a faixa em **♫ Músicas e sons locais**. Os jogadores clicam em **Ativar som da sessão** para ouvir a transmissão ao vivo. Os arquivos de música não são enviados.
6. Ao **Encerrar transmissão**, a transmissão direta para. Os arquivos do mestre permanecem locais.

O Firestore continua sincronizando o estado do mapa e os sinais de conexão, e o Firebase continua autenticando quem pode entrar. A sincronização via WebRTC não utiliza Cloudflare R2 nem armazenamento de arquivos em nuvem.

## Configuração obrigatória: regras de segurança

É preciso **publicar** [firestore.rules](./firestore.rules) no Firebase Console:

1. Entre em https://console.firebase.google.com/project/nex-rpg/firestore/rules
2. Abra o arquivo [firestore.rules](./firestore.rules) do GitHub.
3. Copie o conteúdo completo e substitua as regras atuais do Firebase Firestore.
4. Clique em **Publicar**.
5. Abra https://nexrpg.pages.dev/multiplayer.html e faça atualização forçada no PC; reabra no celular.

As regras adicionam somente as coleções de sinalização `campaigns/{id}/vttLive/session` e `campaigns/{id}/vttLivePeers/{uid}`. A publicação é necessária; atualizar o GitHub **não publica regras automaticamente**.

## Limitações e cuidados

- O **mestre deve manter a campanha aberta e a conexão ativa** enquanto os jogadores recebem imagens ou escutam música. Desconectar o mestre interrompe a transmissão.
- **WebRTC sem servidor TURN não conecta em todas as redes**, especialmente alguns dados móveis, VPNs e redes restritas. A interface mostrará erro de conexão se não funcionar.
- O navegador de cada jogador pode exigir um clique em **Ativar som** por causa de bloqueios de reprodução automática.
- Mapas e tokens novos: até **10 MB** por arquivo. GIFs de atmosfera novos: até **5 MB**. Músicas locais: **25 MB** por faixa (24 faixas/120 MB por campanha); o limite real depende do navegador.
- **Não limpe os dados do site do mestre sem fazer um backup dos arquivos originais.** Navegadores podem limpar o IndexedDB automaticamente em situações de pouco espaço.
- Arquivos antigos já salvos no Firestore ou no R2 continuam legíveis. A alteração não copia nem exclui esses arquivos antigos.
- Apenas jogadores autorizados podem publicar sinais de conexão. O mestre precisa iniciar a sessão para que arquivos locais sejam compartilhados.
- STUN do Google é usado apenas para negociação da conexão; os arquivos e o áudio trafegam pelos canais WebRTC entre navegadores quando uma conexão direta é possível.
- A conexão não foi validada em dois navegadores reais neste commit. Teste usando uma conta de mestre e outra de jogador antes de depender do recurso durante uma sessão.
