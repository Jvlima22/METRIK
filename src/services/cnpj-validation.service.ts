import { AppError } from '../utils/AppError';

export type CnpjValidationResult = {
  cnpj: string;
  legalName: string;
  tradeName: string | null;
  status: string;
  address: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  phone: string | null;
  email: string | null;
  primaryCnae: string | null;
  provider: string;
  checkedAt: string;
};

export function onlyDigits(value: string) { return value.replace(/\D/g, ''); }

export function isValidCnpj(value: string) {
  const cnpj = onlyDigits(value);
  if (cnpj.length !== 14 || /^(\d)\1+$/.test(cnpj)) return false;
  const calculate = (base: string) => {
    let factor = base.length - 5;
    let sum = 0;
    for (const digit of base) { sum += Number(digit) * factor; factor = factor === 2 ? 9 : factor - 1; }
    const remainder = sum % 11;
    return remainder < 2 ? 0 : 11 - remainder;
  };
  return calculate(cnpj.slice(0, 12)) === Number(cnpj[12]) && calculate(cnpj.slice(0, 13)) === Number(cnpj[13]);
}

export async function validateCnpj(value: string): Promise<CnpjValidationResult> {
  const cnpj = onlyDigits(value);
  if (!isValidCnpj(cnpj)) throw new AppError('CNPJ inválido', 400);
  const response = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpj}`, { signal: AbortSignal.timeout(10000) });
  if (response.status === 404) throw new AppError('CNPJ não encontrado', 404);
  if (!response.ok) throw new AppError('Serviço de validação de CNPJ indisponível no momento', 502);
  const data = await response.json() as Record<string, unknown>;
  const status = String(data.descricao_situacao_cadastral ?? '').toUpperCase();
  if (status !== 'ATIVA') throw new AppError(`CNPJ encontrado, mas está com situação cadastral ${status || 'DESCONHECIDA'}`, 422);
  const addressParts = [data.logradouro, data.numero].filter(Boolean).map(String);
  return { cnpj, legalName: String(data.razao_social ?? ''), tradeName: data.nome_fantasia ? String(data.nome_fantasia) : null, status, address: addressParts.length ? addressParts.join(', ') : null, city: data.municipio ? String(data.municipio) : null, state: data.uf ? String(data.uf) : null, postalCode: data.cep ? String(data.cep) : null, phone: data.ddd_telefone_1 ? String(data.ddd_telefone_1) : null, email: data.email ? String(data.email) : null, primaryCnae: data.cnae_fiscal ? String(data.cnae_fiscal) : null, provider: 'brasilapi', checkedAt: new Date().toISOString() };
}
