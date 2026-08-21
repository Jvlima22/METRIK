import { getSupabaseAdmin } from '../lib/supabase';
import { listCaktoSubscriptions } from './cakto.service';
import { CaktoApiError } from './cakto.service';
import { getPlanEntitlements, type LimitKey, type PlanId } from '../config/plan-entitlements';

type AnyRecord = Record<string, any>;

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function resultsOf(value: unknown): AnyRecord[] {
  const record = value && typeof value === 'object' ? value as AnyRecord : {};
  return Array.isArray(record.results) ? record.results.filter(Boolean) : [];
}

export function resolvePlanFromSubscription(subscription: AnyRecord | null): PlanId | null {
  if (!subscription) return null;
  const haystack = JSON.stringify(subscription).toLowerCase();
  if (haystack.includes('pro')) return 'pro';
  if (haystack.includes('performance') || haystack.includes('avançado') || haystack.includes('advanced')) return 'performance';
  if (haystack.includes('essential') || haystack.includes('essencial') || haystack.includes('basic')) return 'essential';
  return null;
}

async function companyEmail(companyId: string | null, fallbackEmail: string | null): Promise<string | null> {
  if (companyId) {
    const { data } = await getSupabaseAdmin().from('companies').select('corporate_email').eq('id', companyId).maybeSingle();
    const email = text(data?.corporate_email);
    if (email) return email.toLowerCase();
  }
  return fallbackEmail?.toLowerCase() ?? null;
}

async function count(table: string, column: string, value: string, extra?: (query: any) => any): Promise<number> {
  try {
    let query = getSupabaseAdmin().from(table).select('id', { count: 'exact', head: true }).eq(column, value);
    if (extra) query = extra(query);
    const result = await query;
    return typeof result.count === 'number' ? result.count : 0;
  } catch {
    return 0;
  }
}

export async function getCompanyEntitlements(input: { companyId: string | null; userEmail: string | null; isGlobalAdmin?: boolean }) {
  const email = await companyEmail(input.companyId, input.userEmail);
  let subscription: AnyRecord | null = null;
  let billingConfigured = false;

  if (email) {
    try {
      const response = await listCaktoSubscriptions(email);
      billingConfigured = true;
      const candidates = resultsOf(response);
      subscription = candidates.find((item) => text(item.customer?.email)?.toLowerCase() === email) ?? candidates[0] ?? null;
    } catch (error) {
      if (!(error instanceof CaktoApiError)) throw error;
      console.error('[entitlements] Cakto lookup failed', error);
    }
  }

  const plan = resolvePlanFromSubscription(subscription) ?? (input.isGlobalAdmin && !input.companyId ? 'pro' : null);
  if (!plan) {
    return { plan: null, subscribed: false, billingConfigured, usage: {}, entitlements: null, upgradeRequired: true };
  }

  const usage: Partial<Record<LimitKey, number>> = {};
  if (input.companyId) {
    usage.team_members = await count('company_members', 'company_id', input.companyId, (q) => q.eq('status', 'ACTIVE'));
    usage.ad_accounts = await count('integration_connections', 'company_id', input.companyId, (q) => q.in('provider', ['google-ads', 'meta-ads']).neq('status', 'DISCONNECTED'));
    usage.alerts = await count('alerts', 'company_id', input.companyId);
    usage.goals = await count('goals', 'company_id', input.companyId);
    usage.scheduled_reports = await count('scheduled_reports', 'company_id', input.companyId, (q) => q.eq('active', true));
    usage.dashboards = await count('dashboards', 'company_id', input.companyId);
    usage.audited_automations = await count('automations', 'company_id', input.companyId, (q) => q.eq('active', true));
    usage.white_label_templates = await count('white_label_templates', 'company_id', input.companyId);
  }

  const entitlements = getPlanEntitlements(plan);
  const reached = Object.entries(usage).filter(([key, value]) => {
    const limit = entitlements.limits[key as LimitKey];
    return typeof value === 'number' && Number.isFinite(limit) && value >= limit;
  }).map(([resource, current]) => ({ resource, current, limit: entitlements.limits[resource as LimitKey] }));

  return { plan, subscribed: true, billingConfigured, usage, entitlements, reached, upgradeRequired: false };
}

export async function assertCompanyLimit(input: { companyId: string; userEmail: string | null; resource: LimitKey; current: number; isGlobalAdmin?: boolean }) {
  if (input.isGlobalAdmin) return;
  const result = await getCompanyEntitlements({ companyId: input.companyId, userEmail: input.userEmail, isGlobalAdmin: input.isGlobalAdmin });
  if (!result.entitlements) return;
  const limit = result.entitlements.limits[input.resource];
  if (Number.isFinite(limit) && input.current >= limit) {
    const error = new Error(`Limite do plano atingido para ${input.resource}`) as Error & AnyRecord;
    error.status = 409;
    error.code = 'PLAN_LIMIT_REACHED';
    error.resource = input.resource;
    error.current = input.current;
    error.limit = limit;
    error.requiredPlan = result.plan === 'essential' ? 'performance' : 'pro';
    throw error;
  }
}
