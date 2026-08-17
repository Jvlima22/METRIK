import { Request, Response, NextFunction } from "express";
import { approveAdsDraft, createAdsDraft, AdsDraft } from "../services/ads-draft.service";

export function createDraft(req: Request, res: Response, next: NextFunction): void {
  try {
    const { metricId, businessName, objective } = req.body ?? {};
    if (!metricId || !businessName) {
      res.status(400).json({ error: "metricId e businessName são obrigatórios." });
      return;
    }
    res.status(201).json({ draft: createAdsDraft(String(metricId), String(businessName), objective ? String(objective) : undefined) });
  } catch (error) { next(error); }
}

export function approveDraft(req: Request, res: Response, next: NextFunction): void {
  try {
    const draft = req.body?.draft as AdsDraft | undefined;
    if (!draft) { res.status(400).json({ error: "draft é obrigatório." }); return; }
    res.json({ draft: approveAdsDraft(draft) });
  } catch (error) { next(error); }
}
