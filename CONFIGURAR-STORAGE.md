# NEX Tabletop — local, Firestore legado e Cloudflare R2

## Situação atual
A interface do Tabletop tem duas opções para novas imagens:
- **Neste dispositivo (não compartilha)**: dados de imagem persistem no IndexedDB local, se houver espaço.
- **R2 na nuvem (compartilha com jogadores)**: mapas, GIFs e tokens vão diretamente ao bucket privado R2, depois que ele for criado e vinculado.

Imagens já salvas no Firestore continuam legíveis. O estado do Tabletop, posições e permissões continuam no Firebase Firestore. O Cloudflare D1 continua disponível para dados estruturados.

## Antes de usar R2
Leia e siga [CONFIGURAR-R2.md](./CONFIGURAR-R2.md).
Ainda é necessário criar o bucket **`nex-vtt-media`**, vincular o recurso **`NEX_MEDIA`** ao Pages e atualizar **`wrangler.toml`**. Sem isso, o envio em nuvem apresentará aviso de configuração, mas o modo local e arquivos antigos continuarão funcionando.

Confira o estado em [Diagnóstico R2](https://nexrpg.pages.dev/api/nex-r2-health). O resultado esperado depois de configurar é `"r2Configured":true`.

## Compatibilidade
- Até 10 MB para cada nova imagem na nuvem R2.
- Até 5 MB para cada nova imagem apenas local.
- Até 8 atmosferas e 20 imagens de tokens na biblioteca por cena.
- Cache IndexedDB separado por conta e campanha; pode ser removido pelo navegador.
- O acesso ao R2 é autenticado com Firebase; somente o mestre pode enviar e excluir; jogadores da campanha podem ler os arquivos.

## Custos
O R2 Standard possui cota gratuita própria, mas **não é gratuito e ilimitado**. Os limites por campanha existentes no NEX não substituem acompanhamento da cota da conta Cloudflare. Não ative faturamento pago sem avaliar antes.
