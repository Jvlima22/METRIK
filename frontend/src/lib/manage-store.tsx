/**
 * Fonte da verdade do mini Ads Manager (persistido por conta).
 *
 * Mantém a ÁRVORE completa por conta (campanhas → grupos/conjuntos →
 * keywords/públicos + geo/segmentação) e expõe CRUD em todos os níveis.
 * Contas demo do administrador são materializadas de `buildAccountTree`;
 * contas de empresas sem dados sincronizados começam vazias e só passam a
 * conter campanhas após criação manual ou sincronização real.
 *

 * SSR-safe: estado inicial vazio; localStorage só é lido num effect pós-mount.
 * Leitura é read-through (gera a árvore se ainda não materializada); qualquer
 * mutação materializa e persiste a conta inteira.
 */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { AdAccount } from "./accounts";
import type { Creative } from "./creatives";
import {
  buildAccountTree,
  recalcCampaign,
  recalcGroup,
  recalcSet,
  makeId,
  emptyDemographics,
  type Campaign,
  type AdGroup,
  type AdSet,
  type Keyword,
  type Audience,
  type Ad,
  type GeoTarget,
  type Demographics,
  type EntityStatus,
  type MatchType,
  type GoogleChannelType,
  type GoogleBidStrategy,
  type MetaObjective,
  type MetaBudgetMode,
  type MetaBidStrategy,
  type MetaOptimizationGoal,
  type GeoKind,
} from "./manage-data";

const TREES_KEY = "fury:manage:trees";
type TreeMap = Record<string, Campaign[]>;

export type NewGoogleCampaign = {
  name: string;
  googleType: GoogleChannelType;
  googleBidStrategy: GoogleBidStrategy;
  budgetDailyMicros: number;
};
export type NewMetaCampaign = {
  name: string;
  objective: MetaObjective;
  budgetMode: MetaBudgetMode;
  metaBidStrategy: MetaBidStrategy;
  budgetDailyMicros: number;
};

/** Anúncio para geração em lote (a partir de peças do board). */
export type GeneratedAd = {
  name: string;
  /** Caminho em /public (SVG/HTML) ou data-URL (thumb rasterizado da peça). */
  src: string;
  kind?: "image" | "board";
  thumbTone?: "wine" | "neutral";
};

