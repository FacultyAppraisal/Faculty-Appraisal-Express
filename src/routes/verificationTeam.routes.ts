import { Router } from 'express';
import { 
  getVerificationCommitteeByDept,
  createVerificationCommitteeByDept,
  assignFacultiesToCommittee
} from '../handlers/verificationTeam.handler';
import { authMiddleware } from '../middleware/auth.middleware';
import { getAllUsers } from '../handlers/admin.handler';

const router: Router = Router();

// Get all users
router.use(authMiddleware('admin'));

router.get('/faculties', getAllUsers);
router.post('/verification-committee/get', getVerificationCommitteeByDept);
router.post('/verification-committee/create', createVerificationCommitteeByDept);
router.post('/verification-committee/assign', assignFacultiesToCommittee);

export default router;
