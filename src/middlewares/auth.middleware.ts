import { Request, Response, NextFunction } from 'express';
import { getSupabase } from '../lib/supabase';
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
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const email = req.user?.email?.toLowerCase();
  if (!email || (!isGlobalAdmin(email) && !env.INVITE_ADMINS.includes(email))) {
    next(new AppError('Acesso restrito a administradores', 403));
    return;
  }
  next();
}
