import { Router } from 'express';
import { authMiddleware } from '../middleware/auth.middleware';
import {
  generateDoc,
  getFacultyPdf,
  getPdfMetadata,
  getSavedPdfs,
  savePdf,
  viewSavedPdf,
  deleteSavedPdf,
} from '../handlers/document.handler';

const router = Router({ mergeParams: true }); // mergeParams exposes :department from parent

// All document routes require a valid session
router.use(authMiddleware());

// GET  /:department/:userId/generate-doc   — render template → PDF (fresh)
router.get('/:userId/generate-doc', generateDoc);

// GET  /:department/:userId/faculty-pdf    — load latest saved PDF (stubs 404 → triggers fallback)
router.get('/:userId/faculty-pdf', getFacultyPdf);

// GET  /:department/:userId/pdf-metadata
router.get('/:userId/pdf-metadata', getPdfMetadata);

// GET  /:department/:userId/saved-pdfs
router.get('/:userId/saved-pdfs', getSavedPdfs);

// POST /:department/:userId/save-pdf
router.post('/:userId/save-pdf', savePdf);

// GET  /:department/:userId/view-saved-pdf/:id
router.get('/:userId/view-saved-pdf/:id', viewSavedPdf);

// DELETE /:department/:userId/delete-saved-pdf/:id
router.delete('/:userId/delete-saved-pdf/:id', deleteSavedPdf);

export default router;
