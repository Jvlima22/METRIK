import { useEffect, useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Check, Loader2, Save } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/api";

export const Route = createFileRoute("/company-settings")({ component: CompanySettingsPage });

type CompanyProfile = {
  id: string; name: string; slug?: string; document?: string | null; legal_name?: string | null; trade_name?: string | null;
  corporate_email?: string | null; corporate_phone?: string | null; website?: string | null; segment?: string | null;
  address?: string | null; city?: string | null; state?: string | null; postal_code?: string | null; country?: string | null;
  timezone?: string | null; status?: string;
};

type Completion = { completed: number; total: number; percentage: number };

const initialProfile: CompanyProfile = { id: "", name: "", document: "", legal_name: "", trade_name: "", corporate_email: "", corporate_phone: "", website: "", segment: "", address: "", city: "", state: "", postal_code: "", country: "Brasil", timezone: "America/Sao_Paulo" };

function Field({ label, value, onChange, placeholder, type = "text", required = false }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string; required?: boolean }) {
  return <label className="block text-sm font-medium text-slate-700">{label}{required && <span className="ml-1 text-violet-600">*</span>}<input type={type} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>;
}

function CompanySettingsPage() {
  const [profile, setProfile] = useState<CompanyProfile>(initialProfile);
  const [completion, setCompletion] = useState<Completion>({ completed: 0, total: 14, percentage: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    apiFetch<{ data: CompanyProfile; completion: Completion }>("/company-profile")
      .then((response) => { setProfile({ ...initialProfile, ...response.data }); setCompletion(response.completion); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados da empresa"))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field: keyof CompanyProfile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
  const filledFields = useMemo(() => Object.entries(profile).filter(([key, value]) => key !== "id" && typeof value === "string" && value.trim()).length, [profile]);

  async function save() {
    setSaving(true); setFeedback(null); setError(null);
    try {
      const response = await apiFetch<{ data: CompanyProfile; completion: Completion }>("/company-profile", { method: "PATCH", body: JSON.stringify(profile) });
      setProfile({ ...initialProfile, ...response.data }); setCompletion(response.completion); setFeedback("Dados da empresa salvos com sucesso.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar os dados da empresa"); }
    finally { setSaving(false); }
  }

  return <AppShell><div className="mx-auto max-w-5xl space-y-5"><section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 sm:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-violet-700"><Building2 className="size-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Configuração da empresa</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Complete o perfil da sua empresa.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Mantenha os dados atualizados para melhorar relatórios, integrações e recomendações da inteligência da Metrik.</p></div><div className="min-w-[180px] rounded-2xl border border-white bg-white/80 p-4 shadow-sm"><div className="flex items-center justify-between text-xs text-slate-500"><span>Completude</span><span>{completion.percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all" style={{ width: `${completion.percentage}%` }} /></div><div className="mt-2 text-xs text-slate-500">{completion.completed} de {completion.total} campos preenchidos</div></div></div></section>{loading ? <GlassCard className="flex min-h-80 items-center justify-center"><Loader2 className="size-6 animate-spin text-violet-600" /></GlassCard> : <><GlassCard className="p-5 sm:p-7"><div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><h2 className="font-semibold text-slate-900">Identificação e contato</h2><p className="mt-1 text-xs text-slate-500">Os campos essenciais podem ser preenchidos agora e complementados depois.</p></div><Badge variant="secondary">{filledFields} preenchidos</Badge></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Nome da empresa" value={profile.name ?? ""} onChange={(value) => setField("name", value)} placeholder="Ex.: Metrik Brasil" required /><Field label="Razão social" value={profile.legal_name ?? ""} onChange={(value) => setField("legal_name", value)} placeholder="Nome jurídico da empresa" /><Field label="Nome fantasia" value={profile.trade_name ?? ""} onChange={(value) => setField("trade_name", value)} placeholder="Nome comercial" /><Field label="CNPJ" value={profile.document ?? ""} onChange={(value) => setField("document", value)} placeholder="00.000.000/0000-00" /><Field label="E-mail corporativo" type="email" value={profile.corporate_email ?? ""} onChange={(value) => setField("corporate_email", value)} placeholder="contato@empresa.com.br" required /><Field label="Telefone corporativo" value={profile.corporate_phone ?? ""} onChange={(value) => setField("corporate_phone", value)} placeholder="(00) 00000-0000" /><Field label="Site" value={profile.website ?? ""} onChange={(value) => setField("website", value)} placeholder="https://empresa.com.br" /><Field label="Segmento" value={profile.segment ?? ""} onChange={(value) => setField("segment", value)} placeholder="Ex.: Tecnologia e serviços" /></div></GlassCard><GlassCard className="p-5 sm:p-7"><div className="border-b border-slate-200 pb-4"><h2 className="font-semibold text-slate-900">Endereço e preferências</h2><p className="mt-1 text-xs text-slate-500">Essas informações ajudam a contextualizar análises e campanhas.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Endereço" value={profile.address ?? ""} onChange={(value) => setField("address", value)} placeholder="Rua, número e complemento" /><Field label="Cidade" value={profile.city ?? ""} onChange={(value) => setField("city", value)} placeholder="Cidade" /><Field label="Estado" value={profile.state ?? ""} onChange={(value) => setField("state", value)} placeholder="SP" /><Field label="CEP" value={profile.postal_code ?? ""} onChange={(value) => setField("postal_code", value)} placeholder="00000-000" /><Field label="País" value={profile.country ?? "Brasil"} onChange={(value) => setField("country", value)} placeholder="Brasil" /><Field label="Fuso horário" value={profile.timezone ?? "America/Sao_Paulo"} onChange={(value) => setField("timezone", value)} placeholder="America/Sao_Paulo" /></div></GlassCard><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm">{feedback && <span className="flex items-center gap-2 text-emerald-700"><Check className="size-4" />{feedback}</span>}{error && <span className="text-red-600">{error}</span>}</div><Button onClick={save} disabled={saving} className="rounded-xl bg-slate-900 px-6 hover:bg-slate-800"><Save className="mr-2 size-4" />{saving ? "Salvando..." : "Salvar alterações"}</Button></div></>}</div></AppShell>;
}
