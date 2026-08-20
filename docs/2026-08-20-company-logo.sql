-- Logo privada da empresa, isolada pelo company_id.
-- Execute no Supabase SQL Editor antes de publicar o backend.

alter table public.companies
  add column if not exists logo_path text;

insert into storage.buckets (id, name, public)
values ('company-assets', 'company-assets', false)
on conflict (id) do update set public = false;

comment on column public.companies.logo_path is
  'Caminho do arquivo privado da logo no bucket company-assets; nunca armazenar tokens ou dados sensíveis aqui.';

-- O backend usa a service role somente depois de validar o usuário e o company_id.
-- Não crie política pública para este bucket.
