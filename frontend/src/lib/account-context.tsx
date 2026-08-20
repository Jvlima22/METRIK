import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";
import { apiFetch } from "./api";
import { initialAccounts, type AccountPlatform, type AdAccount } from "./accounts";

export const EMPTY_ACCOUNT: AdAccount = {
  id: "empty-account",
  platform: "GOOGLE_ADS",
  name: "Nenhuma conta conectada",
  accountId: "—",
  status: "pending",
  currency: "BRL",
};

type AddAccountInput = {
  platform: AccountPlatform;
  name: string;
  accountId: string;
  currency?: string;
  figmaFileKey?: string;
  companyId?: string;
  companyName?: string;
};

type AccountContextValue = {
  accounts: AdAccount[];
  allAccounts: AdAccount[];
  activeAccount: AdAccount;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  setActiveAccount: (id: string) => void;
  addAccount: (input: AddAccountInput) => Promise<AdAccount>;
  updateAccount: (id: string, patch: Partial<Pick<AdAccount, "name" | "figmaFileKey">>) => void;
  removeAccount: (id: string) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [allAccounts, setAllAccounts] = useState<AdAccount[]>([]);
  const [activeId, setActiveId] = useState<string>(EMPTY_ACCOUNT.id);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(() => {
    if (typeof window === "undefined" || !user?.id || isAdmin) return null;
    try { return window.localStorage.getItem(`metrik:${user.id}:active-company`); } catch { return null; }
  });
  const storagePrefix = user?.id ? `metrik:${user.id}` : "metrik:anonymous";
  const listKey = `${storagePrefix}:accounts`;
  const activeKey = `${storagePrefix}:active-account`;
  const companyKey = `${storagePrefix}:active-company`;

  useEffect(() => {
    if (authLoading || !user) {
      setAllAccounts([]);
      setActiveId(EMPTY_ACCOUNT.id);
      setActiveCompanyIdState(null);
      return;
    }

    let cancelled = false;
    const hydrate = async () => {
      let nextAccounts: AdAccount[] = [];
      let storedCompanyId: string | null = null;
      let inferredCompanyId: string | null = null;
      try {
        const storedList = localStorage.getItem(listKey);
        const parsed = storedList ? JSON.parse(storedList) as AdAccount[] : [];
        const saved = Array.isArray(parsed) ? parsed : [];
        const adminProfile = isAdmin ? await apiFetch<{ data: { id?: string } }>('/company-profile') : null;
        const serverAccounts: AdAccount[] = isAdmin
          ? ((await apiFetch<{ data: Array<{ id: string; company_id: string; platform: AccountPlatform; external_account_id: string; name: string; status: string; company_name?: string }> }>('/integrations/admin/accounts')).data ?? []).map((account) => ({
              id: `server-${account.id}`,
              platform: account.platform,
              name: account.name,
              accountId: account.external_account_id,
              status: account.status === 'ERROR' ? 'error' : account.status === 'PAUSED' ? 'pending' : 'active',
              currency: 'BRL',
              companyId: account.company_id,
              companyName: account.company_name,
            }))
          : [];
        const byAccountKey = (account: AdAccount) => `${account.companyId ?? 'global'}:${account.platform}:${account.accountId}`;
        const mergedAccounts = [...serverAccounts, ...saved];
        const uniqueAccounts = mergedAccounts.filter((account, index, list) => list.findIndex((candidate) => byAccountKey(candidate) === byAccountKey(account)) === index);
        nextAccounts = isAdmin
          ? [
              // As contas demo pertencem exclusivamente ao Global Admin. O seed
              // também restaura o `brandKey` caso uma versão antiga tenha sido
              // persistida no navegador sem essa marcação.
              ...initialAccounts.map((seed) => {
                const savedAccount = saved.find((account) => account.id === seed.id);
                return savedAccount ? { ...seed, ...savedAccount, brandKey: seed.brandKey, logoUrl: seed.logoUrl } : seed;
              }),
              ...uniqueAccounts.filter((account) => !initialAccounts.some((seed) => seed.id === account.id)),
            ]
          : saved.filter((account) => Boolean(account.companyId));
        storedCompanyId = isAdmin ? (localStorage.getItem(companyKey) ?? adminProfile?.data?.id ?? null) : localStorage.getItem(companyKey);
        inferredCompanyId = isAdmin ? adminProfile?.data?.id ?? null : nextAccounts.find((account) => account.companyId)?.companyId ?? null;
        if (isAdmin && storedCompanyId) localStorage.setItem(companyKey, storedCompanyId);
        if (!cancelled) {
          setAllAccounts(nextAccounts);
          setActiveId(localStorage.getItem(activeKey) ?? EMPTY_ACCOUNT.id);
          setActiveCompanyIdState(storedCompanyId ?? inferredCompanyId);
        }
      } catch {
        if (!cancelled) {
          setAllAccounts(isAdmin ? initialAccounts : []);
          setActiveId(EMPTY_ACCOUNT.id);
          setActiveCompanyIdState(null);
        }
      }

      // Usuários de empresa podem não ter contas de anúncios locais ainda.
      // O backend resolve a única membership ativa e fornece o company_id real.
      if (!isAdmin && !storedCompanyId && !inferredCompanyId) {
        try {
          const response = await apiFetch<{ data: { id?: string } }>('/company-profile');
          const serverCompanyId = response.data?.id;
          if (!cancelled && serverCompanyId) {
            setActiveCompanyIdState(serverCompanyId);
            localStorage.setItem(companyKey, serverCompanyId);
          }
        } catch {
          // O middleware continuará protegendo o backend; mantemos a visão vazia até o contexto ser resolvido.
        }
      }
    };

    void hydrate();
    return () => { cancelled = true; };
  }, [authLoading, user?.id, isAdmin, listKey, activeKey, companyKey]);

  useEffect(() => {
    if (!user || authLoading) return;
    try { localStorage.setItem(listKey, JSON.stringify(allAccounts)); } catch { /* storage opcional */ }
  }, [allAccounts, user?.id, authLoading, listKey]);

  useEffect(() => {
    if (!user || authLoading) return;
    try {
      localStorage.setItem(activeKey, activeId);
      if (activeCompanyId) localStorage.setItem(companyKey, activeCompanyId);
      else localStorage.removeItem(companyKey);
    } catch { /* storage opcional */ }
  }, [activeId, activeCompanyId, user?.id, authLoading, activeKey, companyKey]);

  const accounts = useMemo(() => {
    if (!activeCompanyId) return allAccounts;
    return allAccounts.filter((account) => account.companyId === activeCompanyId);
  }, [allAccounts, activeCompanyId]);

  const activeAccount = accounts.find((account) => account.id === activeId) ?? accounts[0] ?? EMPTY_ACCOUNT;

  function setActiveCompanyId(id: string | null) {
    setActiveCompanyIdState(id);
    setActiveId(EMPTY_ACCOUNT.id);
    if (user && typeof window !== 'undefined') {
      try {
        if (id) window.localStorage.setItem(companyKey, id);
        else window.localStorage.removeItem(companyKey);
        window.localStorage.removeItem('metrik:active-company-id');
      } catch { /* armazenamento opcional */ }
    }
  }

  function setActiveAccount(id: string) {
    const account = allAccounts.find((item) => item.id === id);
    setActiveId(id);
    if (account?.companyId) {
      setActiveCompanyIdState(account.companyId);
      if (user && typeof window !== 'undefined') {
        try { window.localStorage.setItem(companyKey, account.companyId); } catch { /* armazenamento opcional */ }
      }
    }
  }

  async function addAccount(input: AddAccountInput): Promise<AdAccount> {
    const acc: AdAccount = {
      id: `acc-${Date.now()}`,
      platform: input.platform,
      name: input.name.trim(),
      accountId: input.accountId.trim(),
      status: "pending",
      currency: input.currency ?? "BRL",
      figmaFileKey: input.figmaFileKey?.trim() || undefined,
      companyId: input.companyId || activeCompanyId || undefined,
      companyName: input.companyName?.trim() || undefined,
    };
    if (!acc.companyId) throw new Error('Selecione uma empresa antes de adicionar uma conta de anúncios.');
    const response = await apiFetch<{ data: { id: string; external_account_id: string; name: string; status: string } }>('/integrations/accounts', {
      method: 'POST',
      body: JSON.stringify({ platform: acc.platform, externalAccountId: acc.accountId, name: acc.name }),
    });
    const validatedAccount: AdAccount = { ...acc, id: response.data.id, accountId: response.data.external_account_id, name: response.data.name, status: response.data.status === 'ERROR' ? 'error' : 'active' };
    setAllAccounts((prev) => [...prev.filter((account) => `${account.companyId}:${account.platform}:${account.accountId}` !== `${validatedAccount.companyId}:${validatedAccount.platform}:${validatedAccount.accountId}`), validatedAccount]);
    setActiveId(validatedAccount.id);
    return validatedAccount;
  }

  function updateAccount(id: string, patch: Partial<Pick<AdAccount, "name" | "figmaFileKey">>) {
    setAllAccounts((prev) => prev.map((account) => account.id === id ? { ...account, ...patch, figmaFileKey: "figmaFileKey" in patch ? patch.figmaFileKey?.trim() || undefined : account.figmaFileKey } : account));
  }

  function removeAccount(id: string) {
    setAllAccounts((prev) => prev.filter((account) => account.id !== id));
    if (id === activeId) setActiveId(EMPTY_ACCOUNT.id);
  }

  return <AccountContext.Provider value={{ accounts, allAccounts, activeAccount, activeCompanyId, setActiveCompanyId, setActiveAccount, addAccount, updateAccount, removeAccount }}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within <AccountProvider>");
  return ctx;
}
