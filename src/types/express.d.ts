/**
 * Contratos de autenticação e escopo usados pelos middlewares do Metrik.
 */
export type AuthUser = {
  id: string;
  email: string | null;
};

export type CompanyRole = 'GLOBAL_ADMIN' | 'COMPANY_ADMIN' | 'COMPANY_OPERATOR' | 'COMPANY_VIEWER';

export type CompanyContext = {
  id: string;
  name: string;
  slug: string;
  role: CompanyRole;
  isGlobalAdmin: boolean;
};

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      user?: AuthUser;
      company?: CompanyContext;
    }
  }
}
