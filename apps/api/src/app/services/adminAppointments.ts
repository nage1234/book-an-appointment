import { SLOT_KEYS, type AppointmentDto, type SlotKey } from '@baa/types';
import { HttpError } from '@app/utils/httpError';
import { pool } from '@app/db';
import {
  findAppointmentWithOwner,
  insertAppointment,
  markCancelled,
} from '@app/repositories/appointments';
import { holidaysInRange } from '@app/repositories/holidays';
import { parseIsoDate } from '@app/utils/dates';
import { sendCancellationEmail } from '@app/utils/mailer';

function isSlotKey(v: unknown): v is SlotKey {
  return typeof v === 'string' && (SLOT_KEYS as string[]).includes(v);
}

/** Admin books for any patient. Bypasses per-patient limit / horizon / 1h window. */
export async function adminBook(body: unknown): Promise<AppointmentDto> {
  const b = (body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === 'string' ? b.date : '';
  const slot = b.slot;
  const patientId = Number(b.patientId);

  const parsed = parseIsoDate(date);
  if (!parsed) throw new HttpError(400, 'Invalid date');
  if (!isSlotKey(slot)) throw new HttpError(400, 'Invalid slot');
  if (!Number.isInteger(patientId)) throw new HttpError(400, 'Invalid patientId');

  const { rows } = await pool.query(`select customer_id from patients where id = $1`, [patientId]);
  if (!rows[0]) throw new HttpError(404, 'Patient not found');

  const weekday = new Date(parsed.year, parsed.month1 - 1, parsed.day).toLocaleDateString('en-US', {
    weekday: 'short',
  });
  if (weekday === 'Sun') throw new HttpError(400, "Can't book on a Sunday");
  const [holiday] = await holidaysInRange(date, date);
  if (holiday) throw new HttpError(400, "Can't book on a holiday");

  try {
    const { id } = await insertAppointment(patientId, date, slot, 'admin');
    return { id, patientId, date, slot, status: 'booked' };
  } catch (err) {
    if ((err as { code?: string }).code === '23505') {
      throw new HttpError(409, 'That slot is already booked');
    }
    throw err;
  }
}

/** Admin cancels any appointment, any time. Emails the owning customer. */
export async function adminCancel(appointmentId: number): Promise<AppointmentDto> {
  if (!Number.isInteger(appointmentId)) throw new HttpError(400, 'Invalid appointment id');
  const appt = await findAppointmentWithOwner(appointmentId);
  if (!appt) throw new HttpError(404, 'Appointment not found');
  if (appt.status !== 'booked') {
    throw new HttpError(409, 'This appointment is not active');
  }

  await markCancelled(appt.id);

  const { rows } = await pool.query(
    `select c.email_id from customers c
       join patients p on p.customer_id = c.id
      where p.id = $1`,
    [appt.patient_id]
  );
  if (rows[0]?.email_id) await sendCancellationEmail(rows[0].email_id);

  return {
    id: appt.id,
    patientId: appt.patient_id,
    date: appt.appointment_date,
    slot: appt.slot as SlotKey,
    status: 'cancelled',
  };
}
