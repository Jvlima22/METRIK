import { createContext, useContext, useState, type ReactNode } from "react";
import { getPlanEntitlements, type PlanId, type PlanEntitlements } from "./entitlements";

type PlanContextValue = {
  currentPlan: PlanId;
  entitlements: PlanEntitlements;
  setCurrentPlan: (plan: PlanId) => void;
};

const PlanContext = createContext<PlanContextValue | null>(null);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlan] = useState<PlanId>(() => {
    if (typeof window === "undefined") return "performance";
    const stored = window.localStorage.getItem("metrik-plan") as PlanId | null;
    return stored && ["essential", "performance", "pro"].includes(stored) ? stored : "performance";
  });
  const updatePlan = (plan: PlanId) => {
    setCurrentPlan(plan);
    window.localStorage.setItem("metrik-plan", plan);
  };
  return <PlanContext.Provider value={{ currentPlan, entitlements: getPlanEntitlements(currentPlan), setCurrentPlan: updatePlan }}>{children}</PlanContext.Provider>;
}

export function usePlan(): PlanContextValue {
  const value = useContext(PlanContext);
  if (!value) throw new Error("usePlan must be used within <PlanProvider>");
  return value;
}