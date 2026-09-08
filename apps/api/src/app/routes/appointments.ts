import { Router } from 'express';
import { requireAuth } from '@app/utils/requireAuth';
import { book, cancel } from '@app/controllers/appointments';

const router = Router();
router.use(requireAuth);
router.post('/', book);
router.post('/:id/cancel', cancel);

export default router;
