import { Request, Response } from 'express';
import { User } from '../models/user';

interface UserResponse {
    userId: string;
    department: string;
    status: string;
    name: string;
    role: string;
}
interface SuccessResponse {
    message: string;
    users: UserResponse[];
}

interface ErrorResponse {
    message: string;
}

export const getAllFaculties = async (
  req: Request,
  res: Response<SuccessResponse | ErrorResponse>
) => {
  try {
    const faculties = await User.find({ role: { $nin: ['admin', 'director'] } }).select('userId department status name role');

    const formattedFaculties = faculties.map((faculty) => ({
      userId: faculty.userId,
      department: faculty.department,
      status: faculty.status,
      name: faculty.name,
      role: faculty.role,
    }));

    return res.status(200).json({
      message: 'Faculties retrieved successfully',
      users: formattedFaculties,
    });
  } catch (error: any) {
    console.error('Error retrieving faculties:', error);
    return res.status(500).json({
      message: error.message || 'Internal server error',
    });
  }
}

export const getUsersByDepartment = async (req: Request, res: Response) => {
  try {
    const { department } = req.query;

    if (!department || typeof department !== 'string') {
      return res.status(400).json({
        message: 'Department query parameter is required and must be a string',
      });
    }

    const users = await User.find({ department, role: { $nin: ['admin', 'director'] } }).select('userId name email department status role');
    return res.status(200).json({
      message: 'Users retrieved successfully',
      users,
    });
  } catch (error) {
    console.error('Error fetching users by department:', error);
    return res.status(500).json({
      message: error instanceof Error ? error.message : 'Internal server error',
    });
  }
};