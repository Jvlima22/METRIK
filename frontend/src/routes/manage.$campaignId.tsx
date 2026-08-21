import { createFileRoute, Link } from "@tanstack/react-router";
import { motion } from "framer-motion";
import { useState } from "react";
import {
  Bar,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  ArrowLeft,
  MousePointerClick,
  Zap,
  DollarSign,
  Target,
  Percent,
  Users,
  Plus,
  Trash2,
  Pencil,
  Check,
  X,
  Play,
  Pause,
  Copy,
  MoreHorizontal,
  ChevronDown,
  Layers,
  Images,
  ImagePlus,
} from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { PlatformBadge } from "@/components/platform-badge";
import { CampaignFormDialog } from "@/components/campaign-form-dialog";
import { CreativePickerDialog, CreativeThumb } from "@/components/creative-picker-dialog";
import { GeoTargeting, DemographicsEditor, InterestEditor } from "@/components/manage-targeting";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { cn } from "@/lib/utils";
import { formatMicros, formatNumber, formatCompact } from "@/lib/mock-data";
import { useAccount } from "@/lib/account-context";
import { platformMeta, type AdAccount } from "@/lib/accounts";
import { useManage } from "@/lib/manage-store";
import {
  campaignSeries,
  campaignHistory,
  relativeTime,
  entityStatusMeta,
  matchTypeMeta,
  audienceTypeMeta,
  googleBidMeta,
  metaObjectiveMeta,
  metaBidMeta,
  metaOptGoalMeta,
  type Campaign,
  type AdGroup,
  type AdSet,
  type Ad,
  type MatchType,
  type Audience,
  type MetaOptimizationGoal,
} from "@/lib/manage-data";

export const Route = createFileRoute("/manage/$campaignId")({
  head: ({ params }) => ({
    meta: [
      { title: `Gerir ${params.campaignId} · Metrik` },
      { name: "description", content: "Grupos/conjuntos, palavras-chave, públicos, geolocalização e orçamento." },
    ],
  }),
  component: ManageDetail,
});

const MATCH_OPTIONS: MatchType[] = ["EXACT", "PHRASE", "BROAD"];
const AUDIENCE_TYPES: Audience["type"][] = ["custom", "lookalike", "interest", "remarketing"];

function Fallback({ title }: { title: string }) {
  return (
    <AppShell>
      <div className="text-center py-20">
        <h2 className="font-display text-2xl font-bold">{title}</h2>
        <Link to="/manage" className="text-violet underline mt-4 inline-block">Voltar à gestão</Link>
      </div>
    </AppShell>
  );
}

