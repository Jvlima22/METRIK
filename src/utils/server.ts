import { app } from '../app';
import { env } from '../config/env';
import { startTakedownWorker } from '../workers/takedown.worker';
import { redisConnection } from '../queues/redis';
import { takedownQueue } from '../queues/takedown.queue';

export { app };

if (process.env.VERCEL !== '1') {
  const worker = startTakedownWorker();

  async function shutdown(signal: string): Promise<void> {
    console.log(`[${signal}] encerrando...`);
    await worker.close();
    await takedownQueue.close();
    await redisConnection.quit();
    process.exit(0);
  }

  process.on('SIGINT', () => void shutdown('SIGINT'));
  process.on('SIGTERM', () => void shutdown('SIGTERM'));

  app.listen(env.PORT, () => {
    console.log(`API rodando na porta ${env.PORT} [${env.NODE_ENV}]`);
    console.log('Worker takedown iniciado');
  });
}
