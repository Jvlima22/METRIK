import { Request, Response, NextFunction } from "express";
import { rankAdsOpportunities, AdsMetric } from "../services/ads-intelligence.service";

export function getAdsOpportunities(req: Request, res: Response, next: NextFunction): void {
  try {
    const metrics = Array.isArray(req.body?.metrics) ? (req.body.metrics as AdsMetric[]) : [];
    res.json({ opportunities: rankAdsOpportunities(metrics), generatedAt: new Date().toISOString() });
  } catch (error) {
    next(error);
  }
}
