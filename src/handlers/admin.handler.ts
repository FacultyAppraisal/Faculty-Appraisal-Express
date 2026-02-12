import { Request, Response } from 'express';
import { DepartmentValue, StakeholderStatus, UserDesignation, UserRole } from '../constant';
import { User } from '../models/user';

interface CreateUserRequest {
    userId: string;
    name: string;
    email: string;
    department: DepartmentValue;
    mobile: string;
    designation: UserDesignation;
    status: StakeholderStatus;
    password: string;
    role: UserRole;
}


interface UserResponse {
  userId: string;
    username: string;
    role: string;
}

interface SuccessResponse {
    message: string;
    user: UserResponse;
}

interface ErrorResponse {
    message: string;
}


export const AddUser = async (
  req: Request<{}, {}, CreateUserRequest>,
  res: Response<SuccessResponse | ErrorResponse>
) => {
  try {
    const { userId, name, email, department, mobile, designation, status, password, role } = req.body;

    if (!userId || !name || !email || !department || !mobile || !designation || !status || !password || !role) {
      return res.status(400).json({
        message: "All fields including userId are required"
      });
    }
    const existingUserId = await User.findOne({ userId });
    if (existingUserId) {
      return res.status(409).json({
        message: "User with this userId already exists"
      });
    }

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({
        message: "User with this email already exists"
      });
    }

    const user = await User.create({
      userId,
      name,
      email,
      department,
      mobile,
      designation,
      status,
      password,
      role
    });

    const response: UserResponse = {
      userId: user.userId,
      username: user.name,
      role: user.role
    };

    return res.status(201).json({
      message: "User created successfully",
      user: response
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      message: "Internal server error"
    });
  }
};
