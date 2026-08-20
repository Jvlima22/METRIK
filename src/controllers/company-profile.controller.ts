import type { Request, Response, NextFunction } from 'express';
import { getCompanyProfile, updateCompanyProfile, uploadCompanyLogo, removeCompanyLogo, companyProfileCompletion } from '../services/company-profile.service';
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

export async function uploadLogo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await uploadCompanyLogo(companyId(req), String(req.body?.fileName ?? ''), String(req.body?.mimeType ?? ''), String(req.body?.base64 ?? ''));
    res.json({ data, completion: companyProfileCompletion(data as Record<string, unknown>) });
  } catch (error) { next(error); }
}

export async function deleteLogo(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await removeCompanyLogo(companyId(req));
    res.json({ data, completion: companyProfileCompletion(data as Record<string, unknown>) });
  } catch (error) { next(error); }
}

export async function patchProfile(req: Request, res: Response, next: NextFunction) {
  try {
    const data = await updateCompanyProfile(companyId(req), req.body ?? {});
    res.json({ data, completion: companyProfileCompletion(data as Record<string, unknown>) });
  } catch (error) { next(error); }
}
