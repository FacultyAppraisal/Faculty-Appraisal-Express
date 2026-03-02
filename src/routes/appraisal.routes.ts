import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getAppraisalByUserId,
  getAppraisalsByDepartment,
  updatePartA,
  updatePartB,
  updatePartC,
  updatePartD,
  portfolioMarksEvaluator,
  updatePartE,
  updateDeclaration,
  submitAppraisal,
} from '../handlers/appraisal.handler';

const router = Router();

// Every route in this file requires a valid JWT.
router.use(authMiddleware());

// Must be declared BEFORE /:userId to avoid Express matching "department" as a userId.
router.get(
  '/department/:department',
  authMiddleware('hod'),
  getAppraisalsByDepartment
);

// GET /appraisal/:userId
// Fetch the full appraisal document — owner or evaluator roles.
router.get('/:userId', getAppraisalByUserId);

router.put('/:userId/part-a', updatePartA);
router.put('/:userId/part-b', updatePartB);
router.put('/:userId/part-c', updatePartC);
router.put('/:userId/part-d', updatePartD);
router.put('/:userId/part-e', updatePartE);

router.patch('/:userId/declaration', updateDeclaration);

// PATCH /appraisal/:userId/submit
// Faculty freezes and submits their appraisal (DRAFT → SUBMITTED).
router.patch('/:userId/submit', submitAppraisal);

// PUT /appraisal/:userId/part-d/evaluator
// Dean / HOD / Director enters their evaluation marks after faculty submission.
router.put(
  '/:userId/part-d/evaluator',
  authMiddleware('dean', 'hod'),
  portfolioMarksEvaluator
);

export default router;
