import { MIN_PASSWORD_LENGTH } from '@baa/types';
import { registerCustomer, findCustomerByEmail, updatePasswordByEmail } from '@app/repositories/auth';
import { createPatient } from '@app/repositories/patients';
import { hashPassword, verifyPassword, generateTempPassword } from '@app/utils/password';
import { signToken } from '@app/utils/jwt';
import { sendNewPasswordEmail } from '@app/utils/mailer';
import { HttpError } from '@app/utils/httpError';

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

// ---- CR-1: forgot password (auto-generated) + change password ----

/**
 * Verifies the email is registered, then generates and emails a new password.
 * Always resolves (no error) whether or not the email exists - the controller
 * responds 200 either way so registration status is never revealed.
 */
export const forgotPassword = async (emailRaw: string): Promise<void> => {
  const email = (emailRaw ?? '').trim().toLowerCase();
  if (!email) return;

  const customer = await findCustomerByEmail(email);
  if (!customer) return; // silently no-op - don't reveal whether the email is registered

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await updatePasswordByEmail(email, passwordHash);
  await sendNewPasswordEmail(email, tempPassword);
};

/**
 * Changes the logged-in customer's password. Requires both the email on the
 * JWT to match the submitted email, AND the current password to verify -
 * a valid token alone isn't enough.
 */
export const changePassword = async (
  authEmail: string,
  body: { email_id?: string; oldPassword?: string; newPassword?: string }
): Promise<void> => {
  const submittedEmail = (body.email_id ?? '').trim().toLowerCase();
  if (!submittedEmail || submittedEmail !== authEmail.trim().toLowerCase()) {
    throw new HttpError(403, 'That email does not match your account');
  }
  if (!body.oldPassword || !body.newPassword) {
    throw new HttpError(400, 'Old and new password are required');
  }

  const customer = await findCustomerByEmail(submittedEmail);
  if (!customer) throw new HttpError(404, 'Account not found');

  const oldPlain = decodePassword(body.oldPassword);
  if (!(await verifyPassword(oldPlain, customer.password))) {
    throw new HttpError(400, 'Old password is incorrect');
  }

  const newPlain = decodePassword(body.newPassword);
  if (newPlain.length < MIN_PASSWORD_LENGTH) {
    throw new HttpError(400, `New password must be at least ${MIN_PASSWORD_LENGTH} characters`);
  }
  if (newPlain === oldPlain) {
    throw new HttpError(400, 'New password must be different from the old password');
  }

  const newHash = await hashPassword(newPlain);
  await updatePasswordByEmail(submittedEmail, newHash);
};
