import { Router } from 'express';
import { requireAuth } from '../middlewares/auth.middleware';
import { requireCompanyContext } from '../middlewares/company.middleware';
import { getCatalog, getConnections, patchConnectionStatus, postConnection, postConnectionTest, removeConnection } from '../controllers/integration-hub.controller';

const router = Router();
router.use(requireAuth, requireCompanyContext);
router.get('/catalog', getCatalog);
router.get('/connections', getConnections);
router.post('/connections', postConnection);
router.post('/connections/:id/test', postConnectionTest);
router.patch('/connections/:id/status', patchConnectionStatus);
router.delete('/connections/:id', removeConnection);
export default router;
