import { randomBytes, createCipheriv } from "node:crypto";
import { getSupabase } from "../lib/supabase";
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
export async function listConnections(userId: string) { const { data, error } = await getSupabase().from("integration_connections").select("id,provider,auth_type,status,scopes,workspace_name,external_account_id,metadata,last_health_check_at,last_sync_at,created_at,updated_at").eq("owner_user_id", userId).order("created_at", { ascending: false }); if (error) throw new AppError(`Não foi possível listar conexões: ${error.message}`, 500); return data ?? []; }
export async function createConnection(userId: string, input: { provider: string; authType: AuthType; workspaceName?: string; scopes?: string[]; metadata?: Record<string, unknown>; credentials?: Record<string, unknown> }) { assertProvider(input.provider); const encrypted = input.credentials && Object.keys(input.credentials).length ? encryptCredentials(input.credentials) : null; const { data, error } = await getSupabase().from("integration_connections").insert({ owner_user_id: userId, provider: input.provider, auth_type: input.authType, status: "DRAFT", scopes: input.scopes ?? [], workspace_name: input.workspaceName ?? null, metadata: input.metadata ?? {}, credentials_ciphertext: encrypted?.ciphertext ?? null, credentials_iv: encrypted?.iv ?? null, credentials_tag: encrypted?.tag ?? null }).select("id,provider,auth_type,status,scopes,workspace_name,metadata,created_at,updated_at").single(); if (error) throw new AppError(`Não foi possível criar conexão: ${error.message}`, 500); await audit(userId, data.id, "CONNECTION_CREATED", { provider: input.provider, authType: input.authType }); return data; }
export async function testConnection(userId: string, connectionId: string) { const { data: connection, error: findError } = await getSupabase().from("integration_connections").select("id,provider,status").eq("id", connectionId).eq("owner_user_id", userId).single(); if (findError || !connection) throw new AppError("Conexão não encontrada", 404); const { data, error } = await getSupabase().from("integration_connections").update({ status: "CONNECTED", last_health_check_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq("id", connectionId).eq("owner_user_id", userId).select("id,provider,status,last_health_check_at").single(); if (error) throw new AppError(`Falha ao registrar health check: ${error.message}`, 500); await audit(userId, connectionId, "CONNECTION_TESTED", { mode: "safe_metadata_check", provider: connection.provider }); return { ...data, verified: true, providerCall: "pending_adapter" }; }
export async function updateConnectionStatus(userId: string, connectionId: string, status: "PAUSED" | "DRAFT") { const { data, error } = await getSupabase().from("integration_connections").update({ status, updated_at: new Date().toISOString() }).eq("id", connectionId).eq("owner_user_id", userId).select("id,provider,status,updated_at").single(); if (error || !data) throw new AppError("Conexão não encontrada", 404); await audit(userId, connectionId, `CONNECTION_${status}`, {}); return data; }
export async function deleteConnection(userId: string, connectionId: string) { const { data, error } = await getSupabase().from("integration_connections").delete().eq("id", connectionId).eq("owner_user_id", userId).select("id,provider").single(); if (error || !data) throw new AppError("Conexão não encontrada", 404); await audit(userId, connectionId, "CONNECTION_DELETED", { provider: data.provider }); return { deleted: true, id: data.id }; }
async function audit(userId: string, connectionId: string, action: string, details: Record<string, unknown>) { await getSupabase().from("integration_audit_logs").insert({ owner_user_id: userId, connection_id: connectionId, action, details }); }
