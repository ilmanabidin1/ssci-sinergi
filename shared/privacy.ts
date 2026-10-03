export function maskNik(value: string | null | undefined): string {
  const raw = String(value ?? "").trim();
  if (!raw) return "";
  if (raw.length <= 8) return `${"*".repeat(Math.max(raw.length - 2, 0))}${raw.slice(-2)}`;
  return `${raw.slice(0, 4)}${"*".repeat(raw.length - 8)}${raw.slice(-4)}`;
}

export function isSameActor(checkerId: number, ...actorIds: Array<number | null | undefined>): boolean {
  return actorIds.some(id => id !== null && id !== undefined && id === checkerId);
}
