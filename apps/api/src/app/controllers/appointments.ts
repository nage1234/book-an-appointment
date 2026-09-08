import type { Request, Response } from 'express';
import { bookAppointment, cancelAppointment } from '@app/services/appointments';
import { sendError } from '@app/utils/httpError';

export async function book(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await bookAppointment(req.user!.id, req.body);
    res.status(201).json({ appointment });
  } catch (err) {
    sendError(res, err);
  }
}

export async function cancel(req: Request, res: Response): Promise<void> {
  try {
    const appointment = await cancelAppointment(req.user!.id, Number(req.params.id));
    res.json({ appointment });
  } catch (err) {
    sendError(res, err);
  }
}
