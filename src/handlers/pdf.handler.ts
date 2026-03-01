import { Request, Response } from 'express';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import path from 'path';
import fs from 'fs';
import libre from 'libreoffice-convert';
import { sendError, HttpStatus } from '../utils/response';

const convertToPdf = (input: Buffer): Promise<Buffer> =>
  new Promise((resolve, reject) =>
    libre.convert(input, '.pdf', undefined, (err: Error | null, result: Buffer) => {
      if (err) reject(err);
      else resolve(result);
    })
  );

const TEMPLATE_PATH = path.join(__dirname, '../../pdf_template/template.docx');

/**
 * All template variables from template.docx.
 * Every field defaults to an empty string; faculty_name is seeded with "Danish".
 */
const buildTemplateData = () => ({
  // ── Identity ─────────────────────────────────────────────────────────────
  faculty_name: 'Danish',
  faculty_designation: '',
  faculty_department: '',

  // ── Section A ─────────────────────────────────────────────────────────────
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

  // ── Section B – Research papers ───────────────────────────────────────────
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

  // ── Section B – Conferences ───────────────────────────────────────────────
  scopus_conf_marks: '',
  scopus_conf_verified_marks: '',
  other_conf_marks: '',
  other_conf_verified_marks: '',

  // ── Section B – Book chapters ─────────────────────────────────────────────
  scopus_chapter_marks: '',
  scopus_chapter_verified_marks: '',
  other_chapter_marks: '',
  other_chapter_verified_marks: '',

  // ── Section B – Books ─────────────────────────────────────────────────────
  scopus_books_marks: '',
  scopus_books_verified_marks: '',
  national_books_marks: '',
  national_books_verified_marks: '',
  local_books_marks: '',
  local_books_verified_marks: '',

  // ── Section B – Citations ─────────────────────────────────────────────────
  wos_citations_marks: '',
  wos_citations_verified_marks: '',
  scopus_citations_marks: '',
  scopus_citations_verified_marks: '',
  google_citations_marks: '',
  google_citations_verified_marks: '',

  // ── Section B – Copyrights ────────────────────────────────────────────────
  individual_copyright_registered_marks: '',
  individual_copyright_registered_verified_marks: '',
  individual_copyright_granted_marks: '',
  individual_copyright_granted_verified_marks: '',
  institute_copyright_registered_marks: '',
  institute_copyright_registered_verified_marks: '',
  institute_copyright_granted_marks: '',
  institute_copyright_granted_verified_marks: '',

  // ── Section B – Patents ───────────────────────────────────────────────────
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

  // ── Section B – Grants & products ────────────────────────────────────────
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

  // ── Section B – Startups ──────────────────────────────────────────────────
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

  // ── Section B – Awards & fellowships ─────────────────────────────────────
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

  // ── Section B – MOU / lab / internships ──────────────────────────────────
  active_mou_marks: '',
  active_mou_verified_marks: '',
  lab_development_marks: '',
  lab_development_verified_marks: '',
  internships_placements_marks: '',
  internships_placements_verified_marks: '',

  // ── Section B – Totals ────────────────────────────────────────────────────
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

  // ── Section C ─────────────────────────────────────────────────────────────
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

  // ── Section D ─────────────────────────────────────────────────────────────
  Institute_Portfolio: '',
  Department_portfolio: '',
  deanMarks: '',
  hodMarks: '',
  self_awarded_marks: '',
  section_d_total: '',

  // ── Section E ─────────────────────────────────────────────────────────────
  assDeanHODMarks: '',
  assDeanDeanMarks: '',
  assSelfawardedmarks: '',
  sumMarks_hod_dean: '',
  assTotalMarks: '',
  section_E_total: '',

  // ── Grand totals ──────────────────────────────────────────────────────────
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
 * GET /appraisal/:userId/pdf
 *
 * Fills template.docx with blank values (faculty_name = "Danish"),
 * converts the result to PDF via LibreOffice, and streams it to the client.
 */
export const downloadAppraisalPDF = async (
  req: Request,
  res: Response
): Promise<void> => {
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
    res.setHeader('Content-Disposition', `attachment; filename="appraisal-${req.params.userId}.pdf"`);
    res.setHeader('Content-Length', pdfBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end(pdfBuffer);
  } catch (error: unknown) {
    console.error('[downloadAppraisalPDF] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    sendError(
      res,
      'Failed to generate PDF',
      HttpStatus.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? msg : undefined
    );
  }
};
