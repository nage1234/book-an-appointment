import { Router } from 'express';
import { requireAdmin } from '@app/utils/requireAuth';
import * as admin from '@app/controllers/admin';

const router = Router();
router.use(requireAdmin);

router.get('/customers', admin.listCustomers);
router.get('/customers/dormant', admin.dormant);
router.get('/customers/:id/patients', admin.listCustomerPatients);
router.post('/customers/:id/patients', admin.createCustomerPatient);

router.post('/appointments', admin.book);
router.post('/appointments/:id/cancel', admin.cancel);

router.get('/holidays', admin.listHolidays);
router.post('/holidays', admin.createHoliday);
router.delete('/holidays/:date', admin.deleteHolidayCtl);

router.get('/metrics', admin.metrics);

export default router;
