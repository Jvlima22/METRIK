import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { createCompanySignupInvite, validateCompanySignupInvite, completeCompanySignup } from '../services/company-signup.service';

function adminId(req: Request) {
  if (!req.user?.id) throw new AppError('Administrador não identificado', 401);
  return req.user.id;
}

export async function postCompanySignupInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const { email, provisionalName } = req.body ?? {};
    if (typeof email !== 'string' || !email.trim()) throw new AppError('email é obrigatório', 400);
    res.status(201).json({ data: await createCompanySignupInvite({ email, provisionalName, invitedBy: adminId(req) }) });
  } catch (error) { next(error); }
}

export async function getCompanySignupInvite(req: Request, res: Response, next: NextFunction) {
  try { res.json({ data: await validateCompanySignupInvite(String(req.query.token ?? '')) }); } catch (error) { next(error); }
}

export async function postCompanySignupComplete(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    const required = ['token', 'password', 'fullName', 'legalName', 'cnpj', 'companyEmail'];
    for (const field of required) if (typeof body[field] !== 'string' || !body[field].trim()) throw new AppError(`${field} é obrigatório`, 400);
    res.status(201).json({ data: await completeCompanySignup(body) });
  } catch (error) { next(error); }
}
