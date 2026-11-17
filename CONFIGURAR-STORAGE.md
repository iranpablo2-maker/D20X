# Armazenamento do NEX — regras por categoria

O NEX Tabletop salva novos **mapas** e **tokens** (incluindo tokens GIF animados) no Cloudflare R2 para compartilhamento entre dispositivos. O Firestore continua responsável pelo estado da mesa, posições e permissões.

**GIFs de atmosfera e músicas ficam no navegador do mestre (IndexedDB)**. As atmosferas são visíveis somente no dispositivo que armazena o arquivo; músicas tocam apenas nele. O navegador pode apagar os dados locais ao limpar o site ou por restrição de espaço.

A biblioteca de músicas locais aparece como **♫ Músicas e sons locais** nas ferramentas do mestre, com reprodução e exclusão. Não há envio de músicas à nuvem.

Novos uploads usam destino automático por categoria: token GIF = R2; GIF de chuva/neblina = local.

## Como ativar

Leia [CONFIGURAR-R2.md](./CONFIGURAR-R2.md). Ainda é necessário criar o bucket privado `nex-vtt-media`, associá-lo como `NEX_MEDIA` ao Cloudflare Pages e atualizar `wrangler.toml` após a criação.

Sem bucket configurado, uploads de mapas e tokens no R2 falharão com aviso, mas os arquivos antigos do Firestore e imagens já guardadas localmente continuam legíveis. Não apague o Firebase nem realize migração automática antes de testar.

Diagnóstico da conexão: https://nexrpg.pages.dev/api/nex-r2-health
