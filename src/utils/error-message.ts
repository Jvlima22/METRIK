function usableString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0 && value.trim() !== '{}';
}

export function describeError(error: unknown): string {
  if (error instanceof Error && usableString(error.message)) return error.message;

  if (usableString(error)) return error;

  if (error && typeof error === 'object') {
    const candidate = error as Record<string, unknown>;
    const parts = [
      candidate.message,
      candidate.error_description,
      candidate.msg,
      candidate.details,
      candidate.hint,
    ].filter(usableString);

    if (parts.length > 0) return parts.join(' | ');

    const ownProperties = Object.getOwnPropertyNames(error);
    const ownValues = ownProperties
      .map((property) => candidate[property])
      .filter(usableString);
    if (ownValues.length > 0) return ownValues.join(' | ');

    try {
      const serialized = JSON.stringify(error);
      if (usableString(serialized)) return serialized;
    } catch {
      // Mantém o diagnóstico seguro abaixo quando o objeto não puder ser serializado.
    }

    const typeName = Object.prototype.toString.call(error);
    return `Objeto de erro sem mensagem (${typeName})`;
  }

  return 'Erro não especificado retornado pelo provedor externo';
}

export function describeErrorCode(error: unknown): string | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const candidate = error as Record<string, unknown>;
  const code = candidate.code ?? candidate.status ?? candidate.statusCode;
  return typeof code === 'string' || typeof code === 'number' ? String(code) : undefined;
}

export function describeErrorMetadata(error: unknown): Record<string, string | undefined> {
  if (!error || typeof error !== 'object') return {};
  const candidate = error as Record<string, unknown>;
  return {
    name: typeof candidate.name === 'string' ? candidate.name : undefined,
    code: describeErrorCode(error),
    status: typeof candidate.status === 'number' || typeof candidate.status === 'string' ? String(candidate.status) : undefined,
    statusCode: typeof candidate.statusCode === 'number' || typeof candidate.statusCode === 'string' ? String(candidate.statusCode) : undefined,
  };
}
