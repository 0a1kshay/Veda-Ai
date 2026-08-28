import { GoogleGenAI } from '@google/genai';
import type { ExtractedQuestion, Question, StudentAnswer, ExtractedAnswerRegion } from '@/types';

/**
 * Default Gemini model for assessment processing.
 * Configurable via process.env.GEMINI_MODEL.
 */
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

/**
 * Initializes and returns a server-side Gemini client instance using the @google/genai SDK.
 * Reads API key strictly from process.env.GEMINI_API_KEY.
 *
 * @throws Error if GEMINI_API_KEY environment variable is missing or empty.
 */
export function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey || apiKey.trim() === '' || apiKey === 'YOUR_GEMINI_API_KEY_HERE') {
    throw new Error(
      'GEMINI_API_KEY is not configured. Please set a valid GEMINI_API_KEY in your .env.local file.'
    );
  }

  return new GoogleGenAI({ apiKey });
}

/**
 * Optional fallback models, configured as a comma-separated environment variable.
 * Model availability varies by API key and account, so there is no hard-coded fallback.
 */
const MODEL_FALLBACK_LIST = [
  DEFAULT_GEMINI_MODEL,
  ...(process.env.GEMINI_FALLBACK_MODELS?.split(',') ?? []),
].map((model) => model.trim())
  .filter(Boolean)
  .filter((model, index, models) => models.indexOf(model) === index);

export function isGeminiRateLimitError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error);
  return /429|RESOURCE_EXHAUSTED|quota/i.test(message);
}

/**
 * Executes generateContent with automatic model fallback when free-tier rate limits (429 / RESOURCE_EXHAUSTED) occur.
 */
