# NEX Tabletop — mapa e tokens no R2; atmosfera e áudio local

## Política de armazenamento

| Tipo | Armazenamento |
|---|---|
| Mapas PNG/JPG/WebP/GIF | Cloudflare R2 (nuvem compartilhada) |
| Tokens PNG/JPG/WebP | Cloudflare R2 (nuvem compartilhada) |
| Tokens animados GIF | Cloudflare R2 (nuvem compartilhada) |
| GIFs de atmosfera (chuva, tempestade, neblina etc.) | IndexedDB local no navegador do mestre |
| Músicas e sons | IndexedDB local no navegador do mestre, com reprodução no próprio dispositivo |

Os uploads são classificados automaticamente pela área do Tabletop: **não pelo formato GIF isoladamente**. Um token em GIF vai para o R2; um efeito de chuva GIF fica local. A biblioteca de música é acessada na seção **♫ Músicas e sons locais** dentro das ferramentas do mestre.

**O conteúdo local não é sincronizado com outro dispositivo ou jogador.** O Firestore pode guardar uma referência à atmosfera, mas não copia seu arquivo. Para levá-lo ao celular, será necessário adicionar o arquivo no dispositivo (não existe importação automática entre dispositivos). Música local toca só no navegador que a abriu; não é transmitida pelo multiplayer.

## Configurar R2 (uma única vez)

**O código já está preparado no GitHub; o bucket só funcionará após a criação e vinculação no Cloudflare.**

1. No Cloudflare, abra **Armazenamento e bancos de dados → R2 Object Storage**. Avalie exigências de faturamento antes de ativar a opção.
2. Crie o bucket **`nex-vtt-media`** com classe Standard. Deixe **acesso público desativado**.
3. No projeto Pages **nexrpg → Configurações → Associações**, adicione uma associação **Bucket R2**, variável **`NEX_MEDIA`**, bucket **`nex-vtt-media`**.
4. Como o projeto usa **`wrangler.toml`**, acrescente ao arquivo após criar o bucket:

```toml
[[r2_buckets]]
binding = "NEX_MEDIA"
bucket_name = "nex-vtt-media"
```

5. Publique nova versão pelo GitHub e verifique **https://nexrpg.pages.dev/api/nex-r2-health**. O campo `r2Configured` deverá indicar `true`.
6. Teste o envio de um mapa, token estático e token GIF em uma campanha; confirme no PC e celular. Teste um GIF de chuva e uma música para confirmar que ficaram apenas no dispositivo do mestre.

## Privacidade, acesso e limites

- API R2 privada `/api/nex-vtt-media`: exige sessão Firebase válida e acesso à campanha. Apenas o mestre faz upload e exclusão; integrantes autorizados podem baixar.
- Mapas/tokens em R2: até **10 MB por arquivo**, **200 arquivos/300 MB por campanha** como limites internos iniciais. Não garantem que a conta inteira permaneça dentro da cota gratuita.
- Atmosfera local: até **5 MB por arquivo**; até **8 camadas** na cena. O navegador pode limpar o armazenamento local.
- Música local: até **25 MB por arquivo**, **24 faixas** e **120 MB** por campanha neste dispositivo. Não faz upload ao R2, Firestore ou D1. O navegador pode remover o armazenamento.
- Arquivos antigos `firestore:`, `r2:` ou `local:` existentes continuam reconhecidos: esta mudança **não migra ou exclui** arquivos antigos.
- O R2 tem cotas gratuitas mensais que **não acumulam**. Ultrapassar os limites pode gerar custos. Monitore a conta e os controles de cobrança disponíveis.
