# Integrações reais de Google Ads e Meta Ads

## O que foi implementado

A primeira etapa adiciona OAuth somente leitura para Google Ads e Meta Ads, armazenamento criptografado dos tokens no backend, estado OAuth com nonce de uso único, isolamento por `company_id`, endpoint de métricas reais e substituição dos textos mock do dashboard para empresas.

O dashboard do Global Admin continua podendo exibir o modo demonstração. Empresas comuns não recebem campanhas demo: sem dados sincronizados, os gráficos permanecem visíveis com valores zerados e o resumo informa que ainda não há dados.

## Migração Supabase

Aplicar no SQL Editor:

```text
docs/2026-08-19-real-ads-integrations.sql
```

A migração depende das tabelas existentes `companies`, `company_members` e `integration_connections`. As credenciais permanecem em `credentials_ciphertext`, `credentials_iv` e `credentials_tag`.

## Variáveis do backend

Configurar no ambiente Production do backend:

```text
BACKEND_ORIGIN=https://metrik-backend.vercel.app
FRONTEND_ORIGIN=https://metrik-ai.vercel.app
GOOGLE_ADS_CLIENT_ID=...
GOOGLE_ADS_CLIENT_SECRET=...
GOOGLE_ADS_DEVELOPER_TOKEN=...
META_ADS_APP_ID=...
META_ADS_APP_SECRET=...
INTEGRATION_SECRETS_KEY=...
```

A `INTEGRATION_SECRETS_KEY` deve ser uma chave hexadecimal de 64 caracteres, diferente das credenciais das plataformas.

## URLs de callback

Registrar nos aplicativos dos provedores:

```text
Google Ads:
https://metrik-backend.vercel.app/integrations/oauth/google-ads/callback

Meta Ads:
https://metrik-backend.vercel.app/integrations/oauth/meta-ads/callback
```

O frontend inicia a autorização por:

```text
GET /integrations/oauth/google-ads/start
GET /integrations/oauth/meta-ads/start
```

Essas rotas exigem sessão autenticada e `x-company-id`. O callback não recebe credenciais do navegador; ele usa o estado nonce salvo no banco para recuperar a empresa e o usuário corretos.

## Escopos

Google Ads usa:

```text
https://www.googleapis.com/auth/adwords
```

Meta Ads usa:

```text
ads_read
```

A primeira versão não pausa, edita, cria nem publica anúncios. Operações de escrita serão adicionadas somente depois de auditoria, confirmação explícita e revisão das permissões.

## Endpoint de métricas

Depois que a sincronização gravar dados, o dashboard consulta:

```text
GET /integrations/ads/metrics?start=YYYY-MM-DD&end=YYYY-MM-DD
```

O endpoint retorna campanhas agregadas e série diária filtradas pela empresa ativa. O backend valida a empresa usando o middleware de contexto e a consulta sempre aplica `company_id`.

## Próxima etapa

Ainda é necessário implementar o worker de sincronização que, após a conexão OAuth, lista as contas de anúncios selecionáveis, consulta os relatórios de campanha, grava `ad_platform_accounts`, `ad_platform_campaigns` e `ad_daily_metrics`, e atualiza `ad_sync_runs` com retentativas e erros. Isso exige credenciais reais dos aplicativos Google/Meta e uma conta de teste autorizada.
