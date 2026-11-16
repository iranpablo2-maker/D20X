# NEX Tabletop — atmosferas com GIFs maiores sem plano Blaze

## Solução atualmente utilizada

O NEX usa **Cloud Firestore**, que já funciona no plano gratuito Spark,
para guardar GIFs e imagens de atmosfera em documentos menores.

- PNG, JPG, WebP e GIF de até **5 MB cada**.
- Até **8 atmosferas** na cena.
- GIFs são mantidos em sua forma original, com animação.
- Cada arquivo é dividido em partes de até 240.000 caracteres base64 e
  guardado em `campaigns/{campaignId}/tabletopMedia/{id}/chunks/{indice}`.
- O estado da mesa salva somente uma referência
  `firestore:atmo_ID:QUANTIDADE:FORMATO`.
- Apenas o mestre envia, apaga ou altera o efeito;
  jogadores da campanha conseguem carregar os arquivos.
- Os controles de ON/OFF e opacidade continuam na Biblioteca de Artes > Mapa.

## Única configuração obrigatória

1. Abra [Firestore > Rules](https://console.firebase.google.com/project/nex-rpg/firestore/rules).
2. Copie **todo** o conteúdo do arquivo [firestore.rules](./firestore.rules)
   e publique no **Firestore**, substituindo as regras anteriores.
3. Atualize o NEX com **Ctrl + F5** e teste o GIF.

Não é necessário usar Firebase Storage nem atualizar para Blaze para esta solução.
O antigo `storage.rules` permanece no repositório como alternativa opcional
e **não precisa ser publicado**.

## Limites da conta gratuita

O Firebase Firestore tem quotas de armazenamento e operações no plano Spark.
Cada GIF gera várias escritas ao enviar e várias leituras ao carregar para cada jogador.
Atingir a quota pode suspender operações até a quota ser renovada.
Confira as quotas oficiais em https://firebase.google.com/docs/firestore/quotas.

## Resolução de problemas

- **PERMISSION_DENIED**: confira se publicou o arquivo completo `firestore.rules` atualizado.
- **Falha ao gravar uma parte**: pode ser quota atingida ou conexão instável; tente novamente.
- **GIF fica imóvel**: confirme que o arquivo realmente contém vários quadros animados.
- **GIF grande demais**: o limite desta implementação sem Storage é de 5 MB.
- **Interface antiga**: recarregue com Ctrl+F5 para limpar o cache.

