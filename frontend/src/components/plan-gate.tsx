import { LockKeyhole, Sparkles } from "lucide-react";
import type { ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { GlassCard } from "@/components/glass-card";

type PlanGateProps = {
  allowed: boolean;
  title: string;
  description: string;
  children: ReactNode;
  onUpgrade?: () => void;
};

export function PlanGate({ allowed, title, description, children, onUpgrade }: PlanGateProps) {
  if (allowed) return <>{children}</>;
  return (
    <GlassCard className="relative overflow-hidden border-violet-200 bg-violet-50/50 p-5">
      <div className="absolute right-4 top-4 rounded-full bg-white p-2 text-violet-600 shadow-sm"><LockKeyhole className="size-4" /></div>
      <div className="flex max-w-xl items-start gap-3">
        <div className="rounded-xl bg-violet-100 p-2 text-violet-700"><Sparkles className="size-4" /></div>
        <div>
          <h3 className="font-semibold text-foreground">{title}</h3>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">{description}</p>
          <Button type="button" size="sm" className="mt-4" onClick={onUpgrade}>Conhecer planos</Button>
        </div>
      </div>
    </GlassCard>
  );
}