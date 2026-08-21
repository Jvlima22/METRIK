import { useNavigate } from "@tanstack/react-router";
import { CreditCard, Settings2, UserRound } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { usePlan } from "@/lib/plan-context";
import { CompanySettingsModalContent } from "@/components/company-settings-modal-content";

export type QuickActionKind = "account" | "settings" | "subscription";

export function QuickActionModal({ kind, onClose }: { kind: QuickActionKind | null; onClose: () => void }) {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const { activeAccount } = useAccount();
  const { currentPlan } = usePlan();
  const open = Boolean(kind);
  const titles = { account: "Conta", settings: "Configurações", subscription: "Assinatura" } as const;
  const icons = { account: UserRound, settings: Settings2, subscription: CreditCard } as const;
  const Icon = kind ? icons[kind] : UserRound;
  const goTo = (to: "/company-settings" | "/subscriptions") => { onClose(); void navigate({ to }); };

  return <Dialog open={open} onOpenChange={(next) => !next && onClose()}><DialogContent className={kind === "settings" ? "max-w-5xl max-h-[92vh] overflow-y-auto rounded-2xl p-0" : "max-w-md rounded-2xl p-0"}><DialogHeader className="border-b border-border p-5"><div className="flex items-center gap-3"><div className="flex size-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="size-4" /></div><div><DialogTitle>{kind ? titles[kind] : ""}</DialogTitle><DialogDescription className="mt-1">{kind === "settings" ? "Gerencie os dados da empresa ativa, identidade visual e informações comerciais." : "Gerencie informações da sua conta Metrik."}</DialogDescription></div></div></DialogHeader>{kind === "account" && <div className="space-y-4 p-5"><div><p className="text-xs text-muted-foreground">E-mail</p><p className="mt-1 text-sm font-medium">{user?.email ?? "Não informado"}</p></div><div><p className="text-xs text-muted-foreground">Perfil de acesso</p><p className="mt-1 text-sm font-medium">{isAdmin ? "Administrador global" : "Membro da empresa"}</p></div><div><p className="text-xs text-muted-foreground">Conta ativa</p><p className="mt-1 text-sm font-medium">{activeAccount.name}</p></div><Button className="w-full" onClick={() => goTo("/company-settings")}>Abrir configurações completas</Button></div>}{kind === "settings" && <CompanySettingsModalContent onSaved={() => undefined} />}{kind === "subscription" && <div className="space-y-4 p-5"><div className="rounded-xl bg-accent/50 p-4"><p className="text-xs text-muted-foreground">Plano atual</p><p className="mt-1 text-lg font-semibold">{currentPlan ? currentPlan.charAt(0).toUpperCase() + currentPlan.slice(1) : "Nenhum plano ativo"}</p></div><p className="text-sm text-muted-foreground">Consulte os planos e gerencie a assinatura da empresa ativa.</p><Button className="w-full" onClick={() => goTo("/subscriptions")}>{currentPlan ? "Gerenciar assinatura" : "Escolher plano"}</Button></div>}</DialogContent></Dialog>;
}
