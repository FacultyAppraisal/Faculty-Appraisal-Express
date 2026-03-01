/**
 * pdf.handler.ts
 *
 * Generates the appraisal PDF by editing the test2.pdf template directly —
 * no headless browser required.
 *
 * How it works
 * ────────────
 * The PDF was exported by Microsoft Word, so every piece of text is in an
 * individually positioned BT…ET block.  A long placeholder like
 * `{result_analysis_marks}` is stored inside a single TJ array as split
 * glyph-groups with kerning adjustments, e.g.:
 *
 *   [({r)3(es)7(ult_anal)4(ysis_marks})] TJ
 *
 * This handler:
 *  1. Loads test2.pdf via pdf-lib (so the final save re-serialises xrefs
 *     and cross-reference tables correctly).
 *  2. For every FlateDecode (zlib-compressed) content stream it:
 *     a. Decompresses the bytes.
 *     b. Finds TJ arrays whose joined `(fragment)` text equals exactly
 *        `{varName}`.
 *     c. Replaces that array with `[(value)] TJ` (or `[( )] TJ` for blank).
 *     d. Recompresses the bytes and updates the stream /Length entry.
 *  3. Streams the modified PDF to the client.
 *
 * Only three variables are populated from the database right now; every other
 * variable is replaced with a space so the raw `{…}` placeholder text no
 * longer appears in the output.
 */

import { Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { PDFDocument, PDFRawStream, PDFName, PDFNumber } from 'pdf-lib';
import { User } from '../models/user';
import { sendError, HttpStatus } from '../utils/response';

const PDF_TEMPLATE_PATH = path.join(__dirname, '../../pdf_template/test2.pdf');

// ── Variable map ─────────────────────────────────────────────────────────────
/**
 * Returns the substitution map for the 26 variables in test2.pdf.
 * Identity fields come from the DB; everything else is blank until wired up.
 */
function buildData(
  userName: string,
  designation: string,
  department: string,
): Record<string, string> {
  return {
    // ── Identity (live from DB) ──────────────────────────────────────────────
    faculty_name:        userName,
    faculty_designation: designation,
    faculty_department:  department.replace(/\b\w/g, (ch) => ch.toUpperCase()),

    // ── Part A ───────────────────────────────────────────────────────────────
    result_analysis_marks:     '',
    course_outcome_marks:      '',
    elearning_content_marks:   '',
    academic_engagement_marks: '',
    teaching_load_marks:       '',
    projects_guided_marks:     '',
    student_feedback_marks:    '',
    ptg_meetings_marks:        '',
    section_a_total:           '',
    Prof_A:                    '',
    Assoc_A:                   '',
    Assis_A:                   '',
    Prof_A_total_marks:        '',
    Assoc_A_total_marks:       '',
    Assis_A_total_marks:       '',
    total_for_A:               '',
    total_for_A_verified:      '',

    // ── Part B ───────────────────────────────────────────────────────────────
    sci_papers_marks:                           '',
    sci_papers_verified_marks:                  '',
    esci_papers_marks:                          '',
    esci_papers_verified_marks:                 '',
    scopus_papers_marks:                        '',
    scopus_papers_verified_marks:               '',
    ugc_papers_marks:                           '',
    ugc_papers_verified_marks:                  '',
    other_papers_marks:                         '',
    other_papers_verified_marks:                '',
    scopus_conf_marks:                          '',
    scopus_conf_verified_marks:                 '',
    other_conf_marks:                           '',
    other_conf_verified_marks:                  '',
    scopus_chapter_marks:                       '',
    scopus_chapter_verified_marks:              '',
    other_chapter_marks:                        '',
    other_chapter_verified_marks:               '',
    scopus_books_marks:                         '',
    scopus_books_verified_marks:                '',
    national_books_marks:                       '',
    national_books_verified_marks:              '',
    local_books_marks:                          '',
    local_books_verified_marks:                 '',
    wos_citations_marks:                        '',
    wos_citations_verified_marks:               '',
    scopus_citations_marks:                     '',
    scopus_citations_verified_marks:            '',
    google_citations_marks:                     '',
    google_citations_verified_marks:            '',
    individual_copyright_registered_marks:          '',
    individual_copyright_registered_verified_marks: '',
    individual_copyright_granted_marks:             '',
    individual_copyright_granted_verified_marks:    '',
    institute_copyright_registered_marks:           '',
    institute_copyright_registered_verified_marks:  '',
    institute_copyright_granted_marks:              '',
    institute_copyright_granted_verified_marks:     '',
    individual_patent_registered_marks:             '',
    individual_patent_registered_verified_marks:    '',
    individual_patent_published_marks:              '',
    individual_patent_published_verified_marks:     '',
    individual_granted_marks:                       '',
    individual_granted_verified_marks:              '',
    individual_commercialized_marks:                '',
    individual_commercialized_verified_marks:       '',
    college_patent_registered_marks:                '',
    college_patent_registered_verified_marks:       '',
    college_patent_published_marks:                 '',
    college_patent_published_verified_marks:        '',
    college_granted_marks:                          '',
    college_granted_verified_marks:                 '',
    college_commercialized_marks:                   '',
    college_commercialized_verified_marks:          '',
    research_grants_marks:                          '',
    research_grants_verified_marks:                 '',
    training_marks:                                 '',
    training_verified_marks:                        '',
    nonresearch_grants_marks:                       '',
    nonresearch_grants_verified_marks:              '',
    commercialized_products_marks:                  '',
    commercialized_products_verified_marks:         '',
    developed_products_marks:                       '',
    developed_products_verified_marks:              '',
    poc_products_marks:                             '',
    poc_products_verified_marks:                    '',
    startup_revenue_pccoe_marks:                    '',
    startup_revenue_pccoe_verified_marks:           '',
    startup_funding_pccoe_marks:                    '',
    startup_funding_pccoe_verified_marks:           '',
    startup_products_marks:                         '',
    startup_products_verified_marks:                '',
    startup_poc_marks:                              '',
    startup_poc_verified_marks:                     '',
    startup_registered_marks:                       '',
    startup_registered_verified_marks:              '',
    international_awards_marks:                     '',
    international_awards_verified_marks:            '',
    government_awards_marks:                        '',
    government_awards_verified_marks:               '',
    national_awards_marks:                          '',
    national_awards_verified_marks:                 '',
    international_fellowship_marks:                 '',
    international_fellowship_verified_marks:        '',
    national_fellowship_marks:                      '',
    national_fellowship_verified_marks:             '',
    active_mou_marks:                               '',
    active_mou_verified_marks:                      '',
    lab_development_marks:                          '',
    lab_development_verified_marks:                 '',
    internships_placements_marks:                   '',
    internships_placements_verified_marks:          '',
    B_total_marks:           '',
    section_b_total:         '',
    Prof_B:                  '',
    Assoc_B:                 '',
    Assis_B:                 '',
    Prof_B_total_marks:      '',
    Assoc_B_total_marks:     '',
    Assis_B_total_marks:     '',
    Prof_B_total_verified:   '',
    Assoc_B_total_verified:  '',
    Assis_B_total_verified:  '',
    total_for_B:             '',
    total_for_B_verified:    '',
    verf_committee_name:     '',

    // ── Part C ───────────────────────────────────────────────────────────────
    Prof_qualification_marks:  '',
    qualification_marks:       '',
    training_attended_marks:   '',
    training_organized_marks:  '',
    phd_guided_marks:          '',
    section_c_total:           '',
    Prof_C:                    '',
    Assoc_C:                   '',
    Assis_C:                   '',
    Prof_C_total_marks:        '',
    Assoc_C_total_marks:       '',
    Assis_C_total_marks:       '',
    total_for_C:               '',
    total_for_C_verified:      '',

    // ── Part D ───────────────────────────────────────────────────────────────
    Institute_Portfolio:   '',
    Department_portfolio:  '',
    deanMarks:             '',
    hodMarks:              '',
    self_awarded_marks:    '',
    section_d_total:       '',
    total_for_D_verified:  '',

    // ── Part E / Summary ──────────────────────────────────────────────────────
    assDeanHODMarks:      '',
    assDeanDeanMarks:     '',
    assSelfawardedmarks:  '',
    sumMarks_hod_dean:    '',
    assTotalMarks:        '',
    extra_marks:          '',
    section_E_total:      '',
    total_for_E_verified: '',
    grand_total:          '',
    grand_verified_marks: '',
  };
}

// ── Stream-level text substitution ───────────────────────────────────────────

/**
 * Join every `(fragment)` in a PDF TJ array to reconstruct the visible text.
 *
 * TJ arrays look like: `({f)3(a)7(cul)4(t)3(y_nam)4(e})`
 * Numbers between the parenthesised pieces are glyph-advance adjustments
 * (kerning); we ignore them — only the text portions matter.
 */
function extractTjText(arrayContent: string): string {
  const parts: string[] = [];
  // Matches `(...)` allowing escaped parens inside
  const re = /\(([^)\\]*(?:\\.[^)\\]*)*)\)/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(arrayContent)) !== null) {
    parts.push(m[1]);
  }
  return parts.join('');
}

