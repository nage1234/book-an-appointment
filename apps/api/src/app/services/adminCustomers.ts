import type { DormantCustomer } from '@baa/types';
import { HttpError } from '@app/utils/httpError';
import { customerExists, listCustomers } from '@app/repositories/customers';
import { createPatient, listPatients, type PatientRow } from '@app/repositories/patients';
import { dormantCustomers } from '@app/repositories/metrics';

export function getCustomers(q?: string) {
  return listCustomers(q);
}

export async function getCustomerPatients(customerId: number): Promise<PatientRow[]> {
  if (!Number.isInteger(customerId) || !(await customerExists(customerId))) {
    throw new HttpError(404, 'Customer not found');
  }
  return listPatients(customerId);
}

export async function addCustomerPatient(customerId: number, body: unknown): Promise<PatientRow> {
  if (!Number.isInteger(customerId) || !(await customerExists(customerId))) {
    throw new HttpError(404, 'Customer not found');
  }
  const b = (body ?? {}) as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  const relation = typeof b.relation === 'string' ? b.relation.trim() : '';
  if (!name || !relation) throw new HttpError(400, 'Name and relation are required');

  let age: number | null = null;
  if (b.age !== undefined && b.age !== null && b.age !== '') {
    const n = Number(b.age);
    age = Number.isFinite(n) && n >= 0 && n <= 130 ? Math.trunc(n) : null;
  }
  const gender =
    typeof b.gender === 'string' && ['Male', 'Female', 'Other'].includes(b.gender) ? b.gender : null;

  return createPatient({ customerId, name, age, gender, relation });
}

export function getDormantCustomers(): Promise<DormantCustomer[]> {
  return dormantCustomers();
}
