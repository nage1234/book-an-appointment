import { Request, Response } from 'express';
import { registerUser, loginUser } from "@app/services/auth";

export const register = async (
  req: Request,
  res: Response
) => {
  try {
    const { name, email, password } = req.body;

    // Basic validation
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email and password are required",
      });
    }

    const { token, user } = await registerUser({
      name,
      email,
      password,
      type: "customer",
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

    return res.status(400).json({
      message,
    });
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
