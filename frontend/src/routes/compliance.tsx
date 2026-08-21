import { createFileRoute } from "@tanstack/react-router";
import { AlertTriangle, CheckCircle2, FileWarning, Search, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { violationsForAccount } from "@/lib/mock-data";

export const Route = createFileRoute("/compliance")({ component: CompliancePage });

function CompliancePage() {
  const { activeAccount } = useAccount();
  const { isAdmin } = useAuth();
  const violations = isAdmin && activeAccount.companyId?.startsWith("mock-") ? violationsForAccount(activeAccount) : [];
  const critical = violations.filter((item) => item.severity === "CRITICAL").length;
  const high = violations.filter((item) => item.severity === "HIGH").length;

  return <AppShell><div className="mx-auto max-w-6xl space-y-6"><header><p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">Gestão de risco</p><h1 className="mt-1 text-3xl font-display font-bold text-foreground">Compliance</h1><p className="mt-2 text-sm text-muted-foreground">Analise violações, anúncios afetados e ações recomendadas da conta ativa.</p></header><div className="grid gap-4 sm:grid-cols-3"><GlassCard className="p-5"><div className="flex items-center gap-3"><FileWarning className="size-5 text-rose-500" /><span className="text-sm text-muted-foreground">Total de violações</span></div><p className="mt-3 text-3xl font-display font-bold">{violations.length}</p></GlassCard><GlassCard className="p-5"><div className="flex items-center gap-3"><AlertTriangle className="size-5 text-amber-500" /><span className="text-sm text-muted-foreground">Alta prioridade</span></div><p className="mt-3 text-3xl font-display font-bold">{critical + high}</p></GlassCard><GlassCard className="p-5"><div className="flex items-center gap-3"><CheckCircle2 className="size-5 text-emerald-500" /><span className="text-sm text-muted-foreground">Conta analisada</span></div><p className="mt-3 truncate text-lg font-semibold">{activeAccount.name}</p></GlassCard></div><GlassCard className="p-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><h2 className="font-semibold">Violações da conta ativa</h2><p className="mt-1 text-xs text-muted-foreground">Os dados são filtrados pelo contexto da empresa e da conta selecionadas.</p></div><div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground"><Search className="size-3.5" /> Buscar violação</div></div><div className="mt-5 space-y-2">{violations.length === 0 ? <div className="rounded-xl border border-dashed border-border p-10 text-center"><ShieldCheck className="mx-auto size-8 text-emerald-500" /><p className="mt-3 text-sm font-medium">Nenhuma violação registrada</p><p className="mt-1 text-xs text-muted-foreground">Conecte uma conta ou selecione uma conta demonstrativa para visualizar análises.</p></div> : violations.map((item) => <div key={item.adId} className="flex items-center gap-3 rounded-xl border border-border p-3"><div className="size-2 rounded-full bg-rose-500" /><div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{item.violationType}</p><p className="truncate text-xs text-muted-foreground">{item.adId} · {item.severity}</p></div><span className="text-xs text-muted-foreground">Revisar</span></div>)}</div></GlassCard></div></AppShell>;
}
