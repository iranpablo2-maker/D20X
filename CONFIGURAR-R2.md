# Cloudflare R2 para imagens do NEX Tabletop

**Estado:** API e cliente preparados no GitHub; faltam criar o bucket e a vinculação de produção. A existência deste arquivo não significa que o R2 esteja ativo.

## Configurar uma única vez

1. No Cloudflare, entre em **Armazenamento e bancos de dados → R2 Object Storage**. Ative R2 apenas se aceitar as condições de faturamento apresentadas. Não ative recursos pagos nem forneça cartão sem entender as condições.
2. Crie um bucket com nome **`nex-vtt-media`**, classe **Standard**. Não publique o bucket nem ative acesso público.
3. Em **Workers e Pages → nexrpg → Configurações → Associações → Adicionar**, selecione **Bucket R2**, configure nome da variável **`NEX_MEDIA`** e selecione bucket **`nex-vtt-media`**.
4. Como este projeto usa **`wrangler.toml`** no GitHub, também acrescente ao arquivo, **depois que o bucket estiver criado**:

```toml
[[r2_buckets]]
binding = "NEX_MEDIA"
bucket_name = "nex-vtt-media"
```

5. Faça uma nova implantação e abra **https://nexrpg.pages.dev/api/nex-r2-health**. Procure `"r2Configured":true`.
6. Entre numa campanha do NEX como mestre, selecione **R2 na nuvem (compartilha com jogadores)** no Tabletop, envie mapa/GIF/token e abra a campanha em outro aparelho para verificar.

## Segurança e funcionamento

- A função de upload **`/api/nex-vtt-media`** exige login Firebase válido, consulta as regras de acesso da campanha no Firestore e permite upload/exclusão **somente ao mestre**.
- O download também exige login e participação na campanha. Não é necessário bucket público.
- Arquivos novos em modo nuvem vão ao R2. Arquivos antigos com prefixo `firestore:` continuam legíveis. Arquivos `local:` continuam somente no dispositivo original.
- O Firestore guarda apenas as referências dos arquivos e o estado da mesa. O IndexedDB evita repetir o download quando o cache contém a imagem.
- Até 10 MB por arquivo R2, 200 arquivos e 300 MB por campanha como limites iniciais de proteção (concorrência pode ultrapassar esses limites). **Esses limites NÃO garantem que a conta não excederá a cota gratuita**, pois várias campanhas compartilham a mesma cota e há limites de operações.
- R2 Standard tem limite gratuito mensal de 10 GB-mês de armazenamento, 1 milhão operações Classe A e 10 milhões Classe B; excedentes podem ser cobrados. Monitore o uso e configure os controles de cobrança disponíveis na conta.
- Não apague o Firebase nem migre imagens antigas automaticamente antes dos testes. A conexão D1 existente permanece.
