# CORS em produção

O frontend publicado em `https://metrik-ai.vercel.app` precisa estar na allowlist do backend. Configure no ambiente de produção da API:

```env
FRONTEND_ORIGIN=https://metrik-ai.vercel.app
CORS_ORIGINS=https://metrik-ai.vercel.app,http://localhost:8080,http://localhost:5173
```

`FRONTEND_ORIGIN` é usado para construir os links de convite enviados por e-mail. `CORS_ORIGINS` é a lista separada por vírgulas de origens autorizadas para chamadas HTTP e preflight OPTIONS.

Não inclua uma barra final nos valores. Use `https://metrik-ai.vercel.app`, e não `https://metrik-ai.vercel.app/`.

Após alterar as variáveis, faça redeploy/restart da API. O navegador deve então receber:

```text
Access-Control-Allow-Origin: https://metrik-ai.vercel.app
```

A API não deve usar `*`, pois o Metrik envia `Authorization` e headers de contexto da empresa. O backend mantém a validação por allowlist e rejeita origens não cadastradas.
