import { Router } from 'express';
import { getOnboardingStatus, postOnboardingComplete } from '../controllers/company-onboarding.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext } from '../middlewares/company.middleware';

const router = Router();
router.use(requireAuth, requireCompanyContext);
router.get('/status', getOnboardingStatus);
router.post('/complete', postOnboardingComplete);

export default router;
