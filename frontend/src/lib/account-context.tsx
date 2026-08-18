import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

import {
  initialAccounts,
  type AccountPlatform,
  type AdAccount,
} from "./accounts";

/**
 * Shared account state (active account + the connected list).
 *
 * SSR-safe: server render and the first client render both use
 * `initialAccounts` (so hydration matches); localStorage is only read inside a
 * post-mount effect, then mirrored back on every change.
 */

const ACTIVE_KEY = "fury:active-account";
const LIST_KEY = "fury:accounts";

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
  setActiveAccount: (id: string) => void;
  addAccount: (input: AddAccountInput) => AdAccount;
  updateAccount: (id: string, patch: Partial<Pick<AdAccount, "name" | "figmaFileKey">>) => void;
  removeAccount: (id: string) => void;
};

const AccountContext = createContext<AccountContextValue | null>(null);

export function AccountProvider({ children }: { children: ReactNode }) {
  const [accounts, setAccounts] = useState<AdAccount[]>(initialAccounts);
  const [activeId, setActiveId] = useState<string>(initialAccounts[0].id);

  // Hydrate from localStorage after mount (avoids SSR hydration mismatch).
  useEffect(() => {
    try {
      const storedList = localStorage.getItem(LIST_KEY);
      if (storedList) {
        const parsed = JSON.parse(storedList) as AdAccount[];
        if (Array.isArray(parsed) && parsed.length) {
          // Backfill seeded fields onto accounts saved before those fields existed.
          const migrated = parsed.map((a) => {
            const seed = initialAccounts.find((s) => s.id === a.id);
            if (!seed) return a;
            return {
              ...a,
              figmaFileKey: a.figmaFileKey ?? seed.figmaFileKey,
              companyId: a.companyId,
              companyName: a.companyName,
              claudeProjectId: a.claudeProjectId ?? seed.claudeProjectId,
              brandKey: a.brandKey ?? seed.brandKey,
            };
          });
          // Merge in any newly-seeded accounts the saved list predates, so new
          // built-in accounts show up even when localStorage already has data.
          const knownIds = new Set(migrated.map((a) => a.id));
          const newSeeds = initialAccounts.filter((s) => !knownIds.has(s.id));
          setAccounts([...migrated, ...newSeeds]);
        }
      }
      const storedActive = localStorage.getItem(ACTIVE_KEY);
      if (storedActive) setActiveId(storedActive);
    } catch {
      /* localStorage unavailable — keep defaults */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(LIST_KEY, JSON.stringify(accounts));
    } catch {
      /* ignore */
    }
  }, [accounts]);

  useEffect(() => {
    try {
      localStorage.setItem(ACTIVE_KEY, activeId);
    } catch {
      /* ignore */
    }
  }, [activeId]);

  const activeAccount = accounts.find((a) => a.id === activeId) ?? accounts[0];

  function setActiveAccount(id: string) {
    setActiveId(id);
  }

  function addAccount(input: AddAccountInput): AdAccount {
    const acc: AdAccount = {
      id: `acc-${Date.now()}`,
      platform: input.platform,
      name: input.name.trim(),
      accountId: input.accountId.trim(),
      status: "pending",
      currency: input.currency ?? "BRL",
      figmaFileKey: input.figmaFileKey?.trim() || undefined,
      companyId: input.companyId,
      companyName: input.companyName?.trim() || undefined,
    };
    setAccounts((prev) => [...prev, acc]);
    setActiveId(acc.id);
    return acc;
  }

  function updateAccount(id: string, patch: Partial<Pick<AdAccount, "name" | "figmaFileKey">>) {
    setAccounts((prev) =>
      prev.map((a) =>
        a.id === id
          ? {
              ...a,
              ...patch,
              figmaFileKey:
                "figmaFileKey" in patch ? patch.figmaFileKey?.trim() || undefined : a.figmaFileKey,
            }
          : a,
      ),
    );
  }

  function removeAccount(id: string) {
    setAccounts((prev) => {
      const next = prev.filter((a) => a.id !== id);
      if (!next.length) return prev; // never leave the workspace account-less
      if (id === activeId) setActiveId(next[0].id);
      return next;
    });
  }

  return (
    <AccountContext.Provider
      value={{ accounts, activeAccount, setActiveAccount, addAccount, updateAccount, removeAccount }}
    >
      {children}
    </AccountContext.Provider>
  );
}

export function useAccount(): AccountContextValue {
  const ctx = useContext(AccountContext);
  if (!ctx) throw new Error("useAccount must be used within <AccountProvider>");
  return ctx;
}
