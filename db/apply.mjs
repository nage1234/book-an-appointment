// Runs db/schema.sql against DATABASE_URL. Idempotent - safe to re-run.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import 'dotenv/config';
import pg from 'pg';

const here = dirname(fileURLToPath(import.meta.url));
const sql = readFileSync(join(here, 'schema.sql'), 'utf8');

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  await pool.query('begin');
  await pool.query(sql);
  await pool.query('commit');
  console.log('db/schema.sql applied.');
} catch (err) {
  await pool.query('rollback').catch(() => undefined);
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
