import type { Request, Response } from 'express';
import { addPatient, getPatients } from '@app/services/patients';
import { sendError } from '@app/utils/httpError';

export async function list(req: Request, res: Response): Promise<void> {
  try {
    const patients = await getPatients(req.user!.id);
    res.json({ patients });
  } catch (err) {
    sendError(res, err);
  }
}

export async function create(req: Request, res: Response): Promise<void> {
  try {
    const patient = await addPatient(req.user!.id, req.body);
    res.status(201).json({ patient });
  } catch (err) {
    sendError(res, err);
  }
}
