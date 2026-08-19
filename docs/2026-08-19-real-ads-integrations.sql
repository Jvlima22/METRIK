-- Metrik — integrações reais de Google Ads e Meta Ads
-- Aplicar no Supabase SQL Editor depois de 2026-08-18-integration-hub.sql.
-- O backend usa service role para sincronização; nunca exponha tokens no frontend.

alter table public.integration_connections
  add column if not exists company_id uuid references public.companies(id) on delete cascade;

create index if not exists integration_connections_company_idx
  on public.integration_connections(company_id, provider, status);

-- Contas de anúncios escolhidas pelo cliente após o OAuth.
create table if not exists public.integration_oauth_states (
  id uuid primary key default gen_random_uuid(),
  nonce text not null unique,
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null check (provider in ('google-ads','meta-ads')),
  expires_at timestamptz not null default (now() + interval '10 minutes'),
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists integration_oauth_states_nonce_idx on public.integration_oauth_states(nonce, expires_at);
alter table public.integration_oauth_states enable row level security;

create table if not exists public.ad_platform_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  platform text not null check (platform in ('GOOGLE_ADS','META_ADS')),
  external_account_id text not null,
  name text not null,
  currency_code text,
  timezone text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE','PAUSED','REMOVED','ERROR')),
  metadata jsonb not null default '{}'::jsonb,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, platform, external_account_id)
);

create index if not exists ad_platform_accounts_company_idx
  on public.ad_platform_accounts(company_id, platform, status);

create table if not exists public.ad_platform_campaigns (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  ad_account_id uuid not null references public.ad_platform_accounts(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  platform text not null check (platform in ('GOOGLE_ADS','META_ADS')),
  external_campaign_id text not null,
  name text not null,
  status text not null default 'UNKNOWN',
  objective text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(ad_account_id, external_campaign_id)
);

create index if not exists ad_platform_campaigns_company_idx
  on public.ad_platform_campaigns(company_id, platform, status);

create table if not exists public.ad_daily_metrics (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  ad_account_id uuid not null references public.ad_platform_accounts(id) on delete cascade,
  campaign_id uuid not null references public.ad_platform_campaigns(id) on delete cascade,
  platform text not null check (platform in ('GOOGLE_ADS','META_ADS')),
  metric_date date not null,
  impressions bigint not null default 0,
  reach bigint not null default 0,
  clicks bigint not null default 0,
  spend numeric(20,6) not null default 0,
  cost_micros bigint not null default 0,
  conversions numeric(20,6) not null default 0,
  conversion_value numeric(20,6) not null default 0,
  ctr numeric(12,8) not null default 0,
  cpc numeric(20,6) not null default 0,
  cpm numeric(20,6) not null default 0,
  raw jsonb not null default '{}'::jsonb,
  synced_at timestamptz not null default now(),
  unique(campaign_id, metric_date)
);

create index if not exists ad_daily_metrics_company_date_idx
  on public.ad_daily_metrics(company_id, metric_date desc, platform);
create index if not exists ad_daily_metrics_campaign_date_idx
  on public.ad_daily_metrics(campaign_id, metric_date desc);

create table if not exists public.ad_sync_runs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  connection_id uuid not null references public.integration_connections(id) on delete cascade,
  platform text not null check (platform in ('GOOGLE_ADS','META_ADS')),
  status text not null default 'RUNNING' check (status in ('RUNNING','SUCCEEDED','PARTIAL','FAILED')),
  range_start date not null,
  range_end date not null,
  records_seen integer not null default 0,
  records_written integer not null default 0,
  error_message text,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

create index if not exists ad_sync_runs_company_idx
  on public.ad_sync_runs(company_id, started_at desc);

alter table public.ad_platform_accounts enable row level security;
alter table public.ad_platform_campaigns enable row level security;
alter table public.ad_daily_metrics enable row level security;
alter table public.ad_sync_runs enable row level security;

drop policy if exists integration_oauth_states_owner_select on public.integration_oauth_states;
create policy integration_oauth_states_owner_select on public.integration_oauth_states
  for select using (auth.uid() = user_id);

-- Acesso direto do usuário autenticado apenas aos dados da própria empresa.
-- O backend com service role continua sujeito às verificações de company_id.
drop policy if exists ad_platform_accounts_company_select on public.ad_platform_accounts;
create policy ad_platform_accounts_company_select on public.ad_platform_accounts
  for select using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = ad_platform_accounts.company_id
        and cm.user_id = auth.uid()
        and cm.status = 'ACTIVE'
    )
  );

drop policy if exists ad_platform_campaigns_company_select on public.ad_platform_campaigns;
create policy ad_platform_campaigns_company_select on public.ad_platform_campaigns
  for select using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = ad_platform_campaigns.company_id
        and cm.user_id = auth.uid()
        and cm.status = 'ACTIVE'
    )
  );

drop policy if exists ad_daily_metrics_company_select on public.ad_daily_metrics;
create policy ad_daily_metrics_company_select on public.ad_daily_metrics
  for select using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = ad_daily_metrics.company_id
        and cm.user_id = auth.uid()
        and cm.status = 'ACTIVE'
    )
  );

drop policy if exists ad_sync_runs_company_select on public.ad_sync_runs;
create policy ad_sync_runs_company_select on public.ad_sync_runs
  for select using (
    exists (
      select 1 from public.company_members cm
      where cm.company_id = ad_sync_runs.company_id
        and cm.user_id = auth.uid()
        and cm.status = 'ACTIVE'
    )
  );

-- Atualiza company_id da conexão já existente quando houver vínculo claro pelo owner.
-- Conexões sem empresa devem ser revisadas antes de serem ativadas em produção.
update public.integration_connections ic
set company_id = cm.company_id
from public.company_members cm
where ic.company_id is null
  and ic.owner_user_id = cm.user_id
  and cm.status = 'ACTIVE';
