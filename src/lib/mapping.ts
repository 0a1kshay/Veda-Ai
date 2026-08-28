import { getGeminiClient, generateContentWithFallback } from './gemini';
import type {
  ExtractedQuestion,
  StudentAnswer,
  QuestionMapping,
  UnmappedAnswer,
  MappingResult,
  Question,
  AnswerRegion,
} from '@/types';

/**
 * Detects if a string is a section / module / chapter / topic header rather than an actual question number.
 */
export function isSectionHeader(s: string): boolean {
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
 * Canonical normalization of question numbers for deterministic matching.
 * Examples:
 *   "Q1", "Q.1", "Q 1", "Question 1", "1." -> "1"
 *   "Q11(a)", "Q. 11 (a)", "11 (a)", "11(a)", "Question 11a" -> "11(a)"
 *   "11 (b)", "Q.11(B)", "11 ( B )" -> "11(b)"
 *   "3(ii)", "Q3(ii)" -> "3(ii)"
 *   "Module-01 Vocab Terms" -> null
 */
export function normalizeQuestionNumber(raw: string | null | undefined): string | null {
  if (!raw) return null;
  let s = raw.trim();
  if (!s) return null;

  if (isSectionHeader(s)) {
    return null;
  }

  // Strip leading Q / Q. / Question / Que / Que.
  s = s.replace(/^question\s*/i, '');
  s = s.replace(/^que?\.?\s*/i, '');
  s = s.replace(/^q\s*\.?\s*/i, '');

  // Strip trailing punctuation e.g. "1.", "2:", "3)"
  s = s.replace(/[\.:]+$/, '').trim();

  // Pattern 1: Pure number e.g. "1", "12"
  if (/^\d+$/.test(s)) {
    return s;
  }

  // Pattern 2: Number with subpart in parens or letters: "11(a)", "11 (a)", "11a", "11 ( A )"
  const subpartMatch = s.match(/^(\d+)\s*[\.\-\(]?\s*([a-z]+|\b[ivxlcdm]+\b)\s*[\)]?$/i);
  if (subpartMatch) {
    const num = subpartMatch[1];
    const sub = subpartMatch[2].toLowerCase();
    return `${num}(${sub})`;
  }

  // Pattern 3: Multi-level subpart like "3(a)(i)" or "3(i)"
  const cleanSpaced = s.replace(/\s+/g, '');
  if (/^\d+\([a-z0-9ivxlcdm]+\)(\([a-z0-9ivxlcdm]+\))?$/i.test(cleanSpaced)) {
    return cleanSpaced.toLowerCase();
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

  // Return cleaned alphanumeric if simple token, else null
  if (/^[a-z0-9_\-\(\)]+$/i.test(cleanSpaced) && cleanSpaced.length <= 10) {
    return cleanSpaced.toLowerCase();
  }

  return null;
}

const SEMANTIC_MATCHING_PROMPT = `You are an expert assessment evaluation system.
Your task is to map student answers that lack clear question numbers to their most likely matching questions from the question paper.

Compare each candidate answer's handwritten text to the candidate questions' text.
Determine which question the answer belongs to.

Rules:
1. Match based on semantic intent and subject matter (e.g. topic, entities, formulas).
2. DO NOT evaluate whether the answer is correct or give grades. Only identify which question was attempted.
3. Assign a confidence score between 0.0 and 1.0 (>= 0.85 high confidence, 0.65-0.84 medium, < 0.65 low/uncertain).
4. Provide a brief one-sentence reason explaining the semantic match.
5. If an answer does not correspond to any available question, set questionId to null.

Return ONLY a valid JSON object with a "matches" array, with NO markdown formatting:
{
  "matches": [
    {
      "answerId": "a1",
      "questionId": "q4",
      "confidence": 0.92,
      "reason": "The student answer explains photosynthesis and chloroplasts, directly addressing question 4."
    }
  ]
}`;

interface SemanticMatchOutput {
  answerId: string;
  questionId: string | null;
  confidence: number;
  reason?: string;
}

/**
 * Fallback semantic AI matching using Gemini for answers that cannot be resolved deterministically.
 */
async function performSemanticMatching(
  unansweredQuestions: ExtractedQuestion[],
  unmappedAnswers: StudentAnswer[]
): Promise<SemanticMatchOutput[]> {
  if (unansweredQuestions.length === 0 || unmappedAnswers.length === 0) {
    return [];
  }

  try {
    const ai = getGeminiClient();
    const payload = {
      candidateQuestions: unansweredQuestions.map((q) => ({
        id: q.id,
        number: q.number,
        text: q.text,
      })),
      unmappedAnswers: unmappedAnswers.map((a) => ({
        id: a.id,
        statedQuestionNumber: a.questionNumber,
        section: a.section,
        text: a.text,
      })),
    };

    console.log(
      `[mapping] Calling Gemini Semantic Matching for ${unmappedAnswers.length} unmapped answers against ${unansweredQuestions.length} questions...`
    );

    const response = await generateContentWithFallback(ai, [
      {
        role: 'user',
        parts: [
          { text: SEMANTIC_MATCHING_PROMPT },
          { text: `DATA:\n${JSON.stringify(payload, null, 2)}` },
        ],
      },
    ]);

    const rawText = response.text?.trim();
    if (!rawText) return [];

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    let parsed: unknown;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      const match = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (match) parsed = JSON.parse(match[0]);
    }

    const matchesArray: unknown[] = Array.isArray(parsed)
      ? parsed
      : typeof parsed === 'object' && parsed !== null && Array.isArray((parsed as Record<string, unknown>).matches)
      ? (parsed as Record<string, unknown>).matches as unknown[]
      : [];

    const validMatches: SemanticMatchOutput[] = [];
    const validQIds = new Set(unansweredQuestions.map((q) => q.id));
    const validAIds = new Set(unmappedAnswers.map((a) => a.id));

    for (const item of matchesArray) {
      if (typeof item !== 'object' || item === null) continue;
      const m = item as Record<string, unknown>;
      const answerId = typeof m.answerId === 'string' ? m.answerId : '';
      const questionId = typeof m.questionId === 'string' && m.questionId ? m.questionId : null;
      const confidence = typeof m.confidence === 'number' ? Math.max(0, Math.min(1, m.confidence)) : 0.5;
      const reason = typeof m.reason === 'string' ? m.reason : undefined;

      if (validAIds.has(answerId) && (!questionId || validQIds.has(questionId))) {
        validMatches.push({ answerId, questionId, confidence, reason });
      }
    }

    return validMatches;
  } catch (err) {
    console.warn('[mapping] Semantic matching fallback error:', err);
    return [];
  }
}

/**
 * Main Question ↔ Answer Mapping Engine.
 * Combines questions[] and answers[] following the priority:
 * 1. Exact question-number matching (confidence = 1.0)
 * 2. Normalized question-number matching (confidence = 0.98)
 * 3. Semantic AI matching fallback for unmapped/unlabeled answers (confidence >= 0.65)
 * 4. Unanswered & unmapped classification
 *
 * Guarantees:
 * - Output mappings strictly preserve Question Paper order.
 * - Original answer regions (including multi-page regions) are fully preserved.
 * - Subparts like 11(a) and 11(b) remain distinct.
 * - Unmapped answers (like Q99) are classified into unmappedAnswers without data loss.
 */
export async function mapQuestionsToAnswers(
  questions: ExtractedQuestion[],
  answers: StudentAnswer[],
  options?: { enableSemantic?: boolean }
): Promise<MappingResult> {
  const enableSemantic = options?.enableSemantic ?? true;

  // Track matched status
  const matchedAnswerIds = new Set<string>();
  const questionMapResults = new Map<string, QuestionMapping>();

  let exactMatchesCount = 0;
  let normalizedMatchesCount = 0;
  let semanticMatchesCount = 0;
  let ambiguousCount = 0;

  // Build candidate lookup for answers by raw and normalized numbers
  const answersByRawNum = new Map<string, StudentAnswer[]>();
  const answersByNormNum = new Map<string, StudentAnswer[]>();

  for (const a of answers) {
    if (a.questionNumber) {
      const rawKey = a.questionNumber.trim().toLowerCase();
      const rawList = answersByRawNum.get(rawKey) || [];
      rawList.push(a);
      answersByRawNum.set(rawKey, rawList);

      const normKey = normalizeQuestionNumber(a.questionNumber);
      if (normKey) {
        const normList = answersByNormNum.get(normKey) || [];
        normList.push(a);
        answersByNormNum.set(normKey, normList);
      }
    }
  }

  // --- Step 1: Deterministic Number Matching ---
  for (const q of questions) {
    const rawQKey = q.number.trim().toLowerCase();
    const normQKey = normalizeQuestionNumber(q.number) || rawQKey;

    // Check exact raw match first
    const exactCandidates = (answersByRawNum.get(rawQKey) || []).filter(
      (a) => !matchedAnswerIds.has(a.id)
    );

    if (exactCandidates.length === 1) {
      const matchedAnswer = exactCandidates[0];
      matchedAnswerIds.add(matchedAnswer.id);
      exactMatchesCount++;

      questionMapResults.set(q.id, {
        questionId: q.id,
        questionNumber: q.number,
        questionText: q.text,
        marks: q.marks,
        answerId: matchedAnswer.id,
        status: 'answered',
        matchType: 'exact_number',
        confidence: 1.0,
        answer: {
          id: matchedAnswer.id,
          text: matchedAnswer.text,
          section: matchedAnswer.section,
          regions: matchedAnswer.regions,
          containsDiagram: matchedAnswer.containsDiagram,
        },
      });
      continue;
    } else if (exactCandidates.length > 1) {
      // Multiple answers claim exact same question -> Ambiguous duplicate
      for (const a of exactCandidates) matchedAnswerIds.add(a.id);
      ambiguousCount++;

      questionMapResults.set(q.id, {
        questionId: q.id,
        questionNumber: q.number,
        questionText: q.text,
        marks: q.marks,
        answerId: exactCandidates[0].id,
        status: 'ambiguous',
        matchType: 'exact_number',
        confidence: 0.5,
        candidateAnswerIds: exactCandidates.map((a) => a.id),
        answer: {
          id: exactCandidates[0].id,
          text: exactCandidates[0].text,
          section: exactCandidates[0].section,
          regions: exactCandidates[0].regions,
          containsDiagram: exactCandidates[0].containsDiagram,
        },
      });
      continue;
    }

    // Check normalized match next
    const normCandidates = (answersByNormNum.get(normQKey) || []).filter(
      (a) => !matchedAnswerIds.has(a.id)
    );

    if (normCandidates.length === 1) {
      const matchedAnswer = normCandidates[0];
      matchedAnswerIds.add(matchedAnswer.id);
      normalizedMatchesCount++;

      questionMapResults.set(q.id, {
        questionId: q.id,
        questionNumber: q.number,
        questionText: q.text,
        marks: q.marks,
        answerId: matchedAnswer.id,
        status: 'answered',
        matchType: 'normalized_number',
        confidence: 0.98,
        answer: {
          id: matchedAnswer.id,
          text: matchedAnswer.text,
          section: matchedAnswer.section,
          regions: matchedAnswer.regions,
          containsDiagram: matchedAnswer.containsDiagram,
        },
      });
      continue;
    } else if (normCandidates.length > 1) {
      for (const a of normCandidates) matchedAnswerIds.add(a.id);
      ambiguousCount++;

      questionMapResults.set(q.id, {
        questionId: q.id,
        questionNumber: q.number,
        questionText: q.text,
        marks: q.marks,
        answerId: normCandidates[0].id,
        status: 'ambiguous',
        matchType: 'normalized_number',
        confidence: 0.5,
        candidateAnswerIds: normCandidates.map((a) => a.id),
        answer: {
          id: normCandidates[0].id,
          text: normCandidates[0].text,
          section: normCandidates[0].section,
          regions: normCandidates[0].regions,
          containsDiagram: normCandidates[0].containsDiagram,
        },
      });
      continue;
    }
  }

  // --- Step 2: Semantic AI Matching Fallback ---
  const remainingUnansweredQuestions = questions.filter((q) => !questionMapResults.has(q.id));
  const remainingUnmappedAnswers = answers.filter((a) => !matchedAnswerIds.has(a.id));

  if (
    enableSemantic &&
    remainingUnansweredQuestions.length > 0 &&
    remainingUnmappedAnswers.length > 0
  ) {
    const semanticMatches = await performSemanticMatching(
      remainingUnansweredQuestions,
      remainingUnmappedAnswers
    );

    for (const sm of semanticMatches) {
      if (
        sm.questionId &&
        sm.confidence >= 0.65 &&
        !questionMapResults.has(sm.questionId) &&
        !matchedAnswerIds.has(sm.answerId)
      ) {
        const question = questions.find((q) => q.id === sm.questionId);
        const answer = answers.find((a) => a.id === sm.answerId);

        if (question && answer) {
          matchedAnswerIds.add(answer.id);
          semanticMatchesCount++;

          questionMapResults.set(question.id, {
            questionId: question.id,
            questionNumber: question.number,
            questionText: question.text,
            marks: question.marks,
            answerId: answer.id,
            status: 'answered',
            matchType: 'semantic',
            confidence: sm.confidence,
            semanticReason: sm.reason,
            answer: {
              id: answer.id,
              text: answer.text,
              section: answer.section,
              regions: answer.regions,
              containsDiagram: answer.containsDiagram,
            },
          });
        }
      }
    }
  }

  // --- Step 3: Build Final Ordered Mappings Array ---
  const finalMappings: QuestionMapping[] = [];

  for (const q of questions) {
    if (questionMapResults.has(q.id)) {
      finalMappings.push(questionMapResults.get(q.id)!);
    } else {
      // Question has no mapped answer -> Unanswered
      finalMappings.push({
        questionId: q.id,
        questionNumber: q.number,
        questionText: q.text,
        marks: q.marks,
        answerId: null,
        status: 'unanswered',
        confidence: 1.0,
        answer: null,
      });
    }
  }

  // --- Step 4: Collect Unmapped Answers ---
  const unmappedAnswers: UnmappedAnswer[] = [];

  for (const a of answers) {
    if (!matchedAnswerIds.has(a.id)) {
      let reason = 'Answer does not match any question on the question paper';
      if (a.questionNumber) {
        reason = `Question "${a.questionNumber}" is not present on the question paper`;
      } else if (a.section) {
        reason = `Section header "${a.section}" with unassociated answer text`;
      }

      unmappedAnswers.push({
        answerId: a.id,
        questionNumber: a.questionNumber,
        section: a.section,
        text: a.text,
        regions: a.regions,
        containsDiagram: a.containsDiagram,
        status: 'unmapped',
        reason,
      });
    }
  }

  const answeredCount = finalMappings.filter((m) => m.status === 'answered').length;
  const unansweredCount = finalMappings.filter((m) => m.status === 'unanswered').length;

  console.log(
    `[mapping] Summary: ${finalMappings.length} questions (${answeredCount} answered, ${unansweredCount} unanswered, ${ambiguousCount} ambiguous), ${unmappedAnswers.length} unmapped answers. [Exact: ${exactMatchesCount}, Norm: ${normalizedMatchesCount}, Semantic: ${semanticMatchesCount}]`
  );

  return {
    mappings: finalMappings,
    unmappedAnswers,
    stats: {
      totalQuestions: questions.length,
      answered: answeredCount,
      unanswered: unansweredCount,
      unmapped: unmappedAnswers.length,
      ambiguous: ambiguousCount,
      exactMatches: exactMatchesCount,
      normalizedMatches: normalizedMatchesCount,
      semanticMatches: semanticMatchesCount,
    },
  };
}

export const PAGE_W = 700;
export const PAGE_H = 990;

/**
 * Converts a Gemini-normalized bounding box [ymin, xmin, ymax, xmax] (0-1000)
 * to exact rendered page coordinates (width x height) in pixels.
 */
export function convertGeminiBboxToPageRegion(
  page: number,
  bbox: [number, number, number, number],
  pageWidth = PAGE_W,
  pageHeight = PAGE_H
): AnswerRegion {
  const [ymin, xmin, ymax, xmax] = bbox;
  const x = Math.round((xmin / 1000) * pageWidth);
  const y = Math.round((ymin / 1000) * pageHeight);
  const width = Math.max(40, Math.round(((xmax - xmin) / 1000) * pageWidth));
  const height = Math.max(25, Math.round(((ymax - ymin) / 1000) * pageHeight));
  return { page, x, y, width, height };
}

/**
 * Converts QuestionMapping[] from the mapping engine into UI-ready Question[] models
 * preserving question ordering, answer regions, status ('unanswered' | 'correct' | 'unmapped'),
 * and candidate mappings.
 */
export function mappingResultToUIQuestions(mappingResult: MappingResult): Question[] {
  return mappingResult.mappings.map((m) => {
    let answerPages: AnswerRegion[] = [];
    if (m.answer?.regions && m.answer.regions.length > 0) {
      answerPages = m.answer.regions.map((r) => convertGeminiBboxToPageRegion(r.page, r.bbox));
    }

    let status: 'unanswered' | 'unmapped' | 'correct' = 'unanswered';
    if (m.status === 'answered') {
      status = 'correct';
    } else if (m.status === 'ambiguous') {
      status = 'unmapped';
    }

    return {
      id: m.questionId,
      number: m.questionNumber,
      text: m.questionText,
      marks: m.marks ?? 0,
      obtainedMarks: status === 'correct' ? (m.marks ?? 0) : 0,
      status,
      feedback: m.semanticReason || (status === 'unanswered' ? 'This question was not attempted.' : ''),
      answer: answerPages.length > 0 ? { pages: answerPages } : null,
    };
  });
}

