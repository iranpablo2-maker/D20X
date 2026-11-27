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

A branch experimental já implementa o estado operacional das fichas compartilhadas (edições, PV/PE/SAN e efeitos) no IndexedDB do mestre, com solicitações e distribuição por WebRTC. O cadastro inicial das fichas, campanhas multiplayer, membros, convites, atribuições e permissões ainda dependem do Firestore; cópias remotas anteriores não são removidas. Em caso de desconexão, uma solicitação pendente é rejeitada, e o jogador deve conferir o estado após reconectar antes de repetir uma alteração, pois ela pode ter sido salva pelo mestre. Essa implementação ainda requer testes reais de persistência, permissões e reconexão. Publicação da branch principal depende de validação real. A migração não é replicação automática entre dispositivos. Uma origem de preview diferente tem armazenamento local diferente do site de produção. Não limpar os dados do navegador nem apagar as coleções antigas.

## Teste de aceitação

1. Antes de testar, faça o backup completo de fichas na versão principal.
2. Na versão de teste, entre com a mesma conta. Confirme que a importação conclui.
3. Compare as fichas, homebrews e campanhas locais com o backup; edite uma ficha, recarregue e confirme a edição. Confirme que não houve nova gravação em nex_v3.
4. Saia e volte à mesma conta. Confirme que não há nova importação. Teste a outra conta em um perfil de navegador separado.
5. Com mestre e jogador em dispositivos distintos, teste chat, tokens, mapas, recuperação de conexão, permissões e alterações compartilhadas.
6. Verifique o salvamento com espaço de armazenamento insuficiente e falha de rede. Não considere a migração concluída se a confirmação local falhar.
7. Mantenha a versão principal disponível até a validação de todos os cenários.

Sem TURN, algumas redes não conseguem estabelecer WebRTC direto. Não há garantia de conectividade universal.

## Dados e iniciativa no Tabletop

- O rolador público da barra de ferramentas solicita ao mestre a geração dos dados via WebRTC; a solicitação aceita somente membros atuais da campanha, 1–20 dados e faces d4/d6/d8/d10/d12/d20/d100. O histórico da cena é salvo no IndexedDB do mestre e distribuído por WebRTC.
- O mestre possui uma opção de rolagem secreta, sem histórico compartilhado. Os jogadores acompanham a ordem, rodada e pontuações de iniciativa existentes no estado da cena.
- Testar com dois dispositivos: rolar publicamente como mestre e jogador, verificar histórico nos dois, recarregar a mesa do mestre, confirmar iniciativa e histórico, e testar uma queda de conexão durante uma rolagem. Uma confirmação de resultado não garante persistência se houver falha do banco local.
- A correção das regras de iniciativa por sistema ainda precisa de revisão separada. Não publicar em produção sem testes.

## Resultados de fichas compartilhadas

- O registro central `logResult` das fichas editáveis abertas no Tabletop encaminha o resultado já calculado (atributos, perícias, ataques e habilidades que usam esse registro). A conjuração rápida e completa e o teste de resistência do ritual também encaminham seus resultados numéricos. Não são gerados dados novamente.
- O mestre verifica associação e permissão sobre a ficha pública; fichas ocultas não publicam. O histórico fica na cena local e é distribuído por WebRTC. Resultados vindos das fichas são declarados pelo cliente, não verificados matematicamente pelo mestre; não constituem proteção contra manipulação de dados pelo jogador. A confirmação de recepção não garante persistência se IndexedDB falhar.
- Testar atributos, perícias, ataques, habilidades e rituais individualmente com dois dispositivos, bem como ficha oculta, ficha pessoal fora da mesa e jogador sem atribuição. Rolagens de NPCs/ameaças e sistemas alternativos que não usam logResult não foram integradas nesta etapa.

## Rolagens privadas do Escudo do Mestre

