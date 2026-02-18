import { Request, Response } from 'express';
import { DepartmentValue, StakeholderStatus, UserDesignation, UserRole } from '../constant';
import { User } from '../models/user';
import { hashPassword } from '../utils/password';

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
    createdAt: Date;
    updatedAt: Date;
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
        
    const { 
      userId, 
      name, 
      email, 
      department, 
      mobile, 
      designation, 
      status, 
      password, 
      role
    } = req.body;

    // Validate required fields
    if (!userId || !name || !email || !department || !mobile || !designation || !status || !password || !role) {
      return res.status(400).json({
        message: `All fields including userId are required`
      });
    }

    // Check if user already exists
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

    // Hash the password
    const hashedPassword = await hashPassword(password);

    // Create user in User collection
    const user = await User.create({
      userId,
      name,
      email,
      department,
      mobile,
      designation,
      status,
      password: hashedPassword,
      role,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const response: UserResponse = {
      userId: user.userId,
      username: user.name,
      role: user.role,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt
    };

    return res.status(201).json({
      message: "User created successfully",
      user: response
    });

  } catch (error) {
    console.error("Error creating user:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
};

export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await User.find({ status: "active" })
      .select('userId name email department mobile designation role createdAt')
      .sort({ createdAt: -1 });

    return res.status(200).json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
};

export const deleteUser = async (req: Request, res: Response) => {
  try {
    const { userId } = req.body;
    const user = await User.findOne({ userId });
    if (!user) {
      return res.status(404).json({
        message: "User not found"
      });
    }
    // Instead of deleting the user, we can mark them as inactive
    user.status = "inactive";
    await user.save();
    return res.status(200).json({
      message: "User deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting user:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
};