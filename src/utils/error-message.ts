export function describeError(error: unknown): string {
  if (error instanceof Error && error.message) return error.message;

  if (typeof error === 'string' && error.trim()) return error;

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const parts = [
      candidate.message,
      candidate.error_description,
      candidate.msg,
      candidate.details,
      candidate.hint,
    ].filter((value): value is string => typeof value === 'string' && value.trim().length > 0);

    if (parts.length > 0) return parts.join(' | ');

    try {
      const serialized = JSON.stringify(error);
      if (serialized && serialized !== '{}') return serialized;
    } catch {
      // Mantém a mensagem genérica abaixo quando o objeto não puder ser serializado.
    }
  }

  return 'Erro não especificado retornado pelo provedor externo';
}

export function describeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as Record<string, unknown>;
  const code = candidate.code ?? candidate.status ?? candidate.statusCode;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
}
