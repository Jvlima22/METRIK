import { randomBytes, createCipheriv, createDecipheriv } from "node:crypto";
import { getSupabaseAdmin } from "../lib/supabase";
import { env } from "../config/env";
import { AppError } from "../utils/AppError";

export type AuthType = "API_KEY" | "OAUTH2" | "TOKEN" | "CUSTOM";
export const integrationCatalog = [
  { id: "openai", name: "ChatGPT / OpenAI", authTypes: ["API_KEY"], capabilities: ["analysis", "generation", "structured_output"] },
  { id: "claude", name: "Claude", authTypes: ["API_KEY"], capabilities: ["analysis", "generation", "files"] },
  { id: "manus", name: "Manus", authTypes: ["API_KEY", "OAUTH2"], capabilities: ["agents", "tasks", "execution"] },
  { id: "kimi", name: "Kimi", authTypes: ["API_KEY"], capabilities: ["analysis", "generation", "tool_calling"] },
  { id: "pipedrive", name: "Pipedrive", authTypes: ["OAUTH2", "TOKEN"], capabilities: ["deals", "leads", "activities", "webhooks"] },
  { id: "google-ads", name: "Google Ads", authTypes: ["OAUTH2"], capabilities: ["campaigns", "metrics", "creatives"] },
  { id: "meta-ads", name: "Meta Ads", authTypes: ["OAUTH2", "TOKEN"], capabilities: ["campaigns", "insights", "creatives"] },
  { id: "custom-api", name: "API personalizada", authTypes: ["OAUTH2", "API_KEY", "TOKEN", "CUSTOM"], capabilities: ["rest", "webhook", "mapping"] },
] as const;

