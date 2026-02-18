import { Request, Response } from 'express';
import { User } from '../models/user';
import { VerificationTeam } from '../models/verificationTeam';

interface CreateVerificationCommitteeBody {
  department: string;
  committee_ids: string[];
  deleted_verifiers?: string[];
}

interface AssignFacultiesBody {
  department: string;
  assignments: Record<string, string[]>; // { verifierId: [facultyIds] }
}

interface GetCommitteeBody {
  department: string;
}

// Get verification committee for a department
export const getVerificationCommitteeByDept = async (
  req: Request<{}, {}, GetCommitteeBody>,
  res: Response
) => {
  try {
    const { department } = req.body;
    
    if (!department) {
      return res.status(400).json({
        error: 'Department is required'
      });
    }

    // Find all verification teams for this department
    const verificationTeams = await VerificationTeam.find({ department })
      .populate('userId', 'userId name email department designation')
      .populate('faculties', 'userId name email department designation');

    if (!verificationTeams || verificationTeams.length === 0) {
      return res.status(200).json({
        department: department,
        committees: {}
      });
    }

    // Build response
    const committees: Record<string, string[]> = {};

    for (const team of verificationTeams) {
      const verifier = team.userId as any;
      if (verifier) {
        const key = `${verifier.userId} (${verifier.name})`;
        const faculties = team.faculties.map((faculty: any) => 
          `${faculty.userId} (${faculty.name})`
        );
        committees[key] = faculties;
      }
    }

    return res.status(200).json({
      department: department,
      committees
    });

  } catch (error) {
    console.error('Error fetching verification committee:', error);
    return res.status(500).json({
      error: 'Failed to fetch verification committee'
    });
  }
};

// Create or update verification committee for a department
export const createVerificationCommitteeByDept = async (
  req: Request<{}, {}, CreateVerificationCommitteeBody>,
  res: Response
) => {
  try {
    const { department, committee_ids, deleted_verifiers = [] } = req.body;

    if (!department) {
      return res.status(400).json({
        error: 'Department is required'
      });
    }

    if (!committee_ids || !Array.isArray(committee_ids)) {
      return res.status(400).json({
        error: 'committee_ids is required and must be an array'
      });
    }

    // Validate all committee IDs exist and are from different departments
    const verifiers = await User.find({ 
      userId: { $in: committee_ids }
    });

    if (verifiers.length !== committee_ids.length) {
      return res.status(400).json({
        error: 'One or more committee IDs are invalid'
      });
    }

    // Check if any verifier is from the same department
    const sameDeptVerifiers = verifiers.filter(v => v.department === department);
    if (sameDeptVerifiers.length > 0) {
      return res.status(400).json({
        error: `Verifiers cannot be from the same department (${department})`
      });
    }

    // Get all faculty from the department being verified
    const departmentFaculty = await User.find({ 
      department: department,
      role: 'faculty'
    });

    // Handle deleted verifiers first
    if (deleted_verifiers.length > 0) {
      const deletedUsers = await User.find({ userId: { $in: deleted_verifiers } });
      await VerificationTeam.deleteMany({
        department: department,
        userId: { $in: deletedUsers.map(u => u._id) }
      });
    }

    // Get existing verifier IDs for this department
    const existingVerifierIds = await User.find({ 
      userId: { $in: committee_ids }
    }).then(users => users.map(u => u._id));

    // Remove old assignments for this department (except current verifiers)
    await VerificationTeam.deleteMany({
      department: department,
      userId: { $nin: existingVerifierIds }
    });

    // Distribute faculty among verifiers evenly
    const facultyPerVerifier = Math.ceil(departmentFaculty.length / verifiers.length);
    const verificationTeams = [];
    
    for (let i = 0; i < verifiers.length; i++) {
      const verifier = verifiers[i];
      const startIndex = i * facultyPerVerifier;
      const endIndex = Math.min(startIndex + facultyPerVerifier, departmentFaculty.length);
      const assignedFaculties = departmentFaculty.slice(startIndex, endIndex);

      // Check if this verifier already has a team
      const existingTeam = await VerificationTeam.findOne({
        userId: verifier._id,
        department: department
      });

      if (existingTeam) {
        // Update existing team
        existingTeam.faculties = assignedFaculties.map(f => f._id);
        await existingTeam.save();
        verificationTeams.push(existingTeam);
      } else {
        // Create new team
        const newTeam = new VerificationTeam({
          userId: verifier._id,
          department: department,
          faculties: assignedFaculties.map(f => f._id)
        });
        await newTeam.save();
        verificationTeams.push(newTeam);
      }
    }

    // Populate for response
    const populatedTeams = await VerificationTeam.find({
      _id: { $in: verificationTeams.map(t => t._id) }
    })
      .populate('userId', 'userId name email department')
      .populate('faculties', 'userId name email department');

    // Build response
    const committees: Record<string, string[]> = {};
    
    for (const team of populatedTeams) {
      const verifier = team.userId as any;
      if (verifier) {
        const key = `${verifier.userId} (${verifier.name})`;
        const faculties = team.faculties.map((faculty: any) => 
          `${faculty.userId} (${faculty.name})`
        );
        committees[key] = faculties;
      }
    }

    return res.status(200).json({
      message: 'Verification committee created successfully',
      department: department,
      committees
    });

  } catch (error) {
    console.error('Error creating verification committee:', error);
    return res.status(500).json({
      error: 'Failed to create verification committee'
    });
  }
};

// Assign specific faculties to verification committee members
export const assignFacultiesToCommittee = async (
  req: Request<{}, {}, AssignFacultiesBody>,
  res: Response
) => {
  try {
    const { department, assignments } = req.body;

    if (!department) {
      return res.status(400).json({
        error: 'Department is required'
      });
    }

    if (!assignments || typeof assignments !== 'object') {
      return res.status(400).json({
        error: 'Assignments object is required'
      });
    }

    // Process each assignment
    for (const [verifierId, facultyIds] of Object.entries(assignments)) {
      // Extract just the ID from format "userId (name)"
      const cleanVerifierId = verifierId.split(' ')[0];
      
      // Find verifier
      const verifier = await User.findOne({ userId: cleanVerifierId });
      if (!verifier) continue;

      // Clean faculty IDs and find faculty members
      const cleanFacultyIds = facultyIds.map(id => id.split(' ')[0]);
      const faculties = await User.find({ 
        userId: { $in: cleanFacultyIds }
      });

      // Find or create verification team
      let team = await VerificationTeam.findOne({
        userId: verifier._id,
        department: department
      });

      if (team) {
        // Update existing team
        team.faculties = faculties.map(f => f._id);
        await team.save();
      } else {
        // Create new team
        team = new VerificationTeam({
          userId: verifier._id,
          department: department,
          faculties: faculties.map(f => f._id)
        });
        await team.save();
      }
    }

    return res.status(200).json({
      message: 'Faculty allocation updated successfully',
      department: department
    });

  } catch (error) {
    console.error('Error assigning faculties:', error);
    return res.status(500).json({
      error: 'Failed to assign faculties'
    });
  }
};