function ManageDetail() {
  const { campaignId } = Route.useParams();
  const { activeAccount } = useAccount();
  const store = useManage();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState(false);
  const [budgetInput, setBudgetInput] = useState("");

  const c = store.getCampaign(activeAccount, campaignId);
  if (!c) return <Fallback title="Campanha não encontrada nesta conta" />;

  const isGoogle = c.platform === "GOOGLE_ADS";
  const st = entityStatusMeta[c.status];
  const pacing = c.budgetDailyMicros ? Math.min(100, (c.spentTodayMicros / c.budgetDailyMicros) * 100) : 0;
  const costPerConv = c.conversions ? c.costMicros / c.conversions : 0;
  const series = campaignSeries(c, activeAccount.accountId);
  const history = campaignHistory(c, activeAccount.accountId);

  function saveBudget() {
    const reais = Number(budgetInput.replace(",", "."));
    if (Number.isFinite(reais) && reais >= 0) store.updateCampaign(activeAccount, c!.id, { budgetDailyMicros: Math.round(reais * 1_000_000) });
    setEditingBudget(false);
  }

  const subtitle = isGoogle
    ? `${platformMeta[c.platform].label} · ${c.channelType} · ${c.googleBidStrategy ? googleBidMeta[c.googleBidStrategy] : ""}`
    : `${platformMeta[c.platform].label} · ${c.objective ? metaObjectiveMeta[c.objective] : ""} · ${c.budgetMode ?? ""} · ${c.metaBidStrategy ? metaBidMeta[c.metaBidStrategy] : ""}`;

  return (
    <AppShell>
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }} className="space-y-6">
        <Link to="/manage" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="size-4" /> Gestão de Campanhas
        </Link>

        {/* Header + ações de campanha */}
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <PlatformBadge platform={c.platform} className="size-11 text-base mt-0.5" />
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-display text-2xl font-bold tracking-tight">{c.name}</h1>
                <Badge variant="outline" className={st.cls}>
                  <span className={cn("size-1.5 rounded-full mr-1.5", st.dot)} />
                  {st.label}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{subtitle} · {activeAccount.name}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline" size="sm" className="gap-1.5"
              onClick={() => store.setCampaignStatus(activeAccount, c.id, c.status === "ENABLED" ? "PAUSED" : "ENABLED")}
            >
              {c.status === "ENABLED" ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
              {c.status === "ENABLED" ? "Pausar" : "Ativar"}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setEditOpen(true)}>
              <Pencil className="size-3.5" /> Editar
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="size-9 rounded-md border border-border flex items-center justify-center text-muted-foreground hover:bg-accent hover:text-foreground">
                  <MoreHorizontal className="size-4" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => store.duplicateCampaign(activeAccount, c.id)}>
                  <Copy className="size-4" /> Duplicar
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="text-rose-600 focus:text-rose-600" onClick={() => setDeleteOpen(true)}>
                  <Trash2 className="size-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          <Stat icon={Zap} label="Impressões" value={formatCompact(c.impressions)} />
          <Stat icon={MousePointerClick} label="Cliques" value={formatCompact(c.clicks)} />
          <Stat icon={DollarSign} label="Custo (30d)" value={formatMicros(c.costMicros)} />
          <Stat icon={Target} label="Conversões" value={formatNumber(c.conversions)} />
          <Stat icon={Percent} label="CTR" value={`${(c.ctr * 100).toFixed(2)}%`} />
          <Stat icon={DollarSign} label="CPC médio" value={formatMicros(c.averageCpcMicros)} />
        </div>

        {/* Tabs nativas */}
        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList>
            <TabsTrigger value="overview">Visão geral</TabsTrigger>
            <TabsTrigger value="structure">{isGoogle ? "Grupos de anúncios" : "Conjuntos de anúncios"}</TabsTrigger>
            {isGoogle && <TabsTrigger value="location">Localização</TabsTrigger>}
            <TabsTrigger value="budget">Orçamento</TabsTrigger>
            <TabsTrigger value="history">Histórico</TabsTrigger>
          </TabsList>

          {/* Visão geral */}
          <TabsContent value="overview">
            <GlassCard className="p-5">
              <p className="font-display font-semibold mb-1">Custo × Conversões (14 dias)</p>
              <p className="text-xs text-muted-foreground mb-4">Gasto diário e conversões atribuídas no período.</p>
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={series} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.06)" vertical={false} />
                    <XAxis dataKey="label" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} interval={1} />
                    <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{ borderRadius: 12, border: "1px solid rgba(0,0,0,0.08)", fontSize: 12 }}
                      formatter={(v: number, name) => (name === "spend" ? [`R$ ${formatNumber(v)}`, "Gasto"] : [formatNumber(v), "Conversões"])}
                    />
                    <Bar yAxisId="left" dataKey="spend" fill="#4B97DB" radius={[4, 4, 0, 0]} maxBarSize={22} />
                    <Line yAxisId="right" type="monotone" dataKey="conversions" stroke="#06b6d4" strokeWidth={2.5} dot={false} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            </GlassCard>
          </TabsContent>

          {/* Estrutura — Grupos (Google) ou Conjuntos (Meta) */}
          <TabsContent value="structure">
            {isGoogle ? <GoogleGroups account={activeAccount} campaign={c} /> : <MetaSets account={activeAccount} campaign={c} />}
          </TabsContent>

          {/* Localização (Google — nível de campanha) */}
          {isGoogle && (
            <TabsContent value="location">
              <GlassCard className="p-5">
                <p className="font-display font-semibold mb-1">Localização</p>
                <p className="text-xs text-muted-foreground mb-4">Onde seus anúncios podem aparecer. Inclua ou exclua países, regiões, cidades ou um raio.</p>
                <GeoTargeting
                  geos={c.geoTargets}
                  onAdd={(kind, name) => store.addGeo(activeAccount, c.id, { kind, name })}
                  onRemove={(id) => store.removeGeo(activeAccount, c.id, id)}
                  onToggle={(id) => store.toggleGeoExcluded(activeAccount, c.id, id)}
                />
              </GlassCard>
            </TabsContent>
          )}

          {/* Orçamento (editável) */}
          <TabsContent value="budget">
            <div className="grid md:grid-cols-2 gap-4">
              <GlassCard className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <p className="font-display font-semibold">Orçamento diário {!isGoogle && c.budgetMode === "ABO" && <span className="text-xs text-muted-foreground">(ABO — definido por conjunto)</span>}</p>
                  {!editingBudget && (
                    <Button variant="outline" size="sm" className="h-8 gap-1.5" onClick={() => { setBudgetInput(String(Math.round(c.budgetDailyMicros / 1_000_000))); setEditingBudget(true); }}>
                      <Pencil className="size-3.5" /> Editar
                    </Button>
                  )}
                </div>
                {editingBudget ? (
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                      <Input autoFocus type="number" min={0} value={budgetInput} onChange={(e) => setBudgetInput(e.target.value)}
                        onKeyDown={(e) => { if (e.key === "Enter") saveBudget(); if (e.key === "Escape") setEditingBudget(false); }} className="pl-9 h-10" />
                    </div>
                    <Button size="sm" className="h-10 px-3" onClick={saveBudget}><Check className="size-4" /></Button>
                    <Button size="sm" variant="outline" className="h-10 px-3" onClick={() => setEditingBudget(false)}><X className="size-4" /></Button>
                  </div>
                ) : (
                  <div className="flex items-end justify-between mb-2">
                    <span className="text-2xl font-display font-bold tabular-nums">{formatMicros(c.budgetDailyMicros)}</span>
                    <span className="text-sm text-muted-foreground">por dia</span>
                  </div>
                )}
                {!editingBudget && (
                  <>
                    <div className="mt-4 mb-1.5 flex items-center justify-between text-xs text-muted-foreground">
                      <span>Gasto hoje</span><span className="tabular-nums">{formatMicros(c.spentTodayMicros)}</span>
                    </div>
                    <Progress value={pacing} className="h-2" />
                    <p className="text-xs text-muted-foreground mt-2">{pacing.toFixed(0)}% do orçamento diário consumido.</p>
                  </>
                )}
              </GlassCard>
              <GlassCard className="p-5 space-y-3">
                <p className="font-display font-semibold">Projeções</p>
                <Row label="Orçamento mensal estimado" value={formatMicros(c.budgetDailyMicros * 30)} />
                <Row label="Custo por conversão" value={costPerConv ? formatMicros(costPerConv) : "—"} />
                <Row label="Conversões (30d)" value={formatNumber(c.conversions)} />
                <Row label="CPC médio" value={formatMicros(c.averageCpcMicros)} />
              </GlassCard>
            </div>
          </TabsContent>

          {/* Histórico */}
          <TabsContent value="history">
            <GlassCard className="p-5">
              <p className="font-display font-semibold mb-4">Histórico de alterações</p>
              <div className="space-y-3">
                {history.map((h) => (
                  <div key={h.id} className="flex gap-3 items-start">
                    <div className="size-2 rounded-full bg-violet/60 mt-1.5 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-baseline justify-between gap-2">
                        <p className="text-sm font-medium">{h.action}</p>
                        <span className="text-[11px] text-muted-foreground shrink-0">{relativeTime(h.at)}</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{h.detail} · <span className="capitalize">{h.actor}</span></p>
                    </div>
                  </div>
                ))}
              </div>
            </GlassCard>
          </TabsContent>
        </Tabs>
      </motion.div>

      <CampaignFormDialog account={activeAccount} campaign={c} open={editOpen} onOpenChange={setEditOpen} />
      <AlertDialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir campanha?</AlertDialogTitle>
            <AlertDialogDescription>"{c.name}" e toda a sua estrutura serão removidos. Esta ação não pode ser desfeita.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction className="bg-rose-600 hover:bg-rose-700" onClick={() => { store.deleteCampaign(activeAccount, c.id); window.history.back(); }}>Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}

