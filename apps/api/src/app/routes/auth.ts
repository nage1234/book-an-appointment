import { Router } from 'express';
import { changePassword, forgotPassword, login, register } from '@app/controllers/auth';
import { requireAuth } from '@app/utils/requireAuth';

const router = Router();

router.post("/register", register);
router.post("/login", login);
router.post("/forgot-password", forgotPassword);
router.post("/change-password", requireAuth, changePassword);

export default router;
