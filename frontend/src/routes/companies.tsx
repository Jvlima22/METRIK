import { useEffect, useState } from 'react';
import { Building2, MailPlus, Plus, ShieldCheck } from 'lucide-react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export const Route = createFileRoute('/companies')({ component: CompaniesPage });

type Company = { id: string; name: string; slug: string; document?: string | null; status: string; timezone: string; created_at: string };

function CompaniesPage() {
  const { isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [name, setName] = useState('');
  const [document, setDocument] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [companyInviteEmail, setCompanyInviteEmail] = useState('');
  const [provisionalName, setProvisionalName] = useState('');
  const [generatedUrl, setGeneratedUrl] = useState('');
  const [inviteCompanyId, setInviteCompanyId] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function loadCompanies() {
    try { const result = await apiFetch<{ data: Company[] }>('/companies'); setCompanies(result.data); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao carregar empresas'); }
  }
  useEffect(() => { if (isAdmin) void loadCompanies(); }, [isAdmin]);

  async function createNewCompany() {
    setLoading(true); setMessage(null);
    try { await apiFetch('/companies', { method: 'POST', body: JSON.stringify({ name, document, inviteEmail: inviteEmail || undefined }) }); setName(''); setDocument(''); setInviteEmail(''); setMessage('Empresa criada e convite processado.'); await loadCompanies(); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao criar empresa'); } finally { setLoading(false); }
  }

  async function createCompanyInvite() {
    setLoading(true); setMessage(null);
    try { const result = await apiFetch<{ data: { inviteUrl: string } }>('/company-signup/invites', { method: 'POST', body: JSON.stringify({ email: companyInviteEmail, provisionalName }) }); setGeneratedUrl(result.data.inviteUrl); setCompanyInviteEmail(''); setProvisionalName(''); setMessage('Link único gerado e convite enviado por e-mail.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao gerar convite'); } finally { setLoading(false); }
  }

  async function inviteMember() {
    if (!inviteCompanyId || !inviteEmail) return;
    setLoading(true); setMessage(null);
    try { await apiFetch(`/companies/${inviteCompanyId}/invites`, { method: 'POST', body: JSON.stringify({ email: inviteEmail, role: 'COMPANY_OPERATOR' }) }); setInviteEmail(''); setMessage('Convite enviado.'); } catch (error) { setMessage(error instanceof Error ? error.message : 'Falha ao enviar convite'); } finally { setLoading(false); }
  }

  if (!isAdmin) return <AppShell><GlassCard className="p-8"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">Somente o administrador global pode gerenciar empresas.</p></GlassCard></AppShell>;

  return <AppShell><div className="space-y-6">
    <div><div className="flex items-center gap-2"><ShieldCheck className="size-6 text-violet" /><h1 className="font-display text-2xl font-bold">Empresas</h1></div><p className="mt-1 text-sm text-muted-foreground">Cadastro e administração dos tenants isolados do Metrik.</p></div>
    {message && <div className="rounded-lg border border-violet/20 bg-violet/5 px-4 py-3 text-sm">{message}</div>}
    <div className="grid gap-4 lg:grid-cols-2">
      <GlassCard className="space-y-4 p-5"><div className="flex items-center gap-2"><MailPlus className="size-4 text-violet" /><h2 className="font-semibold">Convidar nova empresa</h2></div><Input placeholder="E-mail do responsável" type="email" value={companyInviteEmail} onChange={(e) => setCompanyInviteEmail(e.target.value)} /><Input placeholder="Nome provisório da empresa (opcional)" value={provisionalName} onChange={(e) => setProvisionalName(e.target.value)} /><Button disabled={loading || !companyInviteEmail} onClick={() => void createCompanyInvite()} className="gap-2 bg-gradient-to-r from-violet to-cyan text-white"><MailPlus className="size-4" />Gerar link de convite</Button>{generatedUrl && <div className="space-y-2 rounded-lg border border-violet/20 bg-violet/5 p-3"><p className="text-xs font-medium">Link único — válido por 72 horas</p><Input readOnly value={generatedUrl} onFocus={(e) => e.currentTarget.select()} /><Button variant="outline" className="w-full" onClick={() => void navigator.clipboard?.writeText(generatedUrl)}>Copiar link</Button></div>}</GlassCard>
      <GlassCard className="space-y-4 p-5"><div className="flex items-center gap-2"><Plus className="size-4 text-violet" /><h2 className="font-semibold">Nova empresa direta</h2></div><Input placeholder="Nome da empresa" value={name} onChange={(e) => setName(e.target.value)} /><Input placeholder="CNPJ ou identificador (opcional)" value={document} onChange={(e) => setDocument(e.target.value)} /><Input placeholder="E-mail do administrador (opcional)" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /><Button disabled={loading || !name.trim()} onClick={() => void createNewCompany()} className="gap-2 bg-gradient-to-r from-violet to-cyan text-white"><Plus className="size-4" />Criar empresa</Button></GlassCard>
      <GlassCard className="space-y-4 p-5"><div className="flex items-center gap-2"><MailPlus className="size-4 text-cyan" /><h2 className="font-semibold">Convidar membro</h2></div><select className="h-10 rounded-md border bg-background px-3 text-sm" value={inviteCompanyId} onChange={(e) => setInviteCompanyId(e.target.value)}><option value="">Selecione a empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select><Input placeholder="E-mail do membro" type="email" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} /><Button variant="outline" disabled={loading || !inviteCompanyId || !inviteEmail} onClick={() => void inviteMember()} className="gap-2"><MailPlus className="size-4" />Enviar convite de operador</Button></GlassCard>
    </div>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{companies.map((company) => <GlassCard key={company.id} className="cursor-pointer p-5 transition-colors hover:border-violet/40" onClick={() => { window.localStorage.setItem('metrik:active-company-id', company.id); setMessage(`Empresa ativa selecionada: ${company.name}`); }}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet/10 p-2.5"><Building2 className="size-5 text-violet" /></div><div><h3 className="font-semibold">{company.name}</h3><p className="text-xs text-muted-foreground">{company.slug}</p></div></div><Badge variant="outline">{company.status}</Badge></div><p className="mt-4 text-xs text-muted-foreground">Timezone: {company.timezone}</p><p className="mt-2 text-[11px] text-violet">Clique para selecionar como empresa ativa</p></GlassCard>)}{companies.length === 0 && <GlassCard className="p-8 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Nenhuma empresa cadastrada ainda.</GlassCard>}</div>
  </div></AppShell>;
}
