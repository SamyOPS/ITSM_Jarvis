export function normalizePersonName(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  if (!normalized) {
    return null;
  }

  return normalized.charAt(0).toLocaleUpperCase('fr-FR') + normalized.slice(1);
}

export function normalizeOptionalText(
  value: string | null | undefined,
): string | null {
  const normalized = value?.trim();

  return normalized ? normalized : null;
}
