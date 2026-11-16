# NEX Tabletop — armazenamento híbrido (sem plano Blaze)

## Como funciona

O mestre adiciona **uma única vez** mapas, GIFs e imagens de tokens.
O arquivo original é dividido em documentos menores no Cloud Firestore e
uma referência fica no documento da campanha. PC, celular e jogadores
autorizados carregam a mesma imagem automaticamente.

Cada navegador mantém uma cópia local no **IndexedDB**, separada por
conta NEX e campanha. Nas próximas visitas, arquivos que já estão em cache
não precisam ser baixados novamente do Firestore. O cache pode ser
apagado pelo navegador ou sistema operacional; o Firestore mantém a cópia
principal para permitir recuperar imagens em qualquer dispositivo.

- Até **5 MB por imagem** (PNG/JPG/WebP/GIF).
- Até **8 camadas de atmosfera** por cena.
- Até **20 imagens na biblioteca de tokens** por cena.
- Mapas, imagens dos tokens e GIFs originais preservados na nuvem e no cache local.
- O mestre pode estar offline depois de enviar as imagens; jogadores podem carregá-las.
- A posição dos tokens, a campanha e permissões continuam usando Firestore.
- O cache tem um limite aproximado de **75 MiB por origem no navegador**;
  caso o armazenamento local esteja cheio ou indisponível, a nuvem continua
  sendo a fonte de verdade.

## Configuração obrigatória

1. Abra [Firebase Console → Firestore → Rules](https://console.firebase.google.com/project/nex-rpg/firestore/rules).
2. Copie **todo** o arquivo [firestore.rules](./firestore.rules) do GitHub.
3. Substitua as regras anteriores e clique em **Publicar**.
4. Atualize [NEX](https://nexrpg.pages.dev/multiplayer.html) com Ctrl+F5
   no computador e reabra a página no celular.
5. Teste o mesmo mapa e GIF na mesma campanha, conectado em dois dispositivos.

**Não é necessário configurar Firebase Storage, nem publicar storage.rules,
nem ativar o plano Blaze.**

## Avisos e limites

O Firestore possui cotas de espaço e de leituras/gravações.
O cache economiza leituras repetidas de mídias, **não elimina a quota
compartilhada de armazenamento do Firestore**. O serviço não é ilimitado.

Arquivos anteriormente embutidos no documento da cena continuam
compatíveis. Novos uploads de mapa, imagem de token e atmosfera
utilizam as referências `firestore:map_...`, `firestore:asset_...` e
`firestore:atmo_...`. A exclusão das novas mídias remove suas partes
se a cena for salva corretamente.

Para evitar perda de dados, não apague manualmente coleções do Firebase
sem ter uma cópia de segurança das campanhas. A exclusão de uma campanha
inteira ainda pode requerer limpeza recursiva dos arquivos associados.
