import { useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  Building2,
  CreditCard,
  FileText,
  HelpCircle,
  LogOut,
  Network,
  Settings2,
  ShieldCheck,
  UserPlus,
  UserRound,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { cn } from "@/lib/utils";
import type { QuickActionKind } from "@/components/quick-action-modal";

type ProfileNavigationDropdownProps = {
  collapsed: boolean;
  displayName: string;
  avatarUrl?: string | null;
  onInviteMember?: () => void;
  onInviteCompany?: () => void;
  onOpenModal?: (kind: QuickActionKind) => void;
};

function MenuRow({ icon: Icon, children, onSelect, destructive = false }: { icon: typeof UserRound; children: ReactNode; onSelect: () => void; destructive?: boolean }) {
  return (
    <DropdownMenuItem onSelect={onSelect} className={cn("gap-3 rounded-lg px-2.5 py-2.5 text-sm", destructive && "text-rose-600 focus:text-rose-600")}>
      <Icon className="size-4 shrink-0" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </DropdownMenuItem>
  );
}

export function ProfileNavigationSheet({ collapsed, displayName, avatarUrl, onInviteMember, onInviteCompany, onOpenModal }: ProfileNavigationDropdownProps) {
  const navigate = useNavigate();
  const { user, isAdmin, signOut } = useAuth();
  const { activeCompanyId } = useAccount();
  const { currentPlan } = usePlan();
  const planLabel = currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : "Nenhum plano ativo";
  const initials = displayName.slice(0, 2).toUpperCase();
  const go = (to: string) => void navigate({ to });

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button type="button" className={cn("flex items-center rounded-xl bg-accent/60 text-left transition-colors hover:bg-accent", collapsed ? "mx-auto size-9 justify-center" : "m-3 w-[calc(100%-1.5rem)] gap-2.5 p-3")} aria-label="Abrir perfil e opções">
          {avatarUrl ? <img src={avatarUrl} alt={`Logo da ${displayName}`} className="size-8 shrink-0 rounded-lg object-contain" /> : <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-[10px] font-bold text-white">{initials}</div>}
          {!collapsed && <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-[10px] text-muted-foreground">{user?.email ?? "Conta Metrik"}</span>
          </span>}
          {!collapsed && <span className="shrink-0 text-[10px] text-muted-foreground">{isAdmin ? "Admin" : "Conta"}</span>}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="w-72 rounded-2xl p-2">
        <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2.5">
          {avatarUrl ? <img src={avatarUrl} alt={`Logo da ${displayName}`} className="size-9 rounded-lg object-contain" /> : <div className="flex size-9 items-center justify-center rounded-lg bg-gradient-to-br from-violet-600 to-cyan-500 text-xs font-bold text-white">{initials}</div>}
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold text-foreground">{displayName}</span>
            <span className="block truncate text-[10px] font-normal text-muted-foreground">{user?.email ?? "Conta Metrik"}</span>
          </span>
        </DropdownMenuLabel>

        <div className="mx-1 mb-1 flex items-center gap-2 rounded-xl bg-accent/60 px-2.5 py-2">
          <CreditCard className="size-4 text-violet-600" />
          <span className="min-w-0 flex-1">
            <span className="block text-xs font-semibold text-foreground">{planLabel}</span>
            <span className="block text-[10px] text-muted-foreground">Assinatura Metrik</span>
          </span>
          <button type="button" onClick={() => onOpenModal ? onOpenModal("subscription") : go("/subscriptions")} className="rounded-md bg-foreground px-2 py-1 text-[10px] font-semibold text-background hover:opacity-90">{currentPlan ? "Gerenciar" : "Escolher"}</button>
        </div>

        <DropdownMenuSeparator />
        <MenuRow icon={UserRound} onSelect={() => onOpenModal ? onOpenModal("account") : go("/company-settings")}>Conta</MenuRow>
        <MenuRow icon={Settings2} onSelect={() => onOpenModal ? onOpenModal("settings") : go("/company-settings")}>Configurações</MenuRow>
        <MenuRow icon={Network} onSelect={() => onOpenModal ? onOpenModal("hub") : go("/hub")}>Hub de integrações</MenuRow>

        {(onInviteMember || onInviteCompany) && <>
          <DropdownMenuSeparator />
          {onInviteMember && <MenuRow icon={UserPlus} onSelect={onInviteMember}>Convidar membro</MenuRow>}
          {isAdmin && onInviteCompany && <MenuRow icon={Building2} onSelect={onInviteCompany}>Convidar empresa</MenuRow>}
        </>}

        <DropdownMenuSeparator />
        <MenuRow icon={ShieldCheck} onSelect={() => go("/compliance")}>Compliance</MenuRow>

        <DropdownMenuSeparator />
        <MenuRow icon={HelpCircle} onSelect={() => go("/help")}>Obter ajuda</MenuRow>
        <MenuRow icon={FileText} onSelect={() => go("/documents")}>Documentos</MenuRow>
        <MenuRow icon={LogOut} onSelect={() => void signOut()} destructive>Sair</MenuRow>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

