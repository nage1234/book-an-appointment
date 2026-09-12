import { pool } from '@app/db';

export async function registerCustomer(data: { name: string; email: string; passwordHash: string, type: string }) {
  const { rows } = await pool.query(
    `insert into customers (name, email_id, password, type) values ($1, $2, $3, $4)
     returning id, name, email_id, type`,
    [data.name, data.email, data.passwordHash, data.type]
  );
  return rows[0];
}

export async function findCustomerByEmail(email: string) {
  const { rows } = await pool.query(
    `select id, name, email_id, password, type from customers where email_id = $1`,
    [email]
  );
  return rows[0] ?? null;
}

export async function updatePasswordByEmail(email: string, passwordHash: string): Promise<void> {
  await pool.query(`update customers set password = $1 where email_id = $2`, [passwordHash, email]);
}

