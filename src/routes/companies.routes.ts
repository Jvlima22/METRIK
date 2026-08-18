import { Router } from 'express';
import { getCompanies, postCompany, postCompanyInvite } from '../controllers/company.controller';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireGlobalAdmin } from '../middlewares/company.middleware';

const router = Router();
router.use(requireAuth, requireGlobalAdmin);
router.get('/', getCompanies);
router.post('/', postCompany);
router.post('/:companyId/invites', postCompanyInvite);
export default router;
