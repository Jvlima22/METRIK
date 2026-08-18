import { createFileRoute } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useState } from "react";
import { AlertCircle, ShieldAlert, Sparkles, ExternalLink, Lightbulb, FileWarning, Image as ImageIcon, Clock, Building2 } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { violationsForAccount, type ViolationPayload, getCreative } from "@/lib/mock-data";
import { getPolicy, relativeTime } from "@/lib/activity";
import { EMPTY_ACCOUNT, useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { platformMeta } from "@/lib/accounts";

/** YYYY-MM-DD de hoje e de N dias atrás (default do filtro de data). */
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export const Route = createFileRoute("/violations")({
  head: () => ({
    meta: [
      { title: "Violações · Metrik" },
      { name: "description", content: "Relatório de evidências, AI Policy Assistant e ações de compliance para violações detectadas." },
      { property: "og:title", content: "Violações · Metrik" },
      { property: "og:description", content: "Investigue cada violação com evidência visual e sugestões da IA." },
    ],
  }),
  component: ViolationsPage,
});

const severityTheme: Record<ViolationPayload["severity"], { badge: string; ring: string; bar: string; glow: string; label: string }> = {
  CRITICAL: { badge: "bg-rose-500 text-white", ring: "ring-rose-200", bar: "from-rose-500 via-red-500 to-rose-700", glow: "shadow-[0_18px_40px_-18px_rgba(244,63,94,0.6)]", label: "Crítica" },
  HIGH:     { badge: "bg-orange-500 text-white", ring: "ring-orange-200", bar: "from-orange-400 to-orange-600", glow: "shadow-[0_18px_40px_-18px_rgba(249,115,22,0.5)]", label: "Alta" },
  MEDIUM:   { badge: "bg-amber-500 text-white", ring: "ring-amber-200", bar: "from-amber-400 to-amber-600", glow: "shadow-[0_14px_32px_-18px_rgba(245,158,11,0.45)]", label: "Média" },
  LOW:      { badge: "bg-sky-500 text-white",  ring: "ring-sky-200",  bar: "from-sky-400 to-sky-600",   glow: "shadow-[0_10px_28px_-18px_rgba(14,165,233,0.4)]", label: "Baixa" },
};

function ViolationsPage() {
  const [severity, setSeverity] = useState<string>("all");
  const [type, setType] = useState<string>("all");
  const [from, setFrom] = useState<string>(isoDaysAgo(30));
  const [to, setTo] = useState<string>(isoDaysAgo(0));
  const [selected, setSelected] = useState<ViolationPayload | null>(null);
  const [policyOpen, setPolicyOpen] = useState(false);

  // Violações isoladas por conta — derivadas dos criativos da própria conta.
  const { activeAccount, activeCompanyId } = useAccount();
  const { isAdmin } = useAuth();
  const showAdminDemo = isAdmin && !activeCompanyId && activeAccount.id !== EMPTY_ACCOUNT.id;
  const scoped = useMemo(
    () => showAdminDemo ? violationsForAccount(activeAccount) : [],
    [activeAccount, showAdminDemo],
  );

  const types = useMemo(() => Array.from(new Set(scoped.map((v) => v.violationType))), [scoped]);
  const filtered = useMemo(
    () => scoped
      .filter((v) => severity === "all" || v.severity === severity)
      .filter((v) => type === "all" || v.violationType === type)
      .filter((v) => {
        const day = v.detectedAt.slice(0, 10);
        return (!from || day >= from) && (!to || day <= to);
      })
      .sort((a, b) => b.detectedAt.localeCompare(a.detectedAt)),
    [scoped, severity, type, from, to],
  );

  // Evidência = o criativo exato da campanha de origem (sempre da mesma conta).
  const evidenceFor = (v: ViolationPayload) => getCreative(v.campaignId);

  // Contadores refletem a janela de data (mas não os filtros de severidade/tipo).
  const dateScoped = useMemo(
    () => scoped.filter((v) => {
      const day = v.detectedAt.slice(0, 10);
      return (!from || day >= from) && (!to || day <= to);
    }),
    [scoped, from, to],
  );
  const counts = useMemo(() => ({
    CRITICAL: dateScoped.filter((v) => v.severity === "CRITICAL").length,
    HIGH: dateScoped.filter((v) => v.severity === "HIGH").length,
    MEDIUM: dateScoped.filter((v) => v.severity === "MEDIUM").length,
    LOW: dateScoped.filter((v) => v.severity === "LOW").length,
  }), [dateScoped]);

  const policy = selected ? getPolicy(selected.violationType) : null;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Compliance</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-1 flex items-center gap-2 sm:gap-3">
              <ShieldAlert className="size-6 sm:size-7 text-violet" />
              Violações
            </h1>
            <p className="text-muted-foreground text-sm mt-1 flex items-center gap-1.5">
              <span
                className="size-3.5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                style={{ background: platformMeta[activeAccount.platform].gradient }}
              >
                {platformMeta[activeAccount.platform].short}
              </span>
              {activeAccount.name} · {filtered.length} ocorrências
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {(["CRITICAL", "HIGH", "MEDIUM", "LOW"] as const).map((s) => (
              <div key={s} className={`px-3 py-1.5 rounded-full ring-1 ${severityTheme[s].ring} bg-white/70 backdrop-blur-md flex items-center gap-2`}>
                <span className={`size-1.5 rounded-full ${severityTheme[s].badge.split(" ")[0]}`} />
                <span className="font-medium">{severityTheme[s].label}</span>
                <span className="tabular-nums text-foreground font-bold">{counts[s]}</span>
              </div>
            ))}
          </div>
        </header>

        <GlassCard className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Severidade</label>
              <Select value={severity} onValueChange={setSeverity}>
                <SelectTrigger className="h-9 bg-white mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="CRITICAL">Critical</SelectItem>
                  <SelectItem value="HIGH">High</SelectItem>
                  <SelectItem value="MEDIUM">Medium</SelectItem>
                  <SelectItem value="LOW">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger className="h-9 bg-white mt-1.5"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  {types.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">De</label>
              <Input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} className="h-9 bg-white mt-1.5" />
            </div>
            <div>
              <label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Até</label>
              <Input type="date" value={to} min={from} onChange={(e) => setTo(e.target.value)} className="h-9 bg-white mt-1.5" />
            </div>
          </div>
          {filtered.length === 0 && (
            <p className="text-xs text-muted-foreground mt-3">
              Nenhuma violação para esta conta no período/filtros selecionados.
            </p>
          )}
        </GlassCard>

        {/* Evidence Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          <AnimatePresence mode="popLayout">
            {filtered.map((v, i) => {
              const theme = severityTheme[v.severity];
              const ev = evidenceFor(v);
              return (
                <motion.button
                  key={v.adId}
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ delay: i * 0.03 }}
                  onClick={() => { setSelected(v); setPolicyOpen(false); }}
                  className={`group relative text-left rounded-2xl overflow-hidden bg-white border border-white/60 ${theme.glow} hover:-translate-y-0.5 transition-transform`}
                >
                  {/* Animated severity bar */}
                  <div className="relative h-1 overflow-hidden">
                    <div className={`absolute inset-0 bg-gradient-to-r ${theme.bar}`} />
                    {v.severity === "CRITICAL" && (
                      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent animate-[shimmer_2s_linear_infinite]" style={{ backgroundSize: "200% 100%" }} />
                    )}
                  </div>

                  <div className="relative aspect-[16/9] bg-muted overflow-hidden">
                    <img src={ev.image} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                    <div className={`absolute inset-0 bg-gradient-to-br ${theme.bar} opacity-25 mix-blend-multiply`} />
                    <div className="absolute top-2 left-2 flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${theme.badge} shadow-lg`}>
                        {v.severity}
                      </span>
                      <span className="text-[10px] font-medium px-2 py-1 rounded-md bg-white/85 backdrop-blur-sm text-foreground">
                        {v.platform === "google-ads" ? "Google" : "Meta"}
                      </span>
                    </div>
                    <div className="absolute bottom-2 right-2 text-[10px] font-mono px-2 py-1 rounded bg-black/50 text-white backdrop-blur-sm">
                      {v.adId}
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Tipo</p>
                        <p className="font-semibold text-sm leading-tight mt-0.5">{v.violationType.replace(/_/g, " ")}</p>
                      </div>
                      <span className="text-[10px] text-muted-foreground flex items-center gap-1 shrink-0 whitespace-nowrap">
                        <Clock className="size-3" /> {relativeTime(v.detectedAt)}
                      </span>
                    </div>
                    <p className="text-xs text-muted-foreground mt-3 line-clamp-2">
                      {ev.violation?.message ?? getPolicy(v.violationType).explanation}
                    </p>
                    <div className="flex items-center justify-between mt-3 pt-3 border-t border-border/60">
                      <span className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <Building2 className="size-3" /> {v.tenantId}
                      </span>
                      <span className="text-[11px] font-semibold text-violet flex items-center gap-1 group-hover:gap-1.5 transition-all">
                        Ver evidência <FileWarning className="size-3" />
                      </span>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Evidence Modal */}
      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="max-w-3xl p-0 overflow-hidden gap-0 bg-white">
          {selected && (() => {
            const theme = severityTheme[selected.severity];
            const ev = evidenceFor(selected);
            return (
              <>
                <div className={`h-1 bg-gradient-to-r ${theme.bar}`} />
                <DialogHeader className="p-6 pb-4">
                  <DialogTitle className="font-display text-xl flex items-center gap-3">
                    <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md ${theme.badge}`}>{selected.severity}</span>
                    Relatório de Evidência
                  </DialogTitle>
                </DialogHeader>

                <div className="px-6 pb-6 grid grid-cols-1 md:grid-cols-2 gap-5">
                  {/* Left: ad evidence */}
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5">
                      <ImageIcon className="size-3" /> Criativo flagrado
                    </p>
                    <div className="relative rounded-xl overflow-hidden border border-border">
                      <img src={ev.image} alt="" className="w-full aspect-video object-cover" />
                      <div className={`absolute inset-0 bg-gradient-to-br ${theme.bar} opacity-25 mix-blend-multiply`} />
                      <div className="absolute bottom-3 left-3 right-3 rounded-lg bg-white/90 backdrop-blur-md p-2.5">
                        <p className="text-xs font-semibold leading-tight">{ev.headline}</p>
                        <p className="text-[11px] text-muted-foreground mt-0.5 line-clamp-1">{ev.body}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <Cell label="Ad ID" value={selected.adId} mono />
                      <Cell label="Tenant" value={selected.tenantId} mono />
                      <Cell label="Plataforma" value={selected.platform === "google-ads" ? "Google Ads" : "Meta Ads"} />
                      <Cell label="Detectado" value={new Date(selected.detectedAt).toLocaleString("pt-BR")} />
                    </div>
                  </div>

                  {/* Right: trigger + actions */}
                  <div className="space-y-3">
                    <div>
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground">Tipo de violação</p>
                      <p className="font-display font-bold mt-1">{selected.violationType.replace(/_/g, " ")}</p>
                    </div>

                    <div className="rounded-xl border border-rose-200/60 bg-rose-50/60 p-3">
                      <p className="text-[10px] uppercase tracking-wider font-semibold text-rose-700 flex items-center gap-1.5">
                        <AlertCircle className="size-3" /> Termo / sinal que disparou
                      </p>
                      <p className="font-mono text-sm mt-2 text-rose-900 leading-snug">
                        {getPolicy(selected.violationType).trigger}
                      </p>
                    </div>

                    <Button
                      onClick={() => setPolicyOpen(true)}
                      className="w-full bg-gradient-to-r from-violet to-cyan text-white border-0 hover:opacity-90"
                    >
                      <Sparkles className="size-4" /> Por que foi bloqueado?
                    </Button>

                    <div className="flex gap-2">
                      <Button variant="outline" className="flex-1 h-9 text-xs">Marcar como falso positivo</Button>
                      <Button variant="outline" className="flex-1 h-9 text-xs">Solicitar revisão</Button>
                    </div>
                  </div>
                </div>
              </>
            );
          })()}
        </DialogContent>
      </Dialog>

      {/* AI Policy Assistant Modal */}
      <Dialog open={policyOpen} onOpenChange={setPolicyOpen}>
        <DialogContent className="max-w-2xl p-0 overflow-hidden bg-white">
          {policy && (
            <>
              <div className="relative p-6 overflow-hidden" style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.10), rgba(6,182,212,0.08))" }}>
                <div className="absolute -top-8 -right-8 size-40 rounded-full bg-violet/15 blur-3xl pointer-events-none" />
                <div className="relative flex items-start gap-3">
                  <div className="size-10 rounded-xl bg-gradient-to-br from-violet to-cyan text-white flex items-center justify-center shrink-0 shadow-lg">
                    <Sparkles className="size-5" />
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-wider font-bold text-violet">AI Policy Assistant</p>
                    <DialogTitle className="font-display text-lg mt-0.5">{policy.rule}</DialogTitle>
                    <p className="text-xs text-muted-foreground mt-1">Política da {policy.platform}</p>
                  </div>
                </div>
              </div>

              <div className="p-6 pt-4 space-y-4">
                <Section icon={<FileWarning className="size-3.5 text-rose-600" />} label="O que aconteceu">
                  {policy.explanation}
                </Section>

                <Section icon={<Lightbulb className="size-3.5 text-amber-600" />} label="Como corrigir" tone="amber">
                  {policy.suggestion}
                </Section>

                <div className="flex items-center justify-between pt-2 border-t border-border">
                  <a href={`https://${policy.reference}`} target="_blank" rel="noreferrer"
                     className="text-xs text-violet hover:underline flex items-center gap-1.5 font-mono">
                    {policy.reference}
                    <ExternalLink className="size-3" />
                  </a>
                  <Button onClick={() => setPolicyOpen(false)} variant="outline" size="sm">Fechar</Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

function Cell({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="rounded-lg bg-muted/50 border border-border/60 p-2.5">
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</p>
      <p className={`mt-0.5 ${mono ? "font-mono text-xs" : "text-xs"}`}>{value}</p>
    </div>
  );
}

function Section({ icon, label, children, tone }: { icon: React.ReactNode; label: string; children: React.ReactNode; tone?: "amber" }) {
  const cls = tone === "amber"
    ? "border-amber-200/70 bg-amber-50/60"
    : "border-border bg-muted/40";
  return (
    <div className={`rounded-xl border p-3.5 ${cls}`}>
      <p className="text-[10px] uppercase tracking-wider font-semibold text-muted-foreground flex items-center gap-1.5 mb-1.5">
        {icon} {label}
      </p>
      <p className="text-sm leading-relaxed">{children}</p>
    </div>
  );
}

// shimmer keyframe (uses tw-animate-css presence; fallback inline)
declare global { interface CSSStyleDeclaration { } }

// Add shimmer keyframes globally once
if (typeof document !== "undefined" && !document.getElementById("shimmer-kf")) {
  const s = document.createElement("style");
  s.id = "shimmer-kf";
  s.textContent = `@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`;
  document.head.appendChild(s);
}
