import { Request, Response } from 'express';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import path from 'path';
import fs from 'fs';
import libre from 'libreoffice-convert';
import { FacultyAppraisal } from '../models/detailedAppraisal';
import { User } from '../models/user';
import { sendSuccess, sendError, HttpStatus } from '../utils/response';

const convertToPdf = (input: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    libre.convert(input, '.pdf', undefined, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    })
  );

const TEMPLATE_PATH = path.join(__dirname, '../../pdf_template/template.docx');

const buildTemplateData = () => ({
  faculty_name: 'Danish',
  faculty_designation: '',
  faculty_department: '',
  result_analysis_marks: '',
  course_outcome_marks: '',
  elearning_content_marks: '',
  academic_engagement_marks: '',
  teaching_load_marks: '',
  projects_guided_marks: '',
  student_feedback_marks: '',
  ptg_meetings_marks: '',
  section_a_total: '',
  Prof_A: '',
  Assoc_A: '',
  Assis_A: '',
  Prof_A_total_marks: '',
  Assoc_A_total_marks: '',
  Assis_A_total_marks: '',
  sci_papers_marks: '',
  sci_papers_verified_marks: '',
  esci_papers_marks: '',
  esci_papers_verified_marks: '',
  scopus_papers_marks: '',
  scopus_papers_verified_marks: '',
  ugc_papers_marks: '',
  ugc_papers_verified_marks: '',
  other_papers_marks: '',
  other_papers_verified_marks: '',
  scopus_conf_marks: '',
  scopus_conf_verified_marks: '',
  other_conf_marks: '',
  other_conf_verified_marks: '',
  scopus_chapter_marks: '',
  scopus_chapter_verified_marks: '',
  other_chapter_marks: '',
  other_chapter_verified_marks: '',
  scopus_books_marks: '',
  scopus_books_verified_marks: '',
  national_books_marks: '',
  national_books_verified_marks: '',
  local_books_marks: '',
  local_books_verified_marks: '',
  wos_citations_marks: '',
  wos_citations_verified_marks: '',
  scopus_citations_marks: '',
  scopus_citations_verified_marks: '',
  google_citations_marks: '',
  google_citations_verified_marks: '',
  individual_copyright_registered_marks: '',
  individual_copyright_registered_verified_marks: '',
  individual_copyright_granted_marks: '',
  individual_copyright_granted_verified_marks: '',
  institute_copyright_registered_marks: '',
  institute_copyright_registered_verified_marks: '',
  institute_copyright_granted_marks: '',
  institute_copyright_granted_verified_marks: '',
  individual_patent_registered_marks: '',
  individual_patent_registered_verified_marks: '',
  individual_patent_published_marks: '',
  individual_patent_published_verified_marks: '',
  individual_granted_marks: '',
  individual_granted_verified_marks: '',
  individual_commercialized_marks: '',
  individual_commercialized_verified_marks: '',
  college_patent_registered_marks: '',
  college_patent_registered_verified_marks: '',
  college_patent_published_marks: '',
  college_patent_published_verified_marks: '',
  college_granted_marks: '',
  college_granted_verified_marks: '',
  college_commercialized_marks: '',
  college_commercialized_verified_marks: '',
  research_grants_marks: '',
  research_grants_verified_marks: '',
  training_marks: '',
  training_verified_marks: '',
  nonresearch_grants_marks: '',
  nonresearch_grants_verified_marks: '',
  commercialized_products_marks: '',
  commercialized_products_verified_marks: '',
  developed_products_marks: '',
  developed_products_verified_marks: '',
  poc_products_marks: '',
  poc_products_verified_marks: '',
  startup_revenue_pccoe_marks: '',
  startup_revenue_pccoe_verified_marks: '',
  startup_funding_pccoe_marks: '',
  startup_funding_pccoe_verified_marks: '',
  startup_products_marks: '',
  startup_products_verified_marks: '',
  startup_poc_marks: '',
  startup_poc_verified_marks: '',
  startup_registered_marks: '',
  startup_registered_verified_marks: '',
  international_awards_marks: '',
  international_awards_verified_marks: '',
  government_awards_marks: '',
  government_awards_verified_marks: '',
  national_awards_marks: '',
  national_awards_verified_marks: '',
  international_fellowship_marks: '',
  international_fellowship_verified_marks: '',
  national_fellowship_marks: '',
  national_fellowship_verified_marks: '',
  active_mou_marks: '',
  active_mou_verified_marks: '',
  lab_development_marks: '',
  lab_development_verified_marks: '',
  internships_placements_marks: '',
  internships_placements_verified_marks: '',
  B_total_marks: '',
  section_b_total: '',
  Prof_B: '',
  Assoc_B: '',
  Assis_B: '',
  Prof_B_total_marks: '',
  Assoc_B_total_marks: '',
  Assis_B_total_marks: '',
  Prof_B_total_verified: '',
  Assoc_B_total_verified: '',
  Assis_B_total_verified: '',
  verf_committee_name: '',
  Prof_qualification_marks: '',
  qualification_marks: '',
  training_attended_marks: '',
  training_organized_marks: '',
  phd_guided_marks: '',
  section_c_total: '',
  Prof_C: '',
  Assoc_C: '',
  Assis_C: '',
  Prof_C_total_marks: '',
  Assoc_C_total_marks: '',
  Assis_C_total_marks: '',
  Institute_Portfolio: '',
  Department_portfolio: '',
  deanMarks: '',
  hodMarks: '',
  self_awarded_marks: '',
  section_d_total: '',
  assDeanHODMarks: '',
  assDeanDeanMarks: '',
  assSelfawardedmarks: '',
  sumMarks_hod_dean: '',
  assTotalMarks: '',
  section_E_total: '',
  total_for_A: '',
  total_for_A_verified: '',
  total_for_B: '',
  total_for_B_verified: '',
  total_for_C: '',
  total_for_C_verified: '',
  total_for_D_verified: '',
  total_for_E_verified: '',
  extra_marks: '',
  grand_total: '',
  grand_verified_marks: '',
});

