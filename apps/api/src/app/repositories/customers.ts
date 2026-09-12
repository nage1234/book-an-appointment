import { pool } from '@app/db';

export interface CustomerRow {
  id: number;
  name: string;
  email_id: string;
}

export async function listCustomers(q?: string): Promise<CustomerRow[]> {
  if (q && q.trim()) {
    const like = `%${q.trim().toLowerCase()}%`;
    const { rows } = await pool.query(
      `select id, name, email_id from customers
        where type = 'customer' and (lower(name) like $1 or lower(email_id) like $1)
        order by name`,
      [like]
    );
    return rows;
  }
  const { rows } = await pool.query(
    `select id, name, email_id from customers where type = 'customer' order by name`
  );
  return rows;
}

export async function customerExists(id: number): Promise<boolean> {
  const { rows } = await pool.query(
    `select 1 from customers where id = $1 and type = 'customer'`,
    [id]
  );
  return rows.length > 0;
}
