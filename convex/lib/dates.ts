// Loans use calendar days (YYYY-MM-DD, UTC) so ranges compare as strings.

export const MAX_LOAN_DAYS = 30;
export const MAX_DAYS_AHEAD = 90;

const DAY = /^\d{4}-\d{2}-\d{2}$/;

export function today(): string {
  return new Date().toISOString().slice(0, 10);
}

export function isValidDay(value: string): boolean {
  if (!DAY.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

export function addDays(day: string, days: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function daysBetween(start: string, end: string): number {
  const ms = Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`);
  return Math.round(ms / 86_400_000);
}

export function rangesOverlap(aStart: string, aEnd: string, bStart: string, bEnd: string) {
  return aStart <= bEnd && bStart <= aEnd;
}