/**
 * GET /:department/:userId/generate-doc
 * Renders template.docx with blank values and converts to PDF.
 */
export const generateDoc = async (req: Request, res: Response): Promise<void> => {
  try {
    if (!fs.existsSync(TEMPLATE_PATH)) {
      sendError(res, 'PDF template not found on server', HttpStatus.INTERNAL_SERVER_ERROR);
      return;
    }

    const content = fs.readFileSync(TEMPLATE_PATH);
    const zip = new PizZip(content);
    const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });
    doc.render(buildTemplateData());

    const docxBuffer: Buffer = doc.getZip().generate({ type: 'nodebuffer' }) as Buffer;
    const pdfBuffer = await convertToPdf(docxBuffer);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${req.params.userId}_appraisal.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end(pdfBuffer);
  } catch (error: unknown) {
    console.error('[generateDoc] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    sendError(res, 'Failed to generate PDF', HttpStatus.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? msg : undefined);
  }
};

/**
 * GET /:department/:userId/faculty-pdf
 * Returns the most recently saved PDF for this faculty.
 * Currently not implemented — 404 causes PartF_Review to fall back to generate-doc.
 */
export const getFacultyPdf = (_req: Request, res: Response): void => {
  sendError(res, 'No saved PDF found', HttpStatus.NOT_FOUND);
};

/**
 * GET /:department/:userId/pdf-metadata
 * Returns faculty name, designation, appraisal year and status so the
 * PartF_Review component can show the metadata card and keep pdfExists = true.
 */
export const getPdfMetadata = async (req: Request, res: Response): Promise<void> => {
  try {
    const { userId } = req.params;

    const [appraisal, user] = await Promise.all([
      FacultyAppraisal.findOne({ userId }).lean(),
      User.findOne({ userId }).lean(),
    ]);

    if (!appraisal) {
      sendError(res, 'No appraisal found', HttpStatus.NOT_FOUND);
      return;
    }

    sendSuccess(res, {
      faculty_name: (user as any)?.name ?? userId,
      faculty_designation: appraisal.designation ?? '',
      appraisal_year: appraisal.appraisalYear,
      status: appraisal.status,
      upload_date: (appraisal as any).updatedAt ?? new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('[getPdfMetadata] Error:', error);
    sendError(res, 'Failed to fetch metadata', HttpStatus.INTERNAL_SERVER_ERROR);
  }
};

/**
 * GET /:department/:userId/saved-pdfs
 */
export const getSavedPdfs = (_req: Request, res: Response): void => {
  sendSuccess(res, { pdfs: [] }, 'No saved PDFs');
};

/**
 * POST /:department/:userId/save-pdf
 */
export const savePdf = (_req: Request, res: Response): void => {
  sendSuccess(res, null, 'Save feature not yet implemented');
};

/**
 * GET /:department/:userId/view-saved-pdf/:id
 */
export const viewSavedPdf = (_req: Request, res: Response): void => {
  sendError(res, 'Saved PDF not found', HttpStatus.NOT_FOUND);
};

/**
 * DELETE /:department/:userId/delete-saved-pdf/:id
 */
export const deleteSavedPdf = (_req: Request, res: Response): void => {
  sendError(res, 'Saved PDF not found', HttpStatus.NOT_FOUND);
};
