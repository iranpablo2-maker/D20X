# Ativar imagens e GIFs maiores no NEX Tabletop

O NEX Tabletop agora salva as imagens e os GIFs de atmosfera no **Firebase Storage**.
O documento Firestore da mesa armazena apenas os caminhos dos arquivos (por exemplo,
`storage:campaigns/ID_DA_CAMPANHA/atmospheres/atmo_...`).

## Configuração necessária (administrador do projeto Firebase)

1. Abra o projeto **nex-rpg** no [Firebase Console](https://console.firebase.google.com/).
2. Confirme que o **Cloud Storage para Firebase** está habilitado e que existe o bucket
   `nex-rpg.firebasestorage.app`, correspondente ao `storageBucket` da configuração Web.
3. Em **Storage > Rules**, publique o conteúdo de [storage.rules](./storage.rules).
   **Não** cole estas regras na página do Firestore: são serviços separados.
4. Caso o console solicite a ligação de permissões do Storage com o Firestore para que
   as regras possam consultar os documentos de campanhas/membros, conclua essa etapa.
5. Abra o Tabletop em `https://nexrpg.pages.dev/multiplayer.html` e atualize com Ctrl+F5.
6. Na Biblioteca de Artes > Mapa > Atmosfera, adicione um GIF de teste e confirme que
   ele continua funcionando após atualizar a página, inclusive na conta de um jogador.

## Limites e permissões

- Até **8 atmosferas** por cena.
- Arquivos **PNG, JPG, WebP e GIF** até **15 MB** cada (sem transformar GIFs em imagem estática).
- Só o **mestre** pode enviar ou excluir arquivos.
- Somente **membros da campanha e o mestre** podem obter o arquivo via SDK.
- Excluir uma atmosfera remove sua referência da mesa e solicita a exclusão no Storage.
- Atmosferas pequenas antigas guardadas no Firestore continuam compatíveis.

## Observações importantes

- Desde fevereiro de 2026, o Firebase exige o plano de faturamento **Blaze** para
  usar Cloud Storage, ainda que exista cota gratuita. Um administrador responsável
  pelo faturamento deve avaliar custos e habilitar o serviço.
- A integração foi criada no repositório, mas não significa que o serviço tenha sido
  ativado nem que as regras do Storage já estejam publicadas.
- Se o upload falhar com `storage/unauthorized`, revise as regras e a conta usada.
  Se falhar com `storage/bucket-not-found`, verifique o bucket configurado.
