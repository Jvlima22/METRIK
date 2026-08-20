import { z } from 'zod';
import dotenv from 'dotenv';

dotenv.config();

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().default('3000').transform(Number),
  REDIS_URL: z.string().url().default('redis://localhost:6379'),
  TAKEDOWN_HTTP_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform((v) => Number(v)),
  TAKEDOWN_MAX_ATTEMPTS: z
    .string()
    .default('3')
    .transform((v) => Number(v)),

  // Supabase â€” provÃª a autenticaÃ§Ã£o (GoTrue) e a base de usuÃ¡rios (Postgres).
  // Opcionais no boot, no mesmo espÃ­rito das credenciais de plataforma: a API
  // sobe sem elas. O middleware `requireAuth` retorna 500 com erro claro se uma
  // rota protegida for acessada sem essas variÃ¡veis configuradas.
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_ANON_KEY: z.string().optional(),

  // Service role key (SECRETA â€” nunca exposta ao browser). Usada sÃ³ no backend
  // para a admin API de convites (inviteUserByEmail). Opcional no boot.
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),

  // Allowlist de e-mails que podem enviar convites de cadastro. Lista separada
  // por vÃ­rgula. Vazia = ninguÃ©m convida (sistema fechado atÃ© configurar).
  INVITE_ADMINS: z
    .string()
    .default('')
    .transform((v) =>
      v
        .split(',')
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean),
    ),
  GLOBAL_ADMIN_EMAIL: z.string().email().default('comercial.metri.ai@gmail.com').transform((v) => v.toLowerCase()),

  // Origem do frontend liberada no CORS + base do link de convite. O dev server
  // (vite-config da Lovable) roda em :8080 por padrÃ£o.
  FRONTEND_ORIGIN: z.string().url().default('http://localhost:8080'),
  CORS_ORIGINS: z.string().default('http://localhost:8080,http://localhost:5173,https://metrik-ai.vercel.app').transform((value) => value.split(',').map((origin) => origin.trim()).filter(Boolean)),

  // Credenciais das plataformas. Opcionais no boot: a API sobe sem elas.
  // Se um takedown chegar para uma plataforma sem credencial, o job falha
  // com erro claro (ver src/platforms/*.adapter.ts).
  GOOGLE_ADS_CLIENT_ID: z.string().optional(),
  GOOGLE_ADS_CLIENT_SECRET: z.string().optional(),
  GOOGLE_ADS_DEVELOPER_TOKEN: z.string().optional(),
  GOOGLE_ADS_REFRESH_TOKEN: z.string().optional(),
  GOOGLE_ADS_LOGIN_CUSTOMER_ID: z.string().optional(),

  META_ADS_ACCESS_TOKEN: z.string().optional(),
  META_ADS_APP_ID: z.string().optional(),
  META_ADS_APP_SECRET: z.string().optional(),
  CAKTO_CLIENT_ID: z.string().optional(),
  CAKTO_CLIENT_SECRET: z.string().optional(),
  CAKTO_WEBHOOK_SECRET: z.string().optional(),
  CAKTO_API_BASE_URL: z.string().url().default('https://api.cakto.com.br'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('VariÃ¡veis de ambiente invÃ¡lidas:');
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