function encryptCredentials(credentials: Record<string, unknown>) {
  const keyHex = process.env.INTEGRATION_SECRETS_KEY;
  if (!keyHex || !/^[a-f0-9]{64}$/i.test(keyHex)) throw new AppError("INTEGRATION_SECRETS_KEY deve ser uma chave hexadecimal de 32 bytes", 503);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), iv);
  const ciphertext = Buffer.concat([cipher.update(JSON.stringify(credentials), "utf8"), cipher.final()]);
  return { ciphertext: ciphertext.toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64") };
}
function assertProvider(provider: string) { if (!integrationCatalog.some((item) => item.id === provider)) throw new AppError("Provedor de integração inválido", 400); }
function decryptCredentials(ciphertext: string, iv: string, tag: string): Record<string, unknown> { const keyHex = process.env.INTEGRATION_SECRETS_KEY; if (!keyHex || !/^[a-f0-9]{64}$/i.test(keyHex)) throw new AppError("INTEGRATION_SECRETS_KEY inválida", 503); const decipher = createDecipheriv("aes-256-gcm", Buffer.from(keyHex, "hex"), Buffer.from(iv, "base64")); decipher.setAuthTag(Buffer.from(tag, "base64")); return JSON.parse(Buffer.concat([decipher.update(Buffer.from(ciphertext, "base64")), decipher.final()]).toString("utf8")) as Record<string, unknown>; }
async function providerHealthCheck(provider: string, credentials: Record<string, unknown>) { const apiKey = typeof credentials.apiKey === "string" ? credentials.apiKey : typeof credentials.token === "string" ? credentials.token : ""; const accessToken = typeof credentials.accessToken === "string" ? credentials.accessToken : ""; if (provider === "google-ads") { if (!accessToken) return { verified: false, providerCall: "credentials_pending" }; const response = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, { signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new AppError(`Health check Google Ads retornou HTTP ${response.status}`, 401); return { verified: true, providerCall: "google_tokeninfo" }; } if (provider === "meta-ads") { if (!accessToken) return { verified: false, providerCall: "credentials_pending" }; const url = new URL("https://graph.facebook.com/v26.0/me"); url.searchParams.set("fields", "id"); url.searchParams.set("access_token", accessToken); const response = await fetch(url, { signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new AppError(`Health check Meta Ads retornou HTTP ${response.status}`, response.status === 401 || response.status === 403 ? 401 : 502); return { verified: true, providerCall: "meta_me" }; } if (!apiKey) return { verified: false, providerCall: "credentials_pending" }; const requests: Record<string, { url: string; headers: Record<string, string> }> = { openai: { url: "https://api.openai.com/v1/models", headers: { Authorization: `Bearer ${apiKey}` } }, claude: { url: "https://api.anthropic.com/v1/models", headers: { "x-api-key": apiKey, "anthropic-version": "2023-06-01" } }, manus: { url: "https://api.manus.ai/v2/task.list", headers: { "x-manus-api-key": apiKey } }, kimi: { url: "https://api.moonshot.ai/v1/models", headers: { Authorization: `Bearer ${apiKey}` } } }; const request = requests[provider]; if (!request) return { verified: false, providerCall: "adapter_pending" }; const response = await fetch(request.url, { headers: request.headers, signal: AbortSignal.timeout(10000) }); if (!response.ok) throw new AppError(`Health check ${provider} retornou HTTP ${response.status}`, response.status === 401 || response.status === 403 ? 401 : 502); return { verified: true, providerCall: "live_read_only" }; }
export async function listConnections(companyId: string) { const { data, error } = await getSupabaseAdmin().from("integration_connections").select("id,provider,auth_type,status,scopes,workspace_name,external_account_id,metadata,last_health_check_at,last_sync_at,created_at,updated_at").eq("company_id", companyId).order("created_at", { ascending: false }); if (error) throw new AppError(`Não foi possível listar conexões: ${error.message}`, 500); return data ?? []; }

export async function listAdminAdAccounts() {
  const supabase = getSupabaseAdmin();
  const [{ data: accounts, error: accountError }, { data: companies, error: companyError }] = await Promise.all([
    supabase.from('ad_platform_accounts').select('id,company_id,connection_id,platform,external_account_id,name,currency_code,timezone,status,last_synced_at,created_at,updated_at').order('created_at', { ascending: false }),
    supabase.from('companies').select('id,name'),
  ]);
  if (accountError) throw new AppError(`Não foi possível listar contas de anúncios: ${accountError.message}`, 500);
  if (companyError) throw new AppError(`Não foi possível listar empresas das contas: ${companyError.message}`, 500);
  const companyNames = new Map((companies ?? []).map((company) => [company.id, company.name]));
  return (accounts ?? []).map((account) => ({ ...account, company_name: companyNames.get(account.company_id) ?? 'Empresa' }));
}

function normalizeGoogleCustomerId(value: string) {
  const normalized = value.replace(/[-\s]/g, '');
  if (!/^\d{10}$/.test(normalized)) throw new AppError('Customer ID do Google Ads inválido. Informe 10 dígitos, com ou sem hífens.', 400);
  return normalized;
}

async function validateGoogleAdsAccount(credentials: Record<string, unknown>, customerIdInput: string) {
  const accessToken = typeof credentials.accessToken === 'string' ? credentials.accessToken : '';
  if (!accessToken) throw new AppError('Credencial OAuth do Google Ads ausente. Renove a autorização.', 401);
  if (!env.GOOGLE_ADS_DEVELOPER_TOKEN) throw new AppError('GOOGLE_ADS_DEVELOPER_TOKEN não configurado no backend.', 503);
  const customerId = normalizeGoogleCustomerId(customerIdInput);
  const headers: Record<string, string> = { Authorization: `Bearer ${accessToken}`, 'developer-token': env.GOOGLE_ADS_DEVELOPER_TOKEN, 'content-type': 'application/json' };
  if (env.GOOGLE_ADS_LOGIN_CUSTOMER_ID) headers['login-customer-id'] = normalizeGoogleCustomerId(env.GOOGLE_ADS_LOGIN_CUSTOMER_ID);
  const response = await fetch(`https://googleads.googleapis.com/v19/customers/${customerId}/googleAds:searchStream`, { method: 'POST', headers, body: JSON.stringify({ query: 'SELECT customer.id, customer.descriptive_name, customer.currency_code, customer.time_zone FROM customer LIMIT 1' }), signal: AbortSignal.timeout(15000) });
  const payload = await response.json().catch(() => null) as { error?: { message?: string }; results?: Array<{ customerClient?: { id?: string; descriptiveName?: string } }> } | null;
  if (!response.ok) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403) throw new AppError(`Google Ads recusou o acesso ao Customer ID informado: ${message}`, 401);
    if (response.status === 404) throw new AppError('Customer ID do Google Ads não encontrado.', 404);
    throw new AppError(`Não foi possível validar a conta Google Ads: ${message}`, 502);
  }
  return { externalAccountId: customerId, name: payload?.results?.[0]?.customerClient?.descriptiveName || `Google Ads ${customerId}` };
}

async function validateMetaAdsAccount(credentials: Record<string, unknown>, externalAccountIdInput: string) {
  const accessToken = typeof credentials.accessToken === 'string' ? credentials.accessToken : '';
  if (!accessToken) throw new AppError('Credencial OAuth da Meta Ads ausente. Renove a autorização.', 401);
  const accountId = externalAccountIdInput.trim().replace(/^act_/i, '');
  if (!/^\d+$/.test(accountId)) throw new AppError('Account ID da Meta Ads inválido. Use act_ seguido de números.', 400);
  const permissionsUrl = new URL('https://graph.facebook.com/v26.0/me/permissions');
  permissionsUrl.searchParams.set('access_token', accessToken);
  const permissionsResponse = await fetch(permissionsUrl, { signal: AbortSignal.timeout(15000) });
  const permissionsPayload = await permissionsResponse.json().catch(() => null) as { data?: Array<{ permission?: string; status?: string }>; error?: { message?: string } } | null;
  if (!permissionsResponse.ok) throw new AppError(`Não foi possível validar as permissões da Meta Ads: ${permissionsPayload?.error?.message ?? `HTTP ${permissionsResponse.status}`}`, 401);
  const adsRead = permissionsPayload?.data?.some((permission) => permission.permission === 'ads_read' && permission.status === 'granted');
  if (!adsRead) throw new AppError('A autorização da Meta não possui a permissão ads_read para consultar a conta.', 403);
  const url = new URL(`https://graph.facebook.com/v26.0/act_${accountId}`);
  url.searchParams.set('fields', 'id,name,account_status,currency,timezone_id');
  url.searchParams.set('access_token', accessToken);
  const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
  const payload = await response.json().catch(() => null) as { id?: string; name?: string; account_status?: number; currency?: string; timezone_id?: string; error?: { message?: string; code?: number } } | null;
  if (!response.ok || !payload?.id) {
    const message = payload?.error?.message ?? `HTTP ${response.status}`;
    if (response.status === 401 || response.status === 403 || payload?.error?.code === 190) throw new AppError(`Meta Ads recusou o acesso à conta informada: ${message}`, 401);
    throw new AppError(`Account ID da Meta Ads não encontrado ou sem acesso: ${message}`, 404);
  }
  if (payload.account_status !== undefined && payload.account_status !== 1) throw new AppError('A conta de anúncios da Meta está inativa ou restrita.', 409);
  return { externalAccountId: `act_${accountId}`, name: payload.name || `Meta Ads act_${accountId}`, currencyCode: payload.currency, timezone: payload.timezone_id };
}

export async function registerAdAccount(userId: string, companyId: string, input: { platform: 'GOOGLE_ADS' | 'META_ADS'; externalAccountId: string; name: string }) {
  const externalAccountId = input.externalAccountId.trim();
  const name = input.name.trim();
  if (!externalAccountId || !name) throw new AppError('Nome e identificador da conta são obrigatórios', 400);
  const provider = input.platform === 'GOOGLE_ADS' ? 'google-ads' : 'meta-ads';
  const supabase = getSupabaseAdmin();
  const { data: existingConnection, error: connectionError } = await supabase.from('integration_connections').select('id,credentials_ciphertext,credentials_iv,credentials_tag').eq('company_id', companyId).eq('provider', provider).maybeSingle();
  if (connectionError) throw new AppError(`Não foi possível localizar a conexão: ${connectionError.message}`, 500);
  if (!existingConnection) throw new AppError(`Não é possível adicionar esta conta sem uma autorização OAuth válida do ${input.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads'}.`, 401);
  const connection = existingConnection;
  if (!connection.credentials_ciphertext || !connection.credentials_iv || !connection.credentials_tag) throw new AppError(`Não é possível adicionar esta conta sem uma autorização OAuth válida do ${input.platform === 'GOOGLE_ADS' ? 'Google Ads' : 'Meta Ads'}.`, 401);
  const credentials = decryptCredentials(connection.credentials_ciphertext, connection.credentials_iv, connection.credentials_tag);
  const validated = input.platform === 'GOOGLE_ADS' ? await validateGoogleAdsAccount(credentials, externalAccountId) : await validateMetaAdsAccount(credentials, externalAccountId);
  const { data, error } = await supabase.from('ad_platform_accounts').upsert({ company_id: companyId, connection_id: connection.id, platform: input.platform, external_account_id: validated.externalAccountId, name: validated.name || name, currency_code: 'currencyCode' in validated ? validated.currencyCode : null, timezone: 'timezone' in validated ? validated.timezone : null, status: 'ACTIVE', updated_at: new Date().toISOString() }, { onConflict: 'company_id,platform,external_account_id' }).select('id,company_id,connection_id,platform,external_account_id,name,currency_code,timezone,status,last_synced_at,created_at,updated_at').single();
  if (error || !data) throw new AppError(`Não foi possível salvar a conta de anúncios: ${error?.message ?? 'registro vazio'}`, 500);
  const { error: statusError } = await supabase.from('integration_connections').update({ status: 'CONNECTED', last_health_check_at: new Date().toISOString(), metadata: { validationRequired: false, validatedAccountId: validated.externalAccountId, validatedAt: new Date().toISOString() }, updated_at: new Date().toISOString() }).eq('id', connection.id).eq('company_id', companyId);
  if (statusError) throw new AppError(`Conta validada, mas não foi possível atualizar o status da conexão: ${statusError.message}`, 500);
  return data;
}
export async function createConnection(userId: string, companyId: string, input: { provider: string; authType: AuthType; workspaceName?: string; scopes?: string[]; metadata?: Record<string, unknown>; credentials?: Record<string, unknown>; status?: "DRAFT" | "CONNECTED" }) { assertProvider(input.provider); const encrypted = input.credentials && Object.keys(input.credentials).length ? encryptCredentials(input.credentials) : null; const { data, error } = await getSupabaseAdmin().from("integration_connections").insert({ company_id: companyId, owner_user_id: userId, provider: input.provider, auth_type: input.authType, status: input.status ?? "DRAFT", scopes: input.scopes ?? [], workspace_name: input.workspaceName ?? null, metadata: input.metadata ?? {}, credentials_ciphertext: encrypted?.ciphertext ?? null, credentials_iv: encrypted?.iv ?? null, credentials_tag: encrypted?.tag ?? null }).select("id,provider,auth_type,status,scopes,workspace_name,metadata,created_at,updated_at").single(); if (error) throw new AppError(`Não foi possível criar conexão: ${error.message}`, 500); await audit(userId, companyId, data.id, "CONNECTION_CREATED", { provider: input.provider, authType: input.authType }); return data; }
export async function testConnection(userId: string, companyId: string, connectionId: string) { const { data: connection, error: findError } = await getSupabaseAdmin().from("integration_connections").select("id,provider,status,credentials_ciphertext,credentials_iv,credentials_tag").eq("id", connectionId).eq("company_id", companyId).single(); if (findError || !connection) throw new AppError("Conexão não encontrada", 404); const credentials = connection.credentials_ciphertext && connection.credentials_iv && connection.credentials_tag ? decryptCredentials(connection.credentials_ciphertext, connection.credentials_iv, connection.credentials_tag) : {}; const health = await providerHealthCheck(connection.provider, credentials); const nextStatus = health.verified ? "CONNECTED" : "DRAFT"; const { data, error } = await getSupabaseAdmin().from("integration_connections").update({ status: nextStatus, last_health_check_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", connectionId).eq("company_id", companyId).select("id,provider,status,last_health_check_at").single(); if (error) throw new AppError(`Falha ao registrar health check: ${error.message}`, 500); await audit(userId, companyId, connectionId, "CONNECTION_TESTED", { mode: health.providerCall, provider: connection.provider }); return { ...data, ...health }; }
export async function updateConnectionStatus(userId: string, companyId: string, connectionId: string, status: "PAUSED" | "DRAFT") { const { data, error } = await getSupabaseAdmin().from("integration_connections").update({ status, updated_at: new Date().toISOString() }).eq("id", connectionId).eq("company_id", companyId).select("id,provider,status,updated_at").single(); if (error || !data) throw new AppError("Conexão não encontrada", 404); await audit(userId, companyId, connectionId, `CONNECTION_${status}`, {}); return data; }
export async function deleteConnection(userId: string, companyId: string, connectionId: string) { const { data, error } = await getSupabaseAdmin().from("integration_connections").delete().eq("id", connectionId).eq("company_id", companyId).select("id,provider").single(); if (error || !data) throw new AppError("Conexão não encontrada", 404); await audit(userId, companyId, connectionId, "CONNECTION_DELETED", { provider: data.provider }); return { deleted: true, id: data.id }; }
export async function listConnectionAccounts(companyId: string, connectionId: string) {
  const { data: connection, error: connectionError } = await getSupabaseAdmin().from("integration_connections").select("id,provider").eq("id", connectionId).eq("company_id", companyId).single();
  if (connectionError || !connection) throw new AppError("Conexão não encontrada", 404);
  if (connection.provider !== "google-ads" && connection.provider !== "meta-ads") return [];
  const { data, error } = await getSupabaseAdmin().from("ad_platform_accounts").select("id,external_account_id,name,status,last_synced_at,metadata").eq("company_id", companyId).eq("connection_id", connectionId).order("name", { ascending: true });
  if (error) throw new AppError(`Não foi possível listar contas vinculadas: ${error.message}`, 500);
  return data ?? [];
}

export async function listConnectionSyncRuns(companyId: string, connectionId: string) {
  const { data, error } = await getSupabaseAdmin().from("ad_sync_runs").select("id,status,range_start,range_end,records_seen,records_written,error_message,started_at,finished_at").eq("company_id", companyId).eq("connection_id", connectionId).order("started_at", { ascending: false }).limit(10);
  if (error) throw new AppError(`Não foi possível listar o histórico de sincronização: ${error.message}`, 500);
  return data ?? [];
}

export async function getConnectionCredentials(companyId: string, connectionId: string) {
  const { data, error } = await getSupabaseAdmin().from("integration_connections").select("id,provider,status,credentials_ciphertext,credentials_iv,credentials_tag").eq("id", connectionId).eq("company_id", companyId).single();
  if (error || !data) throw new AppError("Conexão não encontrada", 404);
  const credentials = data.credentials_ciphertext && data.credentials_iv && data.credentials_tag
    ? decryptCredentials(data.credentials_ciphertext, data.credentials_iv, data.credentials_tag)
    : {};
  return { ...data, credentials };
}

async function audit(userId: string, companyId: string, connectionId: string, action: string, details: Record<string, unknown>) { await getSupabaseAdmin().from("integration_audit_logs").insert({ owner_user_id: userId, company_id: companyId, connection_id: connectionId, action, details }); }
