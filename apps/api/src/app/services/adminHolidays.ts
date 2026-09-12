import type { Holiday } from '@baa/types';
import { HttpError } from '@app/utils/httpError';
import {
  deleteHoliday,
  holidayExists,
  insertHoliday,
  listHolidays,
} from '@app/repositories/holidays';
import { bookedOnDateWithEmail, cancelMany } from '@app/repositories/appointments';
import { parseIsoDate } from '@app/utils/dates';
import { sendCancellationEmail } from '@app/utils/mailer';

export function getHolidays(): Promise<Holiday[]> {
  return listHolidays();
}

/** Adds a holiday, cancels every booking on that date, emails each customer. */
export async function addHoliday(body: unknown): Promise<{ holiday: Holiday; cancelledCount: number }> {
  const b = (body ?? {}) as Record<string, unknown>;
  const date = typeof b.date === 'string' ? b.date : '';
  const description = typeof b.description === 'string' ? b.description.trim() : '';

  const parsed = parseIsoDate(date);
  if (!parsed) throw new HttpError(400, 'Invalid date');

  const today = new Date();
  const when = new Date(parsed.year, parsed.month1 - 1, parsed.day);
  if (when < new Date(today.getFullYear(), today.getMonth(), today.getDate())) {
    throw new HttpError(400, "Can't add a holiday in the past");
  }
  if (await holidayExists(date)) throw new HttpError(409, 'That date is already a holiday');

  const holiday = await insertHoliday(date, description);

  const affected = await bookedOnDateWithEmail(date);
  await cancelMany(affected.map((a) => a.id));
  await Promise.all(affected.map((a) => sendCancellationEmail(a.email_id)));

  return { holiday, cancelledCount: affected.length };
}

export async function removeHoliday(date: string): Promise<void> {
  if (!parseIsoDate(date)) throw new HttpError(400, 'Invalid date');
  const removed = await deleteHoliday(date);
  if (removed === 0) throw new HttpError(404, 'Holiday not found');
}