type ManageContextValue = {
  getCampaigns: (account: AdAccount) => Campaign[];
  getCampaign: (account: AdAccount, campaignId: string) => Campaign | undefined;

  // Campanha
  createGoogleCampaign: (account: AdAccount, input: NewGoogleCampaign) => string;
  createMetaCampaign: (account: AdAccount, input: NewMetaCampaign) => string;
  /** Cria uma campanha (Google ou Meta, conforme a conta) já com um grupo/conjunto de anúncios. */
  createCampaignWithAds: (
    account: AdAccount,
    input: { name: string; ads: GeneratedAd[]; budgetDailyMicros?: number },
  ) => string;
  updateCampaign: (account: AdAccount, campaignId: string, patch: Partial<Campaign>) => void;
  setCampaignStatus: (account: AdAccount, campaignId: string, status: EntityStatus) => void;
  deleteCampaign: (account: AdAccount, campaignId: string) => void;
  duplicateCampaign: (account: AdAccount, campaignId: string) => string | undefined;

  // Grupo (Google)
  addAdGroup: (account: AdAccount, campaignId: string, name: string) => void;
  updateAdGroup: (account: AdAccount, campaignId: string, groupId: string, patch: Partial<AdGroup>) => void;
  deleteAdGroup: (account: AdAccount, campaignId: string, groupId: string) => void;
  toggleGroupStatus: (account: AdAccount, campaignId: string, groupId: string) => void;

  // Conjunto (Meta)
  addAdSet: (account: AdAccount, campaignId: string, name: string) => void;
  updateAdSet: (account: AdAccount, campaignId: string, setId: string, patch: Partial<AdSet>) => void;
  deleteAdSet: (account: AdAccount, campaignId: string, setId: string) => void;
  toggleSetStatus: (account: AdAccount, campaignId: string, setId: string) => void;
  updateDemographics: (account: AdAccount, campaignId: string, setId: string, demo: Demographics) => void;
  addInterest: (account: AdAccount, campaignId: string, setId: string, interest: string) => void;
  removeInterest: (account: AdAccount, campaignId: string, setId: string, interest: string) => void;

  // Keywords (Google, dentro do grupo)
  addKeyword: (account: AdAccount, campaignId: string, groupId: string, text: string, matchType: MatchType) => void;
  removeKeyword: (account: AdAccount, campaignId: string, groupId: string, keywordId: string) => void;
  toggleKeyword: (account: AdAccount, campaignId: string, groupId: string, keywordId: string) => void;
  updateKeywordMatch: (account: AdAccount, campaignId: string, groupId: string, keywordId: string, matchType: MatchType) => void;

  // Públicos (Meta, dentro do conjunto)
  addAudience: (account: AdAccount, campaignId: string, setId: string, name: string, type: Audience["type"]) => void;
  removeAudience: (account: AdAccount, campaignId: string, setId: string, audienceId: string) => void;
  toggleAudience: (account: AdAccount, campaignId: string, setId: string, audienceId: string) => void;

  // Anúncios / criativos (dentro do grupo Google OU conjunto Meta, via parentId)
  attachCreative: (account: AdAccount, campaignId: string, parentId: string, creative: Creative) => void;
  removeAd: (account: AdAccount, campaignId: string, parentId: string, adId: string) => void;
  toggleAdStatus: (account: AdAccount, campaignId: string, parentId: string, adId: string) => void;

  // Geolocalização (Google: campanha · Meta: conjunto via setId)
  addGeo: (account: AdAccount, campaignId: string, geo: { kind: GeoKind; name: string }, setId?: string) => void;
  removeGeo: (account: AdAccount, campaignId: string, geoId: string, setId?: string) => void;
  toggleGeoExcluded: (account: AdAccount, campaignId: string, geoId: string, setId?: string) => void;
};

const ManageContext = createContext<ManageContextValue | null>(null);

// ── Helpers puros de transformação da árvore ────────────────────────────────

function mapCampaign(list: Campaign[], id: string, fn: (c: Campaign) => Campaign): Campaign[] {
  return list.map((c) => (c.id === id ? recalcCampaign(fn(c)) : c));
}
function mapGroup(c: Campaign, groupId: string, fn: (g: AdGroup) => AdGroup): Campaign {
  return { ...c, adGroups: c.adGroups.map((g) => (g.id === groupId ? recalcGroup(fn(g)) : g)) };
}
function mapSet(c: Campaign, setId: string, fn: (s: AdSet) => AdSet): Campaign {
  return { ...c, adSets: c.adSets.map((s) => (s.id === setId ? recalcSet(fn(s)) : s)) };
}

const ZERO = { impressions: 0, clicks: 0, costMicros: 0, conversions: 0 };

function cloneFresh(c: Campaign): Campaign {
  const sfx = makeId("cp");
  return recalcCampaign({
    ...c,
    ...ZERO,
    id: `${c.id}-${sfx}`,
    name: `${c.name} (cópia)`,
    status: "PAUSED",
    spentTodayMicros: 0,
    geoTargets: c.geoTargets.map((g, i) => ({ ...g, id: `${c.id}-${sfx}-geo-${i}` })),
    adGroups: c.adGroups.map((g, gi) => ({
      ...g,
      ...ZERO,
      id: `${c.id}-${sfx}-ag-${gi}`,
      keywords: g.keywords.map((k, ki) => ({ ...k, ...ZERO, id: `${c.id}-${sfx}-ag-${gi}-kw-${ki}` })),
    })),
    adSets: c.adSets.map((s, si) => ({
      ...s,
      ...ZERO,
      id: `${c.id}-${sfx}-as-${si}`,
      geoTargets: s.geoTargets.map((g, i) => ({ ...g, id: `${c.id}-${sfx}-as-${si}-geo-${i}` })),
      audiences: s.audiences.map((a, ai) => ({ ...a, ...ZERO, id: `${c.id}-${sfx}-as-${si}-aud-${ai}` })),
    })),
  });
}

