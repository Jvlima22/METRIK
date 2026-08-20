import { useState, type FormEvent } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAccount } from "@/lib/account-context";
import { platformMeta, type AccountPlatform } from "@/lib/accounts";

/**
 * Connect-account form. Mock only — appends to the in-memory/localStorage
 * account list as "Pendente" and makes it active. No real OAuth happens.
 */
export function AddAccountDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
}) {
  const { addAccount } = useAccount();
  const [platform, setPlatform] = useState<AccountPlatform>("GOOGLE_ADS");
  const [name, setName] = useState("");
  const [accountId, setAccountId] = useState("");
  const [figmaFileKey, setFigmaFileKey] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const idHint = platform === "GOOGLE_ADS" ? "Ex.: 864-652-2223" : "Ex.: act_1029384756";
  const valid = name.trim().length > 1 && accountId.trim().length > 3;

  function reset() {
    setPlatform("GOOGLE_ADS");
    setName("");
    setAccountId("");
    setFigmaFileKey("");
    setErrorMessage("");
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!valid || submitting) return;
    setSubmitting(true);
    setErrorMessage("");
    try {
      await addAccount({ platform, name, accountId, figmaFileKey });
      reset();
      onOpenChange(false);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Não foi possível validar esta conta.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) reset();
        onOpenChange(o);
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display">Adicionar conta</DialogTitle>
          <DialogDescription>
            Conecte uma conta de anúncios para gerenciar campanhas e takedowns.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Plataforma</Label>
            <Select value={platform} onValueChange={(v) => setPlatform(v as AccountPlatform)}>
              <SelectTrigger className="bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="GOOGLE_ADS">{platformMeta.GOOGLE_ADS.label}</SelectItem>
                <SelectItem value="META_ADS">{platformMeta.META_ADS.label}</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Nome da conta</Label>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex.: Lumen Store — Brasil"
              className="bg-white"
            />
          </div>

          <div className="space-y-1.5">
            <Label>{platform === "GOOGLE_ADS" ? "Customer ID" : "Account ID"}</Label>
            <Input
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              placeholder={idHint}
              className="bg-white"
            />
            <p className="text-[11px] text-muted-foreground">
              O ID e as credenciais serão validados pela plataforma antes de salvar a conta.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label>Arquivo Figma (opcional)</Label>
            <Input
              value={figmaFileKey}
              onChange={(e) => setFigmaFileKey(e.target.value)}
              placeholder="Cole o link figma.com/design/…"
              className="bg-white"
            />
            <p className="text-[11px] text-muted-foreground">
              Os criativos desta conta vêm deste arquivo. Pode preencher depois em “Gerenciar contas”.
            </p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!valid || submitting}
              className="bg-foreground text-background hover:bg-foreground/90"
            >
              {submitting ? "Validando conta..." : "Validar e adicionar"}
            </Button>
          </DialogFooter>
          {errorMessage && <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{errorMessage}</p>}
        </form>
      </DialogContent>
    </Dialog>
  );
}
