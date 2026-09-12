import { pool } from '@app/db';

export async function totalAppointmentsInRange(startIso: string, endIso: string): Promise<number> {
  const { rows } = await pool.query(
    `select count(*)::int as n
       from appointments
      where status <> 'cancelled' and appointment_date between $1 and $2`,
    [startIso, endIso]
  );
  return rows[0].n;
}

export interface PerCustomerRow {
  customerId: number;
  name: string;
  email_id: string;
  count: number;
}

export async function perCustomerInRange(
  startIso: string,
  endIso: string
): Promise<PerCustomerRow[]> {
  const { rows } = await pool.query(
    `select c.id as "customerId", c.name, c.email_id, count(a.id)::int as count
       from customers c
       join patients p on p.customer_id = c.id
       join appointments a on a.patient_id = p.id
        and a.status <> 'cancelled'
        and a.appointment_date between $1 and $2
      where c.type = 'customer'
      group by c.id, c.name, c.email_id
      order by count desc, c.name`,
    [startIso, endIso]
  );
  return rows;
}

export async function allTimeTotals(): Promise<{
  customers: number;
  patients: number;
  appointments: number;
}> {
  const { rows } = await pool.query(
    `select
       (select count(*)::int from customers where type = 'customer') as customers,
       (select count(*)::int from patients) as patients,
       (select count(*)::int from appointments where status <> 'cancelled') as appointments`
  );
  return rows[0];
}

export interface DormantRow {
  id: number;
  name: string;
  email_id: string;
  created_at: string;
  patient_count: number;
}

export async function dormantCustomers(): Promise<DormantRow[]> {
  const { rows } = await pool.query(
    `select c.id, c.name, c.email_id,
            to_char(c.created_at, 'YYYY-MM-DD') as created_at,
            count(p.id)::int as patient_count
       from customers c
       left join patients p on p.customer_id = c.id
      where c.type = 'customer'
        and not exists (
          select 1 from patients p2
          join appointments a on a.patient_id = p2.id and a.status <> 'cancelled'
          where p2.customer_id = c.id
        )
      group by c.id, c.name, c.email_id, c.created_at
      order by c.created_at desc`
  );
  return rows;
}
