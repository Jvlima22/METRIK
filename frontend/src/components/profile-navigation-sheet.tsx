import { useNavigate } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  ChevronRight,
  CreditCard,
  FileText,
  HelpCircle,
  Home,
  LogOut,
  Megaphone,
  Settings2,
  ShieldCheck,
  Sparkles,
  UserRound,
  Users,
  UserPlus,
  Workflow,
} from "lucide-react";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { platformMeta } from "@/lib/accounts";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ProfileNavigationSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInviteMember?: () => void;
  onInviteCompany?: () => void;
};

type NavItem = {
  label: string;
  description?: string;
  icon: typeof UserRound;
  to: string;
};

function Section({ title, items, onNavigate }: { title: string; items: NavItem[]; onNavigate: (to: string) => void }) {
  return (
    <section className="border-t border-border px-4 py-3">
      <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">{title}</p>
      <div className="space-y-0.5">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <button key={item.label} type="button" onClick={() => onNavigate(item.to)} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-accent">
              <Icon className="size-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-foreground">{item.label}</span>
                {item.description && <span className="block truncate text-[10px] text-muted-foreground">{item.description}</span>}
              </span>
              <ChevronRight className="size-3.5 shrink-0 text-muted-foreground/70" />
            </button>
          );
        })}
      </div>
    </section>
  );
}

