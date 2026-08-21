import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { apiFetch } from "./api";
import { getPlanEntitlements, type PlanId, type PlanEntitlements } from "./entitlements";
import { useAccount } from "./account-context";
import { useAuth } from "./auth-context";

type EntitlementsResponse = {
  plan: PlanId | null;
  usage: Record<string, number>;
  entitlements: { limits: Record<string, number>; historyDays: number; supportTier: string } | null;
};

type PlanContextValue = {
  currentPlan: PlanId | null;
  entitlements: PlanEntitlements | null;
  usage: Record<string, number>;
  loading: boolean;
  refresh: () => Promise<void>;
  setCurrentPlan: (plan: PlanId) => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

function mapEntitlements(response: EntitlementsResponse): PlanEntitlements | null {
  if (!response.plan) return null;
  const defaults = getPlanEntitlements(response.plan);
  const limits = response.entitlements?.limits ?? {};
  return {
    ...defaults,
    maxClients: limits.clients ?? defaults.maxClients,
    maxAdAccounts: limits.ad_accounts ?? defaults.maxAdAccounts,
    maxUsers: limits.team_members ?? defaults.maxUsers,
    maxAlerts: limits.alerts ?? defaults.maxAlerts,
    maxGoals: limits.goals ?? defaults.maxGoals,
    maxScheduledReports: limits.scheduled_reports ?? defaults.maxScheduledReports,
    maxDashboards: limits.dashboards ?? defaults.maxDashboards,
    maxBudgetRecommendations: limits.budget_recommendations ?? defaults.maxBudgetRecommendations,
    maxAutomations: limits.audited_automations ?? defaults.maxAutomations,
    maxWhiteLabelTemplates: limits.white_label_templates ?? defaults.maxWhiteLabelTemplates,
    maxExports: limits.exports ?? defaults.maxExports,
    historyDays: response.entitlements?.historyDays ?? defaults.historyDays,
    supportTier: (response.entitlements?.supportTier as PlanEntitlements["supportTier"]) ?? defaults.supportTier,
    features: defaults.features,
  };
}

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { activeCompanyId, activeAccount } = useAccount();
  const [currentPlan, setCurrentPlanState] = useState<PlanId | null>(null);
  const [entitlements, setEntitlements] = useState<PlanEntitlements | null>(null);
  const [usage, setUsage] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const scopeId = activeCompanyId ?? activeAccount?.companyId ?? null;

  const refresh = async () => {
    if (authLoading || !user) {
      setCurrentPlanState(null); setEntitlements(null); setUsage({}); setLoading(false); return;
    }
    setLoading(true);
    try {
      const response = await apiFetch<EntitlementsResponse>("/billing/entitlements");
      setCurrentPlanState(response.plan);
      setEntitlements(mapEntitlements(response));
      setUsage(response.usage ?? {});
    } catch (error) {
      console.error("[plan] falha ao carregar entitlements", error);
      setCurrentPlanState(null); setEntitlements(null); setUsage({});
    } finally { setLoading(false); }
  };

  useEffect(() => { void refresh(); }, [authLoading, user?.id, scopeId]);

  const value = useMemo(() => ({
    currentPlan, entitlements, usage, loading, refresh,
    // Compatibilidade temporária; a origem oficial do plano é o backend.
    setCurrentPlan: (plan: PlanId) => setCurrentPlanState(plan),
  }), [currentPlan, entitlements, usage, loading]);

  return <PlanContext.Provider value={value}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used within <PlanProvider>");
  return value;
}
