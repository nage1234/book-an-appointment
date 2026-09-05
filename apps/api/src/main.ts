import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pingDb } from './db';
import authRouter from './app/routes/auth';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json());

// Mount the auth router ONCE at its prefix. The router already defines
// /register and /login inside it, so this gives you:
//   POST /api/auth/register   and   POST /api/auth/login
app.use('/api/auth', authRouter);

app.get('/api/health', async (_req, res) => {
  const db = await pingDb();
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
});

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
