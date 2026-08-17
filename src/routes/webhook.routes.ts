import { Router } from 'express';
import { handleCaktoWebhook } from '../controllers/cakto.controller';
import { handleViolationWebhook } from '../controllers/webhook.controller';
import { validate } from '../middlewares/validate.middleware';
import { violationPayloadSchema } from '../schemas/violation.schema';

const router = Router();
router.post('/cakto', handleCaktoWebhook);

router.post(
  '/violation',
  validate(violationPayloadSchema, 'body'),
  handleViolationWebhook,
);

export default router;

