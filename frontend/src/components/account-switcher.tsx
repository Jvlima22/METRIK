import { useEffect, useState } from "react";
import { Check, ChevronsUpDown, Plus, Settings2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuGroup,
} from "@/components/ui/dropdown-menu";
import { PlatformBadge } from "@/components/platform-badge";
import { AddAccountDialog } from "@/components/add-account-dialog";
import { ManageAccountsDialog } from "@/components/manage-accounts-dialog";
import { useAccount } from "@/lib/account-context";
import { platformMeta, statusMeta, type AccountPlatform } from "@/lib/accounts";
import { cn } from "@/lib/utils";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/lib/auth-context";

const PLATFORM_ORDER: AccountPlatform[] = ["GOOGLE_ADS", "META_ADS"];
type Company = { id: string; name: string; status: string; document?: string | null; logo_url?: string | null };

const MOCK_COMPANIES: Company[] = [
  { id: "mock-lumen", name: "Lumen Store — Brasil", status: "DEMO", document: "864-652-2223" },
  { id: "mock-atlas", name: "Atlas Travel", status: "DEMO", document: "412-908-1170" },
  { id: "mock-vintech", name: "Vintech", status: "DEMO", document: "738-204-9961", logo_url: "/vintech-logo.png" },
  { id: "mock-aura", name: "Aura Cosmetics", status: "DEMO", document: "act_1029384756" },
  { id: "mock-tgl", name: "TGL Solutions — Demo", status: "DEMO", document: "905-417-2230" },
];

/**
 * Account switcher shown under the Metrik logo in the sidebar. Lists the
 * connected accounts grouped by platform, plus shortcuts to add / manage.
 * Collapses to just the platform badge when the sidebar is collapsed.
 */
export function AccountSwitcher({ collapsed }: { collapsed: boolean }) {
  const { accounts, allAccounts, activeAccount, activeCompanyId, setActiveCompanyId, setActiveAccount } = useAccount();
  const { isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(activeCompanyId);
  const [addOpen, setAddOpen] = useState(false);
  const [manageOpen, setManageOpen] = useState(false);
  const selectedCompany = companies.find((company) => company.id === activeCompanyId);
  const activeAccountCompany = companies.find((company) => company.id === activeAccount.companyId) ?? selectedCompany;
  const activeAccountLogo = activeAccount.logoUrl ?? activeAccountCompany?.logo_url;

  useEffect(() => {
    let cancelled = false;
    const loadCompanies = async () => {
      try {
        if (isAdmin) {
          const { data } = await apiFetch<{ data: Company[] }>('/companies');
          const existingNames = new Set(data.map((company) => company.name.toLowerCase()));
          const mockCompanies = MOCK_COMPANIES.filter((company) => !existingNames.has(company.name.toLowerCase()));
          if (!cancelled) setCompanies([...data, ...mockCompanies]);
          return;
        }
        const { data } = await apiFetch<{ data: Company }>('/company-profile');
        if (!cancelled) setCompanies(data?.id ? [data] : []);
      } catch {
        if (!cancelled) setCompanies([]);
      }
    };
    void loadCompanies();
    return () => { cancelled = true; };
  }, [isAdmin, activeCompanyId]);

  useEffect(() => {
    setSelectedCompanyId(activeCompanyId);
  }, [activeCompanyId]);

  function chooseCompany(companyId: string) {
    setSelectedCompanyId(companyId);
    setActiveCompanyId(companyId);
  }

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            className={cn(
              "flex items-center rounded-xl border border-border bg-white/70 hover:bg-accent transition-colors text-left w-full",
              collapsed ? "justify-center p-1.5" : "gap-2.5 px-2.5 py-2",
            )}
            aria-label="Trocar de conta"
          >
            {activeAccountLogo ? <img src={activeAccountLogo} alt={`Logo da ${activeAccount.name}`} className="size-8 rounded-lg object-contain" /> : <PlatformBadge platform={activeAccount.platform} className="size-8 text-xs" />}
            {!collapsed && (
              <>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-semibold leading-tight truncate">{activeAccount.name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">
                    {platformMeta[activeAccount.platform].label} · {activeAccount.accountId}
                  </p>
                </div>
                <ChevronsUpDown className="size-3.5 text-muted-foreground shrink-0" />
              </>
            )}
          </button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="start" sideOffset={6} className="w-80">
          {isAdmin && companies.length > 0 && <>
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">Empresas clientes</DropdownMenuLabel>
            <div className="mb-2 max-h-56 space-y-1 overflow-y-auto pr-1">
              {companies.map((company) => {
                const selected = selectedCompanyId === company.id;
                const companyAccounts = allAccounts.filter((account) => account.companyId === company.id);
                return <DropdownMenuItem
                  key={company.id}
                  onSelect={(event) => { event.preventDefault(); chooseCompany(company.id); }}
                  className={cn("gap-2.5 rounded-xl border px-2.5 py-2", selected ? "border-violet/40 bg-violet/5" : "border-transparent")}
                >
                  {company.logo_url ? <img src={company.logo_url} alt={`Logo da ${company.name}`} className="size-8 shrink-0 rounded-lg object-contain" /> : <PlatformBadge platform="GOOGLE_ADS" className="size-8 shrink-0 text-xs" />}
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-xs font-semibold">{company.name}</span>
                    <span className="block truncate text-[10px] text-muted-foreground">{company.document || "CNPJ pendente"} · {company.status}</span>
                  </span>
                  {companyAccounts.length > 0 && <span className="text-[10px] text-muted-foreground">{companyAccounts.length} conta{companyAccounts.length === 1 ? "" : "s"}</span>}
                  {selected && <Check className="size-3.5 shrink-0 text-violet" />}
                </DropdownMenuItem>;
              })}
            </div>
            <DropdownMenuSeparator />
          </>}
          {isAdmin && !selectedCompanyId && (
            <div className="mx-1 mb-2 rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-xs font-medium">Selecione uma empresa</p>
              <p className="mt-1 text-[10px] text-muted-foreground">As contas Google Ads e Meta Ads da empresa selecionada aparecerão aqui.</p>
            </div>
          )}
          {!isAdmin && accounts.length === 0 && (
            <div className="mx-1 mb-2 rounded-lg border border-dashed border-border p-3 text-center">
              <p className="text-xs font-medium">Nenhuma conta conectada</p>
              <p className="mt-1 text-[10px] text-muted-foreground">Adicione uma conta Google Ads ou Meta Ads para começar a importar métricas.</p>
            </div>
          )}
          {PLATFORM_ORDER.map((p) => {
            const group = (isAdmin ? (selectedCompanyId ? accounts : []) : accounts).filter((a) => a.platform === p);
            if (!group.length) return null;
            return (
              <DropdownMenuGroup key={p}>
                <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  {platformMeta[p].label}
                </DropdownMenuLabel>
                {group.map((acc) => {
                  const accountCompany = companies.find((company) => company.id === acc.companyId);
                  return <DropdownMenuItem
                    key={acc.id}
                    onSelect={() => setActiveAccount(acc.id)}
                    className="gap-2.5"
                  >
                    {acc.logoUrl ?? accountCompany?.logo_url ? <img src={acc.logoUrl ?? accountCompany?.logo_url ?? ""} alt={`Logo da ${acc.name}`} className="size-7 shrink-0 rounded-md object-contain" /> : <PlatformBadge platform={acc.platform} className="size-7 text-[11px]" />}
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium truncate">{acc.name}</p>
                      <p className="text-[10px] text-muted-foreground truncate">{acc.accountId}</p>
                    </div>
                    <span className={cn("size-1.5 rounded-full shrink-0", statusMeta[acc.status].dot)} />
                    {acc.id === activeAccount.id && <Check className="size-3.5 text-violet shrink-0" />}
                  </DropdownMenuItem>;
                })}
              </DropdownMenuGroup>
            );
          })}

          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setAddOpen(true)} className="gap-2.5 text-violet font-medium">
            <Plus className="size-4" /> Adicionar conta
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setManageOpen(true)} className="gap-2.5">
            <Settings2 className="size-4" /> Gerenciar contas
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>


      <AddAccountDialog open={addOpen} onOpenChange={setAddOpen} />
      <ManageAccountsDialog
        open={manageOpen}
        onOpenChange={setManageOpen}
        onAddAccount={() => {
          setManageOpen(false);
          setAddOpen(true);
        }}
      />
    </>
  );
}