export function ManageProvider({ children }: { children: ReactNode }) {
  const [trees, setTrees] = useState<TreeMap>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(TREES_KEY);
      if (raw) setTrees(JSON.parse(raw) as TreeMap);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(TREES_KEY, JSON.stringify(trees));
    } catch {
      /* ignore */
    }
  }, [trees]);

  function getCampaigns(account: AdAccount): Campaign[] {
    // `brandKey` identifica exclusivamente as contas demo do administrador.
    // Contas reais/novas não podem receber seeds mock automaticamente.
    if (trees[account.id]) return trees[account.id];
    return account.brandKey ? buildAccountTree(account) : [];
  }

  function getCampaign(account: AdAccount, campaignId: string): Campaign | undefined {
    return getCampaigns(account).find((c) => c.id === campaignId);
  }

  /** Materializa a conta (se preciso) e aplica `fn` à lista de campanhas. */
  function update(account: AdAccount, fn: (list: Campaign[]) => Campaign[]) {
    setTrees((prev) => {
      const current = prev[account.id] ?? (account.brandKey ? buildAccountTree(account) : []);
      return { ...prev, [account.id]: fn(current) };
    });

  }

  // ── Campanha ──────────────────────────────────────────────────────────────
  function createGoogleCampaign(account: AdAccount, input: NewGoogleCampaign): string {
    const id = makeId("g-camp");
    const campaign: Campaign = recalcCampaign({
      id,
      platform: "GOOGLE_ADS",
      name: input.name.trim() || "Nova campanha",
      status: "PAUSED",
      channelType: input.googleType,
      budgetDailyMicros: input.budgetDailyMicros,
      spentTodayMicros: 0,
      ...ZERO,
      ctr: 0,
      averageCpcMicros: 0,
      googleType: input.googleType,
      googleBidStrategy: input.googleBidStrategy,
      geoTargets: [],
      adGroups: [],
      adSets: [],
    });
    update(account, (list) => [campaign, ...list]);
    return id;
  }

  function createMetaCampaign(account: AdAccount, input: NewMetaCampaign): string {
    const id = makeId("m-camp");
    const campaign: Campaign = recalcCampaign({
      id,
      platform: "META_ADS",
      name: input.name.trim() || "Nova campanha",
      status: "PAUSED",
      channelType: input.objective,
      budgetDailyMicros: input.budgetDailyMicros,
      spentTodayMicros: 0,
      ...ZERO,
      ctr: 0,
      averageCpcMicros: 0,
      objective: input.objective,
      budgetMode: input.budgetMode,
      metaBidStrategy: input.metaBidStrategy,
      geoTargets: [],
      adGroups: [],
      adSets: [],
    });
    update(account, (list) => [campaign, ...list]);
    return id;
  }

  function createCampaignWithAds(
    account: AdAccount,
    input: { name: string; ads: GeneratedAd[]; budgetDailyMicros?: number },
  ): string {
    const budget = input.budgetDailyMicros ?? 50_000_000;
    const isGoogle = account.platform === "GOOGLE_ADS";
    const id = makeId(isGoogle ? "g-camp" : "m-camp");
    const parentId = makeId(isGoogle ? `${id}-ag` : `${id}-as`);
    const name = input.name.trim() || "Nova campanha";
    const ads: Ad[] = input.ads.map((a, i) => ({
      id: makeId(`${parentId}-ad-${i}`),
      name: a.name,
      status: "ENABLED",
      creativeKind: a.kind ?? "image",
      creativeSrc: a.src,
      thumbTone: a.thumbTone,
      ...ZERO,
    }));

    const campaign: Campaign = isGoogle
      ? recalcCampaign({
          id,
          platform: "GOOGLE_ADS",
          name,
          status: "PAUSED",
          channelType: "Demand Gen",
          budgetDailyMicros: budget,
          spentTodayMicros: 0,
          ...ZERO,
          ctr: 0,
          averageCpcMicros: 0,
          googleType: "DEMAND_GEN",
          googleBidStrategy: "MAXIMIZE_CONVERSIONS",
          geoTargets: [],
          adGroups: [
            recalcGroup({
              id: parentId,
              name,
              status: "ENABLED",
              defaultCpcMicros: 200_000,
              keywords: [],
              ads,
              ...ZERO,
            }),
          ],
          adSets: [],
        })
      : recalcCampaign({
          id,
          platform: "META_ADS",
          name,
          status: "PAUSED",
          channelType: "Engajamento",
          budgetDailyMicros: budget,
          spentTodayMicros: 0,
          ...ZERO,
          ctr: 0,
          averageCpcMicros: 0,
          objective: "OUTCOME_ENGAGEMENT",
          budgetMode: "CBO",
          metaBidStrategy: "LOWEST_COST",
          geoTargets: [],
          adGroups: [],
          adSets: [
            recalcSet({
              id: parentId,
              name,
              status: "ENABLED",
              budgetDailyMicros: budget,
              optimizationGoal: "OFFSITE_CONVERSIONS",
              bidStrategy: "LOWEST_COST",
              geoTargets: [],
              demographics: emptyDemographics(),
              interests: [],
              audiences: [],
              ads,
              ...ZERO,
            }),
          ],
        });

    update(account, (list) => [campaign, ...list]);
    return id;
  }

  function updateCampaign(account: AdAccount, campaignId: string, patch: Partial<Campaign>) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => ({ ...c, ...patch })));
  }
  function setCampaignStatus(account: AdAccount, campaignId: string, status: EntityStatus) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => ({ ...c, status })));
  }
  function deleteCampaign(account: AdAccount, campaignId: string) {
    update(account, (list) => list.filter((c) => c.id !== campaignId));
  }
  function duplicateCampaign(account: AdAccount, campaignId: string): string | undefined {
    const src = getCampaign(account, campaignId);
    if (!src) return undefined;
    const copy = cloneFresh(src);
    update(account, (list) => {
      const idx = list.findIndex((c) => c.id === campaignId);
      const next = [...list];
      next.splice(idx + 1, 0, copy);
      return next;
    });
    return copy.id;
  }

  // ── Grupo (Google) ──────────────────────────────────────────────────────────
  function addAdGroup(account: AdAccount, campaignId: string, name: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) => ({
        ...c,
        adGroups: [
          { id: makeId(`${c.id}-ag`), name: name.trim() || "Novo grupo", status: "ENABLED", defaultCpcMicros: 200_000, keywords: [], ...ZERO },
          ...c.adGroups,
        ],
      })),
    );
  }
  function updateAdGroup(account: AdAccount, campaignId: string, groupId: string, patch: Partial<AdGroup>) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapGroup(c, groupId, (g) => ({ ...g, ...patch }))));
  }
  function deleteAdGroup(account: AdAccount, campaignId: string, groupId: string) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => ({ ...c, adGroups: c.adGroups.filter((g) => g.id !== groupId) })));
  }
  function toggleGroupStatus(account: AdAccount, campaignId: string, groupId: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) => mapGroup(c, groupId, (g) => ({ ...g, status: g.status === "ENABLED" ? "PAUSED" : "ENABLED" }))),
    );
  }

  // ── Conjunto (Meta) ──────────────────────────────────────────────────────────
  function addAdSet(account: AdAccount, campaignId: string, name: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) => ({
        ...c,
        adSets: [
          {
            id: makeId(`${c.id}-as`),
            name: name.trim() || "Novo conjunto",
            status: "ENABLED",
            budgetDailyMicros: Math.round(c.budgetDailyMicros / Math.max(1, c.adSets.length + 1)),
            optimizationGoal: "OFFSITE_CONVERSIONS" as MetaOptimizationGoal,
            bidStrategy: c.metaBidStrategy ?? ("LOWEST_COST" as MetaBidStrategy),
            geoTargets: [],
            demographics: emptyDemographics(),
            interests: [],
            audiences: [],
            ...ZERO,
          },
          ...c.adSets,
        ],
      })),
    );
  }
  function updateAdSet(account: AdAccount, campaignId: string, setId: string, patch: Partial<AdSet>) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => ({ ...s, ...patch }))));
  }
  function deleteAdSet(account: AdAccount, campaignId: string, setId: string) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => ({ ...c, adSets: c.adSets.filter((s) => s.id !== setId) })));
  }
  function toggleSetStatus(account: AdAccount, campaignId: string, setId: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => ({ ...s, status: s.status === "ENABLED" ? "PAUSED" : "ENABLED" }))),
    );
  }
  function updateDemographics(account: AdAccount, campaignId: string, setId: string, demo: Demographics) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => ({ ...s, demographics: demo }))));
  }
  function addInterest(account: AdAccount, campaignId: string, setId: string, interest: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => (s.interests.includes(interest) ? s : { ...s, interests: [...s.interests, interest] }))),
    );
  }
  function removeInterest(account: AdAccount, campaignId: string, setId: string, interest: string) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => ({ ...s, interests: s.interests.filter((i) => i !== interest) }))));
  }

  // ── Keywords (Google) ───────────────────────────────────────────────────────
  function addKeyword(account: AdAccount, campaignId: string, groupId: string, text: string, matchType: MatchType) {
    const t = text.trim();
    if (!t) return;
    const kw: Keyword = { id: makeId(`${groupId}-kw`), text: t, matchType, status: "ENABLED", qualityScore: 0, ...ZERO };
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapGroup(c, groupId, (g) => ({ ...g, keywords: [kw, ...g.keywords] }))));
  }
  function removeKeyword(account: AdAccount, campaignId: string, groupId: string, keywordId: string) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapGroup(c, groupId, (g) => ({ ...g, keywords: g.keywords.filter((k) => k.id !== keywordId) }))));
  }
  function toggleKeyword(account: AdAccount, campaignId: string, groupId: string, keywordId: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        mapGroup(c, groupId, (g) => ({
          ...g,
          keywords: g.keywords.map((k) => (k.id === keywordId ? { ...k, status: k.status === "ENABLED" ? "PAUSED" : "ENABLED" } : k)),
        })),
      ),
    );
  }
  function updateKeywordMatch(account: AdAccount, campaignId: string, groupId: string, keywordId: string, matchType: MatchType) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        mapGroup(c, groupId, (g) => ({ ...g, keywords: g.keywords.map((k) => (k.id === keywordId ? { ...k, matchType } : k)) })),
      ),
    );
  }

  // ── Públicos (Meta) ───────────────────────────────────────────────────────
  function addAudience(account: AdAccount, campaignId: string, setId: string, name: string, type: Audience["type"]) {
    const t = name.trim();
    if (!t) return;
    const aud: Audience = { id: makeId(`${setId}-aud`), name: t, type, status: "ENABLED", sizeEstimate: 0, ...ZERO };
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => ({ ...s, audiences: [aud, ...s.audiences] }))));
  }
  function removeAudience(account: AdAccount, campaignId: string, setId: string, audienceId: string) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapSet(c, setId, (s) => ({ ...s, audiences: s.audiences.filter((a) => a.id !== audienceId) }))));
  }
  function toggleAudience(account: AdAccount, campaignId: string, setId: string, audienceId: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        mapSet(c, setId, (s) => ({
          ...s,
          audiences: s.audiences.map((a) => (a.id === audienceId ? { ...a, status: a.status === "ENABLED" ? "PAUSED" : "ENABLED" } : a)),
        })),
      ),
    );
  }

  // ── Anúncios / criativos ────────────────────────────────────────────────────
  // parentId é um grupo (Google) ou conjunto (Meta) — escolhido pela plataforma
  // da campanha. Ads carregam métricas próprias (zeradas) e NÃO entram no
  // roll-up do grupo/conjunto (recalc continua somando keywords/públicos).
  function mapAdParent(c: Campaign, parentId: string, fn: (ads: Ad[]) => Ad[]): Campaign {
    return c.platform === "GOOGLE_ADS"
      ? mapGroup(c, parentId, (g) => ({ ...g, ads: fn(g.ads ?? []) }))
      : mapSet(c, parentId, (s) => ({ ...s, ads: fn(s.ads ?? []) }));
  }
  function attachCreative(account: AdAccount, campaignId: string, parentId: string, creative: Creative) {
    const ad: Ad = {
      id: makeId(`${parentId}-ad`),
      name: creative.title,
      status: "ENABLED",
      creativeKind: creative.kind,
      creativeSrc: creative.src,
      thumbTone: creative.thumbTone,
      ...ZERO,
    };
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapAdParent(c, parentId, (ads) => [ad, ...ads])));
  }
  function removeAd(account: AdAccount, campaignId: string, parentId: string, adId: string) {
    update(account, (list) => mapCampaign(list, campaignId, (c) => mapAdParent(c, parentId, (ads) => ads.filter((a) => a.id !== adId))));
  }
  function toggleAdStatus(account: AdAccount, campaignId: string, parentId: string, adId: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        mapAdParent(c, parentId, (ads) => ads.map((a) => (a.id === adId ? { ...a, status: a.status === "ENABLED" ? "PAUSED" : "ENABLED" } : a))),
      ),
    );
  }

  // ── Geolocalização ──────────────────────────────────────────────────────────
  function makeGeo(input: { kind: GeoKind; name: string }): GeoTarget {
    return { id: makeId("geo"), kind: input.kind, name: input.name.trim(), reach: 0, excluded: false };
  }
  function addGeo(account: AdAccount, campaignId: string, geo: { kind: GeoKind; name: string }, setId?: string) {
    if (!geo.name.trim()) return;
    const g = makeGeo(geo);
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        setId
          ? mapSet(c, setId, (s) => ({ ...s, geoTargets: [...s.geoTargets, g] }))
          : { ...c, geoTargets: [...c.geoTargets, g] },
      ),
    );
  }
  function removeGeo(account: AdAccount, campaignId: string, geoId: string, setId?: string) {
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        setId
          ? mapSet(c, setId, (s) => ({ ...s, geoTargets: s.geoTargets.filter((g) => g.id !== geoId) }))
          : { ...c, geoTargets: c.geoTargets.filter((g) => g.id !== geoId) },
      ),
    );
  }
  function toggleGeoExcluded(account: AdAccount, campaignId: string, geoId: string, setId?: string) {
    const flip = (g: GeoTarget) => (g.id === geoId ? { ...g, excluded: !g.excluded } : g);
    update(account, (list) =>
      mapCampaign(list, campaignId, (c) =>
        setId
          ? mapSet(c, setId, (s) => ({ ...s, geoTargets: s.geoTargets.map(flip) }))
          : { ...c, geoTargets: c.geoTargets.map(flip) },
      ),
    );
  }

  return (
    <ManageContext.Provider
      value={{
        getCampaigns,
        getCampaign,
        createGoogleCampaign,
        createMetaCampaign,
        createCampaignWithAds,
        updateCampaign,
        setCampaignStatus,
        deleteCampaign,
        duplicateCampaign,
        addAdGroup,
        updateAdGroup,
        deleteAdGroup,
        toggleGroupStatus,
        addAdSet,
        updateAdSet,
        deleteAdSet,
        toggleSetStatus,
        updateDemographics,
        addInterest,
        removeInterest,
        addKeyword,
        removeKeyword,
        toggleKeyword,
        updateKeywordMatch,
        addAudience,
        removeAudience,
        toggleAudience,
        attachCreative,
        removeAd,
        toggleAdStatus,
        addGeo,
        removeGeo,
        toggleGeoExcluded,
      }}
    >
      {children}
    </ManageContext.Provider>
  );
}

export function useManage(): ManageContextValue {
  const ctx = useContext(ManageContext);
  if (!ctx) throw new Error("useManage must be used within <ManageProvider>");
  return ctx;
}
