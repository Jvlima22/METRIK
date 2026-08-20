import { getSupabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { CompanyRole } from '../types/express';
import { describeError, describeErrorCode, describeErrorMetadata } from '../utils/error-message';
import { withLogoUrl } from './company-profile.service';

function slugify(value: string): string {
  const slug = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return slug || `empresa-${Date.now()}`;
}

export async function ensureAdminCompany(adminUserId: string) {
  const supabase = getSupabaseAdmin();
  const slug = `metrik-admin-${adminUserId}`;
  const { data: membership } = await supabase.from('company_members').select('company_id, company:companies!inner(id,name,slug,status)').eq('user_id', adminUserId).eq('role', 'COMPANY_ADMIN').eq('status', 'ACTIVE').eq('company.slug', slug).maybeSingle();
  if (membership?.company_id) return Array.isArray(membership.company) ? membership.company[0] : membership.company;
  let { data: company } = await supabase.from('companies').select('id,name,slug,document,status,timezone').eq('slug', slug).eq('status', 'ACTIVE').maybeSingle();
  if (!company) {
    const created = await supabase.from('companies').insert({ name: 'Metrik Admin', slug, timezone: 'America/Sao_Paulo', created_by: adminUserId }).select('id,name,slug,document,status,timezone').single();
    if (created.error && !String(created.error.message).toLowerCase().includes('duplicate')) throw new AppError(`Não foi possível criar a empresa administrativa: ${created.error.message}`, 500);
    company = created.data ?? (await supabase.from('companies').select('id,name,slug,document,status,timezone').eq('slug', slug).eq('status', 'ACTIVE').single()).data;
  }
  if (!company) throw new AppError('Não foi possível resolver a empresa administrativa', 500);
  const { error: memberError } = await supabase.from('company_members').upsert({ company_id: company.id, user_id: adminUserId, role: 'COMPANY_ADMIN', status: 'ACTIVE' }, { onConflict: 'company_id,user_id' });
  if (memberError) throw new AppError(`Não foi possível vincular o administrador à empresa administrativa: ${memberError.message}`, 500);
  return company;
}

export async function listCompanies() {
  const { data, error } = await getSupabaseAdmin().from('companies').select('id,name,slug,document,logo_path,status,timezone,created_at,updated_at').order('name');
  if (error) throw new AppError(`Não foi possível listar empresas: ${error.message}`, 500);
  return Promise.all((data ?? []).map((company) => withLogoUrl(company as Record<string, unknown>)));
}

export async function createCompany(input: { name: string; document?: string; timezone?: string; adminUserId: string; inviteEmail?: string }) {
  const name = input.name.trim();
  if (!name) throw new AppError('Nome da empresa é obrigatório', 400);
  const supabase = getSupabaseAdmin();
  const { data: company, error } = await supabase.from('companies').insert({ name, slug: slugify(name), document: input.document?.trim() || null, timezone: input.timezone || 'America/Sao_Paulo', created_by: input.adminUserId }).select('id,name,slug,document,status,timezone,created_at').single();
  if (error || !company) throw new AppError(`Não foi possível criar empresa: ${error?.message ?? 'registro vazio'}`, 500);
  const { error: memberError } = await supabase.from('company_members').insert({ company_id: company.id, user_id: input.adminUserId, role: 'COMPANY_ADMIN', status: 'ACTIVE' });
  if (memberError) throw new AppError(`Empresa criada, mas não foi possível criar o membro inicial: ${memberError.message}`, 500);
  if (input.inviteEmail?.trim()) await inviteToCompany(company.id, input.inviteEmail, 'COMPANY_ADMIN', input.adminUserId);
  return company;
}

export async function inviteToCompany(companyId: string, email: string, role: CompanyRole, invitedBy: string) {
  const normalizedEmail = email.trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) throw new AppError('E-mail de convite inválido', 400);
  const { data: company } = await getSupabaseAdmin().from('companies').select('id,name').eq('id', companyId).eq('status', 'ACTIVE').single();
  if (!company) throw new AppError('Empresa não encontrada ou inativa', 404);
  const supabase = getSupabaseAdmin();
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const existingUser = users?.users.find((user) => user.email?.toLowerCase() === normalizedEmail);
  if (existingUser) {
    const { data: memberships } = await supabase.from('company_members').select('id').eq('company_id', companyId).eq('user_id', existingUser.id).eq('status', 'ACTIVE').limit(1);
    if (memberships?.length) throw new AppError('Este e-mail já faz parte desta empresa.', 409);
    throw new AppError('Este e-mail já possui uma conta no Metrik. O usuário deve entrar com a conta existente para ser vinculado.', 409);
  }
  const { data: invite, error } = await supabase.from('company_invitations').insert({ company_id: companyId, email: normalizedEmail, role, invited_by: invitedBy }).select('id,company_id,email,role,status,expires_at,created_at').single();
  if (error || !invite) throw new AppError(`Não foi possível registrar convite: ${error?.message ?? 'registro vazio'}`, 500);
  const { error: authError } = await supabase.auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo: `${env.FRONTEND_ORIGIN}/accept-invite`, data: { company_id: companyId, company_name: company.name, invitation_id: invite.id, role } });
  if (authError) {
    await supabase.from('company_invitations').update({ status: 'REVOKED' }).eq('id', invite.id);
    const errorMessage = describeError(authError);
    const errorCode = describeErrorCode(authError);
    console.error('[auth/invite] Supabase rejeitou convite de membro', { ...describeErrorMetadata(authError), message: errorMessage });
    const message = errorMessage.toLowerCase();
    if (message.includes('rate limit') || message.includes('rate_limit') || message.includes('too many')) {
      throw new AppError('O Supabase atingiu o limite temporário de envio de e-mails. Aguarde e tente novamente mais tarde; nenhum convite foi mantido.', 429);
    }
    throw new AppError(`O convite não foi enviado pelo Supabase${errorCode ? ` (${errorCode})` : ''}: ${errorMessage}`, 502);
  }
  return invite;
}
