import { Router } from 'express';
import { requireAuth } from '@app/utils/requireAuth';
import { get } from '@app/controllers/availability';

const router = Router();
router.use(requireAuth);
router.get('/', get);

export default router;
