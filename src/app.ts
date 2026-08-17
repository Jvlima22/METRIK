import express from 'express';
import cors from 'cors';
import { env } from './config/env';
import { errorHandler } from './middlewares/error.middleware';
import routes from './routes';

export const app = express();

app.use(cors({ origin: env.FRONTEND_ORIGIN }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', env: env.NODE_ENV, ts: new Date().toISOString() });
});

app.use(routes);
app.use(errorHandler);
