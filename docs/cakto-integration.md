# IntegraÃ§Ã£o Cakto

## VariÃ¡veis

Defina `CAKTO_CLIENT_ID`, `CAKTO_CLIENT_SECRET`, `CAKTO_WEBHOOK_SECRET` e `CAKTO_API_BASE_URL` no ambiente do backend. O `client_secret` Ã© usado somente no servidor.

## Banco

Execute `docs/cakto.sql` no Supabase SQL Editor. A tabela `billing_webhook_events` garante idempotÃªncia e `billing_subscriptions` mantÃ©m o estado local da assinatura.

## Painel Cakto

Crie uma chave com os escopos mÃ­nimos `read`, `orders` e `subscriptions`. Crie um webhook HTTPS apontando para:

```text
https://SEU_BACKEND/webhook/cakto
```

Selecione os eventos `purchase_approved`, `subscription_created`, `subscription_renewed`, `subscription_renewal_refused`, `subscription_paused`, `subscription_resumed`, `subscription_canceled`, `refund` e `chargeback`. Copie o secret do webhook para `CAKTO_WEBHOOK_SECRET`.

## PendÃªncia de negÃ³cio

A tabela guarda `customer_email`, mas nÃ£o associa automaticamente a um usuÃ¡rio Metrik. Depois de confirmarmos a tabela de perfis do produto, devemos preencher `user_id` pelo e-mail ou por um identificador interno enviado no checkout. A liberaÃ§Ã£o de acesso nÃ£o deve ser feita apenas pelo e-mail sem essa regra definida.
