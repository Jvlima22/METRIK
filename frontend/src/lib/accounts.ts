/**
 * Ad-account model + platform metadata for the account switcher.
 *
 * Pure mock layer — no real credentials are sent. The active account scopes
 * the dashboard/violations UI (platform + a deterministic per-account scale),
 * mirroring how the real Metrik API would key metrics by customerId.
 */

export type AccountPlatform = "GOOGLE_ADS" | "META_ADS";
export type AccountStatus = "active" | "pending" | "error";

/**
 * Marca/empresa por trás da conta. Define o "DNA" dos dados mock (nomes de
 * campanha, keywords, públicos, criativos) — ver `brand-profiles` em
 * `manage-data.ts` e os seeds brandeados em `mock-data.ts`. Contas sem
 * `brandKey` usam os pools genéricos (comportamento original).
 */
export type BrandKey = "lumen" | "atlas" | "aura" | "vintech" | "tgl";

export type AdAccount = {
  id: string;
  platform: AccountPlatform;
  name: string;
  accountId: string; // Google: "864-652-2223" · Meta: "act_1029384756"
  status: AccountStatus;
  currency: string;
  /** Figma file (key or full link) holding this account's creatives. */
  figmaFileKey?: string;
  /** Claude Design project id (claude.ai/design) for this account's creatives. */
  claudeProjectId?: string;
  /** Empresa cliente responsável por esta conta Ads. */
  companyId?: string;
  companyName?: string;
  /** Empresa por trás da conta — escolhe o conjunto de dados mock brandeado. */
  brandKey?: BrandKey;
  /** Logo opcional para contas mock exibidas no seletor. */
  logoUrl?: string;
};

export const platformMeta: Record<
  AccountPlatform,
  { label: string; short: string; gradient: string }
> = {
  GOOGLE_ADS: {
    label: "Google Ads",
    short: "G",
    gradient: "linear-gradient(135deg,#4285F4,#34A853 55%,#FBBC05)",
  },
  META_ADS: {
    label: "Meta Ads",
    short: "M",
    gradient: "linear-gradient(135deg,#0064E0,#0081FB)",
  },
};

export const statusMeta: Record<
  AccountStatus,
  { label: string; cls: string; dot: string }
> = {
  active: { label: "Ativa", cls: "border-emerald-200 text-emerald-700 bg-emerald-50", dot: "bg-emerald-500" },
  pending: { label: "Pendente", cls: "border-amber-200 text-amber-700 bg-amber-50", dot: "bg-amber-500" },
  error: { label: "Erro de auth", cls: "border-rose-200 text-rose-700 bg-rose-50", dot: "bg-rose-500" },
};

/** Maps the account platform to the value used by mock-data creatives/violations. */
export const PLATFORM_DATA_KEY: Record<AccountPlatform, "google-ads" | "meta-ads"> = {
  GOOGLE_ADS: "google-ads",
  META_ADS: "meta-ads",
};

export const initialAccounts: AdAccount[] = [
  { id: "acc-g-001", platform: "GOOGLE_ADS", name: "Lumen Store — Brasil", accountId: "864-652-2223", status: "active", currency: "BRL", figmaFileKey: "p7VgDkFNwCYcdUNX5YALLw", claudeProjectId: "514627cc-a1e1-4f38-8249-06abe1dd9667", brandKey: "lumen" },
  { id: "acc-g-002", platform: "GOOGLE_ADS", name: "Atlas Travel", accountId: "412-908-1170", status: "pending", currency: "BRL", brandKey: "atlas" },
  { id: "acc-m-001", platform: "META_ADS", name: "Aura Cosmetics", accountId: "act_1029384756", status: "active", currency: "BRL", brandKey: "aura" },

  // Vintech — SaaS wine-tech (gestão/vendas para vinícolas e importadoras).
  { id: "acc-g-vintech", platform: "GOOGLE_ADS", name: "Vintech", accountId: "738-204-9961", status: "active", currency: "BRL", brandKey: "vintech", logoUrl: "/vintech-logo.png", claudeProjectId: "514627cc-a1e1-4f38-8249-06abe1dd9667" },
  { id: "acc-m-vintech", platform: "META_ADS", name: "Vintech", accountId: "act_7790231845", status: "active", currency: "BRL", brandKey: "vintech", logoUrl: "/vintech-logo.png", claudeProjectId: "514627cc-a1e1-4f38-8249-06abe1dd9667" },

  // TGL Solutions — automação + IA sob medida para empresas.
  { id: "acc-g-tgl", platform: "GOOGLE_ADS", name: "TGL Solutions", accountId: "905-417-2230", status: "active", currency: "BRL", brandKey: "tgl" },
  { id: "acc-m-tgl", platform: "META_ADS", name: "TGL Solutions", accountId: "act_6612089734", status: "active", currency: "BRL", brandKey: "tgl" },
];

/**
 * Deterministic per-account multiplier (~0.82–1.24) so switching accounts
 * visibly changes the numbers without needing distinct mock datasets.
 */
export function accountScale(accountId: string): number {
  const h = Array.from(accountId).reduce((a, c) => a + c.charCodeAt(0), 0);
  return 0.82 + (h % 43) / 100;
}
