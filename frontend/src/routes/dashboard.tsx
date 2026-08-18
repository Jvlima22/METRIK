import { createFileRoute } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import {
  Area,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Line,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { MousePointerClick, DollarSign, Target, Zap, TrendingUp, Heart, MessageCircle, ShieldCheck, Sparkles, ArrowRight, Pause, Download } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdCreativePanel } from "@/components/ad-creative-panel";
import {
  campaignsForBrand,
  mockTrend,
  deviceMix,
  getCreative,
  formatMicros,
  formatNumber,
  formatCompact,
  type CampaignMetrics,
} from "@/lib/mock-data";
import { EMPTY_ACCOUNT, useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { PLATFORM_DATA_KEY, accountScale, platformMeta } from "@/lib/accounts";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Central de Anúncios · Metrik" },
      { name: "description", content: "Centro de inteligência: criativos, engajamento social, compliance e performance unificados." },
      { property: "og:title", content: "Central de Anúncios · Metrik" },
      { property: "og:description", content: "Gestão visual de anúncios com glassmorphism, métricas sociais e detecção de violações." },
    ],
  }),
  component: DashboardPage,
});


async function exportNodeAsImage(node: HTMLElement, format: "png" | "jpg", filename: string) {
  const rect = node.getBoundingClientRect();
  const clone = node.cloneNode(true) as HTMLElement;
  clone.querySelectorAll("[data-export-ignore]").forEach((element) => element.remove());

  const copyComputedStyles = (source: Element, target: Element) => {
    const sourceStyle = window.getComputedStyle(source);
    const targetElement = target as HTMLElement;
    for (let index = 0; index < sourceStyle.length; index += 1) {
      const property = sourceStyle.item(index);
      targetElement.style.setProperty(property, sourceStyle.getPropertyValue(property), sourceStyle.getPropertyPriority(property));
    }
    Array.from(source.children).forEach((child, index) => {
      const targetChild = target.children[index];
      if (targetChild) copyComputedStyles(child, targetChild);
    });
  };

  copyComputedStyles(node, clone);
  const wrapper = document.createElement("div");
  wrapper.style.cssText = "position:fixed;left:-100000px;top:0;pointer-events:none;background:#ffffff;";
  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  try {
    const width = Math.ceil(rect.width);
    const height = Math.ceil(rect.height);
    const serialized = new XMLSerializer().serializeToString(clone);
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xhtml="http://www.w3.org/1999/xhtml" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><foreignObject width="100%" height="100%"><xhtml:div xmlns="http://www.w3.org/1999/xhtml">${serialized}</xhtml:div></foreignObject></svg>`;
    const image = new Image();
    image.decoding = "async";
    image.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve();
      image.onerror = () => reject(new Error("NÃ£o foi possÃ­vel renderizar o card para exportaÃ§Ã£o."));
    });

    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas indisponÃ­vel para exportaÃ§Ã£o.");
    context.scale(scale, scale);
    context.fillStyle = "#ffffff";
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    const mime = format === "png" ? "image/png" : "image/jpeg";
    const dataUrl = canvas.toDataURL(mime, 0.95);
    const link = document.createElement("a");
    link.download = `${filename}.${format}`;
    link.href = dataUrl;
    link.click();
  } finally {
    wrapper.remove();
  }
}
const PIE_COLORS = ["#6d28d9", "#2563eb", "#06b6d4"];

/** YYYY-MM-DD de N dias atrás — default do filtro de data (alinhado ao mockTrend). */
function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

const complianceDot: Record<string, string> = {
  ok: "bg-emerald-500 shadow-[0_0_0_3px_rgba(16,185,129,0.18)]",
  warning: "bg-amber-500 shadow-[0_0_0_3px_rgba(245,158,11,0.18)]",
  critical: "bg-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.2)]",
};

function Kpi({ icon: Icon, label, value, delta, positive = true }: { icon: any; label: string; value: string; delta: string; positive?: boolean }) {
  return (
    <GlassCard className="p-4 sm:p-5">
      <div className="flex items-center justify-between">
        <div className="size-9 rounded-lg bg-accent flex items-center justify-center text-foreground/70">
          <Icon className="size-4" />
        </div>
        <span className={`text-xs font-medium flex items-center gap-0.5 ${positive ? "text-emerald-600" : "text-rose-600"}`}>
          <TrendingUp className={`size-3 ${positive ? "" : "rotate-180"}`} />
          {delta}
        </span>
      </div>
      <p className="text-xs text-muted-foreground mt-4">{label}</p>
      <p className="text-2xl font-display font-bold mt-1 tracking-tight">{value}</p>
    </GlassCard>
  );
}

function DashboardPage() {
  const [platform, setPlatform] = useState("all");
  const [engagement, setEngagement] = useState("all");
  const [compliance, setCompliance] = useState("all");
  const [customerId, setCustomerId] = useState("123-456-7890");
  const [from, setFrom] = useState(isoDaysAgo(13));
  const [to, setTo] = useState(isoDaysAgo(0));
  const [selected, setSelected] = useState<CampaignMetrics | null>(null);

  // Scope the dashboard to the active account: keep only its platform and
  // apply a deterministic per-account scale so switching accounts changes the
  // numbers (pure mock — no real API call).
  const { activeAccount, activeCompanyId } = useAccount();
  const { isAdmin } = useAuth();
  const showAdminDemo = isAdmin && !activeCompanyId && activeAccount.id !== EMPTY_ACCOUNT.id;
  const performanceCardRef = useRef<HTMLDivElement>(null);
  const [exportingPerformance, setExportingPerformance] = useState(false);
  const accountPlatform = PLATFORM_DATA_KEY[activeAccount.platform];
  const scale = accountScale(activeAccount.accountId);

  const scopedCampaigns = useMemo(
    () => {
      if (!showAdminDemo) return [];
      return campaignsForBrand(activeAccount.brandKey)
        .filter((c) => getCreative(c.campaignId).platform === accountPlatform)
        .map((c) => ({
          ...c,
          impressions: Math.round(c.impressions * scale),
          clicks: Math.round(c.clicks * scale),
          costMicros: Math.round(c.costMicros * scale),
          conversions: Math.round(c.conversions * scale),
        }));
    },
    [accountPlatform, scale, activeAccount.brandKey, showAdminDemo],
  );

  const scopedTrend = useMemo(
    () => {
      if (!showAdminDemo) return [];
      return mockTrend.map((d) => ({
        ...d,
        impressions: Math.round(d.impressions * scale),
        clicks: Math.round(d.clicks * scale),
        engagement: Math.round(d.engagement * scale),
        conversions: Math.round(d.conversions * scale),
        cost: Math.round(d.cost * scale),
      }));
    },
    [scale, showAdminDemo],
  );

  const scopedDeviceMix = showAdminDemo ? deviceMix : [];

  // Recorta a série temporal pelo intervalo De/Até (filtro de data funcional).
  const filteredTrend = useMemo(
    () => scopedTrend.filter((d) => (!from || d.iso >= from) && (!to || d.iso <= to)),
    [scopedTrend, from, to],
  );

  const handlePerformanceExport = async (format: "png" | "jpg") => {
    if (!performanceCardRef.current) return;
    setExportingPerformance(true);
    try {
      await exportNodeAsImage(performanceCardRef.current, format, `metrik-performance-${activeAccount.accountId}`);
    } finally {
      setExportingPerformance(false);
    }
  };

  const rows = useMemo(
    () => scopedCampaigns.map((c) => ({ c, cr: getCreative(c.campaignId) })),
    [scopedCampaigns],
  );

  const filtered = rows.filter(({ c, cr }) => {
    if (platform !== "all" && cr.platform !== platform) return false;
    if (compliance !== "all" && cr.compliance !== compliance) return false;
    if (engagement === "high" && cr.engagementScore < 60) return false;
    if (engagement === "low" && cr.engagementScore >= 60) return false;
    void c;
    return true;
  });

  const totals = useMemo(() => {
    const t = filtered.reduce(
      (acc, { c, cr }) => ({
        impressions: acc.impressions + c.impressions,
        clicks: acc.clicks + c.clicks,
        cost: acc.cost + c.costMicros,
        conversions: acc.conversions + c.conversions,
        social: acc.social + cr.likes + cr.comments + cr.shares,
        healthy: acc.healthy + (cr.compliance === "ok" ? 1 : 0),
      }),
      { impressions: 0, clicks: 0, cost: 0, conversions: 0, social: 0, healthy: 0 },
    );
    return {
      ...t,
      ctr: t.clicks / Math.max(1, t.impressions),
      cpc: t.cost / Math.max(1, t.clicks),
      healthPct: filtered.length ? Math.round((t.healthy / filtered.length) * 100) : 0,
    };
  }, [filtered]);

  const costByCampaign = filtered.map(({ c }) => ({
    name: c.campaignName.split(" — ")[0].slice(0, 14),
    custo: +(c.costMicros / 1_000_000).toFixed(0),
    conversoes: c.conversions,
  }));

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <header className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground font-medium">Centro de Inteligência</p>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold mt-1">Anúncios</h1>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-accent/70 border border-border text-foreground/70 font-medium">
              <span
                className="size-3.5 rounded flex items-center justify-center text-white text-[9px] font-bold"
                style={{ background: platformMeta[activeAccount.platform].gradient }}
              >
                {platformMeta[activeAccount.platform].short}
              </span>
              {activeAccount.name} · {activeAccount.accountId}
            </div>
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-50 border border-emerald-200/60 text-emerald-700 font-medium">
              <span className="size-1.5 rounded-full bg-emerald-500 animate-pulse" /> {totals.healthPct}% saudáveis
            </div>
          </div>
        </header>

        {/* Smart Summary + Critical Alerts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="lg:col-span-2 relative overflow-hidden rounded-2xl p-5 border border-white/60"
            style={{ background: "linear-gradient(135deg, rgba(124,58,237,0.08), rgba(6,182,212,0.06) 60%, rgba(255,255,255,0.7))" }}
          >
            <div className="absolute -top-12 -right-12 size-48 rounded-full bg-violet/10 blur-3xl pointer-events-none" />
            <div className="relative flex items-start gap-3">
              <div className="size-9 rounded-xl bg-gradient-to-br from-violet to-cyan text-white flex items-center justify-center shrink-0 shadow-lg shadow-violet/20">
                <Sparkles className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider font-bold text-violet">Resumo inteligente · hoje</p>
                <p className="text-sm md:text-[15px] mt-1.5 leading-relaxed text-foreground/90">
                  Suas campanhas no <strong className="text-foreground">Meta Ads</strong> performaram{" "}
                  <strong className="text-emerald-700">15% melhor em conversões</strong>, mas o custo no{" "}
                  <strong className="text-foreground">Google Ads</strong> subiu{" "}
                  <strong className="text-rose-700">+8.4%</strong> devido a{" "}
                  <strong className="text-rose-700">2 violações críticas</strong> que pausaram anúncios de alta performance.
                </p>
                <p className="text-xs text-muted-foreground mt-2">
                  Recomendação: revise os criativos pausados em <em>Performance Max</em> e reative com copy ajustado.
                </p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
            className="relative overflow-hidden rounded-2xl p-5 border border-rose-200/60"
            style={{
              background: "linear-gradient(135deg, rgba(244,63,94,0.10), rgba(255,255,255,0.85))",
              boxShadow: "0 12px 32px -16px rgba(244,63,94,0.4)",
            }}
          >
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-rose-300/10 to-transparent animate-pulse pointer-events-none" />
            <div className="relative">
              <div className="flex items-center gap-2">
                <span className="size-2 rounded-full bg-rose-500 animate-pulse shadow-[0_0_0_4px_rgba(244,63,94,0.2)]" />
                <p className="text-[10px] uppercase tracking-wider font-bold text-rose-700">Ação necessária</p>
              </div>
              <p className="text-sm font-semibold mt-2 leading-snug">
                3 anúncios pausados automaticamente por <strong>Violação de Marca</strong>
              </p>
              <p className="text-xs text-muted-foreground mt-1">Google Ads · últimos 30min · revisão urgente</p>
              <Link
                to="/violations"
                className="inline-flex items-center gap-1.5 mt-3 text-xs font-semibold text-rose-700 hover:gap-2.5 transition-all"
              >
                <Pause className="size-3" />
                Revisar agora
                <ArrowRight className="size-3" />
              </Link>
            </div>
          </motion.div>
        </div>



        {/* Filters */}
        <GlassCard className="p-4">
          <div className="grid grid-cols-2 md:grid-cols-7 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Plataforma</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="google-ads">Google Ads</SelectItem>
                  <SelectItem value="meta-ads">Meta Ads</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Engajamento</Label>
              <Select value={engagement} onValueChange={setEngagement}>
                <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="high">Alto (60+)</SelectItem>
                  <SelectItem value="low">Baixo (&lt;60)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Compliance</Label>
              <Select value={compliance} onValueChange={setCompliance}>
                <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="ok">Saudável</SelectItem>
                  <SelectItem value="warning">Atenção</SelectItem>
                  <SelectItem value="critical">Crítico</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Customer ID</Label>
              <Input value={customerId} onChange={(e) => setCustomerId(e.target.value)} className="h-9 bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">De</Label>
              <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="h-9 bg-white" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Até</Label>
              <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="h-9 bg-white" />
            </div>
            <div className="flex items-end col-span-2 md:col-span-1">
              <Button className="w-full h-9 bg-foreground text-background hover:bg-foreground/90">Aplicar</Button>
            </div>
          </div>
        </GlassCard>

        {/* KPIs */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <Kpi icon={Zap} label="Impressões" value={formatCompact(totals.impressions)} delta="+12.4%" />
          <Kpi icon={MousePointerClick} label="Cliques" value={formatCompact(totals.clicks)} delta="+8.1%" />
          <Kpi icon={Heart} label="Engajamento Social" value={formatCompact(totals.social)} delta="+24.6%" />
          <Kpi icon={DollarSign} label="Custo" value={formatMicros(totals.cost)} delta="+5.2%" positive={false} />
          <Kpi icon={Target} label="Conversões" value={formatNumber(totals.conversions)} delta="+18.9%" />
          <Kpi icon={ShieldCheck} label="Saúde" value={`${totals.healthPct}%`} delta="+2pp" />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <GlassCard ref={performanceCardRef} className="p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
              <div>
                <h3 className="font-display font-semibold text-base">Performance & Engajamento</h3>
                <p className="text-xs text-muted-foreground mt-0.5">Cruzando mídia paga com sinais sociais · 14 dias</p>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#6d28d9]" />Impressões</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#06b6d4]" />Cliques</span>
                <span className="flex items-center gap-1.5"><span className="size-2 rounded-full bg-[#f43f5e]" />Engajamento</span>
                <div data-export-ignore="true" className="flex items-center gap-1.5 sm:ml-2">
                  <Button type="button" variant="outline" size="sm" className="h-8 border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => void handlePerformanceExport("png")} disabled={exportingPerformance}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar PNG
                  </Button>
                  <Button type="button" variant="outline" size="sm" className="h-8 border-slate-300 bg-white px-3 text-[11px] font-semibold text-slate-700 shadow-sm hover:bg-slate-50" onClick={() => void handlePerformanceExport("jpg")} disabled={exportingPerformance}>
                    <Download className="mr-1.5 h-3.5 w-3.5" /> Exportar JPG
                  </Button>
                </div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={filteredTrend} margin={{ left: -10, right: 8, top: 8 }}>
                <defs>
                  <linearGradient id="gradImp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#6d28d9" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#6d28d9" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradClk" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#06b6d4" stopOpacity={0.25} />
                    <stop offset="100%" stopColor="#06b6d4" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                <XAxis dataKey="date" stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="impressions" stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis yAxisId="secondary" orientation="right" stroke="#9aa3b2" fontSize={10} tickLine={false} axisLine={false} width={42} />
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 10, fontSize: 12, boxShadow: "0 8px 24px rgba(15,18,40,0.08)" }} />
                <Area yAxisId="impressions" type="monotone" dataKey="impressions" stroke="#6d28d9" strokeWidth={2} fill="url(#gradImp)" />
                <Line yAxisId="secondary" type="monotone" dataKey="clicks" stroke="#06b6d4" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line yAxisId="secondary" type="monotone" dataKey="engagement" stroke="#f43f5e" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="mb-5">
              <h3 className="font-display font-semibold text-base">Mix de dispositivos</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Distribuição de cliques</p>
            </div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={scopedDeviceMix} dataKey="value" innerRadius={55} outerRadius={80} paddingAngle={2}>
                  {scopedDeviceMix.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 10, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="space-y-2 mt-2">
              {deviceMix.map((d, i) => (
                <div key={d.name} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ background: PIE_COLORS[i] }} />
                    {d.name}
                  </span>
                  <span className="font-medium tabular-nums">{d.value}%</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </div>

        <GlassCard className="p-5">
          <div className="mb-5">
            <h3 className="font-display font-semibold text-base">Custo × Conversões por campanha</h3>
            <p className="text-xs text-muted-foreground mt-0.5">Eficiência relativa do investimento</p>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <BarChart data={costByCampaign} margin={{ left: -10, right: 8 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
              <XAxis dataKey="name" stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
              <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 10, fontSize: 12 }} />
              <Bar dataKey="custo" fill="#6d28d9" radius={[6, 6, 0, 0]} maxBarSize={36} />
              <Bar dataKey="conversoes" fill="#06b6d4" radius={[6, 6, 0, 0]} maxBarSize={36} />
            </BarChart>
          </ResponsiveContainer>
        </GlassCard>

        {/* Campaign table */}
        <GlassCard className="p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-display font-semibold text-base">Anúncios em execução</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Clique para abrir o criativo, métricas sociais e moderação</p>
            </div>
          </div>
          <div className="overflow-x-auto -mx-5">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="pl-5 w-6"></TableHead>
                  <TableHead>Campanha</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Impressões</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="text-right">Conv.</TableHead>
                  <TableHead className="text-right pr-5">Social</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map(({ c, cr }) => (
                  <TableRow
                    key={c.campaignId}
                    onClick={() => setSelected(c)}
                    className="border-border/60 group cursor-pointer hover:bg-accent/40 transition-colors"
                  >
                    <TableCell className="pl-5">
                      <span className={`block size-2.5 rounded-full ${complianceDot[cr.compliance]} ${cr.compliance !== "ok" ? "animate-pulse" : ""}`} />
                    </TableCell>
                    <TableCell className="py-2.5">
                      <div className="flex items-center gap-3">
                        <img src={cr.image} alt="" className="size-10 rounded-lg object-cover border border-border/60 shrink-0" />
                        <div className="min-w-0">
                          <p className="font-medium text-sm leading-tight truncate group-hover:text-violet transition-colors">{c.campaignName}</p>
                          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">{cr.brand} · {cr.platform === "google-ads" ? "Google" : "Meta"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={
                        c.status === "ENABLED" ? "border-emerald-200 text-emerald-700 bg-emerald-50" :
                        c.status === "PAUSED" ? "border-amber-200 text-amber-700 bg-amber-50" :
                        "border-border text-muted-foreground bg-muted"
                      }>
                        {c.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.impressions)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.clicks)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatMicros(c.costMicros)}</TableCell>
                    <TableCell className="text-right tabular-nums">{formatNumber(c.conversions)}</TableCell>
                    <TableCell className="text-right pr-5">
                      <div className="inline-flex items-center gap-2.5 text-xs tabular-nums">
                        <span className="flex items-center gap-1 text-rose-600"><Heart className="size-3 fill-rose-500" /> {formatCompact(cr.likes)}</span>
                        <span className="flex items-center gap-1 text-cyan"><MessageCircle className="size-3" /> {formatCompact(cr.comments)}</span>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </GlassCard>
      </motion.div>

      <AdCreativePanel campaign={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}


