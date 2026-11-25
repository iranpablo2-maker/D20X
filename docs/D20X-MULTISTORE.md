# NEX MultiStore — Local + Turso + Cloudflare D1
Status: **infraestrutura opcional adicionada; integração de dados ainda não ativada**. O Firestore continua como armazenamento principal de fichas e campanhas. Não apague nenhum banco existente.

## Arquitetura
- Conta Google continua autenticando no Firebase Authentication. O servidor verifica a assinatura do ID token.
- IndexedDB local por UID em `d20x-multistore.js` (persistência no navegador, não sincroniza sozinho).
- Cloudflare Pages Functions: `/api/d20x-data?store=d1&key=...` para registros do próprio usuário.
- Turso: `/api/d20x-data?store=turso&key=...` para registros do próprio usuário.
- API implementa GET/PUT/DELETE para registros JSON de até 100 KB. **Não usar para armazenar GIFs ou mapas grandes.**
- Cada registro é privado do seu UID. Permissões de campanhas compartilhadas e sincronização em tempo real **ainda não foram implementadas** nesse serviço.

## Provisionar serviços (ações manuais)
1. Cloudflare: criar um banco D1 e adicionar o binding **D20X_D1** no projeto Pages que serve o D20X. Deploy Functions requer projeto Pages com suporte a Functions (verificar que não é deploy somente estático por integração externa).
2. Criar banco Turso, pegar a URL HTTPS de conexão e gerar um token de acesso.
3. Nas variáveis privadas do projeto Cloudflare Pages, adicionar `FIREBASE_PROJECT_ID`, `TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`. **Nunca publicar o token do Turso no GitHub ou JavaScript público.**
4. Em **ambos** os bancos, executar:
```sql
CREATE TABLE IF NOT EXISTS nex_records (
 uid TEXT NOT NULL,
 record_key TEXT NOT NULL,
 body TEXT NOT NULL,
 updated_at INTEGER NOT NULL,
 PRIMARY KEY (uid, record_key)
);
```
5. Fazer deploy e confirmar que a rota `/api/d20x-data` aparece no Cloudflare; sem bindings ela responde 503 e não altera dados.
6. Conectar depois chamadas do app ao `createNexMultiStore({uid,getIdToken})`. Exemplo: `getIdToken: () => auth.currentUser.getIdToken()`. Primeiramente testar só com cópias de dados, nunca com o banco original.

## Limitações e cuidados
- Não substituir Firebase Authentication: manter conta Google.
- Não migrar imagens, fichas ou campanhas automaticamente sem testar permissões e backups.
- A função valida o JWT do Firebase; o Turso é chamado exclusivamente no servidor, sem expor o token.
- A API atual é privada por usuário; compartilhamento entre mestre e jogadores exige autorização por campanha no backend.
- Salvar dados localmente não significa backup automático: limpar o armazenamento do navegador pode apagá-los.
- D1 e Turso têm cotas gratuitas independentes. Não são um único espaço de armazenamento.
- Esta API não substitui a sincronização em tempo real atualmente implementada com Firestore.
