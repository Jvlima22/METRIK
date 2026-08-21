export type PlanId = "essential" | "performance" | "pro";

export type FeatureKey =
  | "advancedDashboards"
  | "budgetRecommendations"
  | "scheduledReports"
  | "whiteLabelReports"
  | "auditedAutomations"
  | "prioritySupport"
  | "onboarding";

export type PlanEntitlements = {
  id: PlanId;
  name: string;
  maxClients: number;
  maxAdAccounts: number;
  maxUsers: number;
  maxAlerts: number;
  maxGoals: number;
  maxScheduledReports: number;
  maxDashboards: number;
  maxBudgetRecommendations: number;
  maxAutomations: number;
  maxWhiteLabelTemplates: number;
  maxExports: number;
  historyDays: number;
  supportTier: "standard" | "priority" | "dedicated";
  features: Record<FeatureKey, boolean>;
};

const allFeatures: Record<FeatureKey, boolean> = {
  advancedDashboards: true,
  budgetRecommendations: true,
  scheduledReports: true,
  whiteLabelReports: true,
  auditedAutomations: true,
  prioritySupport: true,
  onboarding: true,
};

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  essential: {
    id: "essential",
    name: "Metrik Essencial",
    maxClients: 1,
    maxAdAccounts: 2,
    maxUsers: 1,
    maxAlerts: 3,
    maxGoals: 3,
    maxScheduledReports: 1,
    maxDashboards: 1,
    maxBudgetRecommendations: 3,
    maxAutomations: 1,
    maxWhiteLabelTemplates: 1,
    maxExports: 10,
    historyDays: 90,
    supportTier: "standard",
    features: allFeatures,
  },
  performance: {
    id: "performance",
    name: "Metrik Performance",
    maxClients: 3,
    maxAdAccounts: 5,
    maxUsers: 5,
    maxAlerts: 25,
    maxGoals: 10,
    maxScheduledReports: 5,
    maxDashboards: 5,
    maxBudgetRecommendations: 25,
    maxAutomations: 5,
    maxWhiteLabelTemplates: 5,
    maxExports: 100,
    historyDays: 365,
    supportTier: "priority",
    features: allFeatures,
  },
  pro: {
    id: "pro",
    name: "Metrik Pro",
    maxClients: 10,
    maxAdAccounts: 30,
    maxUsers: 15,
    maxAlerts: Number.POSITIVE_INFINITY,
    maxGoals: Number.POSITIVE_INFINITY,
    maxScheduledReports: Number.POSITIVE_INFINITY,
    maxDashboards: Number.POSITIVE_INFINITY,
    maxBudgetRecommendations: Number.POSITIVE_INFINITY,
    maxAutomations: Number.POSITIVE_INFINITY,
    maxWhiteLabelTemplates: Number.POSITIVE_INFINITY,
    maxExports: Number.POSITIVE_INFINITY,
    historyDays: Number.POSITIVE_INFINITY,
    supportTier: "dedicated",
    features: allFeatures,
  },
};

export function getPlanEntitlements(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}

export function hasFeature(plan: PlanId, feature: FeatureKey): boolean {
  return PLAN_ENTITLEMENTS[plan].features[feature];
}

export function isWithinLimit(
  plan: PlanId,
  limit: keyof Pick<PlanEntitlements, "maxClients" | "maxAdAccounts" | "maxUsers" | "maxAlerts" | "maxGoals" | "maxScheduledReports" | "maxDashboards" | "maxBudgetRecommendations" | "maxAutomations" | "maxWhiteLabelTemplates" | "maxExports">,
  current: number,
): boolean {
  return current < PLAN_ENTITLEMENTS[plan][limit];
}
