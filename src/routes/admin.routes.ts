import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { AddUser, deleteUser, getAllUsers, assignInteractionDeans, getAllInteractionDeans } from '../handlers/admin.handler';
import { createVerificationCommittee, getVerificationCommitteeByDept } from '../handlers/verificationTeam.handler';
const router = Router();

// All admin routes require admin role
router.use(authMiddleware('admin'));

router.post('/create-user', AddUser);
router.delete('/delete-user', deleteUser);
router.get('/faculties', getAllUsers);
router.post('/verification-team', createVerificationCommittee);
router.get('/verification-team/:department', getVerificationCommitteeByDept);

// Interaction deans routes
router.get('/interaction-deans', getAllInteractionDeans);
router.post('/interaction-deans/:department', assignInteractionDeans);

// Interaction deans routes
router.get('/interaction-deans', getAllInteractionDeans);
router.post('/interaction-deans/:department', assignInteractionDeans);

export default router;
