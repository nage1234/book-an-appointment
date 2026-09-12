import type { MetricsPeriod, MetricsResponse } from '@baa/types';
import { HttpError } from '@app/utils/httpError';
import {
  allTimeTotals,
  perCustomerInRange,
  totalAppointmentsInRange,
} from '@app/repositories/metrics';
import { isoDate } from '@app/utils/dates';

const PERIODS: MetricsPeriod[] = ['this_month', 'last_month', 'this_year', 'last_year'];

function rangeFor(period: MetricsPeriod, now = new Date()): { start: string; end: string } {
  const y = now.getFullYear();
  const m = now.getMonth(); // 0-11
  switch (period) {
    case 'this_month':
      return { start: isoDate(y, m + 1, 1), end: isoDate(y, m + 1, new Date(y, m + 1, 0).getDate()) };
    case 'last_month': {
      const d = new Date(y, m - 1, 1);
      const ly = d.getFullYear();
      const lm = d.getMonth() + 1;
      return { start: isoDate(ly, lm, 1), end: isoDate(ly, lm, new Date(ly, lm, 0).getDate()) };
    }
    case 'this_year':
      return { start: isoDate(y, 1, 1), end: isoDate(y, 12, 31) };
    case 'last_year':
      return { start: isoDate(y - 1, 1, 1), end: isoDate(y - 1, 12, 31) };
  }
}

export async function getMetrics(periodRaw: unknown): Promise<MetricsResponse> {
  const period = (typeof periodRaw === 'string' ? periodRaw : 'this_month') as MetricsPeriod;
  if (!PERIODS.includes(period)) throw new HttpError(400, 'Invalid period');

  const { start, end } = rangeFor(period);
  const [totalAppointments, perCustomer, totals] = await Promise.all([
    totalAppointmentsInRange(start, end),
    perCustomerInRange(start, end),
    allTimeTotals(),
  ]);

  return { period, totalAppointments, perCustomer, totals };
}
