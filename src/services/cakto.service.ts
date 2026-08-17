import { env } from '../config/env';

type TokenResponse = { access_token: string; expires_in?: number };

export class CaktoApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = 'CaktoApiError';
  }
}

let cachedToken: { value: string; expiresAt: number } | null = null;

function assertConfigured(): void {
  if (!env.CAKTO_CLIENT_ID || !env.CAKTO_CLIENT_SECRET) {
    throw new Error('Cakto nÃ£o configurada: defina CAKTO_CLIENT_ID e CAKTO_CLIENT_SECRET.');
  }
}

async function getAccessToken(): Promise<string> {
  assertConfigured();
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const response = await fetch(`${env.CAKTO_API_BASE_URL}/public_api/token/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.CAKTO_CLIENT_ID!,
      client_secret: env.CAKTO_CLIENT_SECRET!,
    }),
  });
  if (!response.ok) throw new CaktoApiError(response.status, `Falha ao autenticar na Cakto (${response.status}).`);
  const token = (await response.json()) as TokenResponse;
  cachedToken = {
    value: token.access_token,
    expiresAt: Date.now() + (token.expires_in ?? 36_000) * 1000,
  };
  return token.access_token;
}

export async function caktoRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${token}`);
  headers.set('Content-Type', 'application/json');
  const response = await fetch(`${env.CAKTO_API_BASE_URL}${path}`, { ...init, headers });
  if (response.status === 401) {
    cachedToken = null;
    return caktoRequest<T>(path, init);
  }
  if (!response.ok) throw new CaktoApiError(response.status, `Erro na API Cakto (${response.status}).`);
  return (await response.json()) as T;
}

export async function listCaktoSubscriptions(search?: string): Promise<unknown> {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  return caktoRequest(`/public_api/subscriptions/${query}`);
}

