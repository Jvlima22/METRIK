import { Router } from 'express';
import { getCompanySignupInvite, postCompanySignupComplete, postCompanySignupInvite } from '../controllers/company-signup.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireGlobalAdmin } from '../middlewares/company.middleware';

const router = Router();
router.post('/invites', requireAuth, requireGlobalAdmin, postCompanySignupInvite);
router.get('/invite', getCompanySignupInvite);
router.post('/complete', postCompanySignupComplete);
export default router;
