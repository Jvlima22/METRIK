import { useState } from "react";
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

/**
 * Diálogo único para convidar um novo membro ou uma nova empresa por e-mail.
 * O backend decide o tipo pelo contexto de empresa ativa.
 */
export function InviteUserDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { inviteUser } = useAuth();
  const [email, setEmail] = useState("");
  const [sending, setSending] = useState(false);

  async function handleInvite() {
    const trimmed = email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Informe um e-mail válido");
      return;
    }
    setSending(true);
    const { error } = await inviteUser(trimmed);
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
          <DialogTitle>Convidar empresa ou membro</DialogTitle>
          <DialogDescription>
            Enviaremos um link de cadastro por e-mail. Sem empresa ativa, o convite inicia uma nova empresa; com empresa ativa, adiciona um membro.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-1.5">
          <Label htmlFor="invite-email">E-mail do cliente ou membro</Label>
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
