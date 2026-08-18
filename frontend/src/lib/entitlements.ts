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
  features: Record<FeatureKey, boolean>;
};

const commonFeatures = {
  advancedDashboards: false,
  budgetRecommendations: false,
  scheduledReports: false,
  whiteLabelReports: false,
  auditedAutomations: false,
  prioritySupport: false,
  onboarding: false,
};

export const PLAN_ENTITLEMENTS: Record<PlanId, PlanEntitlements> = {
  essential: {
    id: "essential",
    name: "Metrik Essencial",
    maxClients: 1,
    maxAdAccounts: 2,
    maxUsers: 1,
    maxAlerts: 3,
    maxGoals: 0,
    features: commonFeatures,
  },
  performance: {
    id: "performance",
    name: "Metrik Performance",
    maxClients: 1,
    maxAdAccounts: 5,
    maxUsers: 3,
    maxAlerts: 25,
    maxGoals: 10,
    features: {
      ...commonFeatures,
      advancedDashboards: true,
      budgetRecommendations: true,
      scheduledReports: true,
      prioritySupport: true,
    },
  },
  pro: {
    id: "pro",
    name: "Metrik Pro",
    maxClients: 10,
    maxAdAccounts: 30,
    maxUsers: 15,
    maxAlerts: Number.POSITIVE_INFINITY,
    maxGoals: Number.POSITIVE_INFINITY,
    features: {
      ...commonFeatures,
      advancedDashboards: true,
      budgetRecommendations: true,
      scheduledReports: true,
      whiteLabelReports: true,
      auditedAutomations: true,
      prioritySupport: true,
      onboarding: true,
    },
  },
};

export function getPlanEntitlements(plan: PlanId): PlanEntitlements {
  return PLAN_ENTITLEMENTS[plan];
}

export function hasFeature(plan: PlanId, feature: FeatureKey): boolean {
  return PLAN_ENTITLEMENTS[plan].features[feature];
}

export function isWithinLimit(plan: PlanId, limit: keyof Pick<PlanEntitlements, "maxClients" | "maxAdAccounts" | "maxUsers" | "maxAlerts" | "maxGoals">, current: number): boolean {
  return current < PLAN_ENTITLEMENTS[plan][limit];
}