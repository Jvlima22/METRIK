import crypto from 'node:crypto';
import type { Request, Response } from 'express';
import { env } from '../config/env';
import { caktoWebhookSchema } from '../schemas/cakto.schema';
import { getSupabaseAdmin } from '../lib/supabase';

function validSecret(received: string): boolean {
  const expected = env.CAKTO_WEBHOOK_SECRET;
  if (!expected) return false;
  const a = Buffer.from(received);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

const ACTIVE_EVENTS = new Set(['purchase_approved', 'subscription_created', 'subscription_renewed', 'subscription_resumed']);
const INACTIVE_EVENTS = new Set(['purchase_refused', 'subscription_renewal_refused', 'refund', 'chargeback', 'subscription_paused', 'subscription_canceled']);

export async function handleCaktoWebhook(req: Request, res: Response): Promise<void> {
  const parsed = caktoWebhookSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: 'invalid_payload' });
    return;
  }
  const payload = parsed.data;
  if (!validSecret(payload.secret)) {
    res.status(401).json({ error: 'unauthorized' });
    return;
  }

  const data = payload.data;
  const orderId = typeof data.id === 'string' ? data.id : null;
  const subscription = data.subscription && typeof data.subscription === 'object'
    ? data.subscription as Record<string, unknown>
    : null;
  const subscriptionId = subscription && typeof subscription.id === 'string'
    ? subscription.id
    : typeof data.subscription_id === 'string' ? data.subscription_id : null;
  const customer = data.customer && typeof data.customer === 'object'
    ? data.customer as Record<string, unknown>
    : null;
  const product = data.product && typeof data.product === 'object'
    ? data.product as Record<string, unknown>
    : null;
  const eventKey = `${payload.event}:${orderId ?? subscriptionId ?? crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex')}`;

  try {
    const db = getSupabaseAdmin();
    const { error: eventError } = await db.from('billing_webhook_events').upsert({
      provider: 'cakto',
      event_key: eventKey,
      event_name: payload.event,
      external_id: orderId ?? subscriptionId,
      payload,
      received_at: new Date().toISOString(),
    }, { onConflict: 'provider,event_key', ignoreDuplicates: true });
    if (eventError) throw eventError;

    if (subscriptionId) {
      const status = ACTIVE_EVENTS.has(payload.event)
        ? 'active'
        : INACTIVE_EVENTS.has(payload.event)
          ? 'inactive'
          : typeof subscription?.status === 'string' ? subscription.status : 'unknown';
      const { error } = await db.from('billing_subscriptions').upsert({
        provider: 'cakto',
        cakto_subscription_id: subscriptionId,
        cakto_order_id: orderId,
        customer_email: typeof customer?.email === 'string' ? customer.email : null,
        product_id: typeof product?.id === 'string' ? product.id : null,
        status,
        last_event: payload.event,
        last_payload: payload,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'provider,cakto_subscription_id' });
      if (error) throw error;
    }

    res.status(200).json({ received: true, event: payload.event });
  } catch (error) {
    console.error('[cakto] webhook processing failed', error);
    res.status(500).json({ error: 'processing_failed' });
  }
}
