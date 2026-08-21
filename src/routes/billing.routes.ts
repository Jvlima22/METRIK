import { Router } from 'express';
import { getBillingSubscription } from '../controllers/billing.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext } from '../middlewares/company.middleware';

const router = Router();
router.use(requireAuth, requireCompanyContext);
router.get('/subscription', getBillingSubscription);

export default router;
