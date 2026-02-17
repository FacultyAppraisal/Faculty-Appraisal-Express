import { Request, Response } from 'express';
import { User } from '../models/user';
import { VerificationTeam } from '../models/verificationTeam';
import mongoose from 'mongoose';

// Map frontend department names to backend values
const departmentMapping: Record<string, string> = {
  'Computer Engineering': 'computer',
  'Information Technology': 'it',
  'Mechanical Engineering': 'mechanical',
  'Civil Engineering': 'civil',
  'Electronics and Telecommunication Engineering': 'entc',
  'Computer Engineering (Regional)': 'computer_regional',
  'Artificial Intelligence and Machine Learning': 'aiml',
  'Applied Sciences and Humanities': 'ash'
};

interface CreateVerificationCommitteeRequest {
  committee_ids: string[];
  deleted_verifiers?: string[];
}

interface DepartmentParams {
  department: string;
}

// Get verification committee for a department
export const getVerificationCommittee = async (req: Request<DepartmentParams>, res: Response) => {
  try {
    const { department } = req.params;
    
    // Map frontend department name to backend value
    const deptValue = departmentMapping[department] || department.toLowerCase();

    // Find all verification teams for this department
    const verificationTeams = await VerificationTeam.find({ department: deptValue })
      .populate('userId', 'userId name email department')
      .populate('faculties', 'userId name email department');

    if (!verificationTeams || verificationTeams.length === 0) {
      return res.status(200).json({
        department: department,
        committees: {}
      });
    }

    // Build response in the format expected by frontend
    const committees: Record<string, string[]> = {};

    for (const team of verificationTeams) {
      const verifier = team.userId as any;
      if (verifier) {
        // Create key in format: "userId (name)"
        const key = `${verifier.userId} (${verifier.name})`;
        
        // Map faculties to their display format
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
export const createVerificationCommittee = async (
  req: Request<DepartmentParams, {}, CreateVerificationCommitteeRequest>,
  res: Response
) => {
  try {
    const { department } = req.params;
    const { committee_ids, deleted_verifiers = [] } = req.body;

    if (!committee_ids || !Array.isArray(committee_ids)) {
      return res.status(400).json({
        error: 'committee_ids is required and must be an array'
      });
    }

    // Map frontend department name to backend value
    const deptValue = departmentMapping[department] || department.toLowerCase();

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
    const sameDeptVerifiers = verifiers.filter(v => v.department === deptValue);
    if (sameDeptVerifiers.length > 0) {
      return res.status(400).json({
        error: `Verifiers cannot be from the same department (${department})`
      });
    }

    // Get all faculty from the department being verified
    const departmentFaculty = await User.find({ 
      department: deptValue,
      role: 'faculty'
    });

    // Handle deleted verifiers first
    if (deleted_verifiers.length > 0) {
      await VerificationTeam.deleteMany({
        department: deptValue,
        userId: { 
          $in: await User.find({ userId: { $in: deleted_verifiers } })
            .then(users => users.map(u => u._id))
        }
      });
    }

    // Distribute faculty among verifiers
    const facultyPerVerifier = Math.ceil(departmentFaculty.length / verifiers.length);
    
    // Delete existing verification teams for this department (excluding the ones we just deleted)
    const existingVerifierIds = await User.find({ 
      userId: { $in: committee_ids }
    }).then(users => users.map(u => u._id));

    // Remove old assignments for this department
    await VerificationTeam.deleteMany({
      department: deptValue,
      userId: { $nin: existingVerifierIds }
    });

    // Create new verification teams
    const verificationTeams = [];
    
    for (let i = 0; i < verifiers.length; i++) {
      const verifier = verifiers[i];
      const startIndex = i * facultyPerVerifier;
      const endIndex = Math.min(startIndex + facultyPerVerifier, departmentFaculty.length);
      const assignedFaculties = departmentFaculty.slice(startIndex, endIndex);

      // Check if this verifier already has a team
      const existingTeam = await VerificationTeam.findOne({
        userId: verifier._id,
        department: deptValue
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
          department: deptValue,
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
