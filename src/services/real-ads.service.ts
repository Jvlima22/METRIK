import { getSupabaseAdmin } from '../lib/supabase';
import { AppError } from '../utils/AppError';

function dateOnly(value: string | undefined, fallback: Date) {
  if (value && /^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  return fallback.toISOString().slice(0, 10);
}

export async function getRealAdsMetrics(companyId: string, startInput?: string, endInput?: string) {
  const endDate = dateOnly(endInput, new Date());
  const startFallback = new Date(`${endDate}T00:00:00Z`);
  startFallback.setUTCDate(startFallback.getUTCDate() - 29);
  const startDate = dateOnly(startInput, startFallback);

  const { data: rows, error } = await getSupabaseAdmin()
    .from('ad_daily_metrics')
    .select('metric_date,impressions,reach,clicks,spend,cost_micros,conversions,conversion_value,ctr,cpc,cpm,platform,campaign_id,ad_account_id,ad_platform_campaigns!inner(external_campaign_id,name,status),ad_platform_accounts!inner(external_account_id,name)')
    .eq('company_id', companyId)
    .gte('metric_date', startDate)
    .lte('metric_date', endDate)
    .order('metric_date', { ascending: true });
  if (error) throw new AppError(`Não foi possível consultar métricas reais: ${error.message}`, 500);

  const campaignMap = new Map<string, { campaignId: string; campaignName: string; platform: string; status: string; impressions: number; clicks: number; costMicros: number; conversions: number; ctr: number; averageCpcMicros: number }>();
  const trendMap = new Map<string, { iso: string; date: string; impressions: number; clicks: number; conversions: number; cost: number }>();
  for (const row of (rows ?? []) as any[]) {
    const campaign = Array.isArray(row.ad_platform_campaigns) ? row.ad_platform_campaigns[0] : row.ad_platform_campaigns;
    const impressions = Number(row.impressions ?? 0);
    const clicks = Number(row.clicks ?? 0);
    const conversions = Number(row.conversions ?? 0);
    const spend = Number(row.spend ?? 0);
    const existing = campaignMap.get(row.campaign_id) ?? { campaignId: row.campaign_id, campaignName: campaign?.name ?? 'Campanha sem nome', platform: row.platform, status: campaign?.status ?? 'UNKNOWN', impressions: 0, clicks: 0, costMicros: 0, conversions: 0, ctr: 0, averageCpcMicros: 0 };
    existing.impressions += impressions;
    existing.clicks += clicks;
    existing.conversions += conversions;
    existing.costMicros += Number(row.cost_micros ?? Math.round(spend * 1_000_000));
    existing.ctr = existing.impressions > 0 ? existing.clicks / existing.impressions : 0;
    existing.averageCpcMicros = existing.clicks > 0 ? existing.costMicros / existing.clicks : 0;
    campaignMap.set(row.campaign_id, existing);
    const day = trendMap.get(row.metric_date) ?? { iso: row.metric_date, date: String(row.metric_date).slice(5), impressions: 0, clicks: 0, conversions: 0, cost: 0 };
    day.impressions += impressions;
    day.clicks += clicks;
    day.conversions += conversions;
    day.cost += spend;
    trendMap.set(row.metric_date, day);
  }
  return { startDate, endDate, hasData: campaignMap.size > 0, campaigns: [...campaignMap.values()], trend: [...trendMap.values()] };
}
