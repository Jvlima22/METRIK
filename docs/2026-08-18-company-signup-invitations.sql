-- Corrige ambientes que aplicaram a migração multiempresa antes da inclusão
-- do onboarding empresarial. Execute este arquivo no Supabase SQL Editor.

create extension if not exists pgcrypto;

create table if not exists public.company_signup_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  provisional_name text,
  token_hash text not null unique,
  status text not null default 'PENDING'
    check (status in ('PENDING', 'OPENED', 'ACCEPTED', 'EXPIRED', 'REVOKED', 'CANCELLED')),
  invited_by uuid not null references auth.users(id),
  accepted_by uuid references auth.users(id),
  company_id uuid references public.companies(id) on delete set null,
  expires_at timestamptz not null,
  accepted_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  metadata jsonb not null default '{}'::jsonb
);

create index if not exists company_signup_invitations_status_idx
  on public.company_signup_invitations(status, expires_at);

create index if not exists company_signup_invitations_email_idx
  on public.company_signup_invitations(lower(email), created_at desc);

alter table public.company_signup_invitations enable row level security;

drop policy if exists company_signup_invitations_global_admin_all
  on public.company_signup_invitations;

create policy company_signup_invitations_global_admin_all
  on public.company_signup_invitations
  for all to authenticated
  using (public.is_global_admin())
  with check (public.is_global_admin());

revoke all on table public.company_signup_invitations from anon;
revoke all on table public.company_signup_invitations from authenticated;
grant select on public.company_signup_invitations to authenticated;

comment on table public.company_signup_invitations is
  'Convites de onboarding para novas empresas; tokens são armazenados somente como hash.';
