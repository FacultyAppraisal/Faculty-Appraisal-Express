import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  getAppraisalByUserId,
  getAllAppraisals,
  getAppraisalsByDepartment,
  updatePartA,
  updatePartB,
  updatePartC,
  updatePartD,
  updatePartDEvaluator,
  updatePartE,
  updateDeclaration,
  submitAppraisal,
} from '../handlers/appraisal.handler';
import { downloadAppraisalPDF } from '../handlers/pdf.handler';

const router = Router();

// Every route in this file requires a valid JWT.
router.use(authMiddleware());

// List all appraisals — restricted to elevated roles.
router.get(
  '/',
  authMiddleware('admin', 'director', 'dean', 'associate_dean', 'hod'),
  getAllAppraisals
);

// Must be declared BEFORE /:userId to avoid Express matching "department" as a userId.
router.get(
  '/department/:department',
  authMiddleware('admin', 'director', 'dean', 'associate_dean', 'hod'),
  getAppraisalsByDepartment
);


// GET /appraisal/:userId/pdf
// Generate and download a PDF version of the appraisal.
router.get('/:userId/pdf', downloadAppraisalPDF);

// GET /appraisal/:userId
// Fetch the full appraisal document — owner or evaluator roles.
router.get('/:userId', getAppraisalByUserId);

// PUT /appraisal/:userId/part-a  — Academic Involvement
router.put('/:userId/part-a', updatePartA);

// PUT /appraisal/:userId/part-b  — Research & Innovations
router.put('/:userId/part-b', updatePartB);

// PUT /appraisal/:userId/part-c  — Self Development
router.put('/:userId/part-c', updatePartC);

// PUT /appraisal/:userId/part-d  — Portfolio (faculty self-assessment fields only)
router.put('/:userId/part-d', updatePartD);

// PUT /appraisal/:userId/part-d/evaluator
// Dean / HOD / Director enters their evaluation marks after faculty submission.
router.put(
  '/:userId/part-d/evaluator',
  authMiddleware('director', 'dean', 'associate_dean', 'hod'),
  updatePartDEvaluator
);

// PUT /appraisal/:userId/part-e  — Extraordinary Contributions
router.put('/:userId/part-e', updatePartE);


// PATCH /appraisal/:userId/declaration
router.patch('/:userId/declaration', updateDeclaration);


// PATCH /appraisal/:userId/submit
// Faculty freezes and submits their appraisal (DRAFT → SUBMITTED).
router.patch('/:userId/submit', submitAppraisal);

export default router;
