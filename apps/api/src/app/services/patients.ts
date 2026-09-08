import { createPatient, listPatients, type PatientRow } from '@app/repositories/patients';
import { HttpError } from '@app/utils/httpError';

export function getPatients(customerId: number): Promise<PatientRow[]> {
  return listPatients(customerId);
}

export async function addPatient(customerId: number, body: unknown): Promise<PatientRow> {
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const relation = typeof b.relation === 'string' ? b.relation.trim() : '';
  if (!name || !relation) {
    throw new HttpError(400, 'Name and relation are required');
  }

  let age: number | null = null;
  if (b.age !== undefined && b.age !== null && b.age !== '') {
    const n = Number(b.age);
    age = Number.isFinite(n) && n >= 0 && n <= 130 ? Math.trunc(n) : null;
  }
  const gender =
    typeof b.gender === 'string' && ['Male', 'Female', 'Other'].includes(b.gender) ? b.gender : null;

  return createPatient({ customerId, name, age, gender, relation });
}
