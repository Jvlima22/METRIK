import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { createCompany, inviteToCompany, listCompanies } from '../services/company.service';

function adminUserId(req: Request) {
  if (!req.user?.id) throw new AppError('Administrador não identificado', 401);
  return req.user.id;
}

export async function getCompanies(_req: Request, res: Response, next: NextFunction) {
  try { res.json({ data: await listCompanies() }); } catch (error) { next(error); }
}

export async function postCompany(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    if (typeof body.name !== 'string' || !body.name.trim()) throw new AppError('name é obrigatório', 400);
    res.status(201).json({ data: await createCompany({ name: body.name, document: body.document, timezone: body.timezone, adminUserId: adminUserId(req), inviteEmail: body.inviteEmail }) });
  } catch (error) { next(error); }
}

export async function postCompanyInvite(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    if (typeof body.email !== 'string' || !body.email.trim()) throw new AppError('email é obrigatório', 400);
    const allowedRoles = ['COMPANY_ADMIN', 'COMPANY_OPERATOR', 'COMPANY_VIEWER'];
    const role = allowedRoles.includes(body.role) ? body.role : 'COMPANY_OPERATOR';
    res.status(201).json({ data: await inviteToCompany(String(req.params.companyId), body.email, role, adminUserId(req)) });
  } catch (error) { next(error); }
}
