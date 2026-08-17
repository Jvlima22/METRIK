export type AdsMetric = {
  id: string;
  name: string;
  platform: "GOOGLE_ADS" | "META_ADS";
  impressions: number;
  clicks: number;
  conversions: number;
  spend: number;
  hour: number;
  dayOfWeek: number;
};

export type AdsOpportunity = {
  metricId: string;
  title: string;
  window: string;
  score: number;
  confidence: "low" | "medium" | "high";
  evidence: string[];
  suggestedAction: string;
};

const rate = (value: number, base: number) => (base > 0 ? value / base : 0);

export function rankAdsOpportunities(metrics: AdsMetric[]): AdsOpportunity[] {
  return metrics
    .filter((item) => item.impressions >= 100)
    .map((item) => {
      const ctr = rate(item.clicks, item.impressions);
      const cvr = rate(item.conversions, item.clicks);
      const cpc = rate(item.spend, item.clicks);
      const score = Math.round(Math.min(100, ctr * 4500 + cvr * 3500 + Math.min(item.impressions / 1000, 10) * 2));
      const confidence: AdsOpportunity["confidence"] = item.impressions >= 5000 ? "high" : item.impressions >= 1000 ? "medium" : "low";
      const nextHour = (item.hour + 2) % 24;
      const window = `${String(item.hour).padStart(2, "0")}:00-${String(nextHour).padStart(2, "0")}:00`;
      return {
        metricId: item.id,
        title: `Oportunidade em ${item.name}`,
        window,
        score,
        confidence,
        evidence: [
          `CTR de ${(ctr * 100).toFixed(2)}%`,
          `Conversão de ${(cvr * 100).toFixed(2)}%`,
          `CPC médio de R$ ${cpc.toFixed(2)}`,
          `${item.impressions.toLocaleString("pt-BR")} impressões`,
        ],
        suggestedAction: `Concentrar o teste entre ${window} e criar duas variações do anúncio.`,
      };
    })
    .sort((a, b) => b.score - a.score);
}
