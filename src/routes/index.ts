import { Router } from "express";
import webhookRoutes from "./webhook.routes";
import jobsRoutes from "./jobs.routes";
import metricsRoutes from "./metrics.routes";
import authRoutes from "./auth.routes";
import adsIntelligenceRoutes from "./ads-intelligence.routes";
import adsDraftRoutes from "./ads-drafts.routes";

const router = Router();
router.use("/webhook", webhookRoutes);
router.use("/jobs", jobsRoutes);
router.use("/metrics", metricsRoutes);
router.use("/auth", authRoutes);
router.use("/ai", adsIntelligenceRoutes);
router.use("/ai", adsDraftRoutes);
export default router;
