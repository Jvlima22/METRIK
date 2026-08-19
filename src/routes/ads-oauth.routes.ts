import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext } from '../middlewares/company.middleware';
import { finishAdsOAuth, startAdsOAuth } from '../controllers/ads-oauth.controller';

const router = Router();
router.get('/:provider/start', requireAuth, requireCompanyContext, startAdsOAuth);
router.get('/:provider/callback', finishAdsOAuth);
export default router;
