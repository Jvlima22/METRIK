# Guia de Banco de Dados — Metrik Integration Hub

## Estado da implementação

O backend do Hub já possui rotas autenticadas em `/integrations` para catálogo, criação, listagem, teste seguro, pausa, retomada e remoção de conexões. A migration ainda **não foi executada** no Supabase; isso precisa ser feito pelo responsável pelo banco.

## 1. Gerar a chave de criptografia

A Metrik criptografa API keys, tokens e credenciais OAuth no backend usando AES-256-GCM. Gere uma chave de 32 bytes em hexadecimal no computador seguro:

```bash
openssl rand -hex 32
```

Adicione o resultado somente no ambiente do backend:

```env
INTEGRATION_SECRETS_KEY=cole_a_chave_hexadecimal_aqui
```

Não coloque esse valor no frontend, no Git, no Supabase público ou em mensagens. Em produção, prefira um secret manager. Se a chave for perdida, os tokens armazenados não poderão ser descriptografados.

## 2. Aplicar a migration no Supabase

Abra o projeto correto no Supabase, entre em **SQL Editor**, crie uma nova query e cole o conteúdo integral de:

```text
docs/2026-08-18-integration-hub.sql
```

Execute a migration uma única vez. Ela cria:

| Tabela | Responsabilidade |
|---|---|
| `integration_connections` | Provedor, método de autenticação, status, escopos, conta externa e credenciais criptografadas. |
| `integration_sync_jobs` | Cursor, direção, idempotência, tentativas, status e falhas de sincronização. |
| `integration_audit_logs` | Registro de criação, teste, pausa, remoção e ações futuras. |

A migration também cria índices e habilita RLS. Não remova RLS para “fazer funcionar”. O backend deve usar a service role somente no servidor, nunca no navegador.

## 3. Confirmar as tabelas

No SQL Editor, execute:

```sql
select table_name
from information_schema.tables
where table_schema = 'public'
  and table_name in ('integration_connections', 'integration_sync_jobs', 'integration_audit_logs')
order by table_name;
```

O resultado esperado são as três tabelas.

Confirme as colunas sensíveis:

```sql
select column_name, data_type
from information_schema.columns
where table_schema = 'public'
  and table_name = 'integration_connections'
order by ordinal_position;
```

Os campos `credentials_ciphertext`, `credentials_iv` e `credentials_tag` devem existir. Nenhum campo deve armazenar API key ou token em texto puro.

## 4. Configurar o backend

No `.env` do backend, mantenha as credenciais do Supabase e adicione:

```env
SUPABASE_URL=https://seu-projeto.supabase.co
SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
INTEGRATION_SECRETS_KEY=...
```

A `SUPABASE_SERVICE_ROLE_KEY` e a `INTEGRATION_SECRETS_KEY` devem existir somente no backend. Após alterar o `.env`, reinicie a API.

## 5. Testar o contrato atual

Com um JWT válido do Supabase:

```bash
curl -H "Authorization: Bearer SEU_JWT" \
  http://localhost:3000/integrations/catalog
```

Listar conexões:

```bash
curl -H "Authorization: Bearer SEU_JWT" \
  http://localhost:3000/integrations/connections
```

Criar um rascunho sem credencial real:

```bash
curl -X POST http://localhost:3000/integrations/connections \
  -H "Authorization: Bearer SEU_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openai",
    "authType": "API_KEY",
    "workspaceName": "Empresa de teste",
    "scopes": ["analysis"],
    "metadata": {"mode": "sandbox"}
  }'
```

Para testar uma conexão, substitua `CONNECTION_ID`:

```bash
curl -X POST \
  -H "Authorization: Bearer SEU_JWT" \
  http://localhost:3000/integrations/connections/CONNECTION_ID/test
```

O teste atual é um health check seguro de metadados e marca a conexão como verificada. Ele ainda não chama os provedores externos. Os adaptadores OAuth e API key reais serão adicionados depois da configuração das credenciais e aplicativos de cada provedor.

## 6. Configurar OAuth posteriormente

Para Pipedrive, Google Ads, Meta Ads e Manus OAuth2, crie no backend as variáveis de cada aplicativo:

```env
PIPEDRIVE_CLIENT_ID=
PIPEDRIVE_CLIENT_SECRET=
PIPEDRIVE_REDIRECT_URI=https://api.seudominio.com/integrations/oauth/pipedrive/callback
GOOGLE_ADS_CLIENT_ID=
GOOGLE_ADS_CLIENT_SECRET=
GOOGLE_ADS_REDIRECT_URI=https://api.seudominio.com/integrations/oauth/google-ads/callback
META_ADS_APP_ID=
META_ADS_APP_SECRET=
META_ADS_REDIRECT_URI=https://api.seudominio.com/integrations/oauth/meta-ads/callback
MANUS_CLIENT_ID=
MANUS_CLIENT_SECRET=
MANUS_REDIRECT_URI=https://api.seudominio.com/integrations/oauth/manus/callback
```

Os client secrets são da aplicação da Metrik e não devem ser confundidos com os tokens dos clientes. O fluxo deverá usar `state`, PKCE quando suportado, callback HTTPS, troca server-side do authorization code, refresh token criptografado e escopos mínimos.

## 7. RLS e acesso administrativo

As policies criadas permitem que um usuário veja e altere apenas conexões cujo `owner_user_id` seja igual a `auth.uid()`. O painel administrativo não deve fazer consultas sem filtro de tenant. Se a Metrik possuir organizações, o próximo passo é adicionar `organization_id` às três tabelas e substituir a regra por membership da organização.

O Supabase service role ignora RLS. Por isso, qualquer endpoint administrativo que a utilize deve validar explicitamente organização, papel e motivo da operação. Nunca envie respostas contendo `credentials_ciphertext`, `credentials_iv` ou `credentials_tag`.

## 8. Backup, rotação e revogação

Configure backup do banco e retenção compatível com o negócio. Para rotacionar uma chave de provedor, use uma nova conexão ou substitua o segredo através de endpoint seguro; não registre o novo valor em logs. Para revogar uma integração, marque como `PAUSED`, revogue o token no provedor e remova os campos criptografados depois de confirmar que não existem jobs em execução.

A chave `INTEGRATION_SECRETS_KEY` precisa de procedimento próprio de backup seguro. Ela não deve ser armazenada no mesmo banco que os ciphertexts.

## 9. Checklist antes de produção

| Verificação | Obrigatória |
|---|---:|
| Migration executada no projeto Supabase correto | Sim |
| RLS habilitado nas três tabelas | Sim |
| `INTEGRATION_SECRETS_KEY` configurada no backend | Sim |
| Service role ausente do frontend | Sim |
| Logs mascaram tokens e headers | Sim |
| OAuth callbacks usam HTTPS e `state` | Sim |
| Scopes mínimos por provedor | Sim |
| Idempotência e retries para sincronização | Sim |
| Auditoria para ações de escrita | Sim |
| Escrita externa bloqueada sem aprovação | Sim |
| Backup e rotação documentados | Sim |

## 10. Próxima etapa

Depois que a migration for aplicada e o ambiente tiver `INTEGRATION_SECRETS_KEY`, a próxima implementação deve conectar o modal do frontend aos endpoints atuais. Em seguida, deve adicionar os callbacks OAuth, os adaptadores reais de cada provedor, os workers de sincronização e a fila de aprovação para ações de escrita.
