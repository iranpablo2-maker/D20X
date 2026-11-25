# Cloudflare R2 — integração antiga opcional

**A configuração do R2 não é necessária para o funcionamento dos novos uploads no D20X Tabletop.**

O modo ativo do Tabletop mantém todos os novos mapas, tokens, GIFs e músicas no navegador do mestre. Quando a sessão começa, o NEX tenta compartilhar as imagens diretamente com os jogadores e transmite o som ao vivo via WebRTC.

O código mantém leitura de referências antigas `r2:` e `firestore:` para não perder a compatibilidade. Se o R2 já tiver sido configurado, arquivos antigos no bucket poderão continuar funcionando.

O arquivo `wrangler.toml` conserva a configuração do banco Cloudflare D1, mas **não é preciso criar bucket R2 ou vincular `NEX_MEDIA` para usar o novo modo local**.

Consulte [CONFIGURAR-STORAGE.md](./CONFIGURAR-STORAGE.md) para instruções de publicação das regras Firestore, como iniciar a sessão e limitações de redes WebRTC.
