import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { getPlanEntitlements, type PlanId, type PlanEntitlements } from "./entitlements";
import { useAccount } from "./account-context";
import { useAuth } from "./auth-context";

type PlanContextValue = {
  currentPlan: PlanId | null;
  entitlements: PlanEntitlements | null;
  setCurrentPlan: (plan: PlanId) => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);
const VALID_PLANS: PlanId[] = ["essential", "performance", "pro"];

export function PlanProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const { activeCompanyId, activeAccount } = useAccount();
  const [currentPlan, setCurrentPlanState] = useState<PlanId | null>(null);

  // Cada empresa possui seu próprio plano. O admin sem empresa selecionada
  // mantém o modo demonstração separado dos planos dos clientes.
  const scopeId = activeCompanyId ?? activeAccount.companyId ?? (isAdmin ? "admin-demo" : null);
  const storageKey = user?.id && scopeId ? `metrik:${user.id}:plan:${scopeId}` : null;

  useEffect(() => {
    if (authLoading || !user || !storageKey) {
      setCurrentPlanState(null);
      return;
    }

    const stored = window.localStorage.getItem(storageKey) as PlanId | null;
    if (stored && VALID_PLANS.includes(stored)) {
      setCurrentPlanState(stored);
      return;
    }

    // O plano demo é apenas do administrador. Contas de clientes novas
    // começam explicitamente sem assinatura.
    setCurrentPlanState(isAdmin && scopeId === "admin-demo" ? "performance" : null);
  }, [authLoading, user?.id, storageKey, isAdmin, scopeId]);

  function updatePlan(plan: PlanId) {
    setCurrentPlanState(plan);
    if (storageKey) window.localStorage.setItem(storageKey, plan);
  }

  const entitlements = useMemo(
    () => (currentPlan ? getPlanEntitlements(currentPlan) : null),
    [currentPlan],
  );

  return <PlanContext.Provider value={{ currentPlan, entitlements, setCurrentPlan: updatePlan }}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used within <PlanProvider>");
  return value;
}
