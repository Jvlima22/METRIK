import { Request, Response, NextFunction } from 'express';
import { getSupabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import type { CompanyRole } from '../types/express';
import { ensureAdminCompany } from '../services/company.service';

function currentUser(req: Request) {
  if (!req.user?.id) throw new AppError('Usuário autenticado não identificado', 401);
  return req.user;
}

const PRIMARY_GLOBAL_ADMIN_EMAIL = 'comercial.metrik.ai@gmail.com';

export function isGlobalAdmin(email: string | null | undefined): boolean {
  const normalizedEmail = email?.trim().toLowerCase();
  return Boolean(normalizedEmail && (normalizedEmail === PRIMARY_GLOBAL_ADMIN_EMAIL || normalizedEmail === env.GLOBAL_ADMIN_EMAIL));
}

export async function requireGlobalAdmin(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = currentUser(req);
    if (!isGlobalAdmin(user.email)) throw new AppError('Acesso restrito ao administrador global', 403);
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireCompanyContext(req: Request, _res: Response, next: NextFunction): Promise<void> {
  try {
    const user = currentUser(req);
    const requestedCompanyId = typeof req.headers['x-company-id'] === 'string' ? req.headers['x-company-id'] : undefined;
    const admin = isGlobalAdmin(user.email);
    if (admin && !requestedCompanyId) {
      const company = await ensureAdminCompany(user.id);
      req.company = { id: company.id, name: company.name, slug: company.slug, role: 'GLOBAL_ADMIN', isGlobalAdmin: true };
      next();
      return;
    }
    const membershipQuery = getSupabaseAdmin()
      .from('company_members')
      .select('role, company:companies!inner(id,name,slug,status)')
      .eq('user_id', user.id)
      .eq('status', 'ACTIVE');

    const { data, error } = requestedCompanyId
      ? await membershipQuery.eq('company_id', requestedCompanyId).maybeSingle()
      : await membershipQuery;
    if (error) throw new AppError(`Não foi possível resolver a empresa ativa: ${error.message}`, 500);

    if (admin && requestedCompanyId) {
      const { data: company, error: companyError } = await getSupabaseAdmin()
        .from('companies')
        .select('id,name,slug,status')
        .eq('id', requestedCompanyId)
        .eq('status', 'ACTIVE')
        .single();
      if (companyError || !company) throw new AppError('Empresa ativa não encontrada', 404);
      req.company = { id: company.id, name: company.name, slug: company.slug, role: 'GLOBAL_ADMIN', isGlobalAdmin: true };
      next();
      return;
    }

    const memberships = Array.isArray(data) ? data : data ? [data] : [];
    if (!memberships.length) throw new AppError('Usuário não possui acesso à empresa solicitada', 403);
    if (!requestedCompanyId && memberships.length > 1) throw new AppError('Informe o header x-company-id para selecionar a empresa', 400);
    const selected = memberships[0] as { role: CompanyRole; company: { id: string; name: string; slug: string; status: string } | Array<{ id: string; name: string; slug: string; status: string }> };
    const company = Array.isArray(selected.company) ? selected.company[0] : selected.company;
    if (!company || company.status !== 'ACTIVE') throw new AppError('Empresa inativa ou não encontrada', 403);
    req.company = { id: company.id, name: company.name, slug: company.slug, role: selected.role, isGlobalAdmin: admin };
    next();
  } catch (error) {
    next(error);
  }
}

export function requireCompanyRole(...roles: CompanyRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.company || (!req.company.isGlobalAdmin && !roles.includes(req.company.role))) {
      next(new AppError('Permissão insuficiente para esta operação', 403));
      return;
    }
    next();
  };
}
