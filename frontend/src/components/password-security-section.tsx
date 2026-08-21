import { useMemo, useState } from "react";
import { Eye, EyeOff, KeyRound, Loader2, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getSupabaseClient } from "@/lib/supabase";

type PasswordFieldProps = {
  label: string;
  value: string;
  visible: boolean;
  onChange: (value: string) => void;
  onToggle: () => void;
};

function PasswordField({ label, value, visible, onChange, onToggle }: PasswordFieldProps) {
  return (
    <label className="block text-xs font-medium text-slate-700">
      {label}
      <span className="relative mt-1.5 block">
        <input
          type={visible ? "text" : "password"}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          autoComplete="new-password"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 pr-10 text-sm text-slate-900 outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
        />
        <button
          type="button"
          aria-label={visible ? "Ocultar senha" : "Mostrar senha"}
          onClick={onToggle}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
        >
          {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </span>
    </label>
  );
}

export function PasswordSecuritySection() {
  const [password, setPassword] = useState("");
  const [confirmation, setConfirmation] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const rules = useMemo(() => ({
    length: password.length >= 8,
    letters: /[A-Za-zÀ-ÿ]/.test(password),
    numbers: /\d/.test(password),
  }), [password]);
  const valid = rules.length && rules.letters && rules.numbers && password === confirmation;

  async function updatePassword() {
    if (!valid) {
      setError("Use pelo menos 8 caracteres, com letras e números, e confirme a senha.");
      setFeedback(null);
      return;
    }
    const supabase = getSupabaseClient();
    if (!supabase) {
      setError("A autenticação não está configurada neste ambiente.");
      return;
    }
    setSaving(true);
    setError(null);
    setFeedback(null);
    const { error: updateError } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (updateError) {
      setError(updateError.message.includes("session") ? "Sua sessão expirou. Entre novamente para alterar a senha." : "Não foi possível atualizar a senha. Tente novamente.");
      return;
    }
    setPassword("");
    setConfirmation("");
    setFeedback("Senha atualizada com sucesso.");
  }

  return (
    <section className="rounded-2xl border border-slate-200 p-4">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
            <KeyRound className="size-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-slate-900">Senha e segurança</h3>
            <p className="mt-1 text-[11px] text-slate-500">Atualize a senha da sua conta sem armazená-la no Metrik.</p>
          </div>
        </div>
        <ShieldCheck className="size-4 text-emerald-500" />
      </div>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <PasswordField label="Nova senha" value={password} visible={showPassword} onChange={setPassword} onToggle={() => setShowPassword((value) => !value)} />
        <PasswordField label="Confirmar nova senha" value={confirmation} visible={showConfirmation} onChange={setConfirmation} onToggle={() => setShowConfirmation((value) => !value)} />
      </div>
      <div className="mt-3 flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-slate-500">
        <span className={rules.length ? "text-emerald-600" : ""}>• 8 caracteres</span>
        <span className={rules.letters ? "text-emerald-600" : ""}>• letras</span>
        <span className={rules.numbers ? "text-emerald-600" : ""}>• números</span>
        {confirmation && <span className={password === confirmation ? "text-emerald-600" : "text-rose-600"}>• confirmação {password === confirmation ? "correta" : "diferente"}</span>}
      </div>
      {(error || feedback) && <p className={`mt-3 text-xs ${error ? "text-rose-600" : "text-emerald-600"}`}>{error ?? feedback}</p>}
      <div className="mt-4 flex justify-end">
        <Button size="sm" onClick={() => void updatePassword()} disabled={saving || !valid} className="bg-slate-900">
          {saving ? <><Loader2 className="mr-2 size-3.5 animate-spin" />Atualizando...</> : "Redefinir senha"}
        </Button>
      </div>
    </section>
  );
}
