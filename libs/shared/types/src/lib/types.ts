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

/** Short row label, matching the mockup (slot start time). */
export const SLOT_SHORT_LABELS: Record<SlotKey, string> = {
  S10_11: '10:00 AM',
  S11_12: '11:00 AM',
  S12_13: '12:00 PM',
  S14_15: '2:00 PM',
  S15_16: '3:00 PM',
  S16_17: '4:00 PM',
};

export const SLOT_START_HOUR: Record<SlotKey, number> = {
  S10_11: 10, S11_12: 11, S12_13: 12, S14_15: 14, S15_16: 15, S16_17: 16,
};
export const SLOT_END_HOUR: Record<SlotKey, number> = {
  S10_11: 11, S11_12: 12, S12_13: 13, S14_15: 15, S15_16: 16, S16_17: 17,
};

/** Colour state of a single (date, slot) cell on the dashboard. */
export type SlotStatus = 'red' | 'blue' | 'green' | 'grey';

/** Lifecycle of a customer's own appointment (`completed` is derived, never stored). */
export type AppointmentStatus = 'booked' | 'completed' | 'cancelled';

/** Authenticated user as returned by the API (never includes the password). */
export interface AuthUser {
  id: number;
  name: string;
  email_id: string;
  type: CustomerType;
}

export interface Patient {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  relation: string;
}

/** One (date, slot) cell in the availability response. */
export interface SlotAvailability {
  slot: SlotKey;
  status: SlotStatus;
  /** present only for the selected patient's own bookings (blue cells) */
  appointment: { id: number; status: 'booked' | 'completed' } | null;
}

export interface DayAvailability {
  date: string; // YYYY-MM-DD
  weekday: string; // 'Mon' … 'Sun'
  greyed: boolean; // Sunday or holiday (structural, whole column)
  greyedReason: 'sunday' | 'holiday' | null;
  slots: SlotAvailability[]; // always 6, in SLOT_KEYS order
}

export interface AvailabilityResponse {
  year: number;
  month: number; // 1–12
  daysInMonth: number;
  patientId: number;
  days: DayAvailability[];
}

export interface AppointmentDto {
  id: number;
  patientId: number;
  date: string;
  slot: SlotKey;
  status: AppointmentStatus;
}

// ---- Admin dashboard ----

export interface CustomerSummary {
  id: number;
  name: string;
  email_id: string;
}

export interface Holiday {
  holiday_date: string; // YYYY-MM-DD
  description: string;
}

export type MetricsPeriod = 'this_month' | 'last_month' | 'this_year' | 'last_year';

export interface MetricsResponse {
  period: MetricsPeriod;
  totalAppointments: number;
  perCustomer: { customerId: number; name: string; email_id: string; count: number }[];
  totals: { customers: number; patients: number; appointments: number };
}

export interface DormantCustomer {
  id: number;
  name: string;
  email_id: string;
  created_at: string;
  patient_count: number;
}