- A mini ficha de NPC e as fichas de ameaças do catálogo abertas dentro do Escudo guardam a última rolagem apenas em memória privada. O botão Compartilhar resultado publica explicitamente o resultado já calculado, sem gerar novos dados. A identidade do NPC/ameaça não é adicionada automaticamente ao histórico; o mestre deve conferir os rótulos antes de compartilhar.
- Somente o mestre pode publicar, com a campanha e a mesa abertas. O evento vai para o histórico local da cena e é enviado pelo WebRTC. A rolagem privada não é gravada nesse histórico. A confirmação do evento não garante persistência se o IndexedDB falhar.
- Testar NPC (atributo, perícia e expressões da ficha), ameaça do catálogo, rolagem privada, compartilhamento repetido, troca de ficha/campanha, mestre sem mesa aberta e sincronização com jogador em outro dispositivo. A ficha nativa de ameaça Homebrew continua disponível pelo botão Editar; a visualização operacional e suas rolagens foram integradas na etapa abaixo. Não houve teste real em dois dispositivos nesta etapa.

## Ameaças Homebrew e sistemas manuais

- As ameaças Homebrew possuem uma visualização operacional dentro do Escudo, com rolagens de atributos, testes cadastrados e expressões de ações. O resultado fica privado até o mestre compartilhar explicitamente; o editor original permanece acessível. Somente expressões reconhecidas pelo rolador são automatizadas.
- Sacramento e Assimilação: fichas universais vinculadas podem ser editadas por mestre ou jogador responsável e gravadas no IndexedDB do mestre. Os campos editáveis são validados e as alterações conflitantes são recusadas. O rolador manual aceita expressões de dados e, opcionalmente, maior/menor d20; seus resultados públicos são compartilhados pelo WebRTC durante a mesa.
- O painel de combate desses sistemas não oferece a automação de ataque, recursos e iniciativa de Ordem Paranormal. Há ordenação manual de turnos e avanço manual de rodada. Não foram implementadas regras oficiais específicas, bibliotecas de NPCs/ameaças desses sistemas ou automações completas.
- Validar com mestre e jogador em navegadores distintos: vínculo e edição de cada sistema, conflito de edição, recarga, rolagem, troca de campanha, permissões, edição e compartilhamento de ameaça Homebrew. As fichas pessoais universais e as cópias da campanha continuam independentes. Nenhum teste real de multiplayer foi executado nesta etapa.

## Migração dos dados privados e metadados da campanha

- `D20X_CAMPAIGNS_LOCAL` armazena, por UID e campanha, o Escudo do Mestre (anotações, NPCs, ameaças e respectivos dados) e metadados (nome, descrição e capa). Primeira importação do Escudo e metadados antigos usa leitura do servidor e seed transacional que não sobrescreve um registro existente. As antigas cópias do Firestore não são apagadas. Novas campanhas mantêm apenas descrição vazia no registro remoto; a descrição e a capa são gravadas localmente. O título continua atualizado no índice remoto para descoberta.
- Metadados atuais são enviados somente a membros aprovados durante a sessão WebRTC. Antes da conexão, o jogador pode ver a descrição/capa legada ou vazia; o mestre deve usar o navegador que contém os dados locais. O Escudo permanece privado e não é enviado a jogadores.
- Exportar dados locais gera JSON dos registros confirmados do mestre: metadados, Escudo, fichas operacionais e cena. Não inclui blobs externos de mídias, credenciais, convites ou permissões; não existe importador de restauração completo nesta etapa. Não é uma cópia atômica de todos os bancos, então exportar com a mesa em repouso. Não compartilhar o arquivo privado.
- Conexões WebRTC do mestre passam a exigir lista de membros confirmada pelo servidor; conexões removidas são encerradas e novas solicitações diretas de membros não autorizados são recusadas. Em caso de lista indisponível/cache sem confirmação, o acesso direto é bloqueado. Dados já recebidos por um jogador não podem ser recuperados remotamente.
- **Ainda remoto:** autenticação, índice de campanhas, membros, convites/solicitações, atribuições e cadastro inicial de fichas, sinalização WebRTC e fluxos de exclusão. Não é seguro remover a camada de autorização antes de implementar um substituto autenticado e testar o fluxo de convites. Regras do Firestore não foram alteradas nem publicadas. A remoção de campanhas remotas não remove automaticamente as cópias locais; não apagar registros antigos durante a migração.
- Verificações realizadas: análise de sintaxe JavaScript (imports/exports retirados apenas para análise no parser) dos módulos modificados e do script principal de multiplayer; sem execução em navegador, teste real de IndexedDB ou WebRTC, nem validação das regras em produção. Não publicar sem testes reais. 
