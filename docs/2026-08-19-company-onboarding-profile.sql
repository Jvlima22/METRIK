-- Perfil de onboarding inicial da empresa. Aplicar no Supabase SQL Editor.
-- O registro é único por company_id e não mistura dados entre tenants.

create table if not exists public.company_onboarding_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  primary_goal text,
  ad_channels jsonb not null default '[]'::jsonb,
  conversion_event text,
  management_model text,
  answers jsonb not null default '{}'::jsonb,
  form_version text not null default 'ads-onboarding-v1',
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists company_onboarding_profiles_completed_idx
  on public.company_onboarding_profiles(company_id, completed_at);

alter table public.company_onboarding_profiles enable row level security;

drop policy if exists company_onboarding_profiles_member_select on public.company_onboarding_profiles;
drop policy if exists company_onboarding_profiles_member_insert on public.company_onboarding_profiles;
drop policy if exists company_onboarding_profiles_member_update on public.company_onboarding_profiles;
drop policy if exists company_onboarding_profiles_global_admin_all on public.company_onboarding_profiles;

create policy company_onboarding_profiles_member_select
  on public.company_onboarding_profiles for select to authenticated
  using (public.is_company_member(company_id));

create policy company_onboarding_profiles_member_insert
  on public.company_onboarding_profiles for insert to authenticated
  with check (public.is_company_member(company_id));

create policy company_onboarding_profiles_member_update
  on public.company_onboarding_profiles for update to authenticated
  using (public.is_company_member(company_id))
  with check (public.is_company_member(company_id));

create policy company_onboarding_profiles_global_admin_all
  on public.company_onboarding_profiles for all to authenticated
  using (public.is_global_admin())
  with check (public.is_global_admin());

revoke all on table public.company_onboarding_profiles from anon;
revoke all on table public.company_onboarding_profiles from authenticated;
grant select, insert, update on table public.company_onboarding_profiles to authenticated;

comment on table public.company_onboarding_profiles is 'Respostas e estado do onboarding inicial, isolados por empresa.';
comment on column public.company_onboarding_profiles.completed_at is 'Quando preenchido, impede a repetição do onboarding para a empresa.';

-- Empresas já existentes não são interrompidas: só empresas novas terão o fluxo pendente.

-- Backfill seguro: empresas já existentes não devem receber o onboarding novo.
insert into public.company_onboarding_profiles (company_id, completed_at, form_version)
select c.id, now(), 'ads-onboarding-legacy'
from public.companies c
on conflict (company_id) do nothing;
