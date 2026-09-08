import {
  SLOT_END_HOUR,
  SLOT_KEYS,
  SLOT_START_HOUR,
  type AppointmentDto,
  type SlotKey,
} from '@baa/types';
import { HttpError } from '@app/utils/httpError';
import { findPatientForCustomer } from '@app/repositories/patients';
import {
  bookedForPatient,
  findAppointmentWithOwner,
  insertAppointment,
  markCancelled,
} from '@app/repositories/appointments';
import { holidaysInRange } from '@app/repositories/holidays';
import { bookingHorizon, parseIsoDate } from '@app/utils/dates';

const ONE_HOUR_MS = 60 * 60 * 1000;

function isSlotKey(v: unknown): v is SlotKey {
  return typeof v === 'string' && (SLOT_KEYS as string[]).includes(v);
}

export async function bookAppointment(customerId: number, body: unknown): Promise<AppointmentDto> {
  const b = (body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === 'string' ? b.date : '';
  const slot = b.slot;
  const patientId = Number(b.patientId);

  const parsed = parseIsoDate(date);
  if (!parsed) throw new HttpError(400, 'Invalid date');
  if (!isSlotKey(slot)) throw new HttpError(400, 'Invalid slot');
  if (!Number.isInteger(patientId)) throw new HttpError(400, 'Invalid patientId');

  const patient = await findPatientForCustomer(patientId, customerId);
  if (!patient) throw new HttpError(403, 'That patient is not yours');

  const { year, month1, day } = parsed;
  const now = new Date();
  const slotStart = new Date(year, month1 - 1, day, SLOT_START_HOUR[slot]);
  if (slotStart < now) throw new HttpError(400, "That slot can't be booked");

  const weekday = new Date(year, month1 - 1, day).toLocaleDateString('en-US', { weekday: 'short' });
  if (weekday === 'Sun') throw new HttpError(400, "That slot can't be booked");

  const [holiday] = await holidaysInRange(date, date);
  if (holiday) throw new HttpError(400, "That slot can't be booked");

  const { start: horizonStart, end: horizonEnd } = bookingHorizon(now);
  const theDay = new Date(year, month1 - 1, day);
  if (theDay < horizonStart || theDay > horizonEnd) {
    throw new HttpError(400, 'That date is outside the 3-month booking window');
  }

  // One active appointment per patient (schema.md decision #1).
  const existing = await bookedForPatient(patientId);
  const hasActive = existing.some((row) => {
    const p = parseIsoDate(row.appointment_date);
    if (!p) return false;
    const end = new Date(p.year, p.month1 - 1, p.day, SLOT_END_HOUR[row.slot as SlotKey]);
    return end >= now;
  });
  if (hasActive) throw new HttpError(409, 'This patient already has an active appointment');

  try {
    const { id } = await insertAppointment(patientId, date, slot);
    return { id, patientId, date, slot, status: 'booked' };
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new HttpError(409, 'That slot is no longer available');
    }
    throw err;
  }
}

export async function cancelAppointment(
  customerId: number,
  appointmentId: number
): Promise<AppointmentDto> {
  if (!Number.isInteger(appointmentId)) throw new HttpError(400, 'Invalid appointment id');

  const appt = await findAppointmentWithOwner(appointmentId);
  if (!appt) throw new HttpError(404, 'Appointment not found');
  if (appt.customer_id !== customerId) throw new HttpError(403, 'Not your appointment');
  if (appt.status !== 'booked') {
    throw new HttpError(409, 'This appointment can no longer be cancelled');
  }

  const p = parseIsoDate(appt.appointment_date);
  const slotStart = p
    ? new Date(p.year, p.month1 - 1, p.day, SLOT_START_HOUR[appt.slot as SlotKey])
    : new Date(0);
  if (slotStart.getTime() - Date.now() <= ONE_HOUR_MS) {
    throw new HttpError(409, 'This appointment can no longer be cancelled');
  }

  await markCancelled(appt.id);
  return {
    id: appt.id,
    patientId: appt.patient_id,
    date: appt.appointment_date,
    slot: appt.slot as SlotKey,
    status: 'cancelled',
  };
}
