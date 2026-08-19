import { getSupabaseAdmin } from '../lib/supabase';
import { AppError } from '../utils/AppError';

export type CompanyOnboardingInput = {
  primaryGoal: string;
  adChannels: string[];
  conversionEvent: string;
  managementModel: string;
  answers?: Record<string, unknown>;
  formVersion?: string;
};

const allowedGoals = new Set(['Gerar mais leads', 'Aumentar vendas', 'Reduzir custos', 'Melhorar o ROAS', 'Criar anúncios com IA', 'Acompanhar campanhas']);
const allowedChannels = new Set(['Meta Ads', 'Google Ads', 'Meta Ads + Google Ads', 'Ainda não anuncio', 'Outro canal']);
const allowedConversions = new Set(['Compra', 'Lead', 'Mensagem no WhatsApp', 'Ligação', 'Agendamento', 'Visita ao site', 'Outro']);
const allowedManagement = new Set(['Eu mesmo', 'Equipe interna', 'Agência', 'Freelancer', 'Ainda não tenho campanhas']);

function clean(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

export async function getCompanyOnboarding(companyId: string) {
  const { data, error } = await getSupabaseAdmin()
    .from('company_onboarding_profiles')
    .select('id,company_id,primary_goal,ad_channels,conversion_event,management_model,answers,form_version,started_at,completed_at,created_at,updated_at')
    .eq('company_id', companyId)
    .maybeSingle();
  if (error) throw new AppError(`Não foi possível carregar o onboarding: ${error.message}`, 500);
  return {
    eligible: Boolean(data && !data.completed_at),
    profile: data ?? null,
  };
}

export async function saveCompanyOnboarding(companyId: string, input: CompanyOnboardingInput) {
  const primaryGoal = clean(input.primaryGoal);
  const conversionEvent = clean(input.conversionEvent);
  const managementModel = clean(input.managementModel);
  const adChannels = Array.isArray(input.adChannels) ? input.adChannels.map(clean).filter(Boolean) : [];
  if (!allowedGoals.has(primaryGoal)) throw new AppError('Objetivo principal inválido', 400);
  if (!adChannels.length || adChannels.some((channel) => !allowedChannels.has(channel))) throw new AppError('Canais de anúncios inválidos', 400);
  if (!allowedConversions.has(conversionEvent)) throw new AppError('Evento de conversão inválido', 400);
  if (!allowedManagement.has(managementModel)) throw new AppError('Modelo de gestão inválido', 400);

  const now = new Date().toISOString();
  const { data, error } = await getSupabaseAdmin()
    .from('company_onboarding_profiles')
    .upsert({
      company_id: companyId,
      primary_goal: primaryGoal,
      ad_channels: adChannels,
      conversion_event: conversionEvent,
      management_model: managementModel,
      answers: input.answers ?? { primaryGoal, adChannels, conversionEvent, managementModel },
      form_version: clean(input.formVersion) || 'ads-onboarding-v1',
      started_at: now,
      completed_at: now,
      updated_at: now,
    }, { onConflict: 'company_id' })
    .select('id,company_id,primary_goal,ad_channels,conversion_event,management_model,answers,form_version,started_at,completed_at,created_at,updated_at')
    .single();
  if (error || !data) throw new AppError(`Não foi possível salvar o onboarding: ${error?.message ?? 'registro vazio'}`, 500);
  return { eligible: false, profile: data };
}

export async function seedPendingCompanyOnboarding(companyId: string) {
  const { error } = await getSupabaseAdmin()
    .from('company_onboarding_profiles')
    .upsert({ company_id: companyId, started_at: null, completed_at: null, form_version: 'ads-onboarding-v1' }, { onConflict: 'company_id', ignoreDuplicates: true });
  if (error) throw new AppError(`Empresa criada, mas não foi possível preparar o onboarding: ${error.message}`, 500);
}
