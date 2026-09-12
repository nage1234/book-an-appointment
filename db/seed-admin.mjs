// Upserts an admin account from ADMIN_EMAIL / ADMIN_PASSWORD in .env.
import 'dotenv/config';
import bcrypt from 'bcryptjs';
import pg from 'pg';

const email = (process.env.ADMIN_EMAIL ?? '').trim().toLowerCase();
const password = process.env.ADMIN_PASSWORD ?? '';
const name = process.env.ADMIN_NAME ?? 'Clinic Admin';

if (!email || !password) {
  console.error('Set ADMIN_EMAIL and ADMIN_PASSWORD in .env');
  process.exit(1);
}

const pool = new pg.Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

try {
  const hash = await bcrypt.hash(password, 10);
  const existing = await pool.query(`select id from customers where email_id = $1`, [email]);
  if (existing.rows[0]) {
    await pool.query(
      `update customers set name = $1, password = $2, type = 'admin' where email_id = $3`,
      [name, hash, email]
    );
  } else {
    await pool.query(
      `insert into customers (name, email_id, password, type) values ($1, $2, $3, 'admin')`,
      [name, email, hash]
    );
  }
  console.log(`admin ${email} ready.`);
} catch (err) {
  console.error('Failed:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
