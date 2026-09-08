import { SLOT_END_HOUR, SLOT_START_HOUR, type SlotKey } from '@baa/types';

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export interface YearMonth {
  year: number;
  month: number; // 1–12
}

/** Months a customer can book or edit: current calendar month + the next two (schema.md decision #5). */
export function bookingWindow(now = new Date()): YearMonth[] {
  return [0, 1, 2].map((offset) => {
    const dt = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    return { year: dt.getFullYear(), month: dt.getMonth() + 1 };
  });
}

/**
 * Months a customer can view: from January of two calendar years ago through the
 * last month of the booking window (current month + 2). Past months are read-only
 * history; only months in {@link bookingWindow} are bookable/editable.
 *
 * e.g. now = Nov 2026 → Jan 2024 … Jan 2027 (years 2024, 2025, 2026, 2027).
 */
export function viewWindow(now = new Date()): YearMonth[] {
  const last = bookingWindow(now)[2];

  const out: YearMonth[] = [];
  for (let y = now.getFullYear() - 2, m = 1; y < last.year || (y === last.year && m <= last.month); ) {
    out.push({ year: y, month: m });
    if (m === 12) { y++; m = 1; } else { m++; }
  }
  return out;
}

/** True when a year/month falls in the bookable/editable window; past months are view-only. */
export function isMonthEditable(ym: YearMonth, now = new Date()): boolean {
  return bookingWindow(now).some((w) => w.year === ym.year && w.month === ym.month);
}

export function yearOptions(window = viewWindow()): number[] {
  return [...new Set(window.map((w) => w.year))];
}

export function monthOptionsFor(year: number, window = viewWindow()): number[] {
  return window.filter((w) => w.year === year).map((w) => w.month);
}

/** ISO "2026-09-10" → "Thu, 10 Sep" */
export function formatDayLabel(iso: string): string {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-US', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

function fmtHour(h: number): { hr: number; period: 'AM' | 'PM' } {
  return { hr: h % 12 === 0 ? 12 : h % 12, period: h >= 12 ? 'PM' : 'AM' };
}

/** "3:00–4:00 PM" */
export function formatSlotRange(slot: SlotKey): string {
  const a = fmtHour(SLOT_START_HOUR[slot]);
  const b = fmtHour(SLOT_END_HOUR[slot]);
  return a.period === b.period
    ? `${a.hr}:00–${b.hr}:00 ${b.period}`
    : `${a.hr}:00 ${a.period} – ${b.hr}:00 ${b.period}`;
}

export function dayNumber(iso: string): number {
  return Number(iso.split('-')[2]);
}
