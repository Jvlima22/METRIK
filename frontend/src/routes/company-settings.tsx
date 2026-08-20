import { useEffect, useMemo, useRef, useState, type PointerEvent, type WheelEvent } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, Check, Image, Loader2, Save, Trash2, Upload } from "lucide-react";
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
  timezone?: string | null; logo_path?: string | null; logo_url?: string | null; status?: string;
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
  const [logoUploading, setLogoUploading] = useState(false);
  const [cropDraft, setCropDraft] = useState<{ src: string; fileName: string; mimeType: string } | null>(null);
  const [cropZoom, setCropZoom] = useState(1);
  const [cropX, setCropX] = useState(50);
  const [cropY, setCropY] = useState(50);
  const cropDragRef = useRef<{ startX: number; startY: number; startCropX: number; startCropY: number } | null>(null);

  useEffect(() => {
    apiFetch<{ data: CompanyProfile; completion: Completion }>("/company-profile")
      .then((response) => { setProfile({ ...initialProfile, ...response.data }); setCompletion(response.completion); })
      .catch((reason) => setError(reason instanceof Error ? reason.message : "Não foi possível carregar os dados da empresa"))
      .finally(() => setLoading(false));
  }, []);

  const setField = (field: keyof CompanyProfile, value: string) => setProfile((current) => ({ ...current, [field]: value }));
  const filledFields = useMemo(() => Object.entries(profile).filter(([key, value]) => key !== "id" && typeof value === "string" && value.trim()).length, [profile]);

  function handleCropPointerDown(event: PointerEvent<HTMLDivElement>) {
    event.currentTarget.setPointerCapture(event.pointerId);
    cropDragRef.current = { startX: event.clientX, startY: event.clientY, startCropX: cropX, startCropY: cropY };
  }

  function handleCropPointerMove(event: PointerEvent<HTMLDivElement>) {
    const drag = cropDragRef.current;
    if (!drag) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const nextX = drag.startCropX + ((event.clientX - drag.startX) / rect.width) * 100;
    const nextY = drag.startCropY + ((event.clientY - drag.startY) / rect.height) * 100;
    setCropX(Math.max(0, Math.min(100, nextX)));
    setCropY(Math.max(0, Math.min(100, nextY)));
  }

  function stopCropDrag(event?: PointerEvent<HTMLDivElement>) {
    if (event && event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
    cropDragRef.current = null;
  }

  function handleCropWheel(event: WheelEvent<HTMLDivElement>) {
    event.preventDefault();
    setCropZoom((current) => Math.max(0.25, Math.min(8, current - event.deltaY * 0.0025)));
  }

  function openLogoCrop(file: File) {
    setFeedback(null); setError(null);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Envie uma logo PNG, JPG ou WebP.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('A logo deve ter no máximo 2 MB.'); return; }
    const reader = new FileReader();
    reader.onload = () => { setCropDraft({ src: String(reader.result), fileName: file.name, mimeType: file.type }); setCropZoom(1); setCropX(50); setCropY(50); };
    reader.onerror = () => setError('Não foi possível ler o arquivo');
    reader.readAsDataURL(file);
  }

  async function applyLogoCrop() {
    if (!cropDraft) return;
    const image = new window.Image();
    image.onload = () => {
      const size = 512;
      const canvas = document.createElement('canvas');
      canvas.width = size; canvas.height = size;
      const context = canvas.getContext('2d');
      if (!context) { setError('Não foi possível preparar o recorte'); return; }
      const scale = Math.max(size / image.width, size / image.height) * cropZoom;
      const width = image.width * scale;
      const height = image.height * scale;
      const left = (size - width) * (cropX / 100);
      const top = (size - height) * (cropY / 100);
      context.clearRect(0, 0, size, size);
      context.save();
      context.beginPath();
      context.arc(size / 2, size / 2, size / 2, 0, Math.PI * 2);
      context.clip();
      context.drawImage(image, left, top, width, height);
      context.restore();
      canvas.toBlob((blob) => {
        if (!blob) { setError('Não foi possível gerar o recorte'); return; }
        setCropDraft(null);
        void uploadLogo(new File([blob], `logo-${Date.now()}.png`, { type: 'image/png' }));
      }, 'image/png', 0.94);
    };
    image.onerror = () => setError('Não foi possível abrir a imagem');
    image.src = cropDraft.src;
  }

  async function uploadLogo(file: File) {
    setFeedback(null); setError(null);
    if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type)) { setError('Envie uma logo PNG, JPG ou WebP.'); return; }
    if (file.size > 2 * 1024 * 1024) { setError('A logo deve ter no máximo 2 MB.'); return; }
    setLogoUploading(true);
    try {
      const base64 = await new Promise<string>((resolve, reject) => { const reader = new FileReader(); reader.onload = () => resolve(String(reader.result).split(',')[1] ?? ''); reader.onerror = () => reject(new Error('Não foi possível ler o arquivo')); reader.readAsDataURL(file); });
      const response = await apiFetch<{ data: CompanyProfile; completion: Completion }>('/company-profile/logo', { method: 'POST', body: JSON.stringify({ fileName: file.name, mimeType: file.type, base64 }) });
      setProfile((current) => ({ ...current, ...response.data })); setCompletion(response.completion); setFeedback('Logo da empresa atualizada com sucesso.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível enviar a logo'); }
    finally { setLogoUploading(false); }
  }

  async function removeLogo() {
    setLogoUploading(true); setFeedback(null); setError(null);
    try {
      const response = await apiFetch<{ data: CompanyProfile; completion: Completion }>('/company-profile/logo', { method: 'DELETE' });
      setProfile((current) => ({ ...current, ...response.data })); setCompletion(response.completion); setFeedback('Logo removida.');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Não foi possível remover a logo'); }
    finally { setLogoUploading(false); }
  }

  async function save() {
    setSaving(true); setFeedback(null); setError(null);
    try {
      const response = await apiFetch<{ data: CompanyProfile; completion: Completion }>("/company-profile", { method: "PATCH", body: JSON.stringify(profile) });
      setProfile({ ...initialProfile, ...response.data }); setCompletion(response.completion); setFeedback("Dados da empresa salvos com sucesso.");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Não foi possível salvar os dados da empresa"); }
    finally { setSaving(false); }
  }

  return <AppShell><div className="mx-auto max-w-5xl space-y-5"><section className="rounded-3xl border border-violet-200 bg-gradient-to-br from-violet-50 via-white to-cyan-50 p-5 sm:p-7"><div className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between"><div><div className="mb-2 flex items-center gap-2 text-violet-700"><Building2 className="size-4" /><span className="text-xs font-semibold uppercase tracking-[0.18em]">Configuração da empresa</span></div><h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">Complete o perfil da sua empresa.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">Mantenha os dados atualizados para melhorar relatórios, integrações e recomendações da inteligência da Metrik.</p></div><div className="min-w-[180px] rounded-2xl border border-white bg-white/80 p-4 shadow-sm"><div className="flex items-center justify-between text-xs text-slate-500"><span>Completude</span><span>{completion.percentage}%</span></div><div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-cyan-500 transition-all" style={{ width: `${completion.percentage}%` }} /></div><div className="mt-2 text-xs text-slate-500">{completion.completed} de {completion.total} campos preenchidos</div></div></div></section>{loading ? <GlassCard className="flex min-h-80 items-center justify-center"><Loader2 className="size-6 animate-spin text-violet-600" /></GlassCard> : <><GlassCard className="p-5 sm:p-7"><div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">{profile.logo_url ? <img src={profile.logo_url} alt={`Logo da ${profile.name || 'empresa'}`} className="size-full object-contain" /> : <Image className="size-8 text-slate-300" />}</div><div><h2 className="font-semibold text-slate-900">Logo da empresa</h2><p className="mt-1 text-xs leading-5 text-slate-500">PNG, JPG ou WebP. Tamanho máximo de 2 MB.</p></div></div><div className="flex flex-wrap gap-2"><label className="inline-flex cursor-pointer items-center rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-60"><Upload className="mr-2 size-4" />{logoUploading ? 'Enviando...' : 'Enviar logo'}<input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" disabled={logoUploading} onChange={(event) => { const file = event.target.files?.[0]; if (file) openLogoCrop(file); event.currentTarget.value = ''; }} /></label>{profile.logo_url && <Button type="button" variant="outline" className="rounded-xl" disabled={logoUploading} onClick={() => void removeLogo()}><Trash2 className="mr-2 size-4" />Remover</Button>}</div></div></GlassCard><GlassCard className="p-5 sm:p-7"><div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4"><div><h2 className="font-semibold text-slate-900">Identificação e contato</h2><p className="mt-1 text-xs text-slate-500">Os campos essenciais podem ser preenchidos agora e complementados depois.</p></div><Badge variant="secondary">{filledFields} preenchidos</Badge></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Nome da empresa" value={profile.name ?? ""} onChange={(value) => setField("name", value)} placeholder="Ex.: Metrik Brasil" required /><Field label="Razão social" value={profile.legal_name ?? ""} onChange={(value) => setField("legal_name", value)} placeholder="Nome jurídico da empresa" /><Field label="Nome fantasia" value={profile.trade_name ?? ""} onChange={(value) => setField("trade_name", value)} placeholder="Nome comercial" /><Field label="CNPJ" value={profile.document ?? ""} onChange={(value) => setField("document", value)} placeholder="00.000.000/0000-00" /><Field label="E-mail corporativo" type="email" value={profile.corporate_email ?? ""} onChange={(value) => setField("corporate_email", value)} placeholder="contato@empresa.com.br" required /><Field label="Telefone corporativo" value={profile.corporate_phone ?? ""} onChange={(value) => setField("corporate_phone", value)} placeholder="(00) 00000-0000" /><Field label="Site" value={profile.website ?? ""} onChange={(value) => setField("website", value)} placeholder="https://empresa.com.br" /><Field label="Segmento" value={profile.segment ?? ""} onChange={(value) => setField("segment", value)} placeholder="Ex.: Tecnologia e serviços" /></div></GlassCard><GlassCard className="p-5 sm:p-7"><div className="border-b border-slate-200 pb-4"><h2 className="font-semibold text-slate-900">Endereço e preferências</h2><p className="mt-1 text-xs text-slate-500">Essas informações ajudam a contextualizar análises e campanhas.</p></div><div className="mt-5 grid gap-4 md:grid-cols-2"><Field label="Endereço" value={profile.address ?? ""} onChange={(value) => setField("address", value)} placeholder="Rua, número e complemento" /><Field label="Cidade" value={profile.city ?? ""} onChange={(value) => setField("city", value)} placeholder="Cidade" /><Field label="Estado" value={profile.state ?? ""} onChange={(value) => setField("state", value)} placeholder="SP" /><Field label="CEP" value={profile.postal_code ?? ""} onChange={(value) => setField("postal_code", value)} placeholder="00000-000" /><Field label="País" value={profile.country ?? "Brasil"} onChange={(value) => setField("country", value)} placeholder="Brasil" /><Field label="Fuso horário" value={profile.timezone ?? "America/Sao_Paulo"} onChange={(value) => setField("timezone", value)} placeholder="America/Sao_Paulo" /></div></GlassCard><div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div className="text-sm">{feedback && <span className="flex items-center gap-2 text-emerald-700"><Check className="size-4" />{feedback}</span>}{error && <span className="text-red-600">{error}</span>}</div><Button onClick={save} disabled={saving} className="rounded-xl bg-slate-900 px-6 hover:bg-slate-800"><Save className="mr-2 size-4" />{saving ? "Salvando..." : "Salvar alterações"}</Button></div></>}</div>{cropDraft && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"><div className="w-full max-w-lg rounded-3xl border border-white/70 bg-white p-5 shadow-2xl sm:p-7"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-semibold text-slate-900">Editar logo</h2><p className="mt-1 text-sm text-slate-500">A área circular define exatamente o logo que será salvo.</p></div><button type="button" onClick={() => setCropDraft(null)} className="rounded-lg px-2 py-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Fechar editor">×</button></div><div className="relative mx-auto mt-5 aspect-square max-w-[320px] touch-none select-none overflow-hidden rounded-full border-2 border-dashed border-violet-400 bg-slate-100 shadow-inner cursor-grab active:cursor-grabbing" onPointerDown={handleCropPointerDown} onPointerMove={handleCropPointerMove} onPointerUp={stopCropDrag} onPointerCancel={stopCropDrag} onWheel={handleCropWheel}><div className="pointer-events-none absolute inset-0 z-10 rounded-full ring-1 ring-white/80" /><img src={cropDraft.src} alt="Pré-visualização do recorte circular" draggable={false} className="size-full rounded-full object-cover" style={{ transform: `scale(${cropZoom}) translate(${(cropX - 50) / 8}%, ${(cropY - 50) / 8}%)` }} /></div><p className="mt-3 text-center text-xs text-slate-500">Arraste a imagem para enquadrar. Use a roda do mouse ou o controle para aproximar e afastar.</p><div className="mt-4 space-y-3"><label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Zoom preciso <span className="float-right normal-case font-normal text-slate-400">{cropZoom.toFixed(2)}×</span><input type="range" min="0.25" max="8" step="0.01" value={cropZoom} onChange={(event) => setCropZoom(Number(event.target.value))} className="mt-2 w-full accent-violet-600" /></label><label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Posição horizontal <span className="float-right normal-case font-normal text-slate-400">{Math.round(cropX)}%</span><input type="range" min="0" max="100" step="0.1" value={cropX} onChange={(event) => setCropX(Number(event.target.value))} className="mt-2 w-full accent-violet-600" /></label><label className="block text-xs font-semibold uppercase tracking-wider text-slate-500">Posição vertical <span className="float-right normal-case font-normal text-slate-400">{Math.round(cropY)}%</span><input type="range" min="0" max="100" step="0.1" value={cropY} onChange={(event) => setCropY(Number(event.target.value))} className="mt-2 w-full accent-violet-600" /></label></div><div className="mt-6 flex justify-end gap-2"><Button type="button" variant="outline" className="rounded-xl" onClick={() => setCropDraft(null)}>Cancelar</Button><Button type="button" className="rounded-xl bg-slate-900 hover:bg-slate-800" onClick={() => void applyLogoCrop()} disabled={logoUploading}>Usar recorte</Button></div></div></div>}</AppShell>;
}
