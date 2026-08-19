import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { completeOAuth, createOAuthAuthorization } from '../services/ads-oauth.service';

function context(req: Request) {
  if (!req.user?.id) throw new AppError('Usuário autenticado não identificado', 401);
  if (!req.company?.id) throw new AppError('Empresa ativa não identificada', 400);
  return { userId: req.user.id, companyId: req.company.id };
}

function frontendRedirect(params: Record<string, string>) {
  const url = new URL(`${process.env.FRONTEND_ORIGIN ?? 'https://metrik-ai.vercel.app'}/ai-ads`);
  for (const [key, value] of Object.entries(params)) url.searchParams.set(key, value);
  return url.toString();
}

export async function startAdsOAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const { userId, companyId } = context(req);
    const data = await createOAuthAuthorization(userId, companyId, String(req.params.provider));
    res.json({ data });
  } catch (error) { next(error); }
}

export async function finishAdsOAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const provider = String(req.params.provider);
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : '';
    if (!code || !state) throw new AppError('Callback OAuth sem code ou state', 400);
    const connection = await completeOAuth(provider, code, state);
    res.redirect(frontendRedirect({ oauth: 'success', provider, connectionId: connection.id }));
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Falha ao concluir OAuth';
    res.redirect(frontendRedirect({ oauth: 'error', message: message.slice(0, 180) }));
  }
}
