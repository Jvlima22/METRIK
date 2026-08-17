import { Router } from "express";
import { getAdsOpportunities } from "../controllers/ads-intelligence.controller";
import { requireAuth } from "../middlewares/auth.middleware";

const router = Router();
router.post("/opportunities", requireAuth, getAdsOpportunities);
export default router;
