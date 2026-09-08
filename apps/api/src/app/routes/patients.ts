import { Router } from 'express';
import { requireAuth } from '@app/utils/requireAuth';
import { create, list } from '@app/controllers/patients';

const router = Router();
router.use(requireAuth);
router.get('/', list);
router.post('/', create);

export default router;
