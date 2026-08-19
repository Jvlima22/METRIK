import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useAuth } from "./auth-context";
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
  activeAccount: AdAccount;
  activeCompanyId: string | null;
  setActiveCompanyId: (id: string | null) => void;
  setActiveAccount: (id: string) => void;
  addAccount: (input: AddAccountInput) => AdAccount;
  updateAccount: (id: string, patch: Partial<Pick<AdAccount, "name" | "figmaFileKey">>) => void;
  removeAccount: (id: string) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const { user, isAdmin, loading: authLoading } = useAuth();
  const [allAccounts, setAllAccounts] = useState<AdAccount[]>([]);
  const [activeId, setActiveId] = useState<string>(EMPTY_ACCOUNT.id);
  const [activeCompanyId, setActiveCompanyIdState] = useState<string | null>(null);
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

    try {
      const storedList = localStorage.getItem(listKey);
      const parsed = storedList ? JSON.parse(storedList) as AdAccount[] : [];
      const saved = Array.isArray(parsed) ? parsed : [];
      const nextAccounts = isAdmin
        ? [
            // As contas demo pertencem exclusivamente ao Global Admin. O seed
            // também restaura o `brandKey` caso uma versão antiga tenha sido
            // persistida no navegador sem essa marcação.
            ...initialAccounts.map((seed) => {
              const savedAccount = saved.find((account) => account.id === seed.id);
              return savedAccount ? { ...seed, ...savedAccount, brandKey: seed.brandKey } : seed;
            }),
            ...saved.filter((account) => !initialAccounts.some((seed) => seed.id === account.id)),
          ]
        : saved.filter((account) => Boolean(account.companyId));
      setAllAccounts(nextAccounts);
      setActiveId(localStorage.getItem(activeKey) ?? EMPTY_ACCOUNT.id);
      setActiveCompanyIdState(localStorage.getItem(companyKey));
    } catch {
      setAllAccounts(isAdmin ? initialAccounts : []);
      setActiveId(EMPTY_ACCOUNT.id);
      setActiveCompanyIdState(null);
    }
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
  }

  function setActiveAccount(id: string) { setActiveId(id); }

  function addAccount(input: AddAccountInput): AdAccount {
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
    setAllAccounts((prev) => [...prev, acc]);
    setActiveId(acc.id);
    return acc;
  }

  function updateAccount(id: string, patch: Partial<Pick<AdAccount, "name" | "figmaFileKey">>) {
    setAllAccounts((prev) => prev.map((account) => account.id === id ? { ...account, ...patch, figmaFileKey: "figmaFileKey" in patch ? patch.figmaFileKey?.trim() || undefined : account.figmaFileKey } : account));
  }

  function removeAccount(id: string) {
    setAllAccounts((prev) => prev.filter((account) => account.id !== id));
    if (id === activeId) setActiveId(EMPTY_ACCOUNT.id);
  }

  return <AccountContext.Provider value={{ accounts, activeAccount, activeCompanyId, setActiveCompanyId, setActiveAccount, addAccount, updateAccount, removeAccount }}>{children}</AccountContext.Provider>;
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within <AccountProvider>");
  return ctx;
}
