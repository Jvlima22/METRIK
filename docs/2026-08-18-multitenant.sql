-- Metrik Multi-tenancy
-- Revisar no Supabase SQL Editor antes de aplicar.
-- Esta migração não apaga dados: cria o núcleo de empresas, faz backfill
-- das integrações existentes e só então torna company_id obrigatório.

create extension if not exists pgcrypto;

do $$ begin
  create type public.company_status as enum ('ACTIVE', 'SUSPENDED', 'ARCHIVED');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.company_member_role as enum ('GLOBAL_ADMIN', 'COMPANY_ADMIN', 'COMPANY_OPERATOR', 'COMPANY_VIEWER');
exception when duplicate_object then null; end $$;

do $$ begin
  create type public.company_member_status as enum ('INVITED', 'ACTIVE', 'SUSPENDED', 'REMOVED');
exception when duplicate_object then null; end $$;

create table if not exists public.companies (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  document text,
  timezone text not null default 'America/Sao_Paulo',
  status public.company_status not null default 'ACTIVE',
  created_by uuid not null references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.companies add column if not exists legal_name text;
alter table public.companies add column if not exists trade_name text;
alter table public.companies add column if not exists corporate_email text;
alter table public.companies add column if not exists corporate_phone text;
alter table public.companies add column if not exists website text;
alter table public.companies add column if not exists segment text;
alter table public.companies add column if not exists address text;
alter table public.companies add column if not exists city text;
alter table public.companies add column if not exists state text;
alter table public.companies add column if not exists postal_code text;
alter table public.companies add column if not exists country text default 'Brasil';

create unique index if not exists companies_document_unique_idx on public.companies(document) where document is not null;

create table if not exists public.company_signup_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  provisional_name text,
  token_hash text not null unique,
  status text not null default 'PENDING' check (status in ('PENDING','OPENED','ACCEPTED','EXPIRED','REVOKED','CANCELLED')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  company_id uuid references public.companies(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);
create index if not exists company_signup_invitations_status_idx on public.company_signup_invitations(status, expires_at);
create index if not exists company_signup_invitations_email_idx on public.company_signup_invitations(lower(email), created_at desc);

create table if not exists public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.company_member_role not null default 'COMPANY_OPERATOR',
  status public.company_member_status not null default 'INVITED',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(company_id, user_id)
);

create table if not exists public.company_invitations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  email text not null,
  role public.company_member_role not null default 'COMPANY_OPERATOR',
  status text not null default 'PENDING' check (status in ('PENDING','ACCEPTED','EXPIRED','REVOKED')),
  invited_by uuid not null references auth.users(id),
  expires_at timestamptz not null default (now() + interval '7 days'),
  created_at timestamptz not null default now()
);

create index if not exists company_members_user_status_idx on public.company_members(user_id, status);
create index if not exists company_members_company_status_idx on public.company_members(company_id, status);
create index if not exists company_invitations_company_status_idx on public.company_invitations(company_id, status, created_at desc);

-- Backfill: cria uma empresa inicial por usuário que já possui integrações.
insert into public.companies (name, slug, created_by)
select concat('Empresa de ', coalesce(u.email, 'usuário')), concat('empresa-', replace(u.id::text, '-', '')), u.id
from auth.users u
where u.id in (
  select owner_user_id from public.integration_connections
  union
  select owner_user_id from public.integration_audit_logs
  union
  select owner_user_id from public.integration_sync_jobs
)
on conflict (slug) do nothing;

insert into public.company_members (company_id, user_id, role, status)
select c.id, c.created_by, case when lower(coalesce(u.email, '')) = 'comercial.metri.ai@gmail.com' then 'GLOBAL_ADMIN'::public.company_member_role else 'COMPANY_ADMIN'::public.company_member_role end, 'ACTIVE'::public.company_member_status
from public.companies c
join auth.users u on u.id = c.created_by
where not exists (select 1 from public.company_members m where m.company_id = c.id and m.user_id = c.created_by);

alter table public.integration_connections add column if not exists company_id uuid references public.companies(id);
alter table public.integration_sync_jobs add column if not exists company_id uuid references public.companies(id);
alter table public.integration_audit_logs add column if not exists company_id uuid references public.companies(id);

