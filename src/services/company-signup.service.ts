import { createHash, randomBytes } from 'node:crypto';
import { getSupabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { CompanyRole } from '../types/express';
import { validateCnpj } from './cnpj-validation.service';
import { seedPendingCompanyOnboarding } from './company-onboarding.service';
import { describeError, describeErrorCode, describeErrorMetadata } from '../utils/error-message';

const INVITE_TTL_HOURS = 72;

function hashToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

function slugify(value: string) {
  const slug = value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 70);
  return slug || `empresa-${Date.now()}`;
}

function onlyDigits(value: string) { return value.replace(/\D/g, ''); }

function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^([0-9])\1+$/.test(cnpj)) return false;
  const calculate = (base: string) => {
    let factor = base.length - 5;
    let sum = 0;
    for (const digit of base) { sum += Number(digit) * factor; factor = factor === 2 ? 9 : factor - 1; }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(cnpj.slice(0, 12)) === Number(cnpj[12]) && calculate(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

async function purgeOrphanedAuthUser(userId: string) {
  const supabase = getSupabaseAdmin();
  const checks = await Promise.all([
    supabase.from('company_members').select('id').eq('user_id', userId).limit(1),
    supabase.from('companies').select('id').eq('created_by', userId).limit(1),
    supabase.from('company_invitations').select('id').eq('invited_by', userId).limit(1),
    supabase.from('company_signup_invitations').select('id').eq('accepted_by', userId).not('company_id', 'is', null).limit(1),
    supabase.from('integration_connections').select('id').eq('owner_user_id', userId).limit(1),
    supabase.from('integration_sync_jobs').select('id').eq('owner_user_id', userId).limit(1),
    supabase.from('integration_audit_logs').select('id').eq('owner_user_id', userId).limit(1),
  ]);
  const queryError = checks.find((result) => result.error)?.error;
  if (queryError) throw new AppError(`Não foi possível verificar a conta órfã: ${queryError.message}`, 500);
  if (checks.some((result) => (result.data ?? []).length > 0)) return false;

  const { error } = await supabase.auth.admin.deleteUser(userId);
  if (error) throw new AppError(`Este e-mail já possui uma conta no Metrik e não pôde ser reutilizado: ${error.message}`, 409);
  return true;
}

export async function createCompanySignupInvite(input: { email: string; provisionalName?: string; invitedBy: string }) {
  const email = input.email.trim().toLowerCase();
  if (!email.includes('@')) throw new AppError('E-mail de convite inválido', 400);
  const token = randomBytes(32).toString('hex');
  const supabase = getSupabaseAdmin();
  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  let existingUser = users?.users.find((user) => user.email?.toLowerCase() === email);
  if (existingUser) {
    const { data: memberships } = await supabase.from('company_members').select('company_id').eq('user_id', existingUser.id).eq('status', 'ACTIVE').limit(1);
    if (memberships?.length) throw new AppError('Este e-mail já está vinculado a uma empresa no Metrik.', 409);
    const purged = await purgeOrphanedAuthUser(existingUser.id);
    if (!purged) throw new AppError('Este e-mail já possui uma conta no Metrik. Use o convite de membro ou entre com a conta existente.', 409);
    existingUser = undefined;
  }
  await supabase.from('company_signup_invitations').update({ status: 'REVOKED', revoked_at: new Date().toISOString() }).eq('email', email).in('status', ['PENDING', 'OPENED']);
  const { data: invite, error } = await supabase.from('company_signup_invitations').insert({ email, provisional_name: input.provisionalName?.trim() || null, token_hash: hashToken(token), invited_by: input.invitedBy, status: 'PENDING', expires_at: new Date(Date.now() + INVITE_TTL_HOURS * 60 * 60 * 1000).toISOString() }).select('id,email,provisional_name,status,expires_at,created_at').single();
  if (error || !invite) throw new AppError(`Não foi possível criar convite: ${error?.message ?? 'registro vazio'}`, 500);
  const redirectTo = `${env.FRONTEND_ORIGIN}/company-onboarding?token=${token}`;
  const { error: authError } = await supabase.auth.admin.inviteUserByEmail(email, { redirectTo, data: { company_invitation_id: invite.id, company_signup_token: token } });
  if (authError) {
    await supabase.from('company_signup_invitations').update({ status: 'REVOKED', revoked_at: new Date().toISOString() }).eq('id', invite.id);
    const errorMessage = describeError(authError);
    const errorCode = describeErrorCode(authError);
    console.error('[auth/invite] Supabase rejeitou convite de empresa', { ...describeErrorMetadata(authError), message: errorMessage });
    const message = errorMessage.toLowerCase();
    if (message.includes('rate limit') || message.includes('rate_limit') || message.includes('too many')) {
      throw new AppError('O Supabase atingiu o limite temporário de envio de e-mails. Aguarde e tente novamente mais tarde; nenhum convite foi mantido.', 429);
    }
    throw new AppError(`O convite não foi enviado pelo Supabase${errorCode ? ` (${errorCode})` : ''}: ${errorMessage}`, 502);
  }
  return { ...invite, inviteUrl: redirectTo };
}

export async function validateCompanySignupInvite(token: string) {
  if (!token || token.length < 32) throw new AppError('Convite inválido', 400);
  const { data, error } = await getSupabaseAdmin().from('company_signup_invitations').select('id,email,provisional_name,status,expires_at').eq('token_hash', hashToken(token)).maybeSingle();
  if (error || !data) throw new AppError('Convite inválido ou expirado', 404);
  if (data.status !== 'PENDING' && data.status !== 'OPENED') throw new AppError('Convite já utilizado ou revogado', 410);
  if (new Date(data.expires_at).getTime() < Date.now()) { await getSupabaseAdmin().from('company_signup_invitations').update({ status: 'EXPIRED' }).eq('id', data.id); throw new AppError('Convite expirado', 410); }
  await getSupabaseAdmin().from('company_signup_invitations').update({ status: 'OPENED' }).eq('id', data.id).eq('status', 'PENDING');
  return { id: data.id, email: data.email, provisionalName: data.provisional_name, expiresAt: data.expires_at };
}

export async function completeCompanySignup(input: { token: string; password: string; fullName: string; phone?: string; cpf?: string; legalName?: string; tradeName?: string; cnpj?: string; companyEmail?: string; companyPhone?: string; website?: string; segment?: string; address?: string; city?: string; state?: string; postalCode?: string; country?: string; timezone?: string }) {
  const tokenHash = hashToken(input.token);
  const supabase = getSupabaseAdmin();
  const { data: invite, error: inviteError } = await supabase.from('company_signup_invitations').select('id,email,status,expires_at,company_id').eq('token_hash', tokenHash).maybeSingle();
  if (inviteError || !invite) throw new AppError('Convite inválido ou expirado', 404);
  if (new Date(invite.expires_at).getTime() < Date.now()) throw new AppError('Convite expirado', 410);
  if (invite.status === 'ACCEPTED' && invite.company_id) return { completed: true, companyId: invite.company_id, email: invite.email };
  if (!['PENDING', 'OPENED'].includes(invite.status)) throw new AppError('Convite já utilizado ou revogado', 410);
  if (input.password.length < 8) throw new AppError('A senha deve ter pelo menos 8 caracteres', 400);
  const normalizedCnpj = input.cnpj?.replace(/\D/g, '') || '';
  const validatedCnpj = normalizedCnpj ? await validateCnpj(normalizedCnpj) : null;
  const cnpj = validatedCnpj?.cnpj || null;
  if (cnpj) {
    const { data: existingCompany } = await supabase.from('companies').select('id').eq('document', cnpj).maybeSingle();
    if (existingCompany) throw new AppError('Este CNPJ já está cadastrado', 409);
  }
  const companyName = input.tradeName?.trim() || input.legalName?.trim() || invite.email.split('@')[0] || 'Nova empresa';

  const { data: users } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
  const authUser = users?.users.find((user) => user.email?.toLowerCase() === invite.email.toLowerCase());
  if (!authUser) throw new AppError('A conta do convite ainda não foi criada. Abra o link recebido por e-mail ou solicite o reenvio.', 409);
  const { error: updateError } = await supabase.auth.admin.updateUserById(authUser.id, { password: input.password, user_metadata: { ...(authUser.user_metadata ?? {}), name: input.fullName, phone: input.phone, cpf: input.cpf } });
  if (updateError) throw new AppError(`Não foi possível concluir a conta: ${updateError.message}`, 400);

  const { data: company, error: companyError } = await supabase.from('companies').insert({ name: companyName, slug: slugify(companyName), document: cnpj, legal_name: validatedCnpj?.legalName || input.legalName?.trim() || null, trade_name: input.tradeName?.trim() || validatedCnpj?.tradeName || null, corporate_email: (input.companyEmail || invite.email).trim().toLowerCase(), corporate_phone: input.companyPhone || validatedCnpj?.phone || null, website: input.website || null, segment: input.segment || null, address: input.address || validatedCnpj?.address || null, city: input.city || validatedCnpj?.city || null, state: input.state || validatedCnpj?.state || null, postal_code: input.postalCode || validatedCnpj?.postalCode || null, country: input.country || 'Brasil', timezone: input.timezone || 'America/Sao_Paulo', cnpj_validation_status: validatedCnpj ? (validatedCnpj.status === 'ATIVA' ? 'VALID' : 'INVALID') : 'PENDING', cnpj_validated_at: validatedCnpj?.checkedAt || null, cnpj_validation_provider: validatedCnpj?.provider || null, cnpj_validation_payload: validatedCnpj ? { legalName: validatedCnpj.legalName, tradeName: validatedCnpj.tradeName, status: validatedCnpj.status, city: validatedCnpj.city, state: validatedCnpj.state, primaryCnae: validatedCnpj.primaryCnae } : {}, created_by: authUser.id }).select('id,name,slug,status').single();
  if (companyError || !company) throw new AppError(`Conta criada, mas não foi possível criar empresa: ${companyError?.message ?? 'registro vazio'}`, 500);
  const { error: memberError } = await supabase.from('company_members').insert({ company_id: company.id, user_id: authUser.id, role: 'COMPANY_ADMIN' as CompanyRole, status: 'ACTIVE' });
  if (memberError) throw new AppError(`Empresa criada, mas não foi possível criar o administrador: ${memberError.message}`, 500);
  await supabase.from('company_signup_invitations').update({ status: 'ACCEPTED', accepted_by: authUser.id, accepted_at: new Date().toISOString(), company_id: company.id }).eq('id', invite.id);
  await seedPendingCompanyOnboarding(company.id);
  return { completed: true, companyId: company.id, email: invite.email, company };
}
