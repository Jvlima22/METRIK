import { randomUUID } from 'node:crypto';
import { getSupabaseAdmin } from '../lib/supabase';
import { AppError } from '../utils/AppError';

const LOGO_BUCKET = 'company-assets';
const MAX_LOGO_BYTES = 2 * 1024 * 1024;
const companyFields = 'id,name,slug,document,legal_name,trade_name,corporate_email,corporate_phone,website,segment,address,city,state,postal_code,country,timezone,logo_path,status,created_at,updated_at';

export async function withLogoUrl<T extends Record<string, unknown>>(company: T): Promise<T & { logo_url: string | null }> {
  if (!company.logo_path || typeof company.logo_path !== 'string') return { ...company, logo_url: null };
  const { data } = await getSupabaseAdmin().storage.from(LOGO_BUCKET).createSignedUrl(company.logo_path, 3600);
  return { ...company, logo_url: data?.signedUrl ?? null };
}

export async function getCompanyProfile(companyId: string) {
  const { data, error } = await getSupabaseAdmin().from('companies').select(companyFields).eq('id', companyId).eq('status', 'ACTIVE').single();
  if (error || !data) throw new AppError(`Não foi possível carregar os dados da empresa: ${error?.message ?? 'empresa não encontrada'}`, error ? 500 : 404);
  return withLogoUrl(data as Record<string, unknown>);
}

export async function uploadCompanyLogo(companyId: string, fileName: string, mimeType: string, base64: string) {
  const allowedTypes: Record<string, string> = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp' };
  const extension = allowedTypes[mimeType];
  if (!extension) throw new AppError('A logo deve estar em PNG, JPG ou WebP', 400);
  const buffer = Buffer.from(base64, 'base64');
  if (!buffer.length || buffer.length > MAX_LOGO_BYTES) throw new AppError('A logo deve ter no máximo 2 MB', 400);
  const safePath = `companies/${companyId}/logo-${randomUUID()}.${extension}`;
  const admin = getSupabaseAdmin();
  const { data: current, error: currentError } = await admin.from('companies').select('logo_path').eq('id', companyId).eq('status', 'ACTIVE').single();
  if (currentError || !current) throw new AppError('Empresa não encontrada', currentError ? 500 : 404);
  const { error: uploadError } = await admin.storage.from(LOGO_BUCKET).upload(safePath, buffer, { contentType: mimeType, upsert: false });
  if (uploadError) throw new AppError(`Não foi possível enviar a logo: ${uploadError.message}`, 500);
  const { data, error } = await admin.from('companies').update({ logo_path: safePath }).eq('id', companyId).eq('status', 'ACTIVE').select(companyFields).single();
  if (error || !data) { await admin.storage.from(LOGO_BUCKET).remove([safePath]); throw new AppError(`Não foi possível salvar a logo: ${error?.message ?? 'empresa não encontrada'}`, error ? 500 : 404); }
  if (current.logo_path) await admin.storage.from(LOGO_BUCKET).remove([current.logo_path]);
  return withLogoUrl(data as Record<string, unknown>);
}

export async function removeCompanyLogo(companyId: string) {
  const admin = getSupabaseAdmin();
  const { data: current, error: currentError } = await admin.from('companies').select('logo_path').eq('id', companyId).eq('status', 'ACTIVE').single();
  if (currentError || !current) throw new AppError('Empresa não encontrada', currentError ? 500 : 404);
  const { data, error } = await admin.from('companies').update({ logo_path: null }).eq('id', companyId).eq('status', 'ACTIVE').select(companyFields).single();
  if (error || !data) throw new AppError(`Não foi possível remover a logo: ${error?.message ?? 'empresa não encontrada'}`, error ? 500 : 404);
  if (current.logo_path) await admin.storage.from(LOGO_BUCKET).remove([current.logo_path]);
  return withLogoUrl(data as Record<string, unknown>);
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
  return withLogoUrl(data as Record<string, unknown>);
}

export function companyProfileCompletion(company: Record<string, unknown>) {
  const fields = ['name', 'corporate_email', 'legal_name', 'trade_name', 'document', 'corporate_phone', 'website', 'segment', 'address', 'city', 'state', 'postal_code', 'country', 'timezone'];
  const completed = fields.filter((field) => Boolean(company[field] && String(company[field]).trim())).length;
  return { completed, total: fields.length, percentage: Math.round((completed / fields.length) * 100) };
}
