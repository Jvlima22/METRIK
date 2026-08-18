import { useEffect, useState } from 'react';
import { Building2, ShieldCheck } from 'lucide-react';
import { createFileRoute } from '@tanstack/react-router';
import { AppShell } from '@/components/app-shell';
import { GlassCard } from '@/components/glass-card';
import { Badge } from '@/components/ui/badge';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';

export const Route = createFileRoute('/companies')({ component: CompaniesPage });
type Company = { id: string; name: string; slug: string; status: string; timezone: string };

function CompaniesPage() {
  const { isAdmin } = useAuth();
  const [companies, setCompanies] = useState<Company[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isAdmin) return;
    apiFetch<{ data: Company[] }>('/companies').then(({ data }) => setCompanies(data)).catch((error) => setMessage(error instanceof Error ? error.message : 'Falha ao carregar empresas'));
  }, [isAdmin]);

  if (!isAdmin) return <AppShell><GlassCard className="p-8"><h1 className="text-xl font-semibold">Acesso restrito</h1><p className="mt-2 text-sm text-muted-foreground">Somente o administrador global pode gerenciar empresas.</p></GlassCard></AppShell>;

  return <AppShell><div className="space-y-6">
    <div><div className="flex items-center gap-2"><ShieldCheck className="size-6 text-violet" /><h1 className="font-display text-2xl font-bold">Empresas</h1></div><p className="mt-1 text-sm text-muted-foreground">Gerencie empresas cadastradas e selecione o contexto ativo. Para convidar, use o popup “Convidar empresa ou membro” no menu da conta.</p></div>
    {message && <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">{message}</div>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{companies.map((company) => <GlassCard key={company.id} className="cursor-pointer p-5 transition-colors hover:border-violet/40" onClick={() => { window.localStorage.setItem('metrik:active-company-id', company.id); setMessage(`Empresa ativa selecionada: ${company.name}`); }}><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-3"><div className="rounded-xl bg-violet/10 p-2.5"><Building2 className="size-5 text-violet" /></div><div><h3 className="font-semibold">{company.name}</h3><p className="text-xs text-muted-foreground">{company.slug}</p></div></div><Badge variant="outline">{company.status}</Badge></div><p className="mt-4 text-xs text-muted-foreground">Timezone: {company.timezone}</p><p className="mt-2 text-[11px] text-violet">Clique para selecionar como empresa ativa</p></GlassCard>)}{companies.length === 0 && <GlassCard className="p-8 text-sm text-muted-foreground md:col-span-2 xl:col-span-3">Nenhuma empresa cadastrada ainda. Use o popup de convite para iniciar o cadastro de uma nova empresa.</GlassCard>}</div>
  </div></AppShell>;
}
