# D20X — migração local-first (branch experimental)

## O que mudou nesta etapa

- Login Google continua no Firebase Authentication.
- O sincronizador de conta não grava fichas, homebrews, campanhas pessoais ou o perfil adicional em `users/{uid}/nex_v3`.
- Uma importação inicial por UID usa uma consulta ao servidor e mantém uma cópia prévia no IndexedDB `D20X_LOCAL_MIGRATION`, store `backups`. A marca de conclusão só é escrita após confirmação do banco local.
- Dados pessoais permanecem no armazenamento já utilizado pelo D20X: `localStorage` e `NEX_FICHAS_SEGURAS` (IndexedDB).
- A importação usa IDs, preserva a versão local mais recente, não restaura IDs apagados localmente e não exclui documentos remotos.
- O perfil do navegador é reservado a uma conta; para outra conta use outro perfil do navegador.
- A versão principal e regras do Firebase não são modificadas.

## O que já existia

A cena do Tabletop usa IndexedDB no dispositivo do mestre e WebRTC para distribuir a cena, tokens, chat e mídias durante a sessão. O Firestore é utilizado na sinalização e nas permissões existentes.

## Limitações / próximos pontos a validar

Campanhas multiplayer, membros, convites, fichas compartilhadas, atribuições, PV/PE/SAN e efeitos entre fichas ainda usam os documentos do Firestore. Esta etapa não desativa essas rotas, para preservar permissões e compatibilidade. Publicação da branch principal depende de validação real. A migração não é replicação automática entre dispositivos. Uma origem de preview diferente tem armazenamento local diferente do site de produção. Não limpar os dados do navegador nem apagar as coleções antigas.

## Teste de aceitação

1. Antes de testar, faça o backup completo de fichas na versão principal.
2. Na versão de teste, entre com a mesma conta. Confirme que a importação conclui.
3. Compare as fichas, homebrews e campanhas locais com o backup; edite uma ficha, recarregue e confirme a edição. Confirme que não houve nova gravação em nex_v3.
4. Saia e volte à mesma conta. Confirme que não há nova importação. Teste a outra conta em um perfil de navegador separado.
5. Com mestre e jogador em dispositivos distintos, teste chat, tokens, mapas, recuperação de conexão, permissões e alterações compartilhadas.
6. Verifique o salvamento com espaço de armazenamento insuficiente e falha de rede. Não considere a migração concluída se a confirmação local falhar.
7. Mantenha a versão principal disponível até a validação de todos os cenários.

Sem TURN, algumas redes não conseguem estabelecer WebRTC direto. Não há garantia de conectividade universal.
