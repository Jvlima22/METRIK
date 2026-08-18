import { getSupabaseClient } from "./supabase";

/**
 * Client mínimo para a API Fury Ads (backend Express). Anexa o JWT do Supabase
 * da sessão atual no header `Authorization`, de forma que as rotas protegidas
 * (`/jobs`, `/metrics`) aceitem a requisição. Lança em respostas não-2xx com a
 * mensagem do backend (`{ message }`).
 */
const API_URL = (import.meta.env.VITE_API_URL as string | undefined) ?? "http://localhost:3000";

export async function apiFetch<T = unknown>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  const supabase = getSupabaseClient();
  const { data } = (await supabase?.auth.getSession()) ?? { data: { session: null } };
  const token = data.session?.access_token;
  const activeCompanyId = typeof window !== 'undefined' ? window.localStorage.getItem('metrik:active-company-id') : null;

  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(activeCompanyId ? { 'x-company-id': activeCompanyId } : {}),
      ...init.headers,
    },
  });

  const body = (await res.json().catch(() => null)) as
    | (T & { message?: string })
    | null;

  if (!res.ok) {
    throw new Error(body?.message ?? `Erro ${res.status} ao chamar ${path}`);
  }
  return body as T;
}
