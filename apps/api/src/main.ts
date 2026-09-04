import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { pingDb } from './db';

const host = process.env.HOST ?? 'localhost';
const port = process.env.PORT ? Number(process.env.PORT) : 3000;

const app = express();

app.use(cors({ origin: process.env.WEB_ORIGIN ?? 'http://localhost:4200' }));
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  const db = await pingDb();
  res.status(db ? 200 : 503).json({ status: db ? 'ok' : 'degraded', db });
});

// Feature routers mount here, e.g. app.use('/api/auth', authRouter);

app.listen(port, host, () => {
  console.log(`[ ready ] http://${host}:${port}`);
});