// ── Google: grupos de anúncios + palavras-chave ─────────────────────────────

function GoogleGroups({ account, campaign }: { account: AdAccount; campaign: Campaign }) {
  const store = useManage();
  const [newGroup, setNewGroup] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={newGroup} onChange={(e) => setNewGroup(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newGroup.trim()) { store.addAdGroup(account, campaign.id, newGroup); setNewGroup(""); } }} placeholder="Novo grupo de anúncios..." className="h-9 max-w-xs bg-white/60" />
        <Button className="h-9 gap-1.5" onClick={() => { if (newGroup.trim()) { store.addAdGroup(account, campaign.id, newGroup); setNewGroup(""); } }}>
          <Plus className="size-4" /> Adicionar grupo
        </Button>
      </div>
      {campaign.adGroups.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum grupo ainda. Crie um para adicionar palavras-chave.</p>}
      {campaign.adGroups.map((g) => (
        <GoogleGroupCard key={g.id} account={account} campaign={campaign} group={g} />
      ))}
    </div>
  );
}

function GoogleGroupCard({ account, campaign, group: g }: { account: AdAccount; campaign: Campaign; group: AdGroup }) {
  const store = useManage();
  const [open, setOpen] = useState(false);
  const [newKw, setNewKw] = useState("");
  const [newMatch, setNewMatch] = useState<MatchType>("BROAD");
  const gst = entityStatusMeta[g.status];

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          <Layers className="size-4 text-violet shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{g.name}</p>
            <p className="text-[11px] text-muted-foreground">{g.keywords.length} palavras-chave · {formatMicros(g.costMicros)} · {formatNumber(g.conversions)} conv.</p>
          </div>
        </button>
        <button onClick={() => store.toggleGroupStatus(account, campaign.id, g.id)} className={cn("inline-flex items-center text-xs rounded-md border px-2 py-1 hover:opacity-80", gst.cls)}>
          <span className={cn("size-1.5 rounded-full mr-1.5", gst.dot)} />{gst.label}
        </button>
        <button onClick={() => store.deleteAdGroup(account, campaign.id, g.id)} title="Excluir grupo" className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border">
          <div className="flex flex-wrap items-center gap-2 px-4 py-3 bg-muted/30">
            <Input value={newKw} onChange={(e) => setNewKw(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newKw.trim()) { store.addKeyword(account, campaign.id, g.id, newKw, newMatch); setNewKw(""); } }} placeholder="Nova palavra-chave..." className="h-8 flex-1 min-w-[180px] bg-white" />
            <Select value={newMatch} onValueChange={(v) => setNewMatch(v as MatchType)}>
              <SelectTrigger className="w-28 h-8 bg-white"><SelectValue /></SelectTrigger>
              <SelectContent>{MATCH_OPTIONS.map((m) => <SelectItem key={m} value={m}>{matchTypeMeta[m].label}</SelectItem>)}</SelectContent>
            </Select>
            <Button size="sm" className="h-8 gap-1.5" onClick={() => { if (newKw.trim()) { store.addKeyword(account, campaign.id, g.id, newKw, newMatch); setNewKw(""); } }}>
              <Plus className="size-4" /> Adicionar
            </Button>
          </div>
          <div className="max-h-80 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 bg-white/95 backdrop-blur-sm">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Palavra-chave</TableHead>
                  <TableHead>Correspondência</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Cliques</TableHead>
                  <TableHead className="text-right">Custo</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {g.keywords.map((kw) => {
                  const kst = entityStatusMeta[kw.status];
                  return (
                    <TableRow key={kw.id}>
                      <TableCell className="font-medium text-sm">{kw.text}</TableCell>
                      <TableCell>
                        <Select value={kw.matchType} onValueChange={(v) => store.updateKeywordMatch(account, campaign.id, g.id, kw.id, v as MatchType)}>
                          <SelectTrigger className="h-7 w-24 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>{MATCH_OPTIONS.map((m) => <SelectItem key={m} value={m}>{matchTypeMeta[m].label}</SelectItem>)}</SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell>
                        <button onClick={() => store.toggleKeyword(account, campaign.id, g.id, kw.id)} className={cn("inline-flex items-center text-xs rounded-md border px-2 py-1 hover:opacity-80", kst.cls)}>
                          <span className={cn("size-1.5 rounded-full mr-1.5", kst.dot)} />{kst.label}
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatCompact(kw.clicks)}</TableCell>
                      <TableCell className="text-right tabular-nums text-sm">{formatMicros(kw.costMicros)}</TableCell>
                      <TableCell>
                        <button onClick={() => store.removeKeyword(account, campaign.id, g.id, kw.id)} className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50" title="Remover">
                          <Trash2 className="size-4" />
                        </button>
                      </TableCell>
                    </TableRow>
                  );
                })}
                {g.keywords.length === 0 && (
                  <TableRow className="hover:bg-transparent"><TableCell colSpan={6} className="text-center text-xs text-muted-foreground py-6">Sem palavras-chave neste grupo.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          <div className="border-t border-border px-4 py-3">
            <p className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-foreground/70">
              <Images className="size-3.5 text-violet/70" /> Anúncios
            </p>
            <AdsSection account={account} campaignId={campaign.id} parentId={g.id} ads={g.ads ?? []} />
          </div>
        </div>
      )}
    </GlassCard>
  );
}