export async function generateContentWithFallback(
  ai: GoogleGenAI,
  // Accept any serializable content shape the SDK accepts
  contents: Parameters<GoogleGenAI['models']['generateContent']>[0]['contents']
) {
  let lastError: unknown;

  for (const [index, model] of MODEL_FALLBACK_LIST.entries()) {
    try {
      const response = await ai.models.generateContent({
        model,
        contents,
      });
      return response;
    } catch (err: unknown) {
      lastError = err;
      if (isGeminiRateLimitError(err)) {
        if (index < MODEL_FALLBACK_LIST.length - 1) {
          console.warn(`[Gemini API] Model "${model}" rate limited (429). Attempting configured fallback...`);
        }
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

/**
 * Helper function to test server-side Gemini API connectivity.
 * Sends a minimal request to Gemini and returns success status and response message.
 */
export async function testGeminiConnection(): Promise<{
  success: boolean;
  message?: string;
  error?: string;
}> {
  try {
    const ai = getGeminiClient();

    const response = await generateContentWithFallback(ai, 'Reply with exactly: Gemini connection successful');

    const responseText = response.text?.trim();

    if (!responseText) {
      return {
        success: false,
        error: 'Received empty response from Gemini API.',
      };
    }

    return {
      success: true,
      message: responseText,
    };
  } catch (err: unknown) {
    const errorMessage = err instanceof Error ? err.message : 'Unknown error during Gemini request.';
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/* ==========================================================================
   Phase 2 — Question Extraction
   ========================================================================== */

const QUESTION_EXTRACTION_PROMPT = `You are an expert at reading exam question papers.
Your task is to extract ALL questions from the document provided.

Return ONLY a valid JSON array with NO markdown, NO code fences, NO explanation.

Each item must follow this exact shape:
{
  "id": "q1",
  "number": "1",
  "text": "Full verbatim question text",
  "marks": 2
}

Rules:
- Include every question and sub-question (e.g. 1a, 1b, 2(i), 2(ii))
- For sub-questions use their full label as "number" (e.g. "1(a)", "3(ii)")
- Copy "text" verbatim from the paper
- "marks" must be a number if stated; omit the field if not shown
- Generate sequential IDs starting from "q1"
- Return an empty array [] if the document contains no questions

Begin the JSON array immediately with [ and end with ].`;

/**
 * Extracts exam questions from a question paper file (PDF or image) using Gemini Vision.
 *
 * @param fileBuffer - Raw file bytes as a Node.js Buffer
 * @param mimeType   - MIME type of the file (e.g. "application/pdf", "image/jpeg")
 * @returns Array of validated ExtractedQuestion objects
 * @throws Error on Gemini failure or unparseable response
 */
export async function extractQuestionsFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<ExtractedQuestion[]> {
  const ai = getGeminiClient();
  const base64Data = fileBuffer.toString('base64');

  const response = await generateContentWithFallback(ai, [
    {
      role: 'user',
      parts: [
        {
          inlineData: {
            mimeType,
            data: base64Data,
          },
        },
        { text: QUESTION_EXTRACTION_PROMPT },
      ],
    },
  ]);

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response during question extraction.');
  }

  // Strip markdown code fences if Gemini wraps the JSON
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    throw new Error(`Gemini returned non-JSON output: ${cleaned.slice(0, 300)}`);
  }

  if (!Array.isArray(parsed)) {
    throw new Error('Gemini response was not a JSON array.');
  }

  // Validate and normalise each item
  const questions: ExtractedQuestion[] = [];
  for (let i = 0; i < parsed.length; i++) {
    const item = parsed[i];
    if (typeof item === 'object' && item !== null) {
      const q = item as Record<string, unknown>;
      const text = typeof q.text === 'string' ? q.text.trim() : '';
      if (text.length > 0) {
        questions.push({
          id: typeof q.id === 'string' && q.id ? q.id : `q${i + 1}`,
          number: typeof q.number === 'string' && q.number ? q.number : String(i + 1),
          text,
          marks: typeof q.marks === 'number' ? q.marks : undefined,
        });
      }
    }
  }

  return questions;
}

/**
 * Converts Gemini-extracted questions into the full Question shape used by the UI,
 * filling in default values for fields populated in later phases (grading, answer mapping).
 */
export function toQuestions(extracted: ExtractedQuestion[]): Question[] {
  return extracted.map((q) => ({
    id: q.id,
    number: q.number,
    text: q.text,
    marks: q.marks ?? 0,
    obtainedMarks: 0,
    status: 'unanswered' as const,
    feedback: '',
    answer: null,
  }));
}

/* ==========================================================================
   Phase 2 — Student Handwritten Answer Extraction
   ========================================================================== */

/**
 * Detects if a string is a section / module / chapter / topic header rather than an actual question number.
 */
function isSectionHeader(s: string): boolean {
  const trimmed = s.trim();
  if (/^(module|section|chapter|unit|part\s+[a-z]+|vocab|vocabulary|topic|assignment|terms|definition)/i.test(trimmed)) {
    return true;
  }
  if (/\b(module|vocab|terms|chapter|section|definitions?|summary)\b/i.test(trimmed)) {
    return true;
  }
  return false;
}

/**
 * Normalizes a raw question-number string written by the student into a canonical format.
 * Returns null if the string is empty, unidentifiable, or is actually a section/module title.
 *
 * Valid Examples:
 *   "1"          → "1"
 *   "Q1"         → "1"
 *   "Q. 1"       → "1"
 *   "Question 2" → "2"
 *   "Q. 11 (a)"  → "11(a)"
 *   "11 (b)"     → "11(b)"
 *   "3(ii)"      → "3(ii)"
 *   "1.a"        → "1(a)"
 *
 * Invalid (Returns null):
 *   "Module-01 Vocab Terms" → null
 *   "Section A"             → null
 *   "Vocab Terms"           → null
 */
function normalizeQuestionNumber(raw: string): string | null {
  let s = raw.trim();
  if (!s) return null;

  if (isSectionHeader(s)) {
    return null;
  }

  // Strip leading Q / Q. / Question / Que / Que. (case-insensitive)
  s = s.replace(/^question\s*/i, '');
  s = s.replace(/^que?\.?\s*/i, '');
  s = s.replace(/^q\s*\.?\s*/i, '');

  // Strip trailing periods or colons, e.g. "1." -> "1", "2:" -> "2"
  s = s.replace(/[\.:]+$/, '').trim();

  // Check if remaining string is a valid question number pattern:
  // Pattern 1: Pure number: "1", "12", "100"
  if (/^\d+$/.test(s)) {
    return s;
  }

  // Pattern 2: Number with subpart in parens or letters: "11(a)", "11 (a)", "11a", "1(a)(i)"
  const subpartMatch = s.match(/^(\d+)\s*[\.\-\(]?\s*([a-z]+|\b[ivxlcdm]+\b)\s*[\)]?$/i);
  if (subpartMatch) {
    const num = subpartMatch[1];
    const sub = subpartMatch[2].toLowerCase();
    return `${num}(${sub})`;
  }

  // Pattern 3: Multi-level subpart like "3(a)(i)" or "3(i)"
  if (/^\d+\s*\([a-z0-9ivxlcdm]+\)(\([a-z0-9ivxlcdm]+\))?$/i.test(s.replace(/\s+/g, ''))) {
    return s.replace(/\s+/g, '').toLowerCase();
  }

  // Pattern 4: Standalone roman numeral like "i", "ii", "iii"
  if (/^(i|ii|iii|iv|v|vi|vii|viii|ix|x)$/i.test(s)) {
    return s.toLowerCase();
  }

  // Pattern 5: Standalone letter like "a", "b", "(a)", "(b)"
  const letterMatch = s.match(/^\(?\s*([a-z])\s*\)?$/i);
  if (letterMatch) {
    return letterMatch[1].toLowerCase();
  }

  // If it still contains non-identifier words, it's not a valid question number
  return null;
}

/**
 * Robustly parses a bbox from an array [ymin, xmin, ymax, xmax] or object {ymin, xmin, ymax, xmax}.
 * Auto-scales normalized 0..1 floats to 0..1000 and ensures valid topological ranges.
 */
function parseBbox(raw: unknown): [number, number, number, number] | null {
  if (!raw) return null;

  let ymin = 0, xmin = 0, ymax = 1000, xmax = 1000;

  if (Array.isArray(raw) && raw.length === 4) {
    const nums = raw.map(Number);
    if (nums.some((n) => isNaN(n))) return null;
    [ymin, xmin, ymax, xmax] = nums;
  } else if (typeof raw === 'object' && raw !== null) {
    const obj = raw as Record<string, unknown>;
    const y1 = Number(obj.ymin ?? obj.top ?? obj.y ?? obj.y1 ?? 0);
    const x1 = Number(obj.xmin ?? obj.left ?? obj.x ?? obj.x1 ?? 0);
    const y2 = Number(obj.ymax ?? obj.bottom ?? (obj.y != null && obj.height != null ? Number(obj.y) + Number(obj.height) : obj.y2 ?? 1000));
    const x2 = Number(obj.xmax ?? obj.right ?? (obj.x != null && obj.width != null ? Number(obj.x) + Number(obj.width) : obj.x2 ?? 1000));
    if (isNaN(y1) || isNaN(x1) || isNaN(y2) || isNaN(x2)) return null;
    [ymin, xmin, ymax, xmax] = [y1, x1, y2, x2];
  } else {
    return null;
  }

  // If coordinates are in 0..1 range (float), scale to 0..1000
  if (ymin <= 1.0 && xmin <= 1.0 && ymax <= 1.0 && xmax <= 1.0 && (ymax > 0 || xmax > 0)) {
    ymin = Math.round(ymin * 1000);
    xmin = Math.round(xmin * 1000);
    ymax = Math.round(ymax * 1000);
    xmax = Math.round(xmax * 1000);
  } else {
    ymin = Math.round(Math.max(0, Math.min(1000, ymin)));
    xmin = Math.round(Math.max(0, Math.min(1000, xmin)));
    ymax = Math.round(Math.max(0, Math.min(1000, ymax)));
    xmax = Math.round(Math.max(0, Math.min(1000, xmax)));
  }

  if (ymin >= ymax) ymax = Math.min(1000, ymin + 100);
  if (xmin >= xmax) xmax = Math.min(1000, xmin + 100);

  return [ymin, xmin, ymax, xmax];
}

const ANSWER_EXTRACTION_PROMPT = `You are an expert handwriting OCR and document analysis engine for student answer sheets.

Extract ALL student-written handwritten answers from this document.

CRITICAL RULES:
1. SEPARATE "questionNumber" FROM "section":
   - "questionNumber" MUST ONLY be an actual question identifier: "1", "2", "3", "11", "11(a)", "11(b)", "3(ii)", etc.
   - If the student wrote a module/section heading like "MODULE - 01", "SECTION A", "Vocab Terms", "Chapter 1", put that in "section" and set "questionNumber" to null (or to the specific question number if under that section).
   - NEVER put "Module-01 Vocab Terms", "Section A", or topic titles in "questionNumber".

2. DO NOT SPLIT LIST ITEMS INTO SEPARATE ANSWERS:
   - If Question 1 is a list of vocabulary terms (e.g. 1. Cipher 2. PlainText 3. Encode), the entire list belongs to ONE answer with questionNumber: "1".
   - Do NOT split internal numbered points (1, 2, 3...) of an answer into separate answer records.

3. PRESERVE PHYSICAL DOCUMENT ORDER:
   - Return answers in the exact sequence they physically appear on the answer sheet (e.g., if student answered Q3 first, then Q1, then Q5, return Q3, Q1, Q5 in that order).

4. MULTI-PAGE ANSWERS:
   - An answer should have multiple region objects in "regions" ONLY when that specific answer visibly begins on one page and continues onto the following page.

5. BOUNDING BOXES:
   - Provide exact normalized bounding boxes [ymin, xmin, ymax, xmax] (0 to 1000) covering each handwritten answer region.

6. UNREADABLE WORDS & DIAGRAMS:
   - Use "[illegible]" for unreadable words. Do NOT correct spelling or grammar.
   - Set "containsDiagram": true if the answer contains a drawing or diagram.

For every student answer, output an object in the "answers" array with this exact shape:
{
  "id": "a1",
  "questionNumber": "1",          // ONLY valid question identifier e.g. "1", "11(a)", or null
  "section": "MODULE - 01",       // Section/Module title e.g. "MODULE - 01", "SECTION A", or null
  "text": "verbatim student handwritten text",
  "regions": [
    { "page": 1, "bbox": [ymin, xmin, ymax, xmax] }
  ],
  "containsDiagram": false,
  "confidence": 0.95
}

Return ONLY a valid JSON object with the "answers" array, with NO markdown code fences:
{
  "answers": [ ... ]
}`;

/**
 * Extracts student handwritten answers from an answer sheet using Gemini Vision.
 *
 * @param fileBuffer - Raw file bytes as a Node.js Buffer
 * @param mimeType   - MIME type (e.g. "application/pdf", "image/jpeg")
 * @returns Validated array of StudentAnswer objects
 */
export async function extractAnswersFromFile(
  fileBuffer: Buffer,
  mimeType: string
): Promise<StudentAnswer[]> {
  const ai = getGeminiClient();
  const base64Data = fileBuffer.toString('base64');

  console.log(`[extract-answers] Sending answer sheet (${mimeType}, ${fileBuffer.length} bytes) to Gemini Vision...`);

  const response = await generateContentWithFallback(ai, [
    {
      role: 'user',
      parts: [
        { inlineData: { mimeType, data: base64Data } },
        { text: ANSWER_EXTRACTION_PROMPT },
      ],
    },
  ]);

  const rawText = response.text?.trim();
  if (!rawText) {
    throw new Error('Gemini returned an empty response during answer extraction.');
  }

  console.log('[extract-answers] Raw Gemini response preview:', rawText.slice(0, 400));

  // Strip markdown code fences if present
  const cleaned = rawText
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```\s*$/i, '')
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    // Try extracting JSON substring between first { and last } or [ and ]
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        parsed = JSON.parse(jsonMatch[0]);
      } catch {
        throw new Error(`Gemini returned non-JSON output during answer extraction: ${cleaned.slice(0, 300)}`);
      }
    } else {
      throw new Error(`Gemini returned non-JSON output during answer extraction: ${cleaned.slice(0, 300)}`);
    }
  }

  // Accept either { answers: [...] } or a bare array
  let rawAnswers: unknown[] = [];
  if (Array.isArray(parsed)) {
    rawAnswers = parsed;
  } else if (typeof parsed === 'object' && parsed !== null) {
    const obj = parsed as Record<string, unknown>;
    if (Array.isArray(obj.answers)) {
      rawAnswers = obj.answers;
    } else if (Array.isArray(obj.studentAnswers)) {
      rawAnswers = obj.studentAnswers;
    } else if (Array.isArray(obj.data)) {
      rawAnswers = obj.data;
    } else {
      const firstArrayKey = Object.keys(obj).find((k) => Array.isArray(obj[k]));
      if (firstArrayKey) {
        rawAnswers = obj[firstArrayKey] as unknown[];
      }
    }
  }

  // Validate and normalise each answer
  const answers: StudentAnswer[] = [];
  for (let i = 0; i < rawAnswers.length; i++) {
    const item = rawAnswers[i];
    if (typeof item !== 'object' || item === null) continue;

    const a = item as Record<string, unknown>;

    // id
    const id = typeof a.id === 'string' && a.id ? a.id : `a${i + 1}`;

    // section
    let section: string | null = null;
    if (typeof a.section === 'string' && a.section.trim()) {
      section = a.section.trim();
    }

    // questionNumber — strictly validate as question identifier
    let rawQNum = '';
    if (typeof a.questionNumber === 'string' && a.questionNumber.trim()) {
      rawQNum = a.questionNumber.trim();
    } else if (typeof a.number === 'string' && a.number.trim()) {
      rawQNum = a.number.trim();
    } else if (typeof a.qNumber === 'string' && a.qNumber.trim()) {
      rawQNum = a.qNumber.trim();
    }

    let questionNumber: string | null = null;
    if (rawQNum) {
      if (isSectionHeader(rawQNum)) {
        if (!section) {
          section = rawQNum;
        }
        questionNumber = null;
      } else {
        questionNumber = normalizeQuestionNumber(rawQNum);
      }
    }

    // text
    const text = typeof a.text === 'string' ? a.text.trim() : (typeof a.answer === 'string' ? a.answer.trim() : '');
    if (!text) continue; // skip completely empty answers

    // regions
    const regions: ExtractedAnswerRegion[] = [];
    if (Array.isArray(a.regions)) {
      for (const r of a.regions as unknown[]) {
        if (typeof r !== 'object' || r === null) continue;
        const region = r as Record<string, unknown>;
        const page = typeof region.page === 'number' && region.page > 0 ? Math.round(region.page) : 1;
        const bbox = parseBbox(region.bbox ?? region.box_2d ?? region.box ?? region);
        if (bbox) {
          regions.push({ page, bbox });
        }
      }
    } else if (a.bbox || a.box_2d || a.region) {
      const page = typeof a.page === 'number' && a.page > 0 ? Math.round(a.page) : 1;
      const bbox = parseBbox(a.bbox ?? a.box_2d ?? a.region);
      if (bbox) {
        regions.push({ page, bbox });
      }
    }

    // If no valid region was parsed, provide a fallback region on page 1 so answer is preserved
    if (regions.length === 0) {
      const page = typeof a.page === 'number' && a.page > 0 ? Math.round(a.page) : 1;
      regions.push({ page, bbox: [100, 100, 900, 900] });
    }

    // optional fields
    const containsDiagram = typeof a.containsDiagram === 'boolean' ? a.containsDiagram : false;
    const confidence =
      typeof a.confidence === 'number' && a.confidence >= 0 && a.confidence <= 1
        ? a.confidence
        : undefined;

    answers.push({ id, questionNumber, section, text, regions, containsDiagram, confidence });
  }

  console.log(
    `[extract-answers] Successfully processed ${answers.length} answers.`,
    `Multi-page: ${answers.filter((a) => a.regions.length > 1).length}.`,
    `No question number: ${answers.filter((a) => a.questionNumber === null).length}.`
  );

  return answers;
}
