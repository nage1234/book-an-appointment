import { Request, Response } from 'express';
import { registerUser, loginUser, forgotPassword as forgotPasswordSvc, changePassword as changePasswordSvc } from "@app/services/auth";
import { sendError } from '@app/utils/httpError';

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email_id, password } = req.body;

    // Basic validation
    if (!name || !email_id || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const { token, user } = await registerUser({
      name,
      email: email_id,
      password,
      type: "customer", // never taken from the client
    });

    return res.status(201).json({
      message: "User registered successfully",
      token,
      user,
    });

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong";

    const status = message.includes("already registered") ? 409 : 400;
    return res.status(status).json({ message });
  }
};

export const login = async (
  req: Request,
  res: Response
) => {
  try {
    const { email_id, password } = req.body;

    if (!email_id || !password) {
      return res.status(400).json({
        message: "email_id and password are required",
      });
    }

    const { token, user } = await loginUser({ email: email_id, password });

    return res.status(200).json({
      message: "Logged in successfully",
      token,
      user,
    });

  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Something went wrong";

    return res.status(401).json({
      message,
    });
  }
};

// CR-1: forgot password (auto-generated + emailed) + change password
export const forgotPassword = async (req: Request, res: Response) => {
  try {
    const { email_id } = req.body;
    if (!email_id) {
      return res.status(400).json({ message: 'email_id is required' });
    }
    await forgotPasswordSvc(email_id);
    // Always 200, regardless of whether the email is registered.
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error);
  }
};

export const changePassword = async (req: Request, res: Response) => {
  try {
    await changePasswordSvc(req.user!.email, req.body);
    return res.status(200).json({ ok: true });
  } catch (error) {
    return sendError(res, error);
  }
};