/**
 * Scan a decompressed PDF content stream for variable placeholders and
 * substitute them.
 *
 * Variables may span *multiple* consecutive TJ arrays (even across BT/ET
 * block boundaries) because Word's PDF export can word-wrap a long placeholder
 * so that the opening `{…body` lands in one positioned text block and the
 * closing `}` lands in the next.  The strategy:
 *
 *  1. Collect every `[…] TJ` occurrence in the stream with its byte-range
 *     and its joined `(fragment)` text.
 *  2. Slide a window forward; starting only at TJs whose text begins with `{`.
 *  3. Accumulate TJ text until the window matches `{varName}` exactly, or
 *     until it can no longer be a valid placeholder (too long / bad chars).
 *  4. Replace the first TJ in the window with `[(value)] TJ` and each
 *     remaining TJ in the window with `[( )] TJ` (blank space at that
 *     position so the layout is preserved).
 */
function substituteStream(
  streamText: string,
  data: Record<string, string>,
): string {
  // ── Collect all TJ arrays with their positions ───────────────────────────
  interface TjEntry { start: number; end: number; text: string; }
  const tjs: TjEntry[] = [];
  const tjRe = /\[([^\]]*)\]\s*TJ/g;
  let scan: RegExpExecArray | null;
  while ((scan = tjRe.exec(streamText)) !== null) {
    tjs.push({
      start: scan.index,
      end:   scan.index + scan[0].length,
      text:  extractTjText(scan[1]),
    });
  }
  if (tjs.length === 0) return streamText;

  // ── Find multi-TJ windows that form a complete {varName} ─────────────────
  // varName chars: letters, digits, underscore — max 80 chars
  const MAX_VAR_LEN = 82; // 80 name chars + 2 braces

  const replacements: Array<{
    entries: TjEntry[];
    value: string;
  }> = [];
  const usedIndices = new Set<number>();

  for (let i = 0; i < tjs.length; i++) {
    if (usedIndices.has(i)) continue;
    // Window must start with a TJ that begins with '{'
    if (!tjs[i].text.trimStart().startsWith('{')) continue;

    let combined = '';
    for (let j = i; j < tjs.length && j < i + 20; j++) {
      combined += tjs[j].text;
      if (combined.length > MAX_VAR_LEN) break; // too long to be a var

      const trimmed = combined.trim();
      // Must still start with '{' after trimming
      if (!trimmed.startsWith('{')) break;

      const varMatch = /^\{([a-zA-Z_][a-zA-Z0-9_]*)\}$/.exec(trimmed);
      if (varMatch) {
        const key = varMatch[1];
        if (Object.prototype.hasOwnProperty.call(data, key)) {
          const window = tjs.slice(i, j + 1);
          replacements.push({ entries: window, value: data[key] });
          for (let k = i; k <= j; k++) usedIndices.add(k);
        }
        break; // matched or unknown key — stop extending this window
      }
    }
  }

  if (replacements.length === 0) return streamText;

  // ── Apply replacements back-to-front so positions stay valid ─────────────
  // Sort by start position, descending
  replacements.sort((a, b) => b.entries[0].start - a.entries[0].start);

  let result = streamText;
  for (const rep of replacements) {
    const { entries, value } = rep;
    const displayValue = value || ' ';
    const escaped = displayValue
      .replace(/\\/g, '\\\\')
      .replace(/\(/g, '\\(')
      .replace(/\)/g, '\\)');

    // Replace from the start of the first entry to the end of the last entry.
    // First TJ → value; remaining TJs within the range → single space each.
    let chunk = `[(${escaped})] TJ`;
    for (let k = 1; k < entries.length; k++) {
      // Preserve the raw bytes between consecutive entries, then blank the TJ
      const between = result.slice(entries[k - 1].end, entries[k].start);
      chunk += between + '[( )] TJ';
    }

    result =
      result.slice(0, entries[0].start) +
      chunk +
      result.slice(entries[entries.length - 1].end);
  }

  return result;
}

