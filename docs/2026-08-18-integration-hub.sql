-- Metrik Integration Hub
-- Aplicar no Supabase SQL Editor após revisar o ambiente.
create extension if not exists pgcrypto;
create table if not exists public.integration_connections (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('openai','claude','manus','kimi','pipedrive','google-ads','meta-ads','custom-api')),
  auth_type text not null check (auth_type in ('API_KEY','OAUTH2','TOKEN','CUSTOM')),
  status text not null default 'DRAFT' check (status in ('DRAFT','CONNECTED','PAUSED','ERROR')),
  workspace_name text, external_account_id text, scopes text[] not null default '{}', metadata jsonb not null default '{}'::jsonb,
  credentials_ciphertext text, credentials_iv text, credentials_tag text, access_token_expires_at timestamptz,
  last_health_check_at timestamptz, last_sync_at timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  constraint encrypted_credentials_complete check ((credentials_ciphertext is null and credentials_iv is null and credentials_tag is null) or (credentials_ciphertext is not null and credentials_iv is not null and credentials_tag is not null))
);
create unique index if not exists integration_connections_owner_provider_account_idx on public.integration_connections(owner_user_id, provider, coalesce(external_account_id, ''));
create index if not exists integration_connections_owner_status_idx on public.integration_connections(owner_user_id, status);
create table if not exists public.integration_sync_jobs (
  id uuid primary key default gen_random_uuid(), connection_id uuid not null references public.integration_connections(id) on delete cascade,
  owner_user_id uuid not null references auth.users(id) on delete cascade, entity text not null,
  direction text not null default 'INBOUND' check (direction in ('INBOUND','OUTBOUND','BIDIRECTIONAL')),
  cursor text, status text not null default 'PENDING' check (status in ('PENDING','RUNNING','SUCCEEDED','PARTIAL','RETRYING','FAILED','PAUSED')),
  attempt integer not null default 0, idempotency_key text not null, error_code text, error_message text, started_at timestamptz, finished_at timestamptz, created_at timestamptz not null default now(), unique(connection_id, idempotency_key)
);
create index if not exists integration_sync_jobs_connection_status_idx on public.integration_sync_jobs(connection_id, status, created_at desc);
create table if not exists public.integration_audit_logs (
  id uuid primary key default gen_random_uuid(), owner_user_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid references public.integration_connections(id) on delete set null, action text not null, details jsonb not null default '{}'::jsonb, created_at timestamptz not null default now()
);
create index if not exists integration_audit_logs_owner_created_idx on public.integration_audit_logs(owner_user_id, created_at desc);
create index if not exists integration_audit_logs_connection_created_idx on public.integration_audit_logs(connection_id, created_at desc);
alter table public.integration_connections enable row level security;
alter table public.integration_sync_jobs enable row level security;
alter table public.integration_audit_logs enable row level security;
drop policy if exists integration_connections_owner_select on public.integration_connections;
create policy integration_connections_owner_select on public.integration_connections for select using (auth.uid() = owner_user_id);
drop policy if exists integration_connections_owner_insert on public.integration_connections;
create policy integration_connections_owner_insert on public.integration_connections for insert with check (auth.uid() = owner_user_id);
drop policy if exists integration_connections_owner_update on public.integration_connections;
create policy integration_connections_owner_update on public.integration_connections for update using (auth.uid() = owner_user_id) with check (auth.uid() = owner_user_id);
drop policy if exists integration_connections_owner_delete on public.integration_connections;
create policy integration_connections_owner_delete on public.integration_connections for delete using (auth.uid() = owner_user_id);
drop policy if exists integration_sync_jobs_owner_select on public.integration_sync_jobs;
create policy integration_sync_jobs_owner_select on public.integration_sync_jobs for select using (auth.uid() = owner_user_id);
drop policy if exists integration_audit_logs_owner_select on public.integration_audit_logs;
create policy integration_audit_logs_owner_select on public.integration_audit_logs for select using (auth.uid() = owner_user_id);
-- A service role deve ser usada somente no servidor. Nunca exponha essa chave no frontend.