update public.integration_connections x set company_id = m.company_id from public.company_members m where x.company_id is null and m.user_id = x.owner_user_id and m.status = 'ACTIVE';
update public.integration_sync_jobs x set company_id = m.company_id from public.company_members m where x.company_id is null and m.user_id = x.owner_user_id and m.status = 'ACTIVE';
update public.integration_audit_logs x set company_id = m.company_id from public.company_members m where x.company_id is null and m.user_id = x.owner_user_id and m.status = 'ACTIVE';

alter table public.integration_connections alter column company_id set not null;
alter table public.integration_sync_jobs alter column company_id set not null;
alter table public.integration_audit_logs alter column company_id set not null;

create index if not exists integration_connections_company_status_idx on public.integration_connections(company_id, status);
create index if not exists integration_sync_jobs_company_status_idx on public.integration_sync_jobs(company_id, status, created_at desc);
create index if not exists integration_audit_logs_company_created_idx on public.integration_audit_logs(company_id, created_at desc);

create or replace function public.is_global_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select lower(coalesce(auth.jwt()->>'email', '')) = 'comercial.metri.ai@gmail.com' $$;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_global_admin() or exists (
    select 1 from public.company_members m
    where m.company_id = target_company_id
      and m.user_id = auth.uid()
      and m.status = 'ACTIVE'
  )
$$;

alter table public.companies enable row level security;
alter table public.company_members enable row level security;
alter table public.company_invitations enable row level security;
alter table public.company_signup_invitations enable row level security;
alter table public.integration_connections enable row level security;
alter table public.integration_sync_jobs enable row level security;
alter table public.integration_audit_logs enable row level security;

-- Remove políticas legadas baseadas apenas no owner_user_id.
drop policy if exists integration_connections_owner_select on public.integration_connections;
drop policy if exists integration_connections_owner_insert on public.integration_connections;
drop policy if exists integration_connections_owner_update on public.integration_connections;
drop policy if exists integration_connections_owner_delete on public.integration_connections;
drop policy if exists integration_sync_jobs_owner_select on public.integration_sync_jobs;
drop policy if exists integration_audit_logs_owner_select on public.integration_audit_logs;

drop policy if exists companies_member_select on public.companies;
drop policy if exists companies_global_admin_all on public.companies;
drop policy if exists company_members_member_select on public.company_members;
drop policy if exists company_members_admin_write on public.company_members;
drop policy if exists company_invitations_global_admin_all on public.company_invitations;
drop policy if exists integration_connections_company_access on public.integration_connections;
drop policy if exists integration_sync_jobs_company_access on public.integration_sync_jobs;
drop policy if exists integration_audit_logs_company_select on public.integration_audit_logs;
drop policy if exists company_signup_invitations_global_admin_all on public.company_signup_invitations;

create policy companies_member_select on public.companies for select to authenticated using (public.is_company_member(id));
create policy companies_global_admin_all on public.companies for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy company_members_member_select on public.company_members for select to authenticated using (public.is_company_member(company_id));
create policy company_members_admin_write on public.company_members for all to authenticated using (public.is_global_admin() or (public.is_company_member(company_id) and role = 'COMPANY_ADMIN')) with check (public.is_global_admin() or public.is_company_member(company_id));
create policy company_invitations_global_admin_all on public.company_invitations for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy company_signup_invitations_global_admin_all on public.company_signup_invitations for all to authenticated using (public.is_global_admin()) with check (public.is_global_admin());
create policy integration_connections_company_access on public.integration_connections for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy integration_sync_jobs_company_access on public.integration_sync_jobs for all to authenticated using (public.is_company_member(company_id)) with check (public.is_company_member(company_id));
create policy integration_audit_logs_company_select on public.integration_audit_logs for select to authenticated using (public.is_company_member(company_id));

-- Remover grants amplos dos papéis cliente; o backend usa a service role apenas no servidor.
revoke all on table public.companies, public.company_members, public.company_invitations, public.company_signup_invitations, public.integration_connections, public.integration_sync_jobs, public.integration_audit_logs from anon;
revoke all on table public.companies, public.company_members, public.company_invitations, public.company_signup_invitations, public.integration_connections, public.integration_sync_jobs, public.integration_audit_logs from authenticated;
grant select on public.companies, public.company_members, public.integration_connections, public.integration_sync_jobs, public.integration_audit_logs to authenticated;
grant select on public.company_invitations, public.company_signup_invitations to authenticated;

comment on table public.companies is 'Tenant lógico isolado do Metrik; toda entidade de negócio deve referenciar company_id.';
comment on column public.integration_connections.company_id is 'Empresa dona da conexão; nunca confiar somente em owner_user_id.';
