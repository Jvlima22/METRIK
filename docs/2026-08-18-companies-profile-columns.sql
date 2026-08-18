-- Complemento idempotente para ambientes que já aplicaram a migração multiempresa
-- sem as colunas cadastrais adicionadas posteriormente.
-- Execute no Supabase SQL Editor antes de tentar concluir o onboarding novamente.

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
alter table public.companies add column if not exists cnpj_validation_status text;
alter table public.companies add column if not exists cnpj_validated_at timestamptz;
alter table public.companies add column if not exists cnpj_validation_provider text;
alter table public.companies add column if not exists cnpj_validation_payload jsonb not null default '{}'::jsonb;

create index if not exists companies_cnpj_validation_status_idx
  on public.companies(cnpj_validation_status);

comment on column public.companies.cnpj_validation_status is
  'PENDING quando o cadastro foi criado sem CNPJ; VALID após consulta externa aprovada.';
