import { Request, Response } from 'express';
import { User } from '../models/user';
import { VerificationTeam } from '../models/verificationTeam';
import { FacultyAppraisal } from '../models/detailedAppraisal';
import { APPRAISAL_STATUS } from '../constant/appraisal';

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

// Get faculties assigned to a specific verifier
export const getAssignedFaculties = async (
  req: Request,
  res: Response
) => {
  try {
    const verifierId = req.user?.userId; // From auth middleware

    if (!verifierId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Find all verification teams where this user is the verifier
    const verificationTeams = await VerificationTeam.find({ userId: verifierId });

    if (!verificationTeams || verificationTeams.length === 0) {
      return res.status(200).json({
        success: true,
        message: 'No faculties assigned to this verifier',
        data: {
          verifier: verifierId,
          assignedFaculties: [],
          departments: []
        }
      });
    }

    // Get all unique faculty userIds
    const allFacultyIds = [...new Set(verificationTeams.flatMap(team => team.faculties))];
    const faculties = await User.find({ userId: { $in: allFacultyIds } });
    const facultyMap = new Map(faculties.map(f => [f.userId, f]));

    // Get appraisal status for all faculties
    const appraisals = await FacultyAppraisal.find({ 
      userId: { $in: allFacultyIds },
      status: APPRAISAL_STATUS.VERIFICATION_PENDING
    });
    const appraisalMap = new Map(appraisals.map(a => [a.userId, a]));

    // Build response with department grouping - only include faculties with Verification Pending status
    const departments = verificationTeams.map(team => ({
      department: team.department,
      faculties: team.faculties
        .filter(fId => appraisalMap.has(fId)) // Only include faculties with Verification Pending status
        .map(fId => {
          const faculty = facultyMap.get(fId);
          const appraisal = appraisalMap.get(fId);
          return faculty && appraisal ? {
            userId: faculty.userId,
            name: faculty.name,
            email: faculty.email,
            department: faculty.department,
            designation: faculty.designation,
            appraisalStatus: appraisal.status
          } : null;
        }).filter(Boolean)
    })).filter(dept => dept.faculties.length > 0); // Remove departments with no verifiable faculties

    // Filter faculties to only include those with Verification Pending status
    const verifiableFaculties = faculties.filter(f => appraisalMap.has(f.userId));

    return res.status(200).json({
      success: true,
      message: 'Assigned faculties retrieved successfully',
      data: {
        verifier: verifierId,
        assignedFaculties: verifiableFaculties.map(f => {
          const appraisal = appraisalMap.get(f.userId);
          return {
            userId: f.userId,
            name: f.name,
            email: f.email,
            department: f.department,
            designation: f.designation,
            appraisalStatus: appraisal?.status || 'Unknown'
          };
        }),
        departments
      }
    });

  } catch (error) {
    console.error('Error fetching assigned faculties:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch assigned faculties',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Get Part B appraisal data for verification
export const getPartBForVerification = async (
  req: Request<{ facultyId: string }>,
  res: Response
) => {
  try {
    const verifierId = req.user?.userId;
    const { facultyId } = req.params;

    if (!verifierId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    // Check if this faculty is assigned to this verifier
    const verificationTeam = await VerificationTeam.findOne({
      userId: verifierId,
      faculties: facultyId
    });

    if (!verificationTeam) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to verify this faculty'
      });
    }

    // Get faculty details
    const faculty = await User.findOne({ userId: facultyId });
    if (!faculty) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    // Get appraisal data
    const appraisal = await FacultyAppraisal.findOne({ userId: facultyId });
    if (!appraisal) {
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found for this faculty'
      });
    }

    // Check if the appraisal status is Verification Pending
    if (appraisal.status !== APPRAISAL_STATUS.VERIFICATION_PENDING) {
      return res.status(403).json({
        success: false,
        message: `Cannot verify faculty. Current status is "${appraisal.status}". Verification is only allowed for "Verification Pending" status.`
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Part B data retrieved successfully',
      data: {
        faculty: {
          userId: faculty.userId,
          name: faculty.name,
          email: faculty.email,
          department: faculty.department,
          designation: faculty.designation
        },
        appraisalYear: appraisal.appraisalYear,
        appraisalStatus: appraisal.status,
        partB: appraisal.partB
      }
    });

  } catch (error) {
    console.error('Error fetching Part B for verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to fetch Part B data',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};

// Finalize verification - save verified marks and update status
export const finalizeVerification = async (
  req: Request<{ facultyId: string }>,
  res: Response
) => {
  try {
    const verifierId = req.user?.userId;
    const { facultyId } = req.params;
    const { verifiedScores, finalTotal } = req.body;

    if (!verifierId) {
      return res.status(401).json({
        success: false,
        message: 'User not authenticated'
      });
    }

    if (!verifiedScores || typeof verifiedScores !== 'object') {
      return res.status(400).json({
        success: false,
        message: 'Verified scores are required'
      });
    }

    // Check if this faculty is assigned to this verifier
    const verificationTeam = await VerificationTeam.findOne({
      userId: verifierId,
      faculties: facultyId
    });

    if (!verificationTeam) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to verify this faculty'
      });
    }

    // Get appraisal data
    const appraisal = await FacultyAppraisal.findOne({ userId: facultyId });
    if (!appraisal) {
      return res.status(404).json({
        success: false,
        message: 'Appraisal not found for this faculty'
      });
    }

    // Check if the appraisal status is Verification Pending
    if (appraisal.status !== APPRAISAL_STATUS.VERIFICATION_PENDING) {
      return res.status(403).json({
        success: false,
        message: `Cannot verify faculty. Current status is "${appraisal.status}". Verification is only allowed for "Verification Pending" status.`
      });
    }

    // Update verified marks in Part B
    // The verifiedScores object has keys like "papers_sci", "conferences_scopus", etc.
    // We need to map them to the nested structure in partB
    Object.keys(verifiedScores).forEach(key => {
      const marks = verifiedScores[key]?.marks || 0;
      
      // Parse the key to get section and subsection
      const parts = key.split('_');
      
      if (parts.length >= 2) {
        // Nested structure: section_subsection (e.g., papers_sci)
        const section = parts[0]; // papers, conferences, bookChapters, etc.
        const subsection = parts[1]; // sci, esci, scopus, etc.
        
        // Update the verified field in the nested structure
        if (appraisal.partB && (appraisal.partB as any)[section] && (appraisal.partB as any)[section][subsection]) {
          (appraisal.partB as any)[section][subsection].verified = marks;
        }
      } else {
        // Single field (e.g., revenueTraining, placement)
        if (appraisal.partB && (appraisal.partB as any)[key]) {
          (appraisal.partB as any)[key].verified = marks;
        }
      }
    });

    // Update totalVerified in Part B
    if (finalTotal !== undefined && finalTotal !== null) {
      appraisal.partB.totalVerified = finalTotal;
    }

    // Update status to Portfolio Marks Pending
    appraisal.status = APPRAISAL_STATUS.PORTFOLIO_MARKING_PENDING;

    // Save the appraisal
    await appraisal.save();

    return res.status(200).json({
      success: true,
      message: 'Verification finalized successfully. Status updated to Portfolio Marks Pending.',
      data: {
        facultyId,
        status: appraisal.status
      }
    });

  } catch (error) {
    console.error('Error finalizing verification:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to finalize verification',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
};
