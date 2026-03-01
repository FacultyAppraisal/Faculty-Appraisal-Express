import { Request, Response } from 'express';
import { DepartmentValue, StakeholderStatus, UserDesignation, UserRole } from '../constant';
import { User } from '../models/user';
import { hashPassword } from '../utils/password';
import mongoose from 'mongoose';
import InteractionDean from '../models/interactionDean';

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
    higherDean?: string; // MongoDB ObjectId as string
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
      role,
      higherDean
    } = req.body;

    // Validate required fields
    if (!userId || !name || !email || !department || !mobile || !designation || !status || !password || !role) {
      return res.status(400).json({
        message: `All fields including userId are required`
      });
    }

    if (role === "associate_dean" && !higherDean) {
      return res.status(400).json({
        message: "Higher Dean is required for Associate Dean role"
      });
    }

    // Validate and verify higherDean if provided
    let higherDeanObjectId: mongoose.Types.ObjectId | undefined;
    if (higherDean) {
      // Validate ObjectId format
      if (!mongoose.Types.ObjectId.isValid(higherDean)) {
        return res.status(400).json({
          message: "Invalid Higher Dean ID format"
        });
      }

      // Verify that the higher dean exists
      const deanExists = await User.findById(higherDean);
      if (!deanExists) {
        return res.status(404).json({
          message: "Higher Dean not found"
        });
      }

      higherDeanObjectId = new mongoose.Types.ObjectId(higherDean);
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
      higherDean: higherDeanObjectId, 
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
    const users = await User.find({ status: "active", role: { $ne: "admin" } })
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

// Handler to assign interaction deans to a department
export const assignInteractionDeans = async (req: Request, res: Response) => {
  try {
    const { department } = req.params;
    const { dean_ids } = req.body;

    if (!department) {
      return res.status(400).json({
        message: "Department is required"
      });
    }

    if (!dean_ids || !Array.isArray(dean_ids) || dean_ids.length === 0) {
      return res.status(400).json({
        message: "Dean IDs array is required and cannot be empty"
      });
    }

    // Validate that all dean_ids are non-empty strings
    const validDeanIds = dean_ids.filter((id) => typeof id === 'string' && id.trim().length > 0);
    
    if (validDeanIds.length !== dean_ids.length) {
      return res.status(400).json({
        message: "Invalid dean ID(s) provided"
      });
    }

    // Verify that all provided IDs are actually deans
    const deans = await User.find({
      userId: { $in: validDeanIds },
      role: "dean"
    });

    if (deans.length !== validDeanIds.length) {
      const foundUserIds = deans.map(d => d.userId);
      const invalidUserIds = validDeanIds.filter(id => !foundUserIds.includes(id));
      return res.status(400).json({
        message: `One or more provided IDs do not belong to users with Dean designation: ${invalidUserIds.join(', ')}`
      });
    }

    // Update or create the interaction dean document
    const interactionDean = await InteractionDean.findOneAndUpdate(
      { department },
      { department, deanIds: validDeanIds },
      { upsert: true, new: true }
    );

    // Fetch dean details separately
    const deanDetails = await User.find(
      { userId: { $in: validDeanIds } },
      'userId name email department designation'
    );

    return res.status(200).json({
      message: "Interaction deans assigned successfully",
      data: {
        ...interactionDean.toObject(),
        deans: deanDetails
      }
    });
  } catch (error) {
    console.error("Error assigning interaction deans:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
};

// Handler to get all interaction deans for all departments
export const getAllInteractionDeans = async (req: Request, res: Response) => {
  try {
    // Fetch all interaction deans
    const allInteractionDeans = await InteractionDean.find();

    // Create a map to store department-wise deans
    const departmentDeansMap: { [key: string]: any[] } = {};

    // Collect all unique userIds
    const allUserIds = new Set<string>();
    allInteractionDeans.forEach(interactionDean => {
      interactionDean.deanIds.forEach(userId => allUserIds.add(userId));
    });

    // Fetch all dean details at once
    const allDeanDetails = await User.find(
      { userId: { $in: Array.from(allUserIds) } },
      'userId name email department designation'
    );

    // Create a map for quick lookup
    const deanDetailsMap = new Map();
    allDeanDetails.forEach(dean => {
      deanDetailsMap.set(dean.userId, dean);
    });

    // Build the response with dean details
    allInteractionDeans.forEach(interactionDean => {
      const deansForDepartment = interactionDean.deanIds
        .map(userId => deanDetailsMap.get(userId))
        .filter(dean => dean !== undefined);
      
      departmentDeansMap[interactionDean.department] = deansForDepartment;
    });

    return res.status(200).json({
      data: departmentDeansMap
    });
  } catch (error) {
    console.error("Error fetching all interaction deans:", error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : "Internal server error"
    });
  }
};
