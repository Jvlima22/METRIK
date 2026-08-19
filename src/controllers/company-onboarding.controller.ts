import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { getCompanyOnboarding, saveCompanyOnboarding } from '../services/company-onboarding.service';

function companyId(req: Request) {
  if (!req.company?.id) throw new AppError('Empresa ativa não identificada', 400);
  return req.company.id;
}

export async function getOnboardingStatus(req: Request, res: Response, next: NextFunction) {
  try { res.json({ data: await getCompanyOnboarding(companyId(req)) }); } catch (error) { next(error); }
}

export async function postOnboardingComplete(req: Request, res: Response, next: NextFunction) {
  try {
    const body = req.body ?? {};
    if (!body || typeof body !== 'object') throw new AppError('Dados do onboarding inválidos', 400);
    res.status(200).json({ data: await saveCompanyOnboarding(companyId(req), {
      primaryGoal: body.primaryGoal,
      adChannels: body.adChannels,
      conversionEvent: body.conversionEvent,
      managementModel: body.managementModel,
      answers: body.answers,
      formVersion: body.formVersion,
    }) });
  } catch (error) { next(error); }
}
