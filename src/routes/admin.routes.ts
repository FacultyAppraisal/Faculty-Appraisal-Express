import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { AddUser, deleteUser, getAllUsers } from '../handlers/admin.handler';
import { createVerificationCommittee, getVerificationCommitteeByDept } from '../handlers/verificationTeam.handler';
const router = Router();

// All admin routes require admin role
router.use(authMiddleware('admin'));

router.post('/create-user', AddUser);
router.delete('/delete-user', deleteUser);
router.get('/faculties', getAllUsers);
router.post('/verification-committee', createVerificationCommittee);
router.get('/verification-committee/:department', getVerificationCommitteeByDept);

export default router;
