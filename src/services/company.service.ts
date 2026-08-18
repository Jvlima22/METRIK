import { getSupabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { CompanyRole } from '../types/express';

function slugify(value: string): string {
  const slug = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
  return slug || `empresa-${Date.now()}`;
}

export async function listCompanies() {
  const { data, error } = await getSupabaseAdmin().from('companies').select('id,name,slug,document,status,timezone,created_at,updated_at').order('name');
  if (error) throw new AppError(`Não foi possível listar empresas: ${error.message}`, 500);
  return data ?? [];
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
  const { data: invite, error } = await getSupabaseAdmin().from('company_invitations').insert({ company_id: companyId, email: normalizedEmail, role, invited_by: invitedBy }).select('id,company_id,email,role,status,expires_at,created_at').single();
  if (error || !invite) throw new AppError(`Não foi possível registrar convite: ${error?.message ?? 'registro vazio'}`, 500);
  const { error: authError } = await getSupabaseAdmin().auth.admin.inviteUserByEmail(normalizedEmail, { redirectTo: `${env.FRONTEND_ORIGIN}/accept-invite`, data: { company_id: companyId, company_name: company.name, invitation_id: invite.id, role } });
  if (authError && !authError.message.toLowerCase().includes('already')) throw new AppError(`Convite não enviado pelo Supabase Auth: ${authError.message}`, 502);
  return invite;
}
