import type { SlotStatus } from '@baa/types';

// UI-only mock data. No backend, no API - replaced with real data in M3.

export const MOCK_PATIENTS = [
  'Ravi Kumar',
  'Priya Kumar',
  'Arjun Kumar',
  'Lakshmi Devi',
];

export const YEARS = [2026, 2027];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Row labels — slot start times, matching the mockup. */
export const SLOT_ROW_LABELS = [
  '10:00 AM',
  '11:00 AM',
  '12:00 PM',
  '2:00 PM',
  '3:00 PM',
  '4:00 PM',
];

export interface DayColumn {
  day: number; // 1..31
  weekday: string; // 'Mon' … 'Sun'
  isSunday: boolean;
  isWeekend: boolean;
}

export function buildDays(year: number, monthIndex: number): DayColumn[] {
  const count = new Date(year, monthIndex + 1, 0).getDate();
  return Array.from({ length: count }, (_, i) => {
    const day = i + 1;
    const weekday = new Date(year, monthIndex, day).toLocaleDateString('en-US', {
      weekday: 'short',
    });
    return {
      day,
      weekday,
      isSunday: weekday === 'Sun',
      isWeekend: weekday === 'Sun' || weekday === 'Sat',
    };
  });
}

/** Deterministic so the grid looks like the mockup and doesn't reshuffle on render. */
export function mockStatus(day: number, slotIdx: number, isSunday: boolean): SlotStatus {
  if (isSunday) return 'grey';
  const seed = (day * 7 + slotIdx * 5) % 19;
  if (seed === 2 || seed === 11) return 'blue';
  if (seed % 4 === 0) return 'red';
  return 'green';
}
