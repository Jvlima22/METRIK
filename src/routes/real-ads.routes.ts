import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext } from '../middlewares/company.middleware';
import { getCompanyAdsMetrics } from '../controllers/real-ads.controller';

const router = Router();
router.use(requireAuth, requireCompanyContext);
router.get('/metrics', getCompanyAdsMetrics);
export default router;
