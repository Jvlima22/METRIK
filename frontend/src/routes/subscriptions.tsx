import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, CreditCard, Crown, Gauge, Receipt, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { usePlan } from "@/lib/plan-context";
import type { PlanId } from "@/lib/entitlements";

export const Route = createFileRoute("/subscriptions")({ component: SubscriptionsPage });

type Plan = {
  id: PlanId;
  name: string;
  price: number;
  annual: number;
  icon: typeof Gauge;
  tag: string;
  description: string;
  features: string[];
  monthlyCheckoutUrl: string;
  annualCheckoutUrl: string;
};

const plans: Plan[] = [
  { id: "essential", name: "Metrik Essencial", price: 197, annual: 1970, icon: Gauge, monthlyCheckoutUrl: "https://pay.cakto.com.br/dobjiw4_1047486", annualCheckoutUrl: "https://pay.cakto.com.br/35m3pjh", tag: "Para começar", description: "O essencial para pequenos negócios acompanharem seus anúncios.", features: ["1 empresa e até 2 contas de anúncio", "Google Ads e Meta Ads", "Dashboard com métricas principais", "Alertas básicos", "Relatório mensal", "1 usuário"] },
  { id: "performance", name: "Metrik Performance", price: 397, annual: 3970, icon: Sparkles, monthlyCheckoutUrl: "https://pay.cakto.com.br/8yduwfk_1047491", annualCheckoutUrl: "https://pay.cakto.com.br/35rqguw", tag: "Mais escolhido", description: "Para empresas que querem transformar dados em decisões melhores.", features: ["1 empresa e até 5 contas de anúncio", "Dashboards e filtros avançados", "25 alertas e 10 metas", "Recomendações de orçamento", "Relatórios agendados", "3 usuários e suporte prioritário"] },
  { id: "pro", name: "Metrik Pro", price: 797, annual: 7970, icon: Crown, monthlyCheckoutUrl: "https://pay.cakto.com.br/34t8tsz_1047494", annualCheckoutUrl: "https://pay.cakto.com.br/7mprmni", tag: "Para escalar", description: "Para agências e equipes que gerenciam múltiplos clientes.", features: ["Até 10 clientes e 30 contas", "Dashboards por cliente", "Alertas e metas ilimitados", "Automações com auditoria", "Relatórios white label", "15 usuários e onboarding"] },
];

const invoices = [
  "15 ago 2026 · Metrik Performance · R$ 397,00",
  "15 jul 2026 · Metrik Performance · R$ 397,00",
  "15 jun 2026 · Metrik Performance · R$ 397,00",
];

const money = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

