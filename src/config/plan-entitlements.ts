export type PlanId = 'essential' | 'performance' | 'pro';
export type LimitKey =
  | 'clients'
  | 'ad_accounts'
  | 'team_members'
  | 'alerts'
  | 'goals'
  | 'scheduled_reports'
  | 'dashboards'
  | 'budget_recommendations'
  | 'audited_automations'
  | 'white_label_templates'
  | 'exports';

export type PlanEntitlements = {
  plan: PlanId;
  name: string;
  limits: Record<LimitKey, number>;
  historyDays: number;
  supportTier: 'standard' | 'priority' | 'dedicated';
};

const ALL = Number.POSITIVE_INFINITY;

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  essential: {
    plan: 'essential', name: 'Metrik Essencial', historyDays: 90, supportTier: 'standard',
    limits: { clients: 1, ad_accounts: 2, team_members: 1, alerts: 3, goals: 3, scheduled_reports: 1, dashboards: 1, budget_recommendations: 3, audited_automations: 1, white_label_templates: 1, exports: 10 },
  },
  performance: {
    plan: 'performance', name: 'Metrik Performance', historyDays: 365, supportTier: 'priority',
    limits: { clients: 3, ad_accounts: 5, team_members: 5, alerts: 25, goals: 10, scheduled_reports: 5, dashboards: 5, budget_recommendations: 25, audited_automations: 5, white_label_templates: 5, exports: 100 },
  },
  pro: {
    plan: 'pro', name: 'Metrik Pro', historyDays: ALL, supportTier: 'dedicated',
    limits: { clients: 10, ad_accounts: 30, team_members: 15, alerts: ALL, goals: ALL, scheduled_reports: ALL, dashboards: ALL, budget_recommendations: ALL, audited_automations: ALL, white_label_templates: ALL, exports: ALL },
  },
};

export function getPlanEntitlements(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}
