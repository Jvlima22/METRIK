import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { inviteToCompany } from '../services/company.service';
import { createCompanySignupInvite } from '../services/company-signup.service';
import { isGlobalAdmin } from '../middlewares/company.middleware';
import { getSupabaseAdmin } from '../lib/supabase';
import { assertCompanyLimit } from '../services/entitlement.service';

/**
 * POST /auth/invite — endpoint único usado pelo popup de convite.
 *
 * Com x-company-id, convida um membro para a empresa ativa. Sem empresa ativa,
 * somente o administrador global pode criar um convite de nova empresa.
 */
export async function inviteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { email } = req.body as { email: string };
    const normalizedEmail = email.trim().toLowerCase();
    const companyId = typeof req.headers['x-company-id'] === 'string' ? req.headers['x-company-id'] : undefined;
    const inviteKind = req.headers['x-invite-kind'] === 'COMPANY' ? 'COMPANY' : 'MEMBER';
    const userId = req.user?.id;
    if (!userId) throw new AppError('Usuário autenticado não identificado', 401);

    if (inviteKind === 'MEMBER') {
      if (!companyId) throw new AppError('Selecione uma empresa ativa para convidar um membro', 400);
      const { count: currentMembers, error: memberUsageError } = await getSupabaseAdmin()
        .from('company_members')
        .select('id', { count: 'exact', head: true })
        .eq('company_id', companyId)
        .in('status', ['ACTIVE', 'PENDING', 'INVITED']);
      if (memberUsageError) throw new AppError(`Não foi possível verificar o limite de membros: ${memberUsageError.message}`, 500);
      await assertCompanyLimit({ companyId, userEmail: req.user?.email ?? null, resource: 'team_members', current: currentMembers ?? 0, isGlobalAdmin: isGlobalAdmin(req.user?.email) });
      const invite = await inviteToCompany(companyId, normalizedEmail, 'COMPANY_OPERATOR', userId);
      res.status(201).json({ status: 'ok', type: 'MEMBER', invited: normalizedEmail, invitationId: invite.id, by: req.user?.email });
      return;
    }

    if (!isGlobalAdmin(req.user?.email)) throw new AppError('Somente o administrador global pode convidar novas empresas', 403);
    const invite = await createCompanySignupInvite({ email: normalizedEmail, invitedBy: userId });
    res.status(201).json({ status: 'ok', type: 'COMPANY', invited: normalizedEmail, invitationId: invite.id, inviteUrl: invite.inviteUrl, by: req.user?.email });
  } catch (err) {
    next(err);
  }
}
