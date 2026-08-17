import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { BrainCircuit, CheckCircle2, Clock3, FileText, Lightbulb, LockKeyhole, Sparkles, Target, TrendingUp } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/ai-ads")({ component: AiAdsPage });

type Opportunity = { id: string; campaign: string; platform: string; window: string; score: number; confidence: string; ctr: string; conversions: string; action: string };

const opportunities: Opportunity[] = [
  { id: "opp-1", campaign: "Conversão — Linha Premium", platform: "Meta Ads", window: "18:00–20:00", score: 92, confidence: "Alta", ctr: "4,82%", conversions: "38", action: "Concentrar o teste e criar duas variações de copy." },
  { id: "opp-2", campaign: "Pesquisa — Marca Metrik", platform: "Google Ads", window: "09:00–11:00", score: 84, confidence: "Média", ctr: "3,91%", conversions: "24", action: "Aumentar cobertura gradualmente e testar CTA direto." },
  { id: "opp-3", campaign: "Remarketing — Visitantes", platform: "Meta Ads", window: "20:00–22:00", score: 76, confidence: "Média", ctr: "3,44%", conversions: "17", action: "Reativar público com criativo de prova social." },
];

function AiAdsPage() {
  const [selected, setSelected] = useState(opportunities[0]);
  const [draftStatus, setDraftStatus] = useState<"idle" | "draft" | "approved">("idle");
  const [headline, setHeadline] = useState("Uma forma mais inteligente de alcançar seus objetivos");
  const [primaryText, setPrimaryText] = useState("Descubra uma experiência simples, clara e orientada a resultados para sua empresa.");
  const [cta, setCta] = useState("Saiba mais");
  const hasDraft = draftStatus !== "idle";
  const statusLabel = useMemo(() => draftStatus === "approved" ? "Aprovado" : draftStatus === "draft" ? "Rascunho" : "Não gerado", [draftStatus]);

  return (
    <AppShell>
      <div className="space-y-6">
        <section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-6 md:p-8">
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-violet-700"><BrainCircuit className="size-5" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Inteligência de Ads</span></div>
              <h1 className="max-w-2xl text-3xl font-bold tracking-tight text-slate-900 md:text-4xl">Transforme métricas em ações no momento certo.</h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-600">A Metrik analisa desempenho por empresa e plataforma, identifica janelas de oportunidade e prepara anúncios para sua revisão.</p>
            </div>
            <div className="rounded-2xl border border-white/80 bg-white/80 p-4 shadow-sm"><div className="flex items-center gap-2 text-sm font-semibold text-slate-800"><Sparkles className="size-4 text-violet-600" /> Próxima melhor janela</div><div className="mt-2 text-2xl font-bold text-violet-700">Hoje, 18:00–20:00</div><div className="text-xs text-slate-500">Confiança alta · score 92</div></div>
          </div>
        </section>

        <div className="grid gap-4 md:grid-cols-4">
          {[{ label: "Oportunidades", value: "12", icon: Lightbulb }, { label: "Score médio", value: "81", icon: TrendingUp }, { label: "Conversões analisadas", value: "79", icon: Target }, { label: "Rascunhos pendentes", value: "3", icon: FileText }].map(({ label, value, icon: Icon }) => <GlassCard key={label} className="p-4"><div className="flex items-center justify-between"><span className="text-xs text-muted-foreground">{label}</span><Icon className="size-4 text-violet-500" /></div><div className="mt-2 text-2xl font-bold tracking-tight">{value}</div></GlassCard>)}
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <GlassCard className="overflow-hidden"><div className="border-b border-border px-5 py-4"><div className="flex items-center justify-between"><div><h2 className="font-semibold">Oportunidades recomendadas</h2><p className="mt-1 text-xs text-muted-foreground">Selecione uma oportunidade para gerar um anúncio orientado por dados.</p></div><Badge variant="secondary">Atualizado agora</Badge></div></div><div className="divide-y divide-border">{opportunities.map((opportunity) => <button key={opportunity.id} onClick={() => { setSelected(opportunity); setDraftStatus("idle"); }} className={`w-full p-5 text-left transition hover:bg-muted/40 ${selected.id === opportunity.id ? "bg-violet-50/70" : ""}`}><div className="flex items-start justify-between gap-4"><div><div className="flex items-center gap-2"><h3 className="font-semibold">{opportunity.campaign}</h3><Badge variant="outline">{opportunity.platform}</Badge></div><div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground"><span className="flex items-center gap-1"><Clock3 className="size-3.5" />{opportunity.window}</span><span>CTR {opportunity.ctr}</span><span>{opportunity.conversions} conversões</span></div></div><div className="text-right"><div className="text-2xl font-bold text-violet-700">{opportunity.score}</div><div className="text-[11px] text-muted-foreground">score · {opportunity.confidence}</div></div></div><p className="mt-3 text-xs leading-5 text-slate-600">{opportunity.action}</p></button>)}</div></GlassCard>

          <GlassCard className="p-5"><div className="flex items-start justify-between gap-3"><div><div className="flex items-center gap-2"><FileText className="size-4 text-violet-600" /><h2 className="font-semibold">Criar anúncio</h2></div><p className="mt-1 text-xs text-muted-foreground">{selected.campaign} · janela {selected.window}</p></div><Badge variant={draftStatus === "approved" ? "default" : "secondary"}>{statusLabel}</Badge></div><div className="mt-5 space-y-4"><div><label className="text-xs font-medium">Headline</label><input value={headline} onChange={(event) => setHeadline(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-violet-400" /></div><div><label className="text-xs font-medium">Texto principal</label><textarea value={primaryText} onChange={(event) => setPrimaryText(event.target.value)} rows={4} className="mt-1 w-full resize-none rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-violet-400" /></div><div><label className="text-xs font-medium">CTA</label><input value={cta} onChange={(event) => setCta(event.target.value)} className="mt-1 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none ring-offset-background focus:ring-2 focus:ring-violet-400" /></div><div className="rounded-xl border border-violet-100 bg-violet-50/60 p-3 text-xs leading-5 text-slate-600"><div className="mb-1 flex items-center gap-2 font-semibold text-violet-800"><Lightbulb className="size-3.5" /> Por que esta recomendação?</div>O score considera CTR, conversões, volume de impressões e custo por clique. A confiança aumenta conforme a amostra histórica cresce.</div><div className="flex flex-col gap-2 sm:flex-row"><Button onClick={() => setDraftStatus("draft")} className="flex-1"><Sparkles className="mr-2 size-4" />{hasDraft ? "Atualizar rascunho" : "Gerar rascunho"}</Button><Button variant="outline" disabled={draftStatus !== "draft"} onClick={() => setDraftStatus("approved")} className="flex-1"><CheckCircle2 className="mr-2 size-4" />Aprovar</Button></div><div className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800"><LockKeyhole className="size-3.5 shrink-0" /> Publicação bloqueada até a aprovação explícita.</div></div></GlassCard>
        </div>
      </div>
    </AppShell>
  );
}
