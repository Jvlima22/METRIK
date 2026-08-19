import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { getRealAdsMetrics } from '../services/real-ads.service';

export async function getCompanyAdsMetrics(req: Request, res: Response, next: NextFunction) {
  try {
    if (!req.company?.id) throw new AppError('Empresa ativa não identificada', 400);
    const start = typeof req.query.start === 'string' ? req.query.start : undefined;
    const end = typeof req.query.end === 'string' ? req.query.end : undefined;
    res.json({ data: await getRealAdsMetrics(req.company.id, start, end) });
  } catch (error) { next(error); }
}