// ── Handler ───────────────────────────────────────────────────────────────────

/**
 * GET /appraisal/:userId/pdf
 *
 * Returns a filled copy of test2.pdf with variable placeholders replaced.
 * Only faculty_name, faculty_designation, faculty_department are populated
 * from the database — all other ~120 variables are blank.
 */
export const downloadAppraisalPDF = async (
  req: Request,
  res: Response,
): Promise<void> => {
  try {
    if (!fs.existsSync(PDF_TEMPLATE_PATH)) {
      sendError(
        res,
        'PDF template (test2.pdf) not found on server',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
      return;
    }

    const { userId } = req.params;

    // ── 1. Fetch user ────────────────────────────────────────────────────────
    const user = await User.findOne({ userId }).lean();
    if (!user) {
      sendError(res, 'User not found', HttpStatus.NOT_FOUND);
      return;
    }

    // ── 2. Build substitution map ────────────────────────────────────────────
    const data = buildData(
      user.name,
      user.designation as string,
      user.department as string,
    );

    // ── 3. Load PDF via pdf-lib ──────────────────────────────────────────────
    // Using pdf-lib ensures correct cross-reference tables and object offsets
    // are recalculated in the final output.
    const templateBytes = fs.readFileSync(PDF_TEMPLATE_PATH);
    const pdfDoc = await PDFDocument.load(templateBytes, {
      updateMetadata: false,
    });
    const context = pdfDoc.context;

    // ── 4. Process every FlateDecode (zlib) content stream ───────────────────
    for (const [, obj] of context.enumerateIndirectObjects()) {
      if (!(obj instanceof PDFRawStream)) continue;

      // Only handle FlateDecode streams
      const filter = obj.dict.get(PDFName.of('Filter'));
      const filterStr: string = filter?.toString?.() ?? '';
      if (!filterStr.includes('FlateDecode')) continue;

      let inflated: Buffer;
      try {
        inflated = zlib.inflateSync(Buffer.from(obj.contents));
      } catch {
        continue; // not actually compressed or corrupt — skip silently
      }

      const original = inflated.toString('latin1');
      const modified = substituteStream(original, data);

      if (modified === original) continue; // nothing changed

      // Recompress and update stream bytes + /Length
      const recompressed = zlib.deflateSync(Buffer.from(modified, 'latin1'));
      // pdf-lib's PDFRawStream.contents is a mutable Uint8Array property
      // pdf-lib types mark contents as readonly but it IS mutable at runtime
      (obj as unknown as { contents: Uint8Array }).contents = new Uint8Array(recompressed);
      obj.dict.set(PDFName.of('Length'), PDFNumber.of(recompressed.length));
    }

    // ── 5. Serialize and stream to client ────────────────────────────────────
    const outputBytes = await pdfDoc.save();
    const outputBuffer = Buffer.from(outputBytes);

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `inline; filename="appraisal-${userId}.pdf"`,
    );
    res.setHeader('Content-Length', outputBuffer.length);
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.end(outputBuffer);
  } catch (error: unknown) {
    console.error('[downloadAppraisalPDF] Error:', error);
    const msg = error instanceof Error ? error.message : String(error);
    sendError(
      res,
      'Failed to generate PDF',
      HttpStatus.INTERNAL_SERVER_ERROR,
      process.env.NODE_ENV === 'development' ? msg : undefined,
    );
  }
};
