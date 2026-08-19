import { randomBytes } from 'node:crypto';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../lib/supabase';
import { AppError } from '../utils/AppError';
import { createConnection } from './integration-hub.service';

type Provider = 'google-ads' | 'meta-ads';

function backendOrigin() {
  return (process.env.BACKEND_ORIGIN ?? 'https://metrik-backend.vercel.app').replace(/\/$/, '');
}

function callbackUrl(provider: Provider) {
  return `${backendOrigin()}/integrations/oauth/${provider}/callback`;
}

function assertProvider(provider: string): asserts provider is Provider {
  if (provider !== 'google-ads' && provider !== 'meta-ads') throw new AppError('Provedor OAuth inválido', 400);
}

export async function createOAuthAuthorization(userId: string, companyId: string, providerInput: string) {
  assertProvider(providerInput);
  const nonce = randomBytes(32).toString('hex');
  const { error } = await getSupabaseAdmin().from('integration_oauth_states').insert({ nonce, company_id: companyId, user_id: userId, provider: providerInput });
  if (error) throw new AppError(`Não foi possível iniciar OAuth: ${error.message}`, 500);

  if (providerInput === 'google-ads') {
    if (!env.GOOGLE_ADS_CLIENT_ID) throw new AppError('GOOGLE_ADS_CLIENT_ID não configurado', 503);
    const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    url.searchParams.set('client_id', env.GOOGLE_ADS_CLIENT_ID);
    url.searchParams.set('redirect_uri', callbackUrl(providerInput));
    url.searchParams.set('response_type', 'code');
    url.searchParams.set('access_type', 'offline');
    url.searchParams.set('prompt', 'consent');
    url.searchParams.set('scope', 'https://www.googleapis.com/auth/adwords');
    url.searchParams.set('state', nonce);
    return { provider: providerInput, authorizationUrl: url.toString(), state: nonce };
  }

  if (!env.META_ADS_APP_ID) throw new AppError('META_ADS_APP_ID não configurado', 503);
  const url = new URL('https://www.facebook.com/v26.0/dialog/oauth');
  url.searchParams.set('client_id', env.META_ADS_APP_ID);
  url.searchParams.set('redirect_uri', callbackUrl(providerInput));
  url.searchParams.set('response_type', 'code');
  url.searchParams.set('scope', 'ads_read');
  url.searchParams.set('state', nonce);
  return { provider: providerInput, authorizationUrl: url.toString(), state: nonce };
}

async function consumeState(provider: Provider, nonce: string) {
  const { data, error } = await getSupabaseAdmin().from('integration_oauth_states').select('id,user_id,company_id,provider,expires_at,used_at').eq('nonce', nonce).eq('provider', provider).is('used_at', null).gt('expires_at', new Date().toISOString()).single();
  if (error || !data) throw new AppError('Estado OAuth inválido, expirado ou já utilizado', 400);
  const { error: updateError } = await getSupabaseAdmin().from('integration_oauth_states').update({ used_at: new Date().toISOString() }).eq('id', data.id).is('used_at', null);
  if (updateError) throw new AppError(`Não foi possível validar o estado OAuth: ${updateError.message}`, 500);
  return data;
}

async function exchangeGoogleCode(code: string, redirectUri: string) {
  if (!env.GOOGLE_ADS_CLIENT_ID || !env.GOOGLE_ADS_CLIENT_SECRET) throw new AppError('Credenciais OAuth do Google Ads não configuradas', 503);
  const response = await fetch('https://oauth2.googleapis.com/token', { method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ code, client_id: env.GOOGLE_ADS_CLIENT_ID, client_secret: env.GOOGLE_ADS_CLIENT_SECRET, redirect_uri: redirectUri, grant_type: 'authorization_code' }) });
  const payload = await response.json() as { access_token?: string; refresh_token?: string; expires_in?: number; error?: string; error_description?: string };
  if (!response.ok || !payload.access_token) throw new AppError(`Google OAuth: ${payload.error_description ?? payload.error ?? 'falha ao trocar código'}`, 502);
  return payload;
}

async function exchangeMetaCode(code: string, redirectUri: string) {
  if (!env.META_ADS_APP_ID || !env.META_ADS_APP_SECRET) throw new AppError('Credenciais OAuth da Meta Ads não configuradas', 503);
  const url = new URL('https://graph.facebook.com/v26.0/oauth/access_token');
  url.searchParams.set('client_id', env.META_ADS_APP_ID);
  url.searchParams.set('client_secret', env.META_ADS_APP_SECRET);
  url.searchParams.set('redirect_uri', redirectUri);
  url.searchParams.set('code', code);
  const response = await fetch(url);
  const payload = await response.json() as { access_token?: string; expires_in?: number; error?: { message?: string } };
  if (!response.ok || !payload.access_token) throw new AppError(`Meta OAuth: ${payload.error?.message ?? 'falha ao trocar código'}`, 502);
  return payload;
}

export async function completeOAuth(providerInput: string, code: string, nonce: string) {
  assertProvider(providerInput);
  const state = await consumeState(providerInput, nonce);
  const redirectUri = callbackUrl(providerInput);
  if (providerInput === 'google-ads') {
    const token = await exchangeGoogleCode(code, redirectUri);
    return createConnection(state.user_id, state.company_id, { provider: providerInput, authType: 'OAUTH2', workspaceName: 'Google Ads', scopes: ['https://www.googleapis.com/auth/adwords'], metadata: { oauth: true, connectedAt: new Date().toISOString() }, status: 'CONNECTED', credentials: { accessToken: token.access_token, refreshToken: token.refresh_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null } });
  }
  const token = await exchangeMetaCode(code, redirectUri);
  return createConnection(state.user_id, state.company_id, { provider: providerInput, authType: 'OAUTH2', workspaceName: 'Meta Ads', scopes: ['ads_read'], metadata: { oauth: true, connectedAt: new Date().toISOString() }, status: 'CONNECTED', credentials: { accessToken: token.access_token, expiresAt: token.expires_in ? Date.now() + token.expires_in * 1000 : null } });
}
