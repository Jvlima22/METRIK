import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { ArrowLeft, Pause, Play, Settings2, ExternalLink, MousePointerClick, Zap, DollarSign, Target, Percent } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { mockCampaigns, campaignTrend, formatMicros, formatNumber, type CampaignMetrics } from "@/lib/mock-data";
import { useAuth } from "@/lib/auth-context";
import { useAccount } from "@/lib/account-context";

export const Route = createFileRoute("/campaigns/$campaignId")({
  head: ({ params }) => ({
    meta: [
      { title: `Campanha ${params.campaignId} · Metrik` },
      { name: "description", content: "Detalhes completos de performance, tendências e configuração da campanha." },
    ],
  }),
  loader: ({ params }) => {
    const campaign = mockCampaigns.find((c) => c.campaignId === params.campaignId);
    if (!campaign) throw notFound();
    return { campaign, trend: campaignTrend(params.campaignId) };
  },
  notFoundComponent: () => (
    <AppShell>
      <div className="text-center py-20">
        <h2 className="font-display text-2xl font-bold">Campanha não encontrada</h2>
        <Link to="/dashboard" className="text-violet underline mt-4 inline-block">Voltar ao dashboard</Link>
      </div>
    </AppShell>
  ),
  component: CampaignDetail,
});

function StatCard({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs">
        <Icon className="size-3.5" />
        <span>{label}</span>
      </div>
      <p className="text-xl font-display font-bold mt-2 tracking-tight">{value}</p>
      {sub && <p className="text-xs text-muted-foreground mt-1">{sub}</p>}
    </GlassCard>
  );
}

