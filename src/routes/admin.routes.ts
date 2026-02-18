import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import  { AddUser, deleteUser, getAllUsers } from '../handlers/admin.handler';
const router = Router();

// All admin routes require admin role
// router.use(authMiddleware('admin'));

router.post('/create-user', AddUser);
router.delete('/delete-user', deleteUser);
router.get('/faculties', getAllUsers);

export default router;
