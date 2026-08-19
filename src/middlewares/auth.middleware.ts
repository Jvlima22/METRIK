import { Request, Response, NextFunction } from 'express';
import { getSupabase, getSupabaseAdmin } from '../lib/supabase';
import { env } from '../config/env';
import { AppError } from '../utils/AppError';
import { isGlobalAdmin } from './company.middleware';

/**
 * Protege uma rota exigindo um JWT válido do Supabase no header
 * `Authorization: Bearer <token>`. Valida o token contra o Supabase
 * (`auth.getUser`) e injeta `req.user`. Lança 401 se ausente/inválido.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const header = req.headers.authorization ?? '';
    const [scheme, token] = header.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new AppError('Token de autenticação ausente', 401);
    }

    const { data, error } = await getSupabase().auth.getUser(token);

    if (error || !data.user) {
      throw new AppError('Token de autenticação inválido ou expirado', 401);
    }

    req.user = { id: data.user.id, email: data.user.email ?? null };
    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Exige que o usuário autenticado esteja na allowlist `INVITE_ADMINS`. Deve ser
 * encadeado DEPOIS de `requireAuth` (depende de `req.user`). Lança 403 caso
 * contrário. É a barreira de segurança real dos convites — a UI esconde o botão
 * por conveniência, mas a verificação que importa é esta.
 */
export async function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const email = req.user?.email?.toLowerCase();
    if (!email) throw new AppError('Acesso restrito a administradores', 403);
    if (isGlobalAdmin(email) || env.INVITE_ADMINS.includes(email)) { next(); return; }

    const inviteKind = req.headers['x-invite-kind'] === 'COMPANY' ? 'COMPANY' : 'MEMBER';
    const companyId = typeof req.headers['x-company-id'] === 'string' ? req.headers['x-company-id'] : undefined;
    if (inviteKind === 'MEMBER' && companyId && req.user?.id) {
      const { data: membership, error } = await getSupabaseAdmin()
        .from('company_members')
        .select('role')
        .eq('company_id', companyId)
        .eq('user_id', req.user.id)
        .eq('status', 'ACTIVE')
        .in('role', ['COMPANY_ADMIN', 'GLOBAL_ADMIN'])
        .maybeSingle();
      if (!error && membership) { next(); return; }
    }
    throw new AppError('Acesso restrito a administradores', 403);
  } catch (error) { next(error); }
}