function CampaignDetail() {
  const { isAdmin } = useAuth();
  const { activeCompanyId } = useAccount();
  const { campaign, trend } = Route.useLoaderData() as { campaign: CampaignMetrics; trend: ReturnType<typeof campaignTrend> };
  const c = campaign;

  if (!isAdmin || activeCompanyId) {
    return <AppShell><div className="py-20 text-center"><h2 className="font-display text-2xl font-bold">Campanha não disponível</h2><p className="mt-2 text-sm text-muted-foreground">Os dados de demonstração estão disponíveis somente para o administrador global.</p><Link to="/dashboard" className="mt-4 inline-block text-violet underline">Voltar ao dashboard</Link></div></AppShell>;
  }

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="space-y-6"
      >
        <div>
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> Dashboard
          </Link>
        </div>

        <header className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={
                c.status === "ENABLED" ? "border-emerald-200 text-emerald-700 bg-emerald-50"
                : c.status === "PAUSED" ? "border-amber-200 text-amber-700 bg-amber-50"
                : "border-border text-muted-foreground bg-muted"
              }>
                {c.status}
              </Badge>
              <span className="text-xs text-muted-foreground font-mono">{c.campaignId}</span>
            </div>
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-display font-bold">{c.campaignName}</h1>
            <p className="text-muted-foreground text-sm">Google Ads · Cliente 123-456-7890</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="outline" size="sm" className="gap-1.5">
              {c.status === "ENABLED" ? <><Pause className="size-3.5" /> Pausar</> : <><Play className="size-3.5" /> Ativar</>}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings2 className="size-3.5" /> Configurar
            </Button>
            <Button size="sm" className="gap-1.5 bg-foreground text-background hover:bg-foreground/90">
              <ExternalLink className="size-3.5" /> Abrir na plataforma
            </Button>
          </div>
        </header>

        {/* KPI row */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Zap} label="Impressões" value={formatNumber(c.impressions)} sub="últimos 30 dias" />
          <StatCard icon={MousePointerClick} label="Cliques" value={formatNumber(c.clicks)} sub="últimos 30 dias" />
          <StatCard icon={DollarSign} label="Custo" value={formatMicros(c.costMicros)} sub="acumulado" />
          <StatCard icon={Target} label="Conversões" value={formatNumber(c.conversions)} sub="taxa 4.2%" />
          <StatCard icon={Percent} label="CTR" value={`${(c.ctr * 100).toFixed(2)}%`} sub="média do período" />
          <StatCard icon={DollarSign} label="CPC médio" value={formatMicros(c.averageCpcMicros)} sub="por clique" />
        </div>

        <Tabs defaultValue="performance" className="space-y-4">
          <TabsList className="bg-accent">
            <TabsTrigger value="performance">Performance</TabsTrigger>
            <TabsTrigger value="quality">Qualidade</TabsTrigger>
            <TabsTrigger value="config">Configuração</TabsTrigger>
          </TabsList>

          <TabsContent value="performance" className="space-y-4 mt-4">
            <GlassCard className="p-5">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="font-display font-semibold">Impressões diárias</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Últimos 30 dias</p>
                </div>
              </div>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trend} margin={{ left: -10, right: 8 }}>
                  <defs>
                    <linearGradient id="gImp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#4B97DB" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#4B97DB" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                  <XAxis dataKey="date" stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                  <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 10, fontSize: 12 }} />
                  <Area type="monotone" dataKey="impressions" stroke="#4B97DB" strokeWidth={2.5} fill="url(#gImp)" />
                </AreaChart>
              </ResponsiveContainer>
            </GlassCard>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <div className="mb-4">
                  <h3 className="font-display font-semibold">Cliques & Conversões</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Funil diário</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <LineChart data={trend} margin={{ left: -10, right: 8 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                    <XAxis dataKey="date" stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 10, fontSize: 12 }} />
                    <Line type="monotone" dataKey="clicks" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                    <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </GlassCard>

              <GlassCard className="p-5">
                <div className="mb-4">
                  <h3 className="font-display font-semibold">CTR ao longo do tempo</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">Taxa de cliques (%)</p>
                </div>
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={trend} margin={{ left: -10, right: 8 }}>
                    <defs>
                      <linearGradient id="gCtr" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#eef0f5" vertical={false} />
                    <XAxis dataKey="date" stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                    <YAxis stroke="#9aa3b2" fontSize={11} tickLine={false} axisLine={false} />
                    <Tooltip contentStyle={{ background: "#fff", border: "1px solid #e6e8ef", borderRadius: 10, fontSize: 12 }} />
                    <Area type="monotone" dataKey="ctr" stroke="#f59e0b" strokeWidth={2} fill="url(#gCtr)" />
                  </AreaChart>
                </ResponsiveContainer>
              </GlassCard>
            </div>
          </TabsContent>

          <TabsContent value="quality" className="mt-4">
            <GlassCard className="p-6">
              <h3 className="font-display font-semibold mb-4">Quality Score</h3>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {[
                  { label: "Relevância do anúncio", score: 9 },
                  { label: "Experiência da landing", score: 8 },
                  { label: "CTR esperado", score: 7 },
                ].map((q) => (
                  <div key={q.label} className="p-4 rounded-xl bg-accent/50">
                    <p className="text-xs text-muted-foreground">{q.label}</p>
                    <p className="text-3xl font-display font-bold mt-1">{q.score}<span className="text-base text-muted-foreground">/10</span></p>
                    <div className="h-1.5 bg-white rounded-full overflow-hidden mt-3">
                      <div className="h-full rounded-full" style={{ width: `${q.score * 10}%`, background: "linear-gradient(90deg, #4B97DB, #06b6d4)" }} />
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>

          <TabsContent value="config" className="mt-4">
            <GlassCard className="p-6 space-y-4">
              {[
                ["ID da campanha", c.campaignId],
                ["Nome", c.campaignName],
                ["Status", c.status],
                ["Orçamento diário", "R$ 1.500,00"],
                ["Estratégia de lance", "Maximize Conversions"],
                ["Tipo", "Search · Performance Max"],
                ["Criada em", "2026-01-12"],
              ].map(([k, v]) => (
                <div key={k} className="flex items-center justify-between py-3 border-b border-border/60 last:border-0">
                  <span className="text-sm text-muted-foreground">{k}</span>
                  <span className="text-sm font-medium">{v}</span>
                </div>
              ))}
            </GlassCard>
          </TabsContent>
        </Tabs>
      </motion.div>
    </AppShell>
  );
}
