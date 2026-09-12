import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pingDb } from './db';
import authRouter from './app/routes/auth';
import patientsRouter from './app/routes/patients';
import availabilityRouter from './app/routes/availability';
import appointmentsRouter from './app/routes/appointments';
import adminRouter from './app/routes/admin';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json());

app.use('/api/auth', authRouter);
app.use('/api/patients', patientsRouter);
app.use('/api/availability', availabilityRouter);
app.use('/api/appointments', appointmentsRouter);
app.use('/api/admin', adminRouter);

app.get('/api/health', async (_req, res) => {
  const db = await pingDb();
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
