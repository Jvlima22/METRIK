import { z } from 'zod';

export const caktoWebhookSchema = z.object({
  secret: z.string().min(1),
  event: z.string().min(1),
  data: z.record(z.string(), z.unknown()),
});

export type CaktoWebhookPayload = z.infer<typeof caktoWebhookSchema>;
