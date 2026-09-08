import { pool } from '@app/db';

export interface PatientRow {
  id: number;
  name: string;
  age: number | null;
  gender: string | null;
  relation: string;
}

export async function listPatients(customerId: number): Promise<PatientRow[]> {
  const { rows } = await pool.query(
    `select id, name, age, gender, relation
       from patients
      where customer_id = $1
      order by (lower(relation) = 'self') desc, created_at asc`,
    [customerId]
  );
  return rows;
}

export async function findPatientForCustomer(
  id: number,
  customerId: number
): Promise<PatientRow | null> {
  const { rows } = await pool.query(
    `select id, name, age, gender, relation
       from patients where id = $1 and customer_id = $2`,
    [id, customerId]
  );
  return rows[0] ?? null;
}

export async function createPatient(data: {
  customerId: number;
  name: string;
  age: number | null;
  gender: string | null;
  relation: string;
}): Promise<PatientRow> {
  const { rows } = await pool.query(
    `insert into patients (customer_id, name, age, gender, relation)
     values ($1, $2, $3, $4, $5)
     returning id, name, age, gender, relation`,
    [data.customerId, data.name, data.age, data.gender, data.relation]
  );
  return rows[0];
}
