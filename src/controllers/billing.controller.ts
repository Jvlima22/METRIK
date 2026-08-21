import type { Request, Response } from 'express';
import { env } from '../config/env';
import { getSupabaseAdmin } from '../lib/supabase';
import { CaktoApiError, listCaktoBillingCycles, listCaktoSubscriptions } from '../services/cakto.service';

type RecordValue = Record<string, unknown>;

function asRecord(value: unknown): RecordValue {
  return value && typeof value === 'object' ? value as RecordValue : {};
}

function resultsOf(value: unknown): RecordValue[] {
  const record = asRecord(value);
  return Array.isArray(record.results) ? record.results.map(asRecord) : [];
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === 'number' ? value : typeof value === 'string' && value.trim() ? Number(value) : null;
}

function sanitizePaymentMethod(value: unknown): RecordValue | null {
  const method = asRecord(value);
  const card = asRecord(method.card);
  if (!Object.keys(method).length && !Object.keys(card).length) return null;
  return {
    type: text(method.paymentMethodName) ?? text(method.type) ?? text(method.paymentMethod) ?? 'Cartão',
    holderName: text(card.holderName) ?? text(method.holderName),
    lastDigits: text(card.lastDigits) ?? text(method.lastDigits),
    brand: text(card.brand) ?? text(method.brand),
    installments: numberValue(method.installments),
  };
}

async function activeCompanyEmail(req: Request): Promise<string | null> {
  if (req.company?.id) {
    const { data } = await getSupabaseAdmin()
      .from('companies')
      .select('corporate_email')
      .eq('id', req.company.id)
      .maybeSingle();
    const corporateEmail = text(data?.corporate_email);
    if (corporateEmail) return corporateEmail.toLowerCase();
  }
  return text(req.user?.email)?.toLowerCase() ?? null;
}

function sanitizeSubscription(subscription: RecordValue): RecordValue {
  const product = asRecord(subscription.product);
  const offer = asRecord(subscription.offer);
  return {
    id: text(subscription.id),
    status: text(subscription.status) ?? 'unknown',
    amount: numberValue(subscription.amount),
    nextPaymentDate: text(subscription.next_payment_date),
    createdAt: text(subscription.createdAt) ?? text(subscription.created_at),
    canceledAt: text(subscription.canceledAt) ?? text(subscription.canceled_at),
    productName: text(product.name),
    offerName: text(offer.name),
    paymentMethod: sanitizePaymentMethod(subscription.paymentMethod),
  };
}

function sanitizeCycles(value: unknown): RecordValue[] {
  return resultsOf(value).map((cycle) => ({
    id: text(cycle.id),
    cycleNumber: numberValue(cycle.cycle_number),
    dueDate: text(cycle.due_date),
    amount: numberValue(cycle.amount),
    status: text(cycle.status) ?? 'unknown',
    completedAt: text(cycle.completed_at),
  }));
}

export async function getBillingSubscription(req: Request, res: Response): Promise<void> {
  if (!env.CAKTO_CLIENT_ID || !env.CAKTO_CLIENT_SECRET) {
    res.json({ configured: false, subscription: null, invoices: [] });
    return;
  }

  const email = await activeCompanyEmail(req);
  if (!email) {
    res.json({ configured: true, subscription: null, invoices: [] });
    return;
  }

  try {
    const subscriptions = await listCaktoSubscriptions(email);
    const candidates = resultsOf(subscriptions);
    const subscription = candidates.find((item) => {
      const customer = asRecord(item.customer);
      return text(customer.email)?.toLowerCase() === email;
    }) ?? candidates[0] ?? null;

    if (!subscription) {
      res.json({ configured: true, customerEmail: email, subscription: null, invoices: [] });
      return;
    }

    const subscriptionId = text(subscription.id);
    const cycles = subscriptionId ? await listCaktoBillingCycles(subscriptionId) : null;
    res.json({
      configured: true,
      customerEmail: email,
      subscription: sanitizeSubscription(subscription),
      invoices: sanitizeCycles(cycles),
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    const status = error instanceof CaktoApiError && error.status === 401 ? 502 : 503;
    console.error('[billing] Cakto subscription lookup failed', error);
    res.status(status).json({ message: 'Não foi possível consultar a assinatura na Cakto.' });
  }
}
