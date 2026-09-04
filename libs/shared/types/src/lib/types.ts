// Domain types shared by the web app and the API. See docs/schema.md.

export type CustomerType = 'customer' | 'admin';

/** The 6 fixed one-hour slots (no 1-2pm slot). */
export type SlotKey =
  | 'S10_11'
  | 'S11_12'
  | 'S12_13'
  | 'S14_15'
  | 'S15_16'
  | 'S16_17';

export const SLOT_KEYS: SlotKey[] = [
  'S10_11',
  'S11_12',
  'S12_13',
  'S14_15',
  'S15_16',
  'S16_17',
];

export const SLOT_LABELS: Record<SlotKey, string> = {
  S10_11: '10:00 - 11:00',
  S11_12: '11:00 - 12:00',
  S12_13: '12:00 - 13:00',
  S14_15: '14:00 - 15:00',
  S15_16: '15:00 - 16:00',
  S16_17: '16:00 - 17:00',
};

/** Colour state of a single (date, slot) cell on the dashboard. */
export type SlotStatus = 'red' | 'blue' | 'green' | 'grey';

/** Lifecycle of a customer's own appointment. */
export type AppointmentStatus =
  | 'booked'
  | 'in_progress'
  | 'completed'
  | 'cancelled';

/** Authenticated user as returned by the API (never includes the password). */
export interface AuthUser {
  id: number;
  name: string;
  email_id: string;
  type: CustomerType;
}
