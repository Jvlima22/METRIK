import { Router } from 'express';
import { getProfile, patchProfile, uploadLogo, deleteLogo } from '../controllers/company-profile.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext, requireCompanyRole } from '../middlewares/company.middleware';

const router = Router();
router.use(requireAuth, requireCompanyContext);
router.get('/', getProfile);
router.patch('/', requireCompanyRole('GLOBAL_ADMIN', 'COMPANY_ADMIN'), patchProfile);
router.post('/logo', requireCompanyRole('GLOBAL_ADMIN', 'COMPANY_ADMIN'), uploadLogo);
router.delete('/logo', requireCompanyRole('GLOBAL_ADMIN', 'COMPANY_ADMIN'), deleteLogo);
export default router;
