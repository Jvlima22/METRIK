import { useEffect, useState } from "react";
import { Loader2, Send } from "lucide-react";
import { toast } from "sonner";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth-context";
import { apiFetch } from "@/lib/api";

/**
 * Diálogo único para convidar um novo membro ou uma nova empresa por e-mail.
 * O backend decide o tipo pelo contexto de empresa ativa.
 */
export function InviteUserDialog({
  open,
  onOpenChange,
  mode = 'MEMBER',
  initialCompanyId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'COMPANY' | 'MEMBER';
  initialCompanyId?: string | null;
}) {
  const { inviteUser } = useAuth();
  const isCompanyInvite = mode === 'COMPANY';
  const [email, setEmail] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [companies, setCompanies] = useState<Array<{ id: string; name: string; status: string }>>([]);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!open || isCompanyInvite) return;
    apiFetch<{ data: Array<{ id: string; name: string; status: string }> }>('/companies')
      .then(({ data }) => {
        const active = data.filter((company) => company.status === 'ACTIVE');
        setCompanies(active);
        const stored = typeof window !== 'undefined' ? window.localStorage.getItem('metrik:active-company-id') : null;
        const preferred = initialCompanyId && active.some((company) => company.id === initialCompanyId) ? initialCompanyId : stored;
        setCompanyId(preferred && active.some((company) => company.id === preferred) ? preferred : active[0]?.id ?? '');
      })
      .catch(() => { setCompanies([]); setCompanyId(''); });
  }, [initialCompanyId, open, isCompanyInvite]);

  async function handleInvite() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setSending(true);
    if (!isCompanyInvite && !companyId) {
      toast.error('Selecione a empresa do membro');
      return;
    }
    const { error } = await inviteUser(trimmed, mode, companyId || undefined);
    setSending(false);
    if (error) {
      toast.error("Falha ao enviar convite", { description: error });
      return;
    }
    toast.success("Convite enviado", { description: `Um link de cadastro foi enviado para ${trimmed}.` });
    setEmail("");
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isCompanyInvite ? 'Convidar nova empresa' : 'Convidar membro'}</DialogTitle>
          <DialogDescription>
            {isCompanyInvite ? 'Envie um link para o responsável criar a conta e cadastrar a empresa.' : 'Envie um link para um funcionário criar a conta e acessar os dados da empresa ativa.'}
          </DialogDescription>
        </DialogHeader>

          {!isCompanyInvite && <div className="space-y-1.5"><Label htmlFor="invite-company">Empresa do membro</Label><select id="invite-company" className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={companyId} onChange={(event) => setCompanyId(event.target.value)}><option value="">Selecione uma empresa</option>{companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}</select></div>}

          <div className="space-y-1.5">
          <Label htmlFor="invite-email">{isCompanyInvite ? 'E-mail do responsável pela empresa' : 'E-mail do membro da equipe'}</Label>
          <Input
            id="invite-email"
            type="email"
            placeholder="pessoa@empresa.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !sending) handleInvite();
            }}
            autoFocus
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={sending}>
            Cancelar
          </Button>
          <Button onClick={handleInvite} disabled={sending}>
            {sending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            Enviar convite
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
