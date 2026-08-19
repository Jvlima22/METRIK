import { Request, Response, NextFunction } from 'express';
import { AppError } from '../utils/AppError';
import { createConnection, deleteConnection, integrationCatalog, listConnectionAccounts, listConnections, listConnectionSyncRuns, testConnection, updateConnectionStatus } from '../services/integration-hub.service';

function context(req: Request) {
  if (!req.user?.id) throw new AppError('Usuário autenticado não identificado', 401);
  if (!req.company?.id) throw new AppError('Empresa ativa não identificada', 400);
  return { userId: req.user.id, companyId: req.company.id };
}

export async function getCatalog(_req: Request, res: Response, next: NextFunction) { try { res.json({ data: integrationCatalog }); } catch (error) { next(error); } }
export async function getConnections(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await listConnections(context(req).companyId) }); } catch (error) { next(error); } }
export async function postConnection(req: Request, res: Response, next: NextFunction) { try { const body = req.body ?? {}; if (!body.provider || !body.authType) throw new AppError('provider e authType são obrigatórios', 400); const { userId, companyId } = context(req); res.status(201).json({ data: await createConnection(userId, companyId, { provider: body.provider, authType: body.authType, workspaceName: body.workspaceName, scopes: body.scopes, metadata: body.metadata, credentials: body.credentials }) }); } catch (error) { next(error); } }
export async function getConnectionAccounts(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await listConnectionAccounts(context(req).companyId, String(req.params.id)) }); } catch (error) { next(error); } }
export async function getConnectionSyncRuns(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await listConnectionSyncRuns(context(req).companyId, String(req.params.id)) }); } catch (error) { next(error); } }
export async function postConnectionTest(req: Request, res: Response, next: NextFunction) { try { const { userId, companyId } = context(req); res.json({ data: await testConnection(userId, companyId, String(req.params.id)) }); } catch (error) { next(error); } }
export async function patchConnectionStatus(req: Request, res: Response, next: NextFunction) { try { const status = req.body?.status; if (status !== 'PAUSED' && status !== 'DRAFT') throw new AppError('status deve ser PAUSED ou DRAFT', 400); const { userId, companyId } = context(req); res.json({ data: await updateConnectionStatus(userId, companyId, String(req.params.id), status) }); } catch (error) { next(error); } }
export async function removeConnection(req: Request, res: Response, next: NextFunction) { try { const { userId, companyId } = context(req); res.json({ data: await deleteConnection(userId, companyId, String(req.params.id)) }); } catch (error) { next(error); } }
