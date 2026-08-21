import { useNavigate } from "@tanstack/react-router";
import { CreditCard, Network, Settings2, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { SettingsModalContent } from "@/components/settings-modal-content";
import { SubscriptionsModalContent } from "@/components/subscriptions-modal-content";
import { HubTab } from "@/routes/ai-ads";

export type QuickActionKind = "account" | "settings" | "subscription" | "hub";

export function QuickActionModal({ kind, onClose }: { kind: QuickActionKind | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { activeAccount } = useAccount();
  const { currentPlan } = usePlan();
  const open = Boolean(kind);
  const titles = { account: "Conta", settings: "Configurações", subscription: "Assinatura", hub: "Hub de integrações" } as const;
  const icons = { account: UserRound, settings: Settings2, subscription: CreditCard, hub: Network } as const;
  const Icon = kind ? icons[kind] : UserRound;
  const goTo = (to: "/company-settings" | "/subscriptions") => { onClose(); void navigate({ to }); };

  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent className={kind === "settings" || kind === "subscription" || kind === "hub" ? `max-w-6xl max-h-[92vh] rounded-2xl p-0 ${kind === "settings" ? "overflow-hidden" : "overflow-y-auto"}` : "max-w-md rounded-2xl p-0"}><DialogHeader className="border-b border-border p-5"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="size-4" /></div><div><DialogTitle>{kind ? titles[kind] : ""}</DialogTitle><DialogDescription className="mt-1">{kind === "settings" ? "Gerencie os dados da empresa ativa, identidade visual e informações comerciais." : "Gerencie informações da sua conta Metrik."}</DialogDescription></div></div></DialogHeader>{kind === "account" && <div className="space-y-4 p-5"><div><p className="text-xs text-muted-foreground">E-mail</p><p className="mt-1 text-sm font-medium">{user?.email ?? "Não informado"}</p></div><div><p className="text-xs text-muted-foreground">Perfil de acesso</p><p className="mt-1 text-sm font-medium">{isAdmin ? "Administrador global" : "Membro da empresa"}</p></div><div><p className="text-xs text-muted-foreground">Conta ativa</p><p className="mt-1 text-sm font-medium">{activeAccount.name}</p></div><Button className="w-full" onClick={() => goTo("/company-settings")}>Abrir configurações completas</Button></div>}{kind === "settings" && <SettingsModalContent />}{kind === "subscription" && <SubscriptionsModalContent />}{kind === "hub" && <div className="p-5"><HubTab /></div>}</DialogContent></Dialog>;
}
