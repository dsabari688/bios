export function parseDaysParam(
  rawValue: unknown,
): number {
  const days = Number(rawValue);

  if (
    !Number.isFinite(days) ||
    days < 1
  ) {
    return 30;
  }

  return Math.min(Math.floor(days), 365);
}
