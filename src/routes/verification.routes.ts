import { Router } from 'express';
import { getVerificationCommittee, createVerificationCommittee } from '../handlers/verification.handler';

const router: Router = Router();

// Get verification committee for a department
router.get('/:department/verification-committee', getVerificationCommittee);

// Create or update verification committee for a department
router.post('/:department/verification-committee', createVerificationCommittee);

export default router;
