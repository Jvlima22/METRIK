import { Router } from "express";
import { approveDraft, createDraft } from "../controllers/ads-drafts.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();
router.post("/drafts", requireAuth, createDraft);
router.post("/drafts/approve", requireAuth, approveDraft);
export default router;
