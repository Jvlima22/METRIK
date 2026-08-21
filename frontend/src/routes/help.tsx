import { createFileRoute } from "@tanstack/react-router";
import { BookOpen, ChevronRight, CircleHelp, Mail, Search, ShieldCheck, Sparkles } from "lucide-react";
import { AppShell } from "@/components/app-shell";
import { GlassCard } from "@/components/glass-card";

export const Route = createFileRoute("/help")({ component: HelpPage });

const topics = [
  { title: "Primeiros passos", description: "Configure sua empresa e conecte a primeira conta de anúncios.", icon: Sparkles },
  { title: "Google Ads e Meta Ads", description: "OAuth, permissões, contas e sincronização de métricas.", icon: BookOpen },
  { title: "Assinatura", description: "Planos, status da assinatura e gerenciamento de cobrança.", icon: ShieldCheck },
];

function HelpPage() {
  return <AppShell><div className="mx-auto max-w-6xl space-y-6"><header><p className="text-xs font-medium uppercase tracking-[0.18em] text-violet-600">Central Metrik</p><h1 className="mt-1 text-3xl font-display font-bold text-foreground">Obter ajuda</h1><p className="mt-2 text-sm text-muted-foreground">Encontre respostas rápidas para operar sua empresa e suas contas de anúncios.</p></header><GlassCard className="flex items-center gap-3 p-4"><Search className="size-5 text-muted-foreground" /><input className="w-full bg-transparent text-sm outline-none" placeholder="Buscar na central de ajuda..." /></GlassCard><div className="grid gap-4 md:grid-cols-3">{topics.map(({ title, description, icon: Icon }) => <button key={title} type="button" className="text-left"><GlassCard className="h-full p-5 transition-colors hover:border-violet-300"><Icon className="size-5 text-violet-600" /><h2 className="mt-4 font-semibold">{title}</h2><p className="mt-2 text-xs leading-5 text-muted-foreground">{description}</p><span className="mt-4 flex items-center gap-1 text-xs font-medium text-violet-600">Abrir guia <ChevronRight className="size-3.5" /></span></GlassCard></button>)}</div><GlassCard className="p-6"><div className="flex items-start gap-4"><CircleHelp className="mt-0.5 size-5 text-violet-600" /><div><h2 className="font-semibold">Ainda precisa de ajuda?</h2><p className="mt-1 text-sm text-muted-foreground">Envie uma mensagem para o suporte da Metrik com o contexto da sua empresa e da conta ativa.</p><button type="button" className="mt-4 inline-flex items-center gap-2 rounded-lg bg-foreground px-3 py-2 text-xs font-semibold text-background"><Mail className="size-3.5" /> Falar com suporte</button></div></div></GlassCard></div></AppShell>;
}
