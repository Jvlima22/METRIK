import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useState } from 'react';
import { Building2, CheckCircle2, Loader2, ShieldX } from 'lucide-react';
import { toast } from 'sonner';
import { AuthLayout } from '@/components/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiFetch } from '@/lib/api';
import { getSupabaseClient } from '@/lib/supabase';

export const Route = createFileRoute('/company-onboarding')({ component: CompanyOnboardingPage });

type Invite = { id: string; email: string; provisionalName?: string | null; expiresAt: string };
type FormState = { fullName: string; phone: string; cpf: string; password: string; confirmPassword: string; legalName: string; tradeName: string; cnpj: string; companyEmail: string; companyPhone: string; website: string; segment: string; address: string; city: string; state: string; postalCode: string; country: string; timezone: string };
const emptyForm: FormState = { fullName: '', phone: '', cpf: '', password: '', confirmPassword: '', legalName: '', tradeName: '', cnpj: '', companyEmail: '', companyPhone: '', website: '', segment: '', address: '', city: '', state: '', postalCode: '', country: 'Brasil', timezone: 'America/Sao_Paulo' };

function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token') ?? '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const setField = (field: keyof FormState, value: string) => setForm((current) => ({ ...current, [field]: value }));

  useEffect(() => {
    if (!token) { setError('Link de convite ausente.'); setLoading(false); return; }
    apiFetch<{ data: Invite }>(`/company-signup/invite?token=${encodeURIComponent(token)}`)
      .then(({ data }) => { setInvite(data); setField('companyEmail', data.email); if (data.provisionalName) setField('tradeName', data.provisionalName); })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Convite inválido ou expirado'))
      .finally(() => setLoading(false));
  }, [token]);

  function nextStep() {
    if (!form.fullName.trim() || !form.password || form.password.length < 8 || form.password !== form.confirmPassword) { setError('Informe seu nome e uma senha válida de pelo menos 8 caracteres.'); return; }
    setError(null); setStep(2);
  }

  async function submit() {
    if (!invite) return;
    if (!form.legalName.trim() || !form.cnpj.trim() || !form.companyEmail.trim()) { setError('Razão social, CNPJ e e-mail corporativo são obrigatórios.'); return; }
    setSubmitting(true); setError(null);
    try {
      await apiFetch<{ data: { companyId: string } }>('/company-signup/complete', { method: 'POST', body: JSON.stringify({ token, ...form }) });
      const supabase = getSupabaseClient();
      const { error: signInError } = supabase ? await supabase.auth.signInWithPassword({ email: invite.email, password: form.password }) : { error: null };
      if (signInError) throw signInError;
      toast.success('Empresa cadastrada com sucesso');
      navigate({ to: '/dashboard' });
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o cadastro.'); } finally { setSubmitting(false); }
  }

  if (loading) return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-violet" /></div>;
  if (error && !invite) return <AuthLayout title="Convite indisponível" subtitle="Não foi possível validar este link."><div className="flex items-center gap-3 rounded-lg border border-border bg-accent/40 p-4 text-sm text-muted-foreground"><ShieldX className="size-5 shrink-0 text-destructive" /><p>{error}</p></div></AuthLayout>;

  return <AuthLayout title="Configurar empresa" subtitle={`Convite destinado a ${invite?.email ?? ''}`}>
    <div className="mb-5 flex items-center gap-2 text-xs"><span className={`flex items-center gap-1 ${step >= 1 ? 'font-semibold text-violet' : 'text-muted-foreground'}`}><CheckCircle2 className="size-4" />Conta</span><span className="h-px flex-1 bg-border" /><span className={`flex items-center gap-1 ${step === 2 ? 'font-semibold text-violet' : 'text-muted-foreground'}`}><Building2 className="size-4" />Empresa</span></div>
    {error && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}
    {step === 1 ? <div className="space-y-4"><div><Label htmlFor="fullName">Nome completo</Label><Input id="fullName" className="mt-1" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} /></div><div><Label htmlFor="phone">Telefone</Label><Input id="phone" className="mt-1" value={form.phone} onChange={(e) => setField('phone', e.target.value)} /></div><div><Label htmlFor="cpf">CPF</Label><Input id="cpf" className="mt-1" value={form.cpf} onChange={(e) => setField('cpf', e.target.value)} /></div><div><Label htmlFor="password">Senha</Label><Input id="password" type="password" className="mt-1" value={form.password} onChange={(e) => setField('password', e.target.value)} /></div><div><Label htmlFor="confirmPassword">Confirmar senha</Label><Input id="confirmPassword" type="password" className="mt-1" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} /></div><Button className="w-full" onClick={nextStep}>Continuar para dados da empresa</Button></div> : <div className="grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Label htmlFor="legalName">Razão social *</Label><Input id="legalName" className="mt-1" value={form.legalName} onChange={(e) => setField('legalName', e.target.value)} /></div><div><Label htmlFor="tradeName">Nome fantasia</Label><Input id="tradeName" className="mt-1" value={form.tradeName} onChange={(e) => setField('tradeName', e.target.value)} /></div><div><Label htmlFor="cnpj">CNPJ *</Label><Input id="cnpj" className="mt-1" value={form.cnpj} onChange={(e) => setField('cnpj', e.target.value)} /></div><div><Label htmlFor="companyEmail">E-mail corporativo *</Label><Input id="companyEmail" type="email" className="mt-1" value={form.companyEmail} onChange={(e) => setField('companyEmail', e.target.value)} /></div><div><Label htmlFor="companyPhone">Telefone corporativo</Label><Input id="companyPhone" className="mt-1" value={form.companyPhone} onChange={(e) => setField('companyPhone', e.target.value)} /></div><div><Label htmlFor="website">Site</Label><Input id="website" className="mt-1" value={form.website} onChange={(e) => setField('website', e.target.value)} /></div><div><Label htmlFor="segment">Segmento</Label><Input id="segment" className="mt-1" value={form.segment} onChange={(e) => setField('segment', e.target.value)} /></div><div className="sm:col-span-2"><Label htmlFor="address">Endereço</Label><Input id="address" className="mt-1" value={form.address} onChange={(e) => setField('address', e.target.value)} /></div><div><Label htmlFor="city">Cidade</Label><Input id="city" className="mt-1" value={form.city} onChange={(e) => setField('city', e.target.value)} /></div><div><Label htmlFor="state">Estado</Label><Input id="state" className="mt-1" value={form.state} onChange={(e) => setField('state', e.target.value)} /></div><div><Label htmlFor="postalCode">CEP</Label><Input id="postalCode" className="mt-1" value={form.postalCode} onChange={(e) => setField('postalCode', e.target.value)} /></div><div><Label htmlFor="country">País</Label><Input id="country" className="mt-1" value={form.country} onChange={(e) => setField('country', e.target.value)} /></div><div className="flex gap-2 sm:col-span-2"><Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button><Button className="flex-1" disabled={submitting} onClick={() => void submit()}>{submitting && <Loader2 className="size-4 animate-spin" />}Concluir cadastro da empresa</Button></div></div>}
  </AuthLayout>;
}
