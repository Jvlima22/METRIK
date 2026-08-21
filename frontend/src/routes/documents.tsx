import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, FileText, LockKeyhole, Search, Settings2, ShieldCheck } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";

export const Route = createFileRoute("/documents")({ component: DocumentsPage });

const documents = [
  { title: "Guia de início", description: "Configure a empresa, o perfil e os primeiros acessos.", category: "Comece aqui", icon: BookOpen },
  { title: "Google Ads e Meta Ads", description: "OAuth, permissões, contas e sincronização.", category: "Integrações", icon: Settings2 },
  { title: "Hub de integrações", description: "IA, CRM, APIs personalizadas e webhooks.", category: "Integrações", icon: FileText },
  { title: "Assinatura e cobrança", description: "Planos, status e gerenciamento da assinatura.", category: "Conta", icon: ShieldCheck },
  { title: "Segurança e privacidade", description: "Isolamento multi-tenant, acesso e proteção de dados.", category: "Segurança", icon: LockKeyhole },
];

function DocumentsPage() {
  return <AppShell><div className="mx-auto max-w-6xl space-y-6"><header><p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">Biblioteca Metrik</p><h1 className="mt-1 text-3xl font-display font-bold text-foreground">Documentos</h1><p className="mt-2 text-sm text-muted-foreground">Guias operacionais para empresas, anúncios, integrações e assinatura.</p></header><GlassCard className="flex items-center gap-3 p-4"><Search className="size-5 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Buscar documentos..." /></GlassCard><div className="grid gap-4 md:grid-cols-2">{documents.map(({ title, description, category, icon: Icon }) => <button key={title} type="button" className="text-left"><GlassCard className="flex h-full items-start gap-4 p-5 transition-colors hover:border-violet-300"><div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600"><Icon className="size-5" /></div><div className="min-w-0"><p className="text-[10px] font-semibold uppercase tracking-wider text-violet-600">{category}</p><h2 className="mt-1 font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p><span className="mt-3 inline-block text-xs font-medium text-violet-600">Abrir documento</span></div></GlassCard></button>)}</div></div></AppShell>;
}
