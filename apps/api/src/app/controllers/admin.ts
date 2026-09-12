import type { Request, Response } from 'express';
import { sendError } from '@app/utils/httpError';
import {
  addCustomerPatient,
  getCustomerPatients,
  getCustomers,
  getDormantCustomers,
} from '@app/services/adminCustomers';
import { adminBook, adminCancel } from '@app/services/adminAppointments';
import { addHoliday, getHolidays, removeHoliday } from '@app/services/adminHolidays';
import { getMetrics } from '@app/services/adminMetrics';

export async function listCustomers(req: Request, res: Response): Promise<void> {
  try {
    const q = typeof req.query.q === 'string' ? req.query.q : undefined;
    res.json({ customers: await getCustomers(q) });
  } catch (err) {
    sendError(res, err);
  }
}

export async function listCustomerPatients(req: Request, res: Response): Promise<void> {
  try {
    res.json({ patients: await getCustomerPatients(Number(req.params.id)) });
  } catch (err) {
    sendError(res, err);
  }
}

export async function createCustomerPatient(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json({ patient: await addCustomerPatient(Number(req.params.id), req.body) });
  } catch (err) {
    sendError(res, err);
  }
}

export async function book(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json({ appointment: await adminBook(req.body) });
  } catch (err) {
    sendError(res, err);
  }
}

export async function cancel(req: Request, res: Response): Promise<void> {
  try {
    res.json({ appointment: await adminCancel(Number(req.params.id)) });
  } catch (err) {
    sendError(res, err);
  }
}

export async function listHolidays(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ holidays: await getHolidays() });
  } catch (err) {
    sendError(res, err);
  }
}

export async function createHoliday(req: Request, res: Response): Promise<void> {
  try {
    res.status(201).json(await addHoliday(req.body));
  } catch (err) {
    sendError(res, err);
  }
}

export async function deleteHolidayCtl(req: Request, res: Response): Promise<void> {
  try {
    await removeHoliday(req.params.date);
    res.json({ ok: true });
  } catch (err) {
    sendError(res, err);
  }
}

export async function metrics(req: Request, res: Response): Promise<void> {
  try {
    res.json(await getMetrics(req.query.period));
  } catch (err) {
    sendError(res, err);
  }
}

export async function dormant(_req: Request, res: Response): Promise<void> {
  try {
    res.json({ customers: await getDormantCustomers() });
  } catch (err) {
    sendError(res, err);
  }
}
