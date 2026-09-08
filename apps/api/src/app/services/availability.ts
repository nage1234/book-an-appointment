import {
  SLOT_END_HOUR,
  SLOT_KEYS,
  type AvailabilityResponse,
  type DayAvailability,
  type SlotAvailability,
  type SlotKey,
  type SlotStatus,
} from '@baa/types';
import { HttpError } from '@app/utils/httpError';
import { findPatientForCustomer } from '@app/repositories/patients';
import { bookedInRange } from '@app/repositories/appointments';
import { holidaysInRange } from '@app/repositories/holidays';
import { daysInMonth, isoDate, viewHorizon, weekdayShort } from '@app/utils/dates';

export async function getAvailability(
  customerId: number,
  year: number,
  month1: number,
  patientId: number
): Promise<AvailabilityResponse> {
  if (
    !Number.isInteger(year) ||
    !Number.isInteger(month1) ||
    month1 < 1 ||
    month1 > 12 ||
    !Number.isInteger(patientId)
  ) {
    throw new HttpError(400, 'Invalid year, month, or patientId');
  }

  const patient = await findPatientForCustomer(patientId, customerId);
  if (!patient) throw new HttpError(403, 'That patient is not yours');

  const now = new Date();
  const { start: viewStart, end: viewEnd } = viewHorizon(now);
  const firstOfMonth = new Date(year, month1 - 1, 1);
  if (firstOfMonth < viewStart || firstOfMonth > viewEnd) {
    throw new HttpError(400, 'That month is outside the viewable window');
  }

  const count = daysInMonth(year, month1);
  const startIso = isoDate(year, month1, 1);
  const endIso = isoDate(year, month1, count);

  const holidays = new Set(await holidaysInRange(startIso, endIso));
  const booked = await bookedInRange(startIso, endIso);
  const bySlot = new Map<string, { id: number; patientId: number }>();
  for (const b of booked) {
    bySlot.set(`${b.appointment_date}|${b.slot}`, { id: b.id, patientId: b.patient_id });
  }

  const days: DayAvailability[] = [];
  for (let d = 1; d <= count; d++) {
    const date = isoDate(year, month1, d);
    const weekday = weekdayShort(year, month1, d);
    const isSunday = weekday === 'Sun';
    const isHoliday = holidays.has(date);

    const slots: SlotAvailability[] = SLOT_KEYS.map((slot: SlotKey) => {
      const hit = bySlot.get(`${date}|${slot}`);
      const slotEnd = new Date(year, month1 - 1, d, SLOT_END_HOUR[slot]);
      const isPast = slotEnd < now;

      let status: SlotStatus;
      let appointment: SlotAvailability['appointment'] = null;

      if (hit && hit.patientId === patientId) {
        status = 'blue';
        appointment = { id: hit.id, status: isPast ? 'completed' : 'booked' };
      } else if (isSunday || isHoliday || isPast) {
        status = 'grey';
      } else if (hit) {
        status = 'red';
      } else {
        status = 'green';
      }
      return { slot, status, appointment };
    });

    const greyedReason = isSunday ? 'sunday' : isHoliday ? 'holiday' : null;
    days.push({ date, weekday, greyed: greyedReason !== null, greyedReason, slots });
  }

  return { year, month: month1, daysInMonth: count, patientId, days };
}
