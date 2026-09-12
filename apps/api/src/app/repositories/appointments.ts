import { pool } from '@app/db';

export interface BookedRow {
  id: number;
  patient_id: number;
  appointment_date: string; // YYYY-MM-DD
  slot: string;
}

export async function bookedInRange(startIso: string, endIso: string): Promise<BookedRow[]> {
  const { rows } = await pool.query(
    `select id, patient_id, to_char(appointment_date, 'YYYY-MM-DD') as appointment_date, slot
       from appointments
      where status = 'booked' and appointment_date between $1 and $2`,
    [startIso, endIso]
  );
  return rows;
}

export async function bookedForPatient(patientId: number): Promise<BookedRow[]> {
  const { rows } = await pool.query(
    `select id, patient_id, to_char(appointment_date, 'YYYY-MM-DD') as appointment_date, slot
       from appointments
      where status = 'booked' and patient_id = $1`,
    [patientId]
  );
  return rows;
}

export async function insertAppointment(
  patientId: number,
  dateIso: string,
  slot: string,
  createdBy: 'customer' | 'admin' = 'customer'
): Promise<{ id: number }> {
  const { rows } = await pool.query(
    `insert into appointments (patient_id, appointment_date, slot, status, created_by)
     values ($1, $2, $3, 'booked', $4)
     returning id`,
    [patientId, dateIso, slot, createdBy]
  );
  return rows[0];
}

export interface BookedOnDateRow {
  id: number;
  email_id: string;
}

/** Every booked appointment on a date, with the owning customer's email. */
export async function bookedOnDateWithEmail(dateIso: string): Promise<BookedOnDateRow[]> {
  const { rows } = await pool.query(
    `select a.id, c.email_id
       from appointments a
       join patients p on p.id = a.patient_id
       join customers c on c.id = p.customer_id
      where a.status = 'booked' and a.appointment_date = $1`,
    [dateIso]
  );
  return rows;
}

export async function cancelMany(ids: number[]): Promise<void> {
  if (ids.length === 0) return;
  await pool.query(
    `update appointments set status = 'cancelled', updated_at = now() where id = any($1::bigint[])`,
    [ids]
  );
}

export interface AppointmentWithOwner {
  id: number;
  patient_id: number;
  customer_id: number;
  appointment_date: string;
  slot: string;
  status: string;
}

export async function findAppointmentWithOwner(id: number): Promise<AppointmentWithOwner | null> {
  const { rows } = await pool.query(
    `select a.id, a.patient_id, p.customer_id,
            to_char(a.appointment_date, 'YYYY-MM-DD') as appointment_date, a.slot, a.status
       from appointments a
       join patients p on p.id = a.patient_id
      where a.id = $1`,
    [id]
  );
  return rows[0] ?? null;
}

export async function markCancelled(id: number): Promise<void> {
  await pool.query(
    `update appointments set status = 'cancelled', updated_at = now() where id = $1`,
    [id]
  );
}
