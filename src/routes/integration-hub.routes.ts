import { Router } from 'express';
import { requireAuth, requireAdmin } from '../middlewares/auth.middleware';
import { requireCompanyContext } from '../middlewares/company.middleware';
import { getAdminAdAccounts, getCatalog, getConnectionAccounts, getConnectionSyncRuns, getConnections, patchConnectionStatus, postAdAccount, postConnection, postConnectionTest, removeConnection } from '../controllers/integration-hub.controller';

const router = Router();
router.get('/admin/accounts', requireAuth, requireAdmin, getAdminAdAccounts);
router.use(requireAuth, requireCompanyContext);
router.get('/catalog', getCatalog);
router.get('/connections', getConnections);
router.post('/connections', postConnection);
router.post('/accounts', postAdAccount);
router.get('/connections/:id/accounts', getConnectionAccounts);
router.get('/connections/:id/sync-runs', getConnectionSyncRuns);
router.post('/connections/:id/test', postConnectionTest);
router.patch('/connections/:id/status', patchConnectionStatus);
router.delete('/connections/:id', removeConnection);
export default router;
