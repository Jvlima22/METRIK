import { useEffect, useState } from "react";
import { Building2, CircleHelp, LockKeyhole, SlidersHorizontal, UserRound } from "lucide-react";
import { useAccount } from "@/lib/account-context";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";
import { CompanySettingsModalContent } from "@/components/company-settings-modal-content";
import { PasswordSecuritySection } from "@/components/password-security-section";

type SettingsSection = "general" | "account" | "security" | "company";
type CompanySummary = { id: string; name?: string | null; trade_name?: string | null };

const sections: Array<{ id: SettingsSection; label: string; description: string; icon: typeof SlidersHorizontal }> = [
  { id: "general", label: "Geral", description: "Preferências da interface", icon: SlidersHorizontal },
  { id: "account", label: "Conta", description: "Perfil e acesso", icon: UserRound },
  { id: "security", label: "Segurança", description: "Senha e proteção", icon: LockKeyhole },
  { id: "company", label: "Empresa", description: "Dados e identidade visual", icon: Building2 },
];

function readPreference<T extends string>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return (value as T | null) ?? fallback;
}

export function SettingsModalContent() {
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");
  const [browserNotifications, setBrowserNotifications] = useState(() => readPreference("metrik:browser-notifications", "true") === "true");
  const [compactDensity, setCompactDensity] = useState(() => readPreference<string>("metrik:compact-density", "false") === "true");
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [notificationMessage, setNotificationMessage] = useState<string | null>(null);
  const { user, isAdmin } = useAuth();
  const { activeAccount, activeCompanyId } = useAccount();
  const active = sections.find((section) => section.id === activeSection) ?? sections[0];

  useEffect(() => {
    window.localStorage.setItem("metrik:browser-notifications", String(browserNotifications));
  }, [browserNotifications]);

  useEffect(() => {
    window.localStorage.setItem("metrik:compact-density", String(compactDensity));
    document.documentElement.classList.toggle("density-compact", compactDensity);
    return () => document.documentElement.classList.remove("density-compact");
  }, [compactDensity]);

  async function handleBrowserNotifications(value: boolean) {
    setNotificationMessage(null);
    if (!value) {
      setBrowserNotifications(false);
      return;
    }
    if (!("Notification" in window)) {
      setBrowserNotifications(false);
      setNotificationMessage("Seu navegador não oferece notificações.");
      return;
    }
    const permission = Notification.permission === "default" ? await Notification.requestPermission() : Notification.permission;
    const granted = permission === "granted";
    setBrowserNotifications(granted);
    setNotificationMessage(granted ? "Notificações ativadas neste navegador." : "Permissão de notificações recusada pelo navegador.");
  }

  useEffect(() => {
    let cancelled = false;
    setCompanyName(null);
    void apiFetch<{ data: CompanySummary }>("/company-profile")
      .then((response) => {
        if (!cancelled) setCompanyName(response.data?.trade_name || response.data?.name || null);
      })
      .catch(() => {
        // Para contas mock do admin, o fallback abaixo usa o companyName do seletor.
      });
    return () => { cancelled = true; };
  }, [activeCompanyId]);

  const selectedCompanyName = companyName || activeAccount.companyName || (activeCompanyId ? "Empresa ativa" : activeAccount.name);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-white md:flex-row">
      <aside className="w-full shrink-0 border-b border-slate-200 bg-slate-50/70 p-3 md:w-56 md:border-b-0 md:border-r md:p-4">
        <div className="mb-4 px-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-slate-400">Configurações</div>
        <nav className="grid gap-1 sm:grid-cols-2 md:grid-cols-1">
          {sections.map((section) => {
            const Icon = section.icon;
            const selected = section.id === activeSection;
            return <button key={section.id} type="button" onClick={() => setActiveSection(section.id)} className={`flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition ${selected ? "bg-white text-slate-900 shadow-sm ring-1 ring-slate-200" : "text-slate-500 hover:bg-white/80 hover:text-slate-900"}`}><Icon className={`size-4 shrink-0 ${selected ? "text-violet-600" : "text-slate-400"}`} /><span className="min-w-0"><span className="block text-xs font-semibold">{section.label}</span><span className="hidden truncate text-[10px] text-slate-400 md:block">{section.description}</span></span></button>;
          })}
        </nav>
        <div className="mt-5 hidden rounded-xl border border-slate-200 bg-white p-3 md:block"><CircleHelp className="size-4 text-slate-400" /><p className="mt-2 text-[11px] font-medium text-slate-700">Precisa de ajuda?</p><p className="mt-1 text-[10px] leading-relaxed text-slate-400">Acesse a central de ajuda pelo menu do perfil.</p></div>
      </aside>

      <main className="min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain bg-white">
        <div className="border-b border-slate-200 px-5 py-5 sm:px-8"><p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-violet-600">{active.label}</p><h2 className="mt-1 text-xl font-semibold text-slate-900">{active.label}</h2><p className="mt-1 text-xs text-slate-500">{active.description}</p></div>

        {activeSection === "general" && <div className="space-y-5 p-5 sm:p-8">
          <section className="rounded-2xl border border-slate-200 p-5"><h3 className="text-sm font-semibold text-slate-900">Preferências de experiência</h3><p className="mt-1 text-xs text-slate-500">Ajuste como você recebe informações e navega pela plataforma.</p><PreferenceRow label="Notificações do navegador" description="Receba avisos quando houver uma atualização importante." checked={browserNotifications} onChange={(value) => void handleBrowserNotifications(value)} />{notificationMessage && <p className="mt-3 text-[11px] text-slate-500">{notificationMessage}</p>}<PreferenceRow label="Densidade compacta" description="Use mais informações na mesma área da tela." checked={compactDensity} onChange={setCompactDensity} /></section>
          <section className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5"><p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">Contexto ativo</p><h3 className="mt-1 text-base font-semibold text-slate-900">{selectedCompanyName}</h3><p className="mt-1 text-xs text-slate-500">As métricas, integrações e configurações exibidas respeitam esta empresa.</p></section>
        </div>}

        {activeSection === "account" && <div className="space-y-4 p-5 sm:p-8"><section className="rounded-2xl border border-slate-200 p-5"><div className="flex items-start gap-3"><div className="flex size-10 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><UserRound className="size-5" /></div><div><h3 className="text-sm font-semibold text-slate-900">Dados da conta</h3><p className="mt-1 text-xs text-slate-500">Informações do usuário autenticado no Metrik.</p></div></div><div className="mt-5 grid gap-4 sm:grid-cols-2"><div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">E-mail</p><p className="mt-1 text-sm font-medium text-slate-900">{user?.email ?? "Não informado"}</p></div><div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Perfil de acesso</p><p className="mt-1 text-sm font-medium text-slate-900">{isAdmin ? "Administrador global" : "Membro da empresa"}</p></div><div><p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">Empresa ativa</p><p className="mt-1 text-sm font-medium text-slate-900">{selectedCompanyName}</p></div></div></section></div>}
        {activeSection === "security" && <div className="space-y-4 p-5 sm:p-8"><PasswordSecuritySection /></div>}
        {activeSection === "company" && <CompanySettingsModalContent onSaved={() => undefined} />}
      </main>
    </div>
  );
}


function PreferenceRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (value: boolean) => void }) {
  return <div className="mt-4 flex items-center justify-between gap-4 border-t border-slate-100 pt-4"><div><p className="text-xs font-medium text-slate-800">{label}</p><p className="mt-1 text-[11px] text-slate-500">{description}</p></div><button type="button" aria-pressed={checked} onClick={() => onChange(!checked)} className={`relative h-5 w-9 shrink-0 rounded-full transition ${checked ? "bg-[#4B97DB]" : "bg-slate-300"}`}><span className={`absolute top-0.5 size-4 rounded-full bg-white shadow transition ${checked ? "left-[18px]" : "left-0.5"}`} /></button></div>;
}
