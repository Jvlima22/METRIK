import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { inviteToCompany } from '../services/company.service';
import { createCompanySignupInvite } from '../services/company-signup.service';
import { isGlobalAdmin } from '../middlewares/company.middleware';

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
    const userId = req.user?.id;
    if (!userId) throw new AppError('Usuário autenticado não identificado', 401);

    if (companyId) {
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