function SubscriptionsPage() {
  const { currentPlan } = usePlan();
  const [annual, setAnnual] = useState(false);
  const active = currentPlan ? plans.find((plan) => plan.id === currentPlan) : undefined;

  return (
    <AppShell>
      <div className="space-y-7">
        <header className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-violet-600">Conta e cobrança</p>
            <h1 className="font-display text-3xl font-bold tracking-tight">Assinatura</h1>
            <p className="mt-2 text-sm text-muted-foreground">Gerencie seu plano, limites e forma de pagamento da Metrik.</p>
          </div>
          <Badge variant="outline" className="w-fit border-violet-200 bg-violet-50 text-violet-700">Modo demonstração</Badge>
        </header>

        <GlassCard className="overflow-hidden p-0">
          <div className="flex flex-col justify-between gap-5 p-5 md:flex-row md:items-center md:p-6">
            <div className="flex items-start gap-4">
              <div className="flex size-11 items-center justify-center rounded-2xl bg-violet-100 text-violet-700"><Sparkles className="size-5" /></div>
              <div>
                <div className="flex items-center gap-2">
                  <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{active ? "Plano atual" : "Sem plano contratado"}</p>
                  {active && <Badge className="bg-emerald-100 text-emerald-700 hover:bg-emerald-100">Ativo</Badge>}
                </div>
                <h2 className="mt-1 font-display text-xl font-bold">{active?.name ?? "Escolha um plano para começar"}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{active ? "Renovação prevista para 15 de setembro de 2026." : "Esta conta ainda não possui uma assinatura ativa."}</p>
              </div>
            </div>
            {active && <div><p className="text-xs text-muted-foreground">Valor atual</p><p className="mt-1 text-xl font-bold">{money(annual ? active.annual : active.price)}<span className="text-xs font-medium text-muted-foreground">/{annual ? "ano" : "mês"}</span></p></div>}
          </div>
          {active && <div className="grid grid-cols-3 border-t border-border/70 bg-white/35"><Usage label="Contas de anúncio" value={currentPlan === "essential" ? "1 / 2" : currentPlan === "performance" ? "3 / 5" : "12 / 30"} /><Usage label="Usuários" value={currentPlan === "essential" ? "1 / 1" : currentPlan === "performance" ? "2 / 3" : "5 / 15"} /><Usage label="Alertas ativos" value={currentPlan === "essential" ? "2 / 3" : currentPlan === "performance" ? "12 / 25" : "28 / ∞"} /></div>}
        </GlassCard>

        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div><h2 className="font-display text-xl font-bold">Escolha o plano ideal</h2><p className="mt-1 text-sm text-muted-foreground">Todos os planos incluem o núcleo de inteligência da Metrik.</p></div>
          <div className="inline-flex w-fit rounded-xl border border-border bg-white/60 p-1"><button onClick={() => setAnnual(false)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", !annual ? "bg-foreground text-background" : "text-muted-foreground")}>Mensal</button><button onClick={() => setAnnual(true)} className={cn("rounded-lg px-4 py-2 text-sm font-semibold", annual ? "bg-foreground text-background" : "text-muted-foreground")}>Anual <span className="ml-1 text-[10px] text-emerald-500">2 meses grátis</span></button></div>
        </div>

        <div className="grid gap-5 xl:grid-cols-3">
          {plans.map((plan) => {
            const Icon = plan.icon;
            const isCurrent = currentPlan !== null && plan.id === currentPlan;
            return <GlassCard key={plan.id} className={cn("relative flex flex-col p-5 md:p-6", plan.id === "performance" && "border-violet-300 shadow-[0_18px_40px_-24px_rgba(109,40,217,0.55)]")}>
              {plan.id === "performance" && <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-violet-600 to-cyan-400" />}
              <div className="flex items-start justify-between"><div><p className="text-xs font-semibold uppercase tracking-wider text-violet-600">{plan.tag}</p><h3 className="mt-2 font-display text-xl font-bold">{plan.name}</h3></div><div className="flex size-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700"><Icon className="size-5" /></div></div>
              <p className="mt-3 min-h-10 text-sm leading-6 text-muted-foreground">{plan.description}</p>
              <p className="mt-5 font-display text-3xl font-bold">{money(annual ? plan.annual : plan.price)}<span className="ml-1 text-sm font-medium text-muted-foreground">/{annual ? "ano" : "mês"}</span></p>
              <ul className="mt-5 flex-1 space-y-3 border-t border-border/70 pt-5">{plan.features.map((feature) => <li key={feature} className="flex gap-2.5 text-sm text-muted-foreground"><Check className="size-4 shrink-0 text-emerald-500" />{feature}</li>)}</ul>
              <Button className="mt-6 w-full" variant={isCurrent ? "outline" : "default"} disabled={isCurrent} onClick={() => { if (!isCurrent) window.location.assign(annual ? plan.annualCheckoutUrl : plan.monthlyCheckoutUrl); }}>{isCurrent ? "Plano atual" : "Escolher plano"}</Button>
            </GlassCard>;
          })}
        </div>

        <div className="grid gap-5 lg:grid-cols-2">
          <GlassCard className="p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold">Forma de pagamento</h2><p className="mt-1 text-sm text-muted-foreground">Gateway será conectado em uma próxima etapa.</p></div><CreditCard className="size-5 text-muted-foreground" /></div><div className="mt-5 flex items-center gap-3 rounded-xl border border-border bg-white/50 p-4"><CreditCard className="size-4 text-slate-600" /><div><p className="text-sm font-semibold">Cartão terminado em 4242</p><p className="text-xs text-muted-foreground">Expira em 12/2028 · mock</p></div></div></GlassCard>
          <GlassCard className="p-5 md:p-6"><div className="flex items-center justify-between"><div><h2 className="font-display text-lg font-bold">Histórico de faturas</h2><p className="mt-1 text-sm text-muted-foreground">Últimas cobranças simuladas.</p></div><Receipt className="size-5 text-muted-foreground" /></div><div className="mt-4 space-y-3">{invoices.map((invoice) => <div key={invoice} className="flex items-center justify-between gap-3 text-sm"><span className="text-muted-foreground">{invoice}</span><span className="text-emerald-600">Paga</span></div>)}</div></GlassCard>
        </div>
      </div>
    </AppShell>
  );
}

function Usage({ label, value }: { label: string; value: string }) {
  return <div className="p-4 md:px-6"><p className="text-xs text-muted-foreground">{label}</p><p className="mt-1 text-sm font-bold tabular-nums">{value}</p></div>;
}

void Receipt;
void Crown;
