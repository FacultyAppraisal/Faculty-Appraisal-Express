import { Request, Response } from 'express';
import { User } from '../models/user';
import { VerificationTeam } from '../models/verificationTeam';

interface VerificationTeamPayload {
  department: string;
  verificationTeam: Array<{
    userId: string;
    facultyIds: string[];
  }>;
}

// Create verification committee from frontend payload
export const createVerificationCommittee = async (
  req: Request<{}, {}, VerificationTeamPayload>,
  res: Response
) => {
  try {
    const { department, verificationTeam } = req.body;

    // Validate required fields
    if (!department || typeof department !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Department is required and must be a string'
      });
    }

    if (!verificationTeam || !Array.isArray(verificationTeam) || verificationTeam.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Verification team array is required and must not be empty'
      });
    }

    // Validate each team entry
    for (let i = 0; i < verificationTeam.length; i++) {
      const team = verificationTeam[i];
      if (!team.userId || !team.facultyIds || !Array.isArray(team.facultyIds)) {
        return res.status(400).json({
          success: false,
          message: `Invalid team entry at index ${i}. userId and facultyIds array are required`
        });
      }
    }

    // Delete existing verification teams for this department
    await VerificationTeam.deleteMany({ department });

    // Create new verification teams
    const createdTeams = [];

    for (const team of verificationTeam) {
      const { userId, facultyIds } = team;

      // Find verifier user by userId field (not _id)
      const verifier = await User.findOne({ userId: userId });
      if (!verifier) {
        return res.status(400).json({
          success: false,
          message: `Verifier with userId ${userId} not found`
        });
      }

      // Ensure verifier is not from the same department
      if (verifier.department === department) {
        return res.status(400).json({
          success: false,
          message: `Verifier ${verifier.name} cannot be from the same department (${department})`
        });
      }

      // Find all faculty members by userId field (not _id)
      const faculties = await User.find({ userId: { $in: facultyIds } });
      
      if (faculties.length !== facultyIds.length) {
        const foundIds = faculties.map(f => f.userId);
        const missingIds = facultyIds.filter(id => !foundIds.includes(id));
        return res.status(400).json({
          success: false,
          message: `Faculty IDs not found: ${missingIds.join(', ')}`
        });
      }

      // Ensure all faculties are from the target department
      const invalidFaculties = faculties.filter(f => f.department !== department);
      if (invalidFaculties.length > 0) {
        return res.status(400).json({
          success: false,
          message: `Faculties must be from ${department} department. Invalid: ${invalidFaculties.map(f => f.name).join(', ')}`
        });
      }

      // Create verification team - store string userId values
      const newTeam = new VerificationTeam({
        userId: verifier.userId,
        department,
        faculties: faculties.map(f => f.userId)
      });

      await newTeam.save();
      createdTeams.push(newTeam);
    }

    // Fetch created teams and manually populate user data
    const savedTeams = await VerificationTeam.find({ department });
    
    // Get all unique userIds to fetch users
    const allUserIds = savedTeams.flatMap(team => [team.userId, ...team.faculties]);
    const users = await User.find({ userId: { $in: allUserIds } });
    const userMap = new Map(users.map(u => [u.userId, u]));

    return res.status(201).json({
      success: true,
      message: 'Verification committee created successfully',
      data: {
        department,
        verificationTeam: savedTeams.map(team => {
          const verifier = userMap.get(team.userId);
          const assignedFaculties = team.faculties
            .map(fId => userMap.get(fId))
            .filter((f): f is NonNullable<typeof f> => f !== undefined && f !== null);
          
          return {
            verifier: verifier ? {
              userId: verifier.userId,
              name: verifier.name,
              email: verifier.email,
              department: verifier.department
            } : null,
            assignedFaculties: assignedFaculties.map(f => ({
              userId: f.userId,
              name: f.name,
              email: f.email,
              department: f.department
            }))
          };
        })
      }
    });

  } catch (error) {
    console.error('Error creating verification committee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create verification committee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get verification committee for a department
export const getVerificationCommitteeByDept = async (
  req: Request<{ department: string }>,
  res: Response
) => {
  try {
    const { department } = req.params;
    
    if (!department) {
      return res.status(400).json({
        success: false,
        message: 'Department parameter is required'
      });
    }

    // Find all verification teams for this department
    const verificationTeams = await VerificationTeam.find({ department });

    if (!verificationTeams || verificationTeams.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No verification teams found for this department',
        data: {
          department: department,
          verificationTeam: []
        }
      });
    }

    // Get all unique userIds to fetch users
    const allUserIds = verificationTeams.flatMap(team => [team.userId, ...team.faculties]);
    const users = await User.find({ userId: { $in: allUserIds } });
    const userMap = new Map(users.map(u => [u.userId, u]));

    // Build response
    const verificationTeam = verificationTeams.map(team => {
      const verifier = userMap.get(team.userId);
      const assignedFaculties = team.faculties
        .map(fId => userMap.get(fId))
        .filter((f): f is NonNullable<typeof f> => f !== undefined && f !== null);
      
      return {
        verifier: verifier ? {
          userId: verifier.userId,
          name: verifier.name,
          email: verifier.email,
          department: verifier.department
        } : null,
        assignedFaculties: assignedFaculties.map(faculty => ({
          userId: faculty.userId,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department
        }))
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Verification committee retrieved successfully',
      data: {
        department: department,
        verificationTeam: verificationTeam
      }
    });

  } catch (error) {
    console.error('Error fetching verification committee:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch verification committee',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
