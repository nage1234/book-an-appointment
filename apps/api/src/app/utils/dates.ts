// The API and DB assume the server's local timezone is the clinic's timezone.

export function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function isoDate(year: number, month1: number, day: number): string {
  return `${year}-${pad2(month1)}-${pad2(day)}`;
}

export function daysInMonth(year: number, month1: number): number {
  return new Date(year, month1, 0).getDate();
}

export function weekdayShort(year: number, month1: number, day: number): string {
  return new Date(year, month1 - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
}

/** First of the current month … last day of (current month + 2). schema.md decision #5. */
export function bookingHorizon(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear(), now.getMonth(), 1),
    end: new Date(now.getFullYear(), now.getMonth() + 3, 0),
  };
}

/**
 * Range a customer may *view*: Jan 1 of two calendar years ago … end of the
 * booking horizon. Months before the booking horizon are read-only history.
 */
export function viewHorizon(now = new Date()): { start: Date; end: Date } {
  return {
    start: new Date(now.getFullYear() - 2, 0, 1),
    end: bookingHorizon(now).end,
  };
}

export function parseIsoDate(iso: string): { year: number; month1: number; day: number } | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return null;
  return { year: Number(m[1]), month1: Number(m[2]), day: Number(m[3]) };
}
