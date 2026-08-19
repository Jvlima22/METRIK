import { Router } from 'express';
import { getProfile, patchProfile } from '../controllers/company-profile.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext, requireCompanyRole } from '../middlewares/company.middleware';

const router = Router();
router.use(requireAuth, requireCompanyContext);
router.get('/', getProfile);
router.patch('/', requireCompanyRole('GLOBAL_ADMIN', 'COMPANY_ADMIN'), patchProfile);
export default router;
