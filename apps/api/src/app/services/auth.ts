import { registerCustomer, findCustomerByEmail } from '@app/repositories/auth';
import { createPatient } from '@app/repositories/patients';
import { hashPassword, verifyPassword } from '@app/utils/password';
import { signToken } from '@app/utils/jwt';

interface AuthResult {
  token: string;
  user: { id: number; name: string; email_id: string; type: string };
}

// The client sends the password base64-encoded (obfuscation, not encryption).
// Invalid base64 just decodes to garbage, which then fails the hash check.
const decodePassword = (encoded: string): string =>
  Buffer.from(encoded, 'base64').toString('utf8');

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
  type: string;
}): Promise<AuthResult> => {
  const email = userData.email.trim().toLowerCase();

  // App-level guard (the customers.email_id UNIQUE index should also exist - see
  // schema.md - but the current DB may be missing it). Small race window is
  // acceptable here; the 23505 catch below is the backstop once the index exists.
  if (await findCustomerByEmail(email)) {
    throw new Error('That email is already registered');
  }

  const passwordHash = await hashPassword(decodePassword(userData.password));

  let user;
  try {
    user = await registerCustomer({
      name: userData.name,
      email,
      passwordHash,
      type: userData.type,
    });
  } catch (err) {
    // 23505 = unique_violation on customers.email_id
    if ((err as { code?: string }).code === '23505') {
      throw new Error('That email is already registered');
    }
    throw err;
  }

  // Auto-create the "Self" patient so the dashboard's patient list is never empty.
  try {
    await createPatient({
      customerId: user.id,
      name: user.name,
      age: null,
      gender: null,
      relation: 'Self',
    });
  } catch (err) {
    console.error('Failed to auto-create self patient:', (err as Error).message);
  }

  return {
    token: signToken({ sub: user.id, email: user.email_id, type: user.type }),
    user,
  };
};

export const loginUser = async (loginData: {
  email: string;
  password: string;
}): Promise<AuthResult> => {
  const email = loginData.email.trim().toLowerCase();
  const customer = await findCustomerByEmail(email);

  // Same message either way - don't reveal whether the email is registered.
  const password = decodePassword(loginData.password);
  if (!customer || !(await verifyPassword(password, customer.password))) {
    throw new Error('Invalid email or password');
  }

  return {
    token: signToken({ sub: customer.id, email: customer.email_id, type: customer.type }),
    user: {
      id: customer.id,
      name: customer.name,
      email_id: customer.email_id,
      type: customer.type,
    },
  };
};