// ── Meta: conjuntos de anúncios + segmentação ───────────────────────────────

function MetaSets({ account, campaign }: { account: AdAccount; campaign: Campaign }) {
  const store = useManage();
  const [newSet, setNewSet] = useState("");
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Input value={newSet} onChange={(e) => setNewSet(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newSet.trim()) { store.addAdSet(account, campaign.id, newSet); setNewSet(""); } }} placeholder="Novo conjunto de anúncios..." className="h-9 max-w-xs bg-white/60" />
        <Button className="h-9 gap-1.5" onClick={() => { if (newSet.trim()) { store.addAdSet(account, campaign.id, newSet); setNewSet(""); } }}>
          <Plus className="size-4" /> Adicionar conjunto
        </Button>
      </div>
      {campaign.adSets.length === 0 && <p className="text-sm text-muted-foreground py-6 text-center">Nenhum conjunto ainda. Crie um para definir públicos e segmentação.</p>}
      {campaign.adSets.map((s) => (
        <MetaSetCard key={s.id} account={account} campaign={campaign} set={s} />
      ))}
    </div>
  );
}

function MetaSetCard({ account, campaign, set: s }: { account: AdAccount; campaign: Campaign; set: AdSet }) {
  const store = useManage();
  const [open, setOpen] = useState(false);
  const [newAud, setNewAud] = useState("");
  const [newAudType, setNewAudType] = useState<Audience["type"]>("custom");
  const sst = entityStatusMeta[s.status];

  return (
    <GlassCard className="p-0 overflow-hidden">
      <div className="flex items-center gap-3 px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-2 flex-1 min-w-0 text-left">
          <ChevronDown className={cn("size-4 text-muted-foreground transition-transform", open && "rotate-180")} />
          <Layers className="size-4 text-violet shrink-0" />
          <div className="min-w-0">
            <p className="font-medium text-sm truncate">{s.name}</p>
            <p className="text-[11px] text-muted-foreground">{metaOptGoalMeta[s.optimizationGoal]} · {s.audiences.length} públicos · {s.geoTargets.length} locais · {formatMicros(s.costMicros)}</p>
          </div>
        </button>
        <button onClick={() => store.toggleSetStatus(account, campaign.id, s.id)} className={cn("inline-flex items-center text-xs rounded-md border px-2 py-1 hover:opacity-80", sst.cls)}>
          <span className={cn("size-1.5 rounded-full mr-1.5", sst.dot)} />{sst.label}
        </button>
        <button onClick={() => store.deleteAdSet(account, campaign.id, s.id)} title="Excluir conjunto" className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50">
          <Trash2 className="size-4" />
        </button>
      </div>

      {open && (
        <div className="border-t border-border p-4 space-y-5 bg-muted/20">
          {/* Otimização + orçamento ABO */}
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <p className="text-xs font-medium text-muted-foreground">Meta de otimização</p>
              <Select value={s.optimizationGoal} onValueChange={(v) => store.updateAdSet(account, campaign.id, s.id, { optimizationGoal: v as MetaOptimizationGoal })}>
                <SelectTrigger className="h-9 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{(Object.keys(metaOptGoalMeta) as MetaOptimizationGoal[]).map((o) => <SelectItem key={o} value={o}>{metaOptGoalMeta[o]}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {campaign.budgetMode === "ABO" && (
              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground">Orçamento do conjunto (R$/dia)</p>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">R$</span>
                  <Input type="number" min={0} value={Math.round(s.budgetDailyMicros / 1_000_000)} onChange={(e) => store.updateAdSet(account, campaign.id, s.id, { budgetDailyMicros: Math.max(0, Math.round(Number(e.target.value) * 1_000_000)) })} className="pl-9 h-9 bg-white" />
                </div>
              </div>
            )}
          </div>

          {/* Demografia */}
          <Section title="Demografia & dispositivos">
            <DemographicsEditor demo={s.demographics} onChange={(d) => store.updateDemographics(account, campaign.id, s.id, d)} />
          </Section>

          {/* Interesses */}
          <Section title="Interesses">
            <InterestEditor
              interests={s.interests}
              onAdd={(i) => store.addInterest(account, campaign.id, s.id, i)}
              onRemove={(i) => store.removeInterest(account, campaign.id, s.id, i)}
            />
          </Section>

          {/* Geolocalização (nível de conjunto no Meta) */}
          <Section title="Geolocalização">
            <GeoTargeting
              geos={s.geoTargets}
              onAdd={(kind, name) => store.addGeo(account, campaign.id, { kind, name }, s.id)}
              onRemove={(id) => store.removeGeo(account, campaign.id, id, s.id)}
              onToggle={(id) => store.toggleGeoExcluded(account, campaign.id, id, s.id)}
            />
          </Section>

          {/* Públicos */}
          <Section title="Públicos">
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <Input value={newAud} onChange={(e) => setNewAud(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newAud.trim()) { store.addAudience(account, campaign.id, s.id, newAud, newAudType); setNewAud(""); } }} placeholder="Novo público..." className="h-8 flex-1 min-w-[160px] bg-white" />
              <Select value={newAudType} onValueChange={(v) => setNewAudType(v as Audience["type"])}>
                <SelectTrigger className="w-36 h-8 bg-white"><SelectValue /></SelectTrigger>
                <SelectContent>{AUDIENCE_TYPES.map((t) => <SelectItem key={t} value={t}>{audienceTypeMeta[t].label}</SelectItem>)}</SelectContent>
              </Select>
              <Button size="sm" className="h-8 gap-1.5" onClick={() => { if (newAud.trim()) { store.addAudience(account, campaign.id, s.id, newAud, newAudType); setNewAud(""); } }}>
                <Plus className="size-4" /> Adicionar
              </Button>
            </div>
            <div className="rounded-lg border border-border overflow-hidden bg-white">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Público</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Tamanho</TableHead>
                    <TableHead className="w-10" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {s.audiences.map((a) => {
                    const at = audienceTypeMeta[a.type];
                    const ast = entityStatusMeta[a.status];
                    return (
                      <TableRow key={a.id}>
                        <TableCell className="font-medium text-sm">{a.name}</TableCell>
                        <TableCell><Badge variant="outline" className={at.cls}>{at.label}</Badge></TableCell>
                        <TableCell>
                          <button onClick={() => store.toggleAudience(account, campaign.id, s.id, a.id)} className={cn("inline-flex items-center text-xs rounded-md border px-2 py-1 hover:opacity-80", ast.cls)}>
                            <span className={cn("size-1.5 rounded-full mr-1.5", ast.dot)} />{ast.label}
                          </button>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-sm">{a.sizeEstimate ? formatCompact(a.sizeEstimate) : "—"}</TableCell>
                        <TableCell>
                          <button onClick={() => store.removeAudience(account, campaign.id, s.id, a.id)} className="size-7 rounded-md flex items-center justify-center text-muted-foreground hover:text-rose-600 hover:bg-rose-50" title="Remover"><Trash2 className="size-4" /></button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  {s.audiences.length === 0 && (
                    <TableRow className="hover:bg-transparent"><TableCell colSpan={5} className="text-center text-xs text-muted-foreground py-5">Sem públicos neste conjunto.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          </Section>

          {/* Anúncios */}
          <Section title="Anúncios">
            <AdsSection account={account} campaignId={campaign.id} parentId={s.id} ads={s.ads ?? []} />
          </Section>
        </div>
      )}
    </GlassCard>
  );
}

// ── Anúncios (criativos anexados ao grupo/conjunto) ─────────────────────────

function AdsSection({ account, campaignId, parentId, ads }: { account: AdAccount; campaignId: string; parentId: string; ads: Ad[] }) {
  const store = useManage();
  const [pickOpen, setPickOpen] = useState(false);

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between">
        <p className="text-[11px] text-muted-foreground">{ads.length} anúncio{ads.length === 1 ? "" : "s"}</p>
        <Button size="sm" variant="outline" className="h-8 gap-1.5" onClick={() => setPickOpen(true)}>
          <ImagePlus className="size-3.5" /> Adicionar criativo
        </Button>
      </div>

      {ads.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border py-4 text-center text-xs text-muted-foreground">
          Nenhum criativo anexado. Adicione um criativo da conta para veicular neste {account.platform === "GOOGLE_ADS" ? "grupo" : "conjunto"}.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
          {ads.map((ad) => {
            const ast = entityStatusMeta[ad.status];
            return (
              <div key={ad.id} className="group relative overflow-hidden rounded-lg border border-border bg-white">
                <div className="relative aspect-[4/3] overflow-hidden bg-muted/60">
                  <CreativeThumb kind={ad.creativeKind} src={ad.creativeSrc} tone={ad.thumbTone} title={ad.name} />
                  <button
                    onClick={() => store.removeAd(account, campaignId, parentId, ad.id)}
                    title="Remover anúncio"
                    className="absolute right-1 top-1 flex size-6 items-center justify-center rounded-md bg-black/55 text-white opacity-0 transition-opacity hover:bg-rose-600 group-hover:opacity-100"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
                <div className="flex items-center justify-between gap-1.5 p-2">
                  <p className="flex-1 truncate text-[11px] font-medium">{ad.name}</p>
                  <button
                    onClick={() => store.toggleAdStatus(account, campaignId, parentId, ad.id)}
                    className={cn("inline-flex shrink-0 items-center rounded border px-1.5 py-0.5 text-[10px] hover:opacity-80", ast.cls)}
                  >
                    <span className={cn("mr-1 size-1.5 rounded-full", ast.dot)} />
                    {ast.label}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <CreativePickerDialog
        open={pickOpen}
        onOpenChange={setPickOpen}
        account={account}
        onPick={(c) => store.attachCreative(account, campaignId, parentId, c)}
      />
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold text-foreground/70 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <Users className="size-3.5 text-violet/70" /> {title}
      </p>
      {children}
    </div>
  );
}

function Stat({ icon: Icon, label, value }: { icon: typeof Zap; label: string; value: string }) {
  return (
    <GlassCard className="p-4">
      <div className="flex items-center gap-2 text-muted-foreground text-xs"><Icon className="size-3.5" /><span>{label}</span></div>
      <p className="text-lg font-display font-bold mt-1.5 tracking-tight tabular-nums">{value}</p>
    </GlassCard>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium tabular-nums">{value}</span>
    </div>
  );
}
