import type { Request, Response } from 'express';
import { getAvailability } from '@app/services/availability';
import { sendError } from '@app/utils/httpError';

export async function get(req: Request, res: Response): Promise<void> {
  try {
    const data = await getAvailability(
      req.user!.id,
      Number(req.query.year),
      Number(req.query.month),
      Number(req.query.patientId)
    );
    res.json(data);
  } catch (err) {
    sendError(res, err);
  }
}
