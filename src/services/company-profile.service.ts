import { getSupabaseAdmin } from '../lib/supabase';
import { AppError } from '../utils/AppError';

const companyFields = 'id,name,slug,document,legal_name,trade_name,corporate_email,corporate_phone,website,segment,address,city,state,postal_code,country,timezone,status,created_at,updated_at';

export async function getCompanyProfile(companyId: string) {
  const { data, error } = await getSupabaseAdmin().from('companies').select(companyFields).eq('id', companyId).eq('status', 'ACTIVE').single();
  if (error || !data) throw new AppError(`Não foi possível carregar os dados da empresa: ${error?.message ?? 'empresa não encontrada'}`, error ? 500 : 404);
  return data;
}

export async function updateCompanyProfile(companyId: string, input: Record<string, unknown>) {
  const allowed = ['name', 'document', 'legal_name', 'trade_name', 'corporate_email', 'corporate_phone', 'website', 'segment', 'address', 'city', 'state', 'postal_code', 'country', 'timezone'];
  const patch: Record<string, string | null> = {};
  for (const field of allowed) {
    if (field in input) {
      const value = input[field];
      patch[field] = value === null || value === undefined || String(value).trim() === '' ? null : String(value).trim();
    }
  }
  if (patch.name !== undefined && !patch.name) throw new AppError('Nome da empresa é obrigatório', 400);
  if (patch.corporate_email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(patch.corporate_email)) throw new AppError('Informe um e-mail corporativo válido', 400);
  if (patch.website && !/^https?:\/\//i.test(patch.website)) throw new AppError('O site deve começar com http:// ou https://', 400);
  if (patch.state && patch.state.length !== 2) throw new AppError('O estado deve usar a sigla de dois caracteres', 400);
  if (patch.document && patch.document.replace(/\D/g, '').length !== 14) throw new AppError('Informe um CNPJ válido com 14 dígitos', 400);
  if (patch.document) patch.document = patch.document.replace(/\D/g, '');
  if (!Object.keys(patch).length) return getCompanyProfile(companyId);
  const { data, error } = await getSupabaseAdmin().from('companies').update(patch).eq('id', companyId).eq('status', 'ACTIVE').select(companyFields).single();
  if (error || !data) throw new AppError(`Não foi possível salvar os dados da empresa: ${error?.message ?? 'empresa não encontrada'}`, error ? 500 : 404);
  return data;
}

export function companyProfileCompletion(company: Record<string, unknown>) {
  const fields = ['name', 'corporate_email', 'legal_name', 'trade_name', 'document', 'corporate_phone', 'website', 'segment', 'address', 'city', 'state', 'postal_code', 'country', 'timezone'];
  const completed = fields.filter((field) => Boolean(company[field] && String(company[field]).trim())).length;
  return { completed, total: fields.length, percentage: Math.round((completed / fields.length) * 100) };
}
