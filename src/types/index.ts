export type AppState = 'upload' | 'processing' | 'mapping';

export type QuestionStatus =
  | 'correct'
  | 'partial'
  | 'incorrect'
  | 'unanswered'
  | 'unmapped';

export interface AnswerRegion {
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface Question {
  id: string;
  number: string;
  text: string;
  marks: number;
  obtainedMarks: number;
  status: QuestionStatus;
  feedback: string;
  answer: {
    pages: AnswerRegion[];
  } | null;
}

export interface UploadedFile {
  name: string;
  size: number;
  pages: number;
  type: string;
  file: File;
}

export interface ProcessingStep {
  id: string;
  label: string;
  status: 'done' | 'active' | 'pending';
}

/* ==========================================================================
   Gemini AI Pipeline Data Contracts (Phase 2 - Phase 5 Readiness)
   ========================================================================== */

export interface ExtractedQuestion {
  id: string;
  number: string;
  text: string;
  marks?: number;
}

/**
 * A single bounding region on one page of the answer sheet.
 * bbox is [ymin, xmin, ymax, xmax] normalized 0–1000 (Gemini native format).
 */
export interface ExtractedAnswerRegion {
  page: number;
  bbox: [number, number, number, number];
}

/**
 * One student answer as extracted by Gemini Vision from the answer sheet.
 * questionNumber is null when the student did not write a visible question number.
 */
export interface StudentAnswer {
  id: string;
  questionNumber: string | null;
  section?: string | null;
  text: string;
  regions: ExtractedAnswerRegion[];
  containsDiagram?: boolean;
  confidence?: number;
}

/** Full response envelope returned by the /api/extract-answers endpoint. */
export interface AnswerExtractionResult {
  answers: StudentAnswer[];
}

export type MappingStatus = 'answered' | 'unanswered' | 'ambiguous';
export type MatchType = 'exact_number' | 'normalized_number' | 'semantic';

/**
 * Result of mapping one question from the question paper to a student answer.
 * Retains original answer regions for subsequent highlighting/grading.
 */
export interface QuestionMapping {
  questionId: string;
  questionNumber: string;
  questionText: string;
  marks?: number;
  answerId: string | null;
  status: MappingStatus;
  matchType?: MatchType;
  confidence: number;
  candidateAnswerIds?: string[];
  answer?: {
    id: string;
    text: string;
    section?: string | null;
    regions: ExtractedAnswerRegion[];
    containsDiagram?: boolean;
  } | null;
  semanticReason?: string;
}

/**
 * An answer written by the student that could not be mapped to any question on the paper.
 */
export interface UnmappedAnswer {
  answerId: string;
  questionNumber: string | null;
  section?: string | null;
  text: string;
  regions: ExtractedAnswerRegion[];
  containsDiagram?: boolean;
  status: 'unmapped';
  reason?: string;
}

/**
 * Overall mapping result returned by the /api/map-answers endpoint and mapping engine.
 */
export interface MappingResult {
  mappings: QuestionMapping[];
  unmappedAnswers: UnmappedAnswer[];
  stats: {
    totalQuestions: number;
    answered: number;
    unanswered: number;
    unmapped: number;
    ambiguous: number;
    exactMatches: number;
    normalizedMatches: number;
    semanticMatches: number;
  };
}

export interface QuestionAnswerMapping {
  questionId: string;
  answerId?: string;
  confidence: number;
}

/* ==========================================================================
   Grading & AI Feedback Contracts (Phase 5 - Phase 7)
   ========================================================================== */

export type GradingCorrectness = 'correct' | 'partially_correct' | 'incorrect' | 'not_attempted';

export interface QuestionGrade {
  questionId: string;
  questionNumber: string;
  score: number;
  maxScore: number;
  correctness: GradingCorrectness;
  feedback: string;
  confidence: number;
  keyPointsCovered?: string[];
  keyPointsMissed?: string[];
}

export interface OverallGradingSummary {
  totalScore: number;
  maxTotalScore: number;
  percentage: number;
  overallFeedback: string;
  strengths: string[];
  improvements: string[];
  grades: QuestionGrade[];
}

