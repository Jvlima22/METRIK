-- Metrik CNPJ validation
-- Aplicar após 2026-08-18-multitenant.sql.

alter table public.companies add column if not exists cnpj_validation_status text check (cnpj_validation_status in ('PENDING', 'VALID', 'INVALID', 'UNAVAILABLE'));
alter table public.companies add column if not exists cnpj_validated_at timestamptz;
alter table public.companies add column if not exists cnpj_validation_provider text;
alter table public.companies add column if not exists cnpj_validation_payload jsonb not null default '{}'::jsonb;

create index if not exists companies_cnpj_validation_status_idx on public.companies(cnpj_validation_status);
