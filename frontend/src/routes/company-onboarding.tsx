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
type FormState = {
  fullName: string;
  password: string;
  confirmPassword: string;
  tradeName: string;
  cnpj: string;
  companyEmail: string;
};

const emptyForm: FormState = {
  fullName: '',
  password: '',
  confirmPassword: '',
  tradeName: '',
  cnpj: '',
  companyEmail: '',
};

function CompanyOnboardingPage() {
  const navigate = useNavigate();
  const token = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '').get('token') ?? '';
  const [invite, setInvite] = useState<Invite | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [step, setStep] = useState<1 | 2>(1);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cnpjLoading, setCnpjLoading] = useState(false);
  const [cnpjConfirmed, setCnpjConfirmed] = useState(false);

  const setField = (field: keyof FormState, value: string) =>
    setForm((current) => ({ ...current, [field]: value }));

  async function lookupCnpj() {
    const digits = form.cnpj.replace(/\D/g, '');
    if (!digits) {
      setCnpjConfirmed(false);
      return;
    }
    if (digits.length !== 14) {
      setError('Se informar o CNPJ, digite os 14 números completos. Ou deixe o campo em branco para continuar.');
      return;
    }

    setCnpjLoading(true);
    setCnpjConfirmed(false);
    setError(null);
    try {
      const { data } = await apiFetch<{ data: { legalName: string; tradeName: string | null } }>(
        `/company-signup/cnpj/${digits}`,
      );
      if (data.tradeName || data.legalName) setField('tradeName', data.tradeName || data.legalName);
      setCnpjConfirmed(true);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível validar o CNPJ. Você pode deixar esse campo em branco e continuar.');
    } finally {
      setCnpjLoading(false);
    }
  }

  useEffect(() => {
    if (!token) {
      setError('Link de convite ausente.');
      setLoading(false);
      return;
    }

    apiFetch<{ data: Invite }>(`/company-signup/invite?token=${encodeURIComponent(token)}`)
      .then(({ data }) => {
        setInvite(data);
        setField('companyEmail', data.email);
        if (data.provisionalName) setField('tradeName', data.provisionalName);
      })
      .catch((cause) => setError(cause instanceof Error ? cause.message : 'Convite inválido ou expirado'))
      .finally(() => setLoading(false));
  }, [token]);

  function nextStep() {
    if (!form.fullName.trim() || form.password.length < 8 || form.password !== form.confirmPassword) {
      setError('Informe seu nome e uma senha válida de pelo menos 8 caracteres.');
      return;
    }
    setError(null);
    setStep(2);
  }

  async function submit() {
    if (!invite) return;
    if (!form.tradeName.trim()) {
      setError('Informe o nome da empresa para continuar.');
      return;
    }
    if (form.cnpj && !cnpjConfirmed) {
      setError('Valide o CNPJ informado ou deixe o campo em branco para concluir agora.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      await apiFetch<{ data: { companyId: string } }>('/company-signup/complete', {
        method: 'POST',
        body: JSON.stringify({
          token,
          fullName: form.fullName,
          password: form.password,
          tradeName: form.tradeName,
          cnpj: form.cnpj || undefined,
          companyEmail: form.companyEmail || invite.email,
        }),
      });

      const supabase = getSupabaseClient();
      const { error: signInError } = supabase
        ? await supabase.auth.signInWithPassword({ email: invite.email, password: form.password })
        : { error: null };
      if (signInError) throw signInError;

      toast.success('Conta criada com sucesso');
      navigate({ to: '/dashboard' });
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Não foi possível concluir o cadastro.');
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center bg-background"><Loader2 className="size-6 animate-spin text-violet" /></div>;
  }

  if (error && !invite) {
    return <AuthLayout title="Convite indisponível" subtitle="Não foi possível validar este link." footer={null}><div className="flex items-center gap-3 rounded-lg border border-border bg-accent/40 p-4 text-sm text-muted-foreground"><ShieldX className="size-5 shrink-0 text-destructive" /><p>{error}</p></div></AuthLayout>;
  }

  return <AuthLayout title="Criar conta no Metrik" subtitle={`Convite destinado a ${invite?.email ?? ''}`} footer={null}>
    <div className="mb-5 flex items-center gap-2 text-xs"><span className={`flex items-center gap-1 ${step >= 1 ? 'font-semibold text-violet' : 'text-muted-foreground'}`}><CheckCircle2 className="size-4" />Conta</span><span className="h-px flex-1 bg-border" /><span className={`flex items-center gap-1 ${step === 2 ? 'font-semibold text-violet' : 'text-muted-foreground'}`}><Building2 className="size-4" />Empresa</span></div>
    {error && <div className="mb-4 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm text-destructive">{error}</div>}

    {step === 1 ? <div className="space-y-4">
      <div><Label htmlFor="fullName">Seu nome completo *</Label><Input id="fullName" className="mt-1" value={form.fullName} onChange={(e) => setField('fullName', e.target.value)} placeholder="Como devemos chamar você?" /></div>
      <div><Label htmlFor="password">Senha *</Label><Input id="password" type="password" className="mt-1" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder="Mínimo de 8 caracteres" /></div>
      <div><Label htmlFor="confirmPassword">Confirmar senha *</Label><Input id="confirmPassword" type="password" className="mt-1" value={form.confirmPassword} onChange={(e) => setField('confirmPassword', e.target.value)} /></div>
      <p className="text-xs text-muted-foreground">Você poderá completar telefone, CPF e outros dados do perfil depois.</p>
      <Button className="w-full" onClick={nextStep}>Continuar</Button>
    </div> : <div className="space-y-4">
      <div><Label htmlFor="tradeName">Nome da empresa *</Label><Input id="tradeName" className="mt-1" value={form.tradeName} onChange={(e) => setField('tradeName', e.target.value)} placeholder="Como sua empresa é conhecida?" /></div>
      <div><Label htmlFor="companyEmail">E-mail da empresa</Label><Input id="companyEmail" type="email" className="mt-1 bg-muted" value={form.companyEmail} readOnly /><p className="mt-1 text-[11px] text-muted-foreground">Usaremos o e-mail do convite como contato inicial.</p></div>
      <div><Label htmlFor="cnpj">CNPJ <span className="font-normal text-muted-foreground">(opcional)</span></Label><Input id="cnpj" className="mt-1" value={form.cnpj} onChange={(e) => { setField('cnpj', e.target.value); setCnpjConfirmed(false); }} onBlur={() => void lookupCnpj()} placeholder="Você pode informar depois" /><p className={`mt-1 text-[11px] ${cnpjLoading ? 'text-muted-foreground' : cnpjConfirmed ? 'text-emerald-600' : 'text-muted-foreground'}`}>{cnpjLoading ? 'Consultando situação cadastral...' : cnpjConfirmed ? 'CNPJ ativo confirmado' : 'Opcional agora; você pode validar depois em Configurações.'}</p></div>
      <div className="rounded-lg border border-violet/20 bg-violet/5 p-3 text-xs text-muted-foreground">Você poderá completar razão social, endereço, telefone, site, segmento e demais dados depois. Algumas funções avançadas poderão solicitar essas informações.</div>
      <div className="flex gap-2"><Button type="button" variant="outline" onClick={() => setStep(1)}>Voltar</Button><Button className="flex-1" disabled={submitting} onClick={() => void submit()}>{submitting && <Loader2 className="size-4 animate-spin" />}Criar conta e continuar</Button></div>
    </div>}
  </AuthLayout>;
}
