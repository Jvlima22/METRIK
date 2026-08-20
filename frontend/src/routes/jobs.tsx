import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { Search, CheckCircle2, XCircle, Loader2, Clock, Activity, Inbox, Cog, Send, Sparkles, Webhook, Fingerprint, ListChecks, RefreshCw, MousePointerClick } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { mockJob, violationsForAccount, type JobStatus } from "@/lib/mock-data";
import { activityFeed, activityIcon, activityTone, relativeTime } from "@/lib/activity";
import { EMPTY_ACCOUNT, useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";

export const Route = createFileRoute("/jobs")({
  head: () => ({
    meta: [
      { title: "Esteira de Jobs · Metrik" },
      { name: "description", content: "Visualize o pipeline de execução de jobs assíncronos e a timeline de eventos em tempo real." },
      { property: "og:title", content: "Esteira de Jobs · Metrik" },
      { property: "og:description", content: "Pipeline visual e timeline de eventos para operações assíncronas." },
    ],
  }),
  component: JobsPage,
});

type StageKey = "received" | "analyzing" | "executing" | "done";

const stages: { key: StageKey; label: string; icon: any; tone: string }[] = [
  { key: "received",  label: "Recebido",            icon: Inbox, tone: "from-violet to-violet/70" },
  { key: "analyzing", label: "Analisando",          icon: Sparkles, tone: "from-cyan to-cyan/70" },
  { key: "executing", label: "Executando no Adapter", icon: Cog, tone: "from-amber-500 to-amber-400" },
  { key: "done",      label: "Concluído",           icon: CheckCircle2, tone: "from-emerald-500 to-emerald-400" },
];

const processSteps: { title: string; detail: string; icon: typeof Webhook; bg: string; text: string }[] = [
  { title: "1. Webhook recebido", detail: "POST /webhook/violation com o payload (tenantId, adId, platform). Zod valida e a API responde 202.", icon: Webhook, bg: "bg-violet-100", text: "text-violet-600" },
  { title: "2. Idempotência", detail: "Job entra na fila com jobId = tenantId__adId. Duplicata em waiting/active devolve 409.", icon: Fingerprint, bg: "bg-fuchsia-100", text: "text-fuchsia-600" },
  { title: "3. Fila BullMQ", detail: "O job aguarda na fila (Redis). O worker roda no mesmo processo e consome quando livre.", icon: Inbox, bg: "bg-cyan-100", text: "text-cyan-600" },
  { title: "4. Worker + Adapter", detail: "Seleciona o adapter pela plataforma (Strategy: Google/Meta) e executa o takedown no SDK, com timeout.", icon: Cog, bg: "bg-amber-100", text: "text-amber-600" },
  { title: "5. Retry / backoff", detail: "Qualquer exceção reentra na fila — 3 tentativas com backoff exponencial até confirmar ou falhar.", icon: RefreshCw, bg: "bg-orange-100", text: "text-orange-600" },
  { title: "6. Status por REST", detail: "GET /jobs/:id devolve { status, attempts, result, error }. É o que esta tela consulta e renderiza.", icon: ListChecks, bg: "bg-emerald-100", text: "text-emerald-600" },
];

const statusToStageIndex = (s: JobStatus["status"]) =>
  s === "waiting" ? 0 : s === "active" ? 2 : s === "completed" ? 3 : s === "failed" ? 2 : 0;

const statusBadge: Record<JobStatus["status"], { cls: string; icon: any; label: string; spin?: boolean }> = {
  waiting:   { cls: "bg-amber-50 text-amber-700 border-amber-200",   icon: Clock,         label: "Aguardando" },
  active:    { cls: "bg-cyan-50 text-cyan-700 border-cyan-200",      icon: Loader2,       label: "Executando", spin: true },
  completed: { cls: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2, label: "Concluído" },
  failed:    { cls: "bg-rose-50 text-rose-700 border-rose-200",      icon: XCircle,       label: "Falhou" },
};

function JobsPage() {
  const { activeAccount, activeCompanyId } = useAccount();
  const { isAdmin } = useAuth();
  const showAdminDemo = isAdmin && activeAccount.companyId?.startsWith('mock-') === true && activeAccount.id !== EMPTY_ACCOUNT.id;
  const [jobId, setJobId] = useState("");
  const [result, setResult] = useState<JobStatus | null>(null);
  const [loading, setLoading] = useState(false);

  const runJob = (id: string) => {
    const v = id.trim();
    if (!v) return;
    if (!showAdminDemo) { setResult(null); return; }
    setJobId(v);
    setLoading(true);
    setTimeout(() => { setResult(mockJob(v)); setLoading(false); }, 600);
  };
  const handleSearch = () => runJob(jobId);

  // jobIds reais desta conta: jobId = `${tenantId}__${adId}` (idempotência).
  const exampleJobIds = useMemo(
    () => showAdminDemo ? violationsForAccount(activeAccount).slice(0, 3).map((v) => `${v.tenantId}__${v.adId}`) : [],
    [activeAccount, showAdminDemo],
  );

  const visibleActivity = showAdminDemo ? activityFeed.slice(0, 6) : [];
  const currentIdx = result ? statusToStageIndex(result.status) : -1;
  const failed = result?.status === "failed";

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <header>
          <p className="text-xs text-muted-foreground font-medium">Operações</p>
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-1 flex items-center gap-2 sm:gap-3">
            <Activity className="size-6 sm:size-7 text-violet" />
            Esteira de Jobs
          </h1>
          <p className="text-muted-foreground text-sm mt-1">Pipeline visual de execução e timeline de eventos do worker</p>
        </header>

        {/* Como a esteira funciona — card autoexplicativo */}
        <GlassCard className="p-5 overflow-hidden relative">
          <div className="absolute -top-16 -right-16 size-48 rounded-full bg-violet/10 blur-3xl pointer-events-none" />
          <div className="relative">
            <div className="flex items-start gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-br from-violet to-cyan text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet/20">
                <Sparkles className="size-4" />
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-wider font-bold text-violet">Como a esteira funciona</p>
                <h3 className="font-display font-semibold text-base mt-0.5">Do webhook ao takedown — todo o processo</h3>
                <p className="text-xs text-muted-foreground mt-1 max-w-2xl">
                  Quando uma violação é detectada, a Metrik API <strong className="text-foreground">enfileira um job
                  assíncrono</strong> de takedown e expõe o status por REST. Esta tela <strong className="text-foreground">captura
                  esse job</strong>: você consulta pelo <code className="font-mono text-[11px] bg-muted px-1 py-0.5 rounded">jobId</code> e
                  ela renderiza o estágio atual no pipeline abaixo.
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mt-5">
              {processSteps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="flex gap-3 rounded-xl border border-border/60 bg-white/60 p-3">
                    <div className="relative shrink-0">
                      <div className={`size-9 rounded-lg ${s.bg} ${s.text} flex items-center justify-center`}>
                        <Icon className="size-4" />
                      </div>
                      <span className="absolute -top-1.5 -left-1.5 size-4 rounded-full bg-foreground text-background text-[9px] font-bold flex items-center justify-center">
                        {i + 1}
                      </span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold leading-tight">{s.title}</p>
                      <p className="text-[11px] text-muted-foreground mt-0.5 leading-snug">{s.detail}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-4 pt-3 border-t border-border/60 text-[11px] text-muted-foreground">
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-violet" /> <code className="font-mono">POST /webhook/violation</code> → 202</span>
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-amber-500" /> idempotência: <code className="font-mono">jobId = tenantId__adId</code> (duplicata → 409)</span>
              <span className="flex items-center gap-1.5"><span className="size-1.5 rounded-full bg-emerald-500" /> <code className="font-mono">GET /jobs/:id</code> → status</span>
            </div>
          </div>
        </GlassCard>

        {/* Search */}
        <GlassCard className="p-4">
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
              <Input
                placeholder="Insira o jobId (ex: tnt_7382__ad_738201)"
                value={jobId}
                onChange={(e) => setJobId(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                className="pl-10 bg-white h-11 font-mono text-sm"
              />
            </div>
            <Button
              onClick={handleSearch}
              disabled={loading || !jobId.trim()}
              className="h-11 px-5 bg-gradient-to-r from-violet to-cyan text-white border-0 hover:opacity-90"
            >
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
              Buscar
            </Button>
          </div>
          {exampleJobIds.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 mt-3">
              <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                <MousePointerClick className="size-3" /> Jobs desta conta ({activeAccount.name}):
              </span>
              {exampleJobIds.map((id) => (
                <button
                  key={id}
                  onClick={() => runJob(id)}
                  className="text-[11px] font-mono px-2 py-1 rounded-md border border-border bg-white/70 hover:bg-accent hover:border-violet/40 transition-colors"
                >
                  {id}
                </button>
              ))}
            </div>
          )}
        </GlassCard>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Pipeline */}
          <div className="lg:col-span-2 space-y-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-semibold text-base">Pipeline de processamento</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {result ? <>Job <span className="font-mono">{result.id}</span></> : "Busque um jobId para acompanhar a esteira"}
                  </p>
                </div>
                {result && (() => {
                  const cfg = statusBadge[result.status];
                  const Icon = cfg.icon;
                  return (
                    <Badge variant="outline" className={`${cfg.cls} px-3 py-1`}>
                      <Icon className={`size-3.5 mr-1.5 ${cfg.spin ? "animate-spin" : ""}`} />
                      {cfg.label}
                    </Badge>
                  );
                })()}
              </div>

              <div className="relative">
                {/* Pipeline rail */}
                <div className="hidden md:block absolute top-7 left-7 right-7 h-1 rounded-full bg-border" />
                {result && (
                  <motion.div
                    className={`hidden md:block absolute top-7 left-7 h-1 rounded-full bg-gradient-to-r ${failed ? "from-rose-500 to-rose-400" : "from-violet via-cyan to-emerald-500"}`}
                    initial={{ width: 0 }}
                    animate={{ width: `calc(${Math.max(0, currentIdx) / (stages.length - 1) * 100}% - ${currentIdx > 0 ? "1.75rem" : "0rem"})` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                )}

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative">
                  {stages.map((st, i) => {
                    const Icon = st.icon;
                    const reached = currentIdx >= i;
                    const isCurrent = currentIdx === i && !failed;
                    const errored = failed && i === 2;
                    return (
                      <motion.div
                        key={st.key}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.08 }}
                        className="flex md:flex-col items-center md:items-center gap-3 md:gap-2 text-center"
                      >
                        <div
                          className={`size-14 rounded-2xl flex items-center justify-center shrink-0 ring-4 ring-white transition-all ${
                            errored
                              ? "bg-gradient-to-br from-rose-500 to-rose-600 text-white shadow-[0_10px_24px_-12px_rgba(244,63,94,0.55)]"
                              : reached
                                ? `bg-gradient-to-br ${st.tone} text-white shadow-lg`
                                : "bg-muted text-muted-foreground"
                          } ${isCurrent ? "scale-110" : ""}`}
                        >
                          {isCurrent ? <Loader2 className="size-5 animate-spin" /> : errored ? <XCircle className="size-5" /> : <Icon className="size-5" />}
                          {isCurrent && (
                            <span className="absolute -inset-1 rounded-2xl border-2 border-cyan/40 animate-ping pointer-events-none" />
                          )}
                        </div>
                        <div className="text-left md:text-center">
                          <p className={`text-xs font-semibold ${reached ? "text-foreground" : "text-muted-foreground"}`}>{st.label}</p>
                          <p className="text-[10px] text-muted-foreground mt-0.5">
                            {errored ? "Erro" : isCurrent ? "Em andamento" : reached ? "OK" : "Pendente"}
                          </p>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>

              <AnimatePresence>
                {result && (
                  <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-3"
                  >
                    <Info label="Progresso" value={`${result.progress}%`} />
                    <Info label="Criado em" value={new Date(result.createdAt).toLocaleTimeString("pt-BR")} />
                    {result.durationMs !== undefined && <Info label="Duração" value={`${(result.durationMs / 1000).toFixed(2)}s`} />}
                    {result.result && (
                      <div className="col-span-2 md:col-span-3 rounded-xl border border-border bg-muted/40 p-3">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Resultado</p>
                        <p className="text-sm mt-1">{result.result}</p>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </GlassCard>
          </div>

          {/* Timeline */}
          <GlassCard className="p-5">
            <div className="mb-4">
              <h3 className="font-display font-semibold text-base">Timeline de eventos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Últimas execuções do worker</p>
            </div>
            <div className="relative">
              <div className="absolute left-[15px] top-2 bottom-2 w-px bg-gradient-to-b from-violet/30 via-border to-transparent" />
              <div className="space-y-3">
                {visibleActivity.length === 0 && <p className="rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">Nenhum evento registrado para esta empresa.</p>}
                {visibleActivity.map((ev, i) => {
                  const Icon = activityIcon[ev.kind];
                  const tone = activityTone[ev.kind];
                  return (
                    <motion.div
                      key={ev.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="relative flex gap-3"
                    >
                      <div className={`relative shrink-0 size-8 rounded-lg ${tone.bg} ${tone.text} flex items-center justify-center ring-4 ring-white ${tone.glow}`}>
                        <Icon className="size-3.5" />
                      </div>
                      <div className="flex-1 min-w-0 -mt-0.5">
                        <div className="flex items-baseline justify-between gap-2">
                          <p className="text-xs font-semibold leading-tight truncate">{ev.title}</p>
                          <span className="text-[10px] text-muted-foreground tabular-nums shrink-0">{relativeTime(ev.at)}</span>
                        </div>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{ev.detail}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </div>
          </GlassCard>
        </div>
      </motion.div>
    </AppShell>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-muted/40 border border-border/60 p-3">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm font-display font-bold mt-1 tabular-nums">{value}</p>
    </div>
  );
}
