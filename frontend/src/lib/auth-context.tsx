import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";

import { getSupabaseClient, isSupabaseConfigured } from "./supabase";
import { apiFetch } from "./api";

/**
 * Estado de autenticação compartilhado, sobre o Supabase Auth (GoTrue).
 *
 * Sistema FECHADO: não há cadastro aberto. Contas só nascem de um convite
 * enviado por um admin (`inviteUser`), e o convidado finaliza o cadastro em
 * `/accept-invite` definindo o perfil + senha (`acceptInvite`).
 *
 * SSR-safe: server e primeiro render do cliente começam com `loading=true` e
 * `user=null`; a sessão real entra num efeito pós-mount e via `onAuthStateChange`.
 */

type AuthResult = { error: string | null };

type InviteProfile = {
  name: string;
  phone: string;
  cpf: string;
  password: string;
};

type AuthContextValue = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isAuthenticated: boolean;
  /** Supabase está configurado (envs presentes)? Usado para mensagens de setup. */
  isConfigured: boolean;
  /** O usuário atual pode enviar convites? (allowlist pública, só p/ UI) */
  isAdmin: boolean;
  signIn: (email: string, password: string) => Promise<AuthResult>;
  /** Finaliza um convite: grava perfil + senha na sessão criada pelo link. */
  acceptInvite: (profile: InviteProfile) => Promise<AuthResult>;
  /** Dispara um convite de cadastro (admin only — validado no backend). */
  inviteUser: (email: string, kind?: 'COMPANY' | 'MEMBER', companyId?: string) => Promise<AuthResult>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const NOT_CONFIGURED =
  "Autenticação não configurada. Defina VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY.";

// Allowlist PÚBLICA de admins — usada apenas para mostrar/esconder a UI de
// convite. A segurança real é o `requireAdmin` no backend (INVITE_ADMINS).
const ADMIN_EMAILS = ((import.meta.env.VITE_INVITE_ADMINS as string | undefined) ?? "comercial.metri.ai@gmail.com")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const supabase = getSupabaseClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setUser(data.session?.user ?? null);
      setLoading(false);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next);
      setUser(next?.user ?? null);
      setLoading(false);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  async function signIn(email: string, password: string): Promise<AuthResult> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: NOT_CONFIGURED };
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error?.message ?? null };
  }

  async function acceptInvite(profile: InviteProfile): Promise<AuthResult> {
    const supabase = getSupabaseClient();
    if (!supabase) return { error: NOT_CONFIGURED };
    // O link do convite já abriu uma sessão (detectSessionInUrl). Aqui só
    // gravamos a senha definitiva + os dados de perfil no user_metadata.
    const { error } = await supabase.auth.updateUser({
      password: profile.password,
      data: { name: profile.name, phone: profile.phone, cpf: profile.cpf },
    });
    return { error: error?.message ?? null };
  }

  async function inviteUser(email: string, kind: 'COMPANY' | 'MEMBER' = 'MEMBER', companyId?: string): Promise<AuthResult> {
    try {
      await apiFetch("/auth/invite", {
        method: "POST",
        headers: { 'x-invite-kind': kind, ...(companyId ? { 'x-company-id': companyId } : {}) },
        body: JSON.stringify({ email }),
      });
      return { error: null };
    } catch (e) {
      return { error: e instanceof Error ? e.message : "Falha ao enviar convite" };
    }
  }

  async function signOut(): Promise<void> {
    const supabase = getSupabaseClient();
    await supabase?.auth.signOut();
    setSession(null);
    setUser(null);
  }

  const email = user?.email?.toLowerCase();

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isAuthenticated: Boolean(session),
        isConfigured: isSupabaseConfigured,
        isAdmin: Boolean(email && ADMIN_EMAILS.includes(email)),
        signIn,
        acceptInvite,
        inviteUser,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within <AuthProvider>");
  return ctx;
}