export function ProfileNavigationSheet({ open, onOpenChange, onInviteMember, onInviteCompany }: ProfileNavigationSheetProps) {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { activeAccount, activeCompanyId } = useAccount();
  const { currentPlan } = usePlan();
  const displayName = activeAccount.companyName ?? activeAccount.name ?? user?.email?.split("@")[0] ?? "Minha conta";
  const avatarUrl = activeAccount.logoUrl;
  const planLabel = currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : "Nenhum plano ativo";

  const go = (to: string) => {
    onOpenChange(false);
    void navigate({ to });
  };

  const accountItems: NavItem[] = [
    { label: "Meu perfil", description: user?.email ?? "Dados da conta", icon: UserRound, to: "/company-settings" },
    { label: "Segurança e acesso", description: "Sessão e autenticação", icon: ShieldCheck, to: "/company-settings" },
    { label: "Notificações", description: "Alertas e atividades", icon: Bell, to: "/dashboard" },
  ];

  const companyItems: NavItem[] = [
    { label: "Configuração", description: "Dados, logo e identidade", icon: Settings2, to: "/company-settings" },
    { label: "Membros e permissões", description: "Equipe da empresa ativa", icon: Users, to: "/dashboard" },
  ];

  const workspaceItems: NavItem[] = [
    { label: "Métricas", description: "Visão geral da performance", icon: Home, to: "/dashboard" },
    { label: "Campanhas", description: "Campanhas e contas de anúncios", icon: Megaphone, to: "/campaigns" },
    { label: "Criativos", description: "Biblioteca de criativos", icon: Sparkles, to: "/creatives" },
    { label: "Violações", description: "Políticas e compliance", icon: ShieldCheck, to: "/violations" },
    { label: "Jobs", description: "Sincronizações e tarefas", icon: Workflow, to: "/jobs" },
    { label: "Inteligência de Ads", description: "Análises e sugestões da IA", icon: Sparkles, to: "/ai-ads" },
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="left" className="w-full max-w-sm overflow-y-auto bg-white/95 p-0 backdrop-blur-xl">
        <div className="flex items-start gap-3 border-b border-border p-4 pr-12">
          {avatarUrl ? <img src={avatarUrl} alt={`Logo da ${displayName}`} className="size-11 shrink-0 rounded-xl object-contain" /> : <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-cyan-500 text-sm font-bold text-white">{displayName.slice(0, 2).toUpperCase()}</div>}
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-foreground">{displayName}</p>
            <p className="truncate text-xs text-muted-foreground">{user?.email ?? "Conta Metrik"}</p>
            <p className="mt-1 text-[10px] font-medium uppercase tracking-wider text-violet-600">{isAdmin ? "Administrador global" : "Equipe da empresa"}</p>
          </div>
        </div>

        <section className="px-4 py-3">
          <div className="flex items-center gap-3 rounded-2xl border border-violet-200 bg-gradient-to-r from-violet-50 to-cyan-50 p-3">
            <CreditCard className="size-5 text-violet-600" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold text-foreground">Assinatura</p>
              <p className="truncate text-[11px] text-muted-foreground">{planLabel}</p>
            </div>
            <Button type="button" size="sm" variant="outline" className="h-8 rounded-lg px-2.5 text-xs" onClick={() => go("/subscriptions")}>{currentPlan ? "Gerenciar" : "Escolher plano"}</Button>
          </div>
        </section>

        <Section title="Conta" items={accountItems} onNavigate={go} />
        <section className="border-t border-border px-4 py-3">
          <p className="mb-1 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Ações rápidas</p>
          <div className="space-y-0.5">
            {onInviteMember && <button type="button" onClick={() => { onOpenChange(false); onInviteMember(); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-accent"><UserPlus className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1 text-sm font-medium">Convidar membro</span><ChevronRight className="size-3.5 text-muted-foreground/70" /></button>}
            {isAdmin && onInviteCompany && <button type="button" onClick={() => { onOpenChange(false); onInviteCompany(); }} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left transition-colors hover:bg-accent"><Building2 className="size-4 shrink-0 text-muted-foreground" /><span className="flex-1 text-sm font-medium">Convidar empresa</span><ChevronRight className="size-3.5 text-muted-foreground/70" /></button>}
          </div>
        </section>
        <Section title="Empresa ativa" items={companyItems} onNavigate={go} />
        <Section title="Workspace" items={workspaceItems} onNavigate={go} />

        <Section title="Ads e integrações" items={[
          { label: "Google Ads", description: platformMeta.GOOGLE_ADS.label, icon: Megaphone, to: "/integrations" },
          { label: "Meta Ads", description: platformMeta.META_ADS.label, icon: Megaphone, to: "/integrations" },
          { label: "Hub de integrações", description: "IA, CRM e APIs", icon: Workflow, to: "/integrations" },
        ]} onNavigate={go} />

        {isAdmin && <Section title="Administração global" items={[
          { label: "Empresas clientes", description: "Empresas reais e demonstrativas", icon: Building2, to: "/dashboard" },
          { label: "Monitoramento global", description: "Contas, conexões e sincronizações", icon: Workflow, to: "/dashboard" },
          { label: "Configurações administrativas", description: activeCompanyId ? "Empresa ativa selecionada" : "Configuração global", icon: Settings2, to: "/company-settings" },
        ]} onNavigate={go} />}

        <Section title="Ajuda e recursos" items={[
          { label: "Página inicial", icon: Home, to: "/dashboard" },
          { label: "Central de ajuda", icon: HelpCircle, to: "/dashboard" },
          { label: "Documentação", icon: FileText, to: "/dashboard" },
        ]} onNavigate={go} />

        <div className="border-t border-border p-4">
          <button type="button" onClick={() => void signOut()} className="flex w-full items-center gap-3 rounded-xl px-2.5 py-2.5 text-left text-sm font-medium text-rose-600 transition-colors hover:bg-rose-50">
            <LogOut className="size-4" />
            Sair
          </button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function ProfileSheetTrigger({ collapsed, onClick, displayName, avatarUrl }: { collapsed: boolean; onClick: () => void; displayName: string; avatarUrl?: string | null }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex w-full items-center rounded-xl bg-accent/60 text-left transition-colors hover:bg-accent", collapsed ? "mx-auto size-9 justify-center" : "m-3 gap-2.5 p-3")} aria-label="Abrir perfil e navegação">
      {avatarUrl ? <img src={avatarUrl} alt={`Logo da ${displayName}`} className="size-8 shrink-0 rounded-lg object-contain" /> : <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-[10px] font-bold text-white">{displayName.slice(0, 2).toUpperCase()}</div>}
      {!collapsed && <span className="min-w-0 flex-1 truncate text-xs font-semibold text-foreground">{displayName}</span>}
      {!collapsed && <ChevronRight className="size-3.5 shrink-0 text-muted-foreground" />}
    </button>
  );
}
