import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import { getAllFaculties, getUsersByDepartment } from '../handlers/common.handler';
const router = Router();

// All admin routes require admin role
router.use(authMiddleware('admin', 'director', 'faculty', 'hod'));
router.get('/faculties', getAllFaculties);
router.get('/by-department', getUsersByDepartment);


export default router;
