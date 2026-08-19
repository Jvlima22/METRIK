import type { Request, Response, NextFunction } from 'express';
import { getCompanyProfile, updateCompanyProfile, companyProfileCompletion } from '../services/company-profile.service';
import { AppError } from '../utils/AppError';

function companyId(req: Request) {
  if (!req.company?.id) throw new AppError('Empresa ativa não identificada', 400);
  return req.company.id;
}

export async function getProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await getCompanyProfile(companyId(req));
    res.json({ data, completion: companyProfileCompletion(data as Record<string, unknown>) });
  } catch (error) { next(error); }
}

export async function patchProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await updateCompanyProfile(companyId(req), req.body ?? {});
    res.json({ data, completion: companyProfileCompletion(data as Record<string, unknown>) });
  } catch (error) { next(error); }
}
