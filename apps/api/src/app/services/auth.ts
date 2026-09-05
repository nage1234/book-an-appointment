import { registerCustomer, findCustomerByEmail } from '@app/repositories/auth';
import { hashPassword, verifyPassword } from '@app/utils/password';
import { signToken } from '@app/utils/jwt';

interface AuthResult {
  token: string;
  user: { id: number; name: string; email_id: string; type: string };
}

export const registerUser = async (userData: {
  name: string;
  email: string;
  password: string;
  type: string;
}): Promise<AuthResult> => {
  const email = userData.email.trim().toLowerCase();
  const passwordHash = await hashPassword(userData.password);

  const user = await registerCustomer({
    name: userData.name,
    email,
    passwordHash,
    type: userData.type,
  });

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
  if (!customer || !(await verifyPassword(loginData.password, customer.password))) {
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
