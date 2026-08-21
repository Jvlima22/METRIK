import { Link, useRouterState, useNavigate, type LinkProps } from "@tanstack/react-router";
import {
  BarChart3,
  ShieldAlert,
  Activity,
  Megaphone,
  Images,
  CreditCard,
  Building2,
  Search,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
  Loader2,
  LogOut,
  UserPlus,
  Settings2,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { ActivityFeedPanel } from "@/components/activity-feed-panel";
import { ProfileNavigationSheet } from "@/components/profile-navigation-sheet";

import { AccountSwitcher } from "@/components/account-switcher";
import { useAccount } from "@/lib/account-context";
import { CompanyFirstAccessOnboarding } from "@/components/company-first-access-onboarding";
import { MobileAccountSwitcher } from "@/components/mobile-account-switcher";
import { Tooltip, TooltipTrigger, TooltipContent } from "@/components/ui/tooltip";

const FRONTEND_URL = (import.meta.env.VITE_FRONTEND_URL as string | undefined) ?? "https://metrik-ai.vercel.app";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { InviteUserDialog } from "@/components/invite-user-dialog";
import { activityFeed } from "@/lib/activity";
import { useAuth } from "@/lib/auth-context";
import { toast } from "sonner";

function initialsFrom(name: string | undefined, email: string | null): string {
  const source = name?.trim() || email?.split("@")[0] || "";
  const parts = source.split(/[\s._-]+/).filter(Boolean);
  if (!parts.length) return "FA";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

type NavItem = { to: LinkProps["to"]; label: string; icon: LucideIcon; adminOnly?: boolean };

const navSections: { group: string; items: NavItem[] }[] = [
  {
    group: "Workspace",
    items: [
      { to: "/dashboard", label: "Métricas", icon: BarChart3 },
      { to: "/violations", label: "Violações", icon: ShieldAlert },
      { to: "/jobs", label: "Jobs", icon: Activity },
    ],
  },
  {
    group: "Gestão",
    items: [
      { to: "/manage", label: "Campanhas", icon: Megaphone },
      { to: "/creatives", label: "Criativos", icon: Images },
      { to: "/ai-ads", label: "Inteligencia de Ads", icon: Activity },
    ],
  },
  {
    group: "Conta",
    items: [
      { to: "/subscriptions", label: "Assinaturas", icon: CreditCard },
      { to: "/company-settings", label: "Configuração", icon: Settings2 },
    ],
  },
];

const navItems: NavItem[] = navSections.flatMap((s) => s.items);

const SIDEBAR_KEY = "fury:sidebar";

function NavLink({ item, active, collapsed }: { item: NavItem; active: boolean; collapsed: boolean }) {
  const link = (
    <Link
      to={item.to}
      className={cn(
        "flex items-center rounded-lg text-sm transition-colors",
        collapsed ? "justify-center p-2.5" : "gap-3 px-3 py-2",
        active
          ? "bg-foreground text-background"
          : "text-foreground/70 hover:bg-accent hover:text-foreground",
      )}
      aria-label={item.label}
    >
      <item.icon className="size-4 shrink-0" />
      {!collapsed && <span>{item.label}</span>}
    </Link>
  );

  if (!collapsed) return link;
  return (
    <Tooltip>
      <TooltipTrigger asChild>{link}</TooltipTrigger>
      <TooltipContent side="right">{item.label}</TooltipContent>
    </Tooltip>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, loading, isAuthenticated, isConfigured, isAdmin, signOut } = useAuth();
    const [feedOpen, setFeedOpen] = useState(false);

  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteMode, setInviteMode] = useState<'COMPANY' | 'MEMBER'>('MEMBER');
  const [collapsed, setCollapsed] = useState(false);
  const { activeAccount, activeCompanyId } = useAccount();
  const [activeCompanyLogo, setActiveCompanyLogo] = useState<string | null>(null);
  const unread = isAdmin && activeAccount.companyId?.startsWith('mock-') === true ? activityFeed.filter((e) => e.kind === "violation" || e.kind === "auto_pause").length : 0;

  useEffect(() => {
    if (!activeCompanyId) {
      setActiveCompanyLogo(null);
      return;
    }
    let cancelled = false;
    const cacheKey = `metrik:company-logo:${activeCompanyId}`;
    let cachedLogo: string | null = null;
    try {
      cachedLogo = localStorage.getItem(cacheKey);
      if (!cancelled) setActiveCompanyLogo(cachedLogo);
    } catch {
      /* cache opcional */
    }
    void apiFetch<{ data?: { logo_url?: string | null } }>("/company-profile")
      .then(({ data }) => {
        if (cancelled) return;
        const logoUrl = data?.logo_url ?? null;
        setActiveCompanyLogo(logoUrl);
        try {
          if (logoUrl) localStorage.setItem(cacheKey, logoUrl);
          else localStorage.removeItem(cacheKey);
        } catch {
          /* cache opcional */
        }
      })
      .catch(() => {
        if (!cancelled && !cachedLogo) setActiveCompanyLogo(null);
      });
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  // Gate: sem sessão, manda pro login. Quando o Supabase não está configurado
  // deixamos o app abrir (modo demo) para não travar o desenvolvimento.
  useEffect(() => {
    if (isConfigured && !loading && !isAuthenticated) {
      navigate({ to: "/login" });
    }
  }, [isConfigured, loading, isAuthenticated, navigate]);

  // Restore the persisted collapse state after mount (SSR-safe).
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(SIDEBAR_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  async function handleSignOut() {
    await signOut();
    navigate({ to: "/login" });
  }

  // Evita piscar o conteúdo protegido enquanto a sessão resolve / redireciona.
  // (depois de TODOS os hooks — mover acima quebra as Rules of Hooks)
  if (isConfigured && (loading || !isAuthenticated)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const displayName =
    (user?.user_metadata?.name as string | undefined) || user?.email?.split("@")[0] || "Conta";

  function toggleCollapsed() {
    setCollapsed((c) => {
      const next = !c;
      try {
        localStorage.setItem(SIDEBAR_KEY, next ? "1" : "0");
      } catch {
        /* ignore */
      }
      return next;
    });
  }

  return (
    <div className="min-h-screen flex w-full">
      <aside
        className={cn(
          "hidden md:flex flex-col border-r border-border bg-white/60 backdrop-blur-sm transition-[width] duration-200 ease-out",
          "sticky top-0 h-screen self-start shrink-0 overflow-y-auto",
          collapsed ? "w-16" : "w-60",
        )}
      >
        {/* Brand */}
        <div className={cn("flex items-center gap-3 p-5", collapsed && "justify-center px-0")}>
          {collapsed ? (
            <a href={FRONTEND_URL} aria-label="Ir para o frontend do Metrik" className="rounded-lg transition-opacity hover:opacity-75">
              <img src="/logo-ilustration.png" alt="Metrik" className="size-9 object-contain shrink-0" />
            </a>
          ) : (
            <div className="flex flex-col gap-1">
              <a href={FRONTEND_URL} aria-label="Ir para o frontend do Metrik" className="inline-flex rounded-lg transition-opacity hover:opacity-75">
                <img src="/logo-METRIK.png" alt="Metrik" className="h-7 w-auto object-contain" />
              </a>
              <p className="text-[11px] text-muted-foreground">Control Center</p>
            </div>
          )}
        </div>

        {/* Account switcher */}
        <div className={cn("px-3", collapsed && "px-2")}>
          <AccountSwitcher collapsed={collapsed} />
        </div>

        {/* Nav */}
        <nav className="p-3 flex-1 space-y-4">
          {navSections.map((section) => (
            <div key={section.group}>
              {!collapsed && (
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold px-3 mb-2">
                  {section.group}
                </p>
              )}
              <ul className="flex flex-col gap-0.5">
                {section.items.filter((item) => !item.adminOnly || isAdmin).map((item) => (
                  <li key={item.to}>
                    <NavLink item={item} active={pathname.startsWith(item.to ?? "")} collapsed={collapsed} />
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <ProfileNavigationSheet
          collapsed={collapsed}
          displayName={activeAccount.companyName ?? activeAccount.name ?? user?.email?.split("@")[0] ?? "Minha conta"}
          avatarUrl={activeCompanyLogo ?? activeAccount.logoUrl}
          onInviteMember={isAdmin || Boolean(activeCompanyId) ? () => { setInviteMode('MEMBER'); setInviteOpen(true); } : undefined}
          onInviteCompany={isAdmin ? () => { setInviteMode('COMPANY'); setInviteOpen(true); } : undefined}
        />

        {/* Collapse toggle */}
        <button
          onClick={toggleCollapsed}
          className={cn(
            "m-3 mt-0 flex h-9 items-center rounded-lg border border-border text-muted-foreground hover:bg-accent hover:text-foreground transition-colors",
            collapsed ? "justify-center" : "justify-start px-3 gap-2",
          )}
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
        >
          {collapsed ? (
            <PanelLeftOpen className="size-4" />
          ) : (
            <>
              <PanelLeftClose className="size-4" />
              <span className="text-xs">Recolher</span>
            </>
          )}
        </button>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border bg-white/70 backdrop-blur-md flex items-center px-4 md:px-6 gap-3 sticky top-0 z-30">
          <div className="md:hidden flex items-center gap-2 flex-1 min-w-0">
            <img src="/logo-ilustration.png" alt="Metrik" className="h-7 w-auto object-contain shrink-0" />
            <MobileAccountSwitcher />
          </div>
          <div className="hidden md:flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <input
                placeholder="Buscar campanhas, anúncios, jobs..."
                className="w-full h-9 pl-9 pr-3 rounded-lg bg-accent/60 border border-transparent focus:border-border focus:bg-white text-sm outline-none transition-colors"
              />
            </div>
          </div>
          <button
            onClick={() => setFeedOpen(true)}
            className="relative size-9 rounded-lg hover:bg-accent flex items-center justify-center text-foreground/70"
            aria-label="Abrir feed de atividade"
          >
            <Bell className="size-4" />
            {unread > 0 && (
              <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-rose-500 ring-2 ring-white animate-pulse" />
            )}
          </button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                className="size-8 overflow-hidden rounded-full bg-foreground text-background flex items-center justify-center text-xs font-semibold hover:opacity-90 transition-opacity"
                aria-label="Menu da conta"
              >
                {activeCompanyLogo ? <img src={activeCompanyLogo} alt="Logo da empresa ativa" className="size-full object-contain bg-white" /> : initialsFrom(user?.user_metadata?.name as string | undefined, user?.email ?? null)}
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel className="flex flex-col gap-0.5">
                <span className="text-sm font-medium">{displayName}</span>
                {user?.email && (
                  <span className="text-xs font-normal text-muted-foreground">{user.email}</span>
                )}
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {isAdmin && (
                <DropdownMenuItem onClick={() => { setInviteMode('COMPANY'); setInviteOpen(true); }}>
                  <Building2 className="size-4" />
                  Convidar empresa
                </DropdownMenuItem>
              )}
              {(isAdmin || activeCompanyId) && (
                <>
                  <DropdownMenuItem onClick={() => { setInviteMode('MEMBER'); setInviteOpen(true); }}>
                    <UserPlus className="size-4" />
                    Convidar membro
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => {
                    if (!activeCompanyId) {
                      toast.info('Selecione uma empresa', { description: 'Escolha uma empresa no seletor lateral para abrir suas configurações.' });
                      return;
                    }
                    navigate({ to: "/company-settings" });
                  }}>
                    <Settings2 className="size-4" />
                    Configurações
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                </>
              )}
              <DropdownMenuItem onClick={handleSignOut} className="text-destructive focus:text-destructive">
                <LogOut className="size-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        {/* Mobile nav */}
        <div className="md:hidden border-b border-border bg-white px-3 py-2 flex gap-1 overflow-x-auto">
          {navItems.map((item) => {
            const active = pathname.startsWith(item.to ?? "");
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs whitespace-nowrap",
                  active ? "bg-foreground text-background" : "text-foreground/70 hover:bg-accent",
                )}
              >
                <item.icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </div>

        <main className="flex-1 p-4 md:p-8 max-w-[1500px] mx-auto w-full">{children}</main>
        <CompanyFirstAccessOnboarding />
      </div>
      <ActivityFeedPanel open={feedOpen} onClose={() => setFeedOpen(false)} />
      {(isAdmin || Boolean(activeCompanyId)) && <InviteUserDialog open={inviteOpen} onOpenChange={setInviteOpen} mode={inviteMode} initialCompanyId={activeCompanyId} />}
    </div>
  );
}
