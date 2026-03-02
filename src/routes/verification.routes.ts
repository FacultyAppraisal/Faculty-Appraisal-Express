import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { 
  getAssignedFaculties,
  getPartBForVerification,
  finalizeVerification
} from '../handlers/verificationTeam.handler';

const router = Router();

// All verification routes require authentication
router.use(authMiddleware());

// Get faculties assigned to the logged-in verifier
router.get('/assigned-faculties', getAssignedFaculties);

// Get Part B appraisal data for verification
router.get('/part-b/:facultyId', getPartBForVerification);

// Finalize verification and update status
router.post('/finalize/:facultyId', finalizeVerification);

export default router;
