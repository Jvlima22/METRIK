-- Execute no Supabase SQL Editor antes de ativar os webhooks da Cakto.
create table if not exists public.billing_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  event_key text not null,
  event_name text not null,
  external_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  unique (provider, event_key)
);

create table if not exists public.billing_subscriptions (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  cakto_subscription_id text not null,
  cakto_order_id text,
  customer_email text,
  user_id uuid references auth.users(id) on delete set null,
  product_id text,
  status text not null default 'unknown',
  last_event text,
  last_payload jsonb,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (provider, cakto_subscription_id)
);

create index if not exists billing_subscriptions_customer_email_idx on public.billing_subscriptions (customer_email);
create index if not exists billing_subscriptions_user_id_idx on public.billing_subscriptions (user_id);
alter table public.billing_webhook_events enable row level security;
alter table public.billing_subscriptions enable row level security;
