import { Request, Response, NextFunction } from "express";
import { AppError } from "../utils/AppError";
import { createConnection, deleteConnection, integrationCatalog, listConnections, testConnection, updateConnectionStatus } from "../services/integration-hub.service";

function userId(req: Request) { const id = req.user?.id; if (!id) throw new AppError("Usuário autenticado não identificado", 401); return id; }
export async function getCatalog(_req: Request, res: Response, next: NextFunction) { try { res.json({ data: integrationCatalog }); } catch (error) { next(error); } }
export async function getConnections(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await listConnections(userId(req)) }); } catch (error) { next(error); } }
export async function postConnection(req: Request, res: Response, next: NextFunction) { try { const body = req.body ?? {}; if (!body.provider || !body.authType) throw new AppError("provider e authType são obrigatórios", 400); res.status(201).json({ data: await createConnection(userId(req), { provider: body.provider, authType: body.authType, workspaceName: body.workspaceName, scopes: body.scopes, metadata: body.metadata, credentials: body.credentials }) }); } catch (error) { next(error); } }
export async function postConnectionTest(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await testConnection(userId(req), String(req.params.id)) }); } catch (error) { next(error); } }
export async function patchConnectionStatus(req: Request, res: Response, next: NextFunction) { try { const status = req.body?.status; if (status !== "PAUSED" && status !== "DRAFT") throw new AppError("status deve ser PAUSED ou DRAFT", 400); res.json({ data: await updateConnectionStatus(userId(req), String(req.params.id), status) }); } catch (error) { next(error); } }
export async function removeConnection(req: Request, res: Response, next: NextFunction) { try { res.json({ data: await deleteConnection(userId(req), String(req.params.id)) }); } catch (error) { next(error); } }
