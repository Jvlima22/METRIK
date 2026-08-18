import { Router } from 'express';
import { getCompanySignupInvite, getCnpjValidation, postCompanySignupComplete, postCompanySignupInvite } from '../controllers/company-signup.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireGlobalAdmin } from '../middlewares/company.middleware';

const router = Router();
router.post('/invites', requireAuth, requireGlobalAdmin, postCompanySignupInvite);
router.get('/invite', getCompanySignupInvite);
router.get('/cnpj/:cnpj', getCnpjValidation);
router.post('/complete', postCompanySignupComplete);
export default router;
