import { Request, Response } from "express";
import { generateToken } from "../utils/jwt";
import { comparePassword } from "../utils/password";
import { sendSuccess, sendError, HttpStatus } from "../utils/response";
import { User } from "../models/user";
import { hashPassword } from "../utils/password";
const setCookies = (
  res: Response,
  accessToken: string,
  role: string,
  user: { id: string; email: string; name: string; role: string },
): void => {
  const isProd = process.env.NODE_ENV === "production";

  const userPayload = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
  };

  const encodedUser = encodeURIComponent(JSON.stringify(userPayload));

  const commonOptions = {
    httpOnly: true as const,
    secure: isProd,
    sameSite: isProd ? ("none" as const) : ("lax" as const),
    maxAge: 24 * 60 * 60 * 1000, // 1 day
    path: "/",
  };

  res.cookie("access_token", accessToken, commonOptions);
  res.cookie("user", encodedUser, commonOptions);
  res.cookie("role", role, commonOptions);
};

/**
 * Login handler
 */
export const login = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId, password } = req.body;

    console.log("Login attempt for userId:", String(userId).trim());

    const user = await User.findOne({
      userId: String(userId).trim(),
      deleted: false,
    });

    console.log("User found:", user);
    if (!user) {
      sendError(res, "Invalid userId or password", HttpStatus.UNAUTHORIZED);
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      sendError(res, "Invalid userId or password", HttpStatus.UNAUTHORIZED);
      return;
    }

    const token = generateToken(user.userId, user.email, user.role);

    user.lastLogin = new Date();
    await user.save();

    const userInfo = {
      id: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
    };

    setCookies(res, token, user.role, userInfo);

    sendSuccess(res, { token, user: userInfo }, "Login successful");
  } catch (error) {
    console.error("Login error:", error);
    sendError(res, "Login failed", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Validate user token
 */
export const validateUser = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!req.user) {
      sendError(res, "User not authenticated", HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await User.findOne(
      { userId: req.user.userId, deleted: false },
      { userId: 1, email: 1, name: 1, role: 1 }
    );

    if (!user) {
      sendError(res, "User not found", HttpStatus.NOT_FOUND);
      return;
    }

    // Get the token from header
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
      ? authHeader.slice(7)
      : authHeader;

    sendSuccess(res, {
      user,
      token,
    });
  } catch (error) {
    console.error("Validate user error:", error);
    sendError(res, "Validation failed", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Logout handler
 */
export const logout = async (req: Request, res: Response): Promise<void> => {
  try {
    // Clear cookies
    res.cookie("access_token", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 0,
    });

    res.cookie("role", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 0,
    });

    res.cookie("user", "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "none",
      maxAge: 0,
    });

    sendSuccess(
      res,
      {
        COOKIES_TO_CLEAR: ["access_token", "role", "user"],
      },
      "Logout successful",
    );
  } catch (error) {
    console.error("Logout error:", error);
    sendError(res, "Logout failed", HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * Change password
 */
export const changePassword = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!req.user) {
      sendError(res, "User not authenticated", HttpStatus.UNAUTHORIZED);
      return;
    }

    const user = await User.findOne({ userId: req.user.userId, deleted: false });

    if (!user) {
      sendError(res, "User not found", HttpStatus.NOT_FOUND);
      return;
    }

    // Verify current password
    const isPasswordValid = await comparePassword(
      currentPassword,
      user.password,
    );
    if (!isPasswordValid) {
      sendError(res, "Current password is incorrect", HttpStatus.UNAUTHORIZED);
      return;
    }

    const hashedPassword = await hashPassword(newPassword);

    // Update password
    user.password = hashedPassword;
    user.updatedAt = new Date();
    await user.save();

    sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    console.error("Change password error:", error);
    sendError(
      res,
      "Failed to change password",
      HttpStatus.INTERNAL_SERVER_ERROR,
    );
  }
};