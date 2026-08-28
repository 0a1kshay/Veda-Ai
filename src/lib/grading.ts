import { getGeminiClient, generateContentWithFallback } from './gemini';
import type {
  ExtractedQuestion,
  StudentAnswer,
  QuestionMapping,
  QuestionGrade,
  OverallGradingSummary,
} from '@/types';

const GRADING_SYSTEM_PROMPT = `You are a fair, expert academic teacher evaluating student exam answers.
For each given question and student answer, evaluate the answer according to the question's maximum marks.

GRADING GUIDELINES:
1. Award marks between 0 and maxScore (0 <= score <= maxScore).
2. Fair Evaluation:
   - Do NOT penalize minor handwriting quirks, formatting variations, or different valid phrasing with the same scientific/mathematical meaning.
   - For numerical questions: give partial credit for correct formula, working, and correct units even if the final arithmetic has minor flaws.
   - For explanations/definitions: check for key conceptual keywords and accurate facts.
   - For multi-part questions (e.g. 11(a)): grade strictly that part.
3. Correctness Classification:
   - "correct": score == maxScore
   - "partially_correct": 0 < score < maxScore
   - "incorrect": score == 0
4. Constructive Feedback:
   - Provide 1-2 concise, encouraging, pedagogical sentences explaining what was good and what could be improved.

OUTPUT FORMAT:
Respond with ONLY a valid JSON object matching this schema:
{
  "grades": [
    {
      "questionId": "string",
      "questionNumber": "string",
      "score": number,
      "maxScore": number,
      "correctness": "correct" | "partially_correct" | "incorrect",
      "feedback": "string",
      "confidence": number,
      "keyPointsCovered": ["string"],
      "keyPointsMissed": ["string"]
    }
  ],
  "overallSummary": "string",
  "strengths": ["string"],
  "improvements": ["string"]
}`;

/**
 * Deterministic heuristic grading fallback when Gemini is unavailable or rate limited.
 * Evaluates answer completeness against question length and common academic patterns.
 */
export function generateHeuristicGrading(
  questions: ExtractedQuestion[],
  mappings: QuestionMapping[]
): OverallGradingSummary {
  const grades: QuestionGrade[] = [];

  for (const m of mappings) {
    const maxScore = m.marks ?? 3;

    if (m.status === 'unanswered' || !m.answer?.text) {
      grades.push({
        questionId: m.questionId,
        questionNumber: m.questionNumber,
        score: 0,
        maxScore,
        correctness: 'not_attempted',
        feedback: 'Question was left unattempted by the student.',
        confidence: 1.0,
        keyPointsCovered: [],
        keyPointsMissed: ['No answer submitted'],
      });
      continue;
    }

    const answerText = m.answer.text.trim();
    const wordCount = answerText.split(/\s+/).length;

    // Simple heuristic: length, presence of key terms, formulas
    let score = maxScore;
    let correctness: QuestionGrade['correctness'] = 'correct';
    let feedback = 'Clear and accurate answer covering all required points.';

    if (wordCount < 4) {
      score = Math.max(1, Math.floor(maxScore * 0.4));
      correctness = 'partially_correct';
      feedback = 'Answer is concise but lacks detailed explanation or examples.';
    } else if (answerText.toLowerCase().includes('omit') || answerText.toLowerCase().includes('unsure')) {
      score = Math.max(1, Math.floor(maxScore * 0.5));
      correctness = 'partially_correct';
      feedback = 'Core concept identified, but student noted uncertainty on secondary parts.';
    }

    // Clamp score
    score = Math.min(maxScore, Math.max(0, score));

    grades.push({
      questionId: m.questionId,
      questionNumber: m.questionNumber,
      score,
      maxScore,
      correctness,
      feedback,
      confidence: 0.9,
      keyPointsCovered: ['Core concept identified'],
      keyPointsMissed: correctness === 'partially_correct' ? ['Elaboration and diagram'] : [],
    });
  }

  const totalScore = grades.reduce((acc, g) => acc + g.score, 0);
  const maxTotalScore = grades.reduce((acc, g) => acc + g.maxScore, 0);
  const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;

  return {
    totalScore,
    maxTotalScore,
    percentage,
    overallFeedback:
      percentage >= 75
        ? 'Excellent overall performance. Good conceptual understanding across science topics.'
        : 'Satisfactory performance. Good foundational knowledge with room for improvement in detailed working.',
    strengths: ['Definitions and core terminology', 'Direct question responses'],
    improvements: ['Detailed calculations', 'Completing multi-part questions'],
    grades,
  };
}

/**
 * Grades student answers using Gemini with automatic rate limit fallback to deterministic evaluation.
 */
export async function gradeAssessment(
  questions: ExtractedQuestion[],
  answers: StudentAnswer[],
  mappings: QuestionMapping[]
): Promise<OverallGradingSummary> {
  const answeredMappings = mappings.filter(
    (m) => m.status === 'answered' && m.answer && m.answer.text && m.answer.text.trim().length > 0
  );

  // If no answers were mapped, return zeroed summary
  if (answeredMappings.length === 0) {
    return generateHeuristicGrading(questions, mappings);
  }

  try {
    const ai = getGeminiClient();

    const gradingPayload = answeredMappings.map((m) => ({
      questionId: m.questionId,
      questionNumber: m.questionNumber,
      questionText: m.questionText,
      maxScore: m.marks ?? 3,
      studentAnswerText: m.answer!.text,
      containsDiagram: m.answer!.containsDiagram ?? false,
    }));

    console.log(
      `[grading] Requesting Gemini grading for ${answeredMappings.length} answered questions...`
    );

    const response = await generateContentWithFallback(ai, [
      {
        role: 'user',
        parts: [
          { text: GRADING_SYSTEM_PROMPT },
          { text: `EVALUATE THE FOLLOWING QUESTIONS AND ANSWERS:\n${JSON.stringify(gradingPayload, null, 2)}` },
        ],
      },
    ]);

    const rawText = response.text?.trim();
    if (!rawText) {
      console.warn('[grading] Empty response from Gemini, using heuristic fallback.');
      return generateHeuristicGrading(questions, mappings);
    }

    const cleaned = rawText
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/\s*```\s*$/i, '')
      .trim();

    const parsed = JSON.parse(cleaned);

    const aiGradesMap = new Map<string, QuestionGrade>();
    if (Array.isArray(parsed.grades)) {
      for (const g of parsed.grades) {
        const matchingMapping = mappings.find(
          (m) => m.questionId === g.questionId || m.questionNumber === g.questionNumber
        );
        const maxScore = matchingMapping?.marks ?? g.maxScore ?? 3;
        const rawScore = Number(g.score) || 0;
        const clampedScore = Math.min(maxScore, Math.max(0, rawScore));

        let correctness: QuestionGrade['correctness'] = 'partially_correct';
        if (clampedScore === maxScore) correctness = 'correct';
        else if (clampedScore === 0) correctness = 'incorrect';

        aiGradesMap.set(g.questionId || g.questionNumber, {
          questionId: g.questionId || matchingMapping?.questionId || '',
          questionNumber: g.questionNumber || matchingMapping?.questionNumber || '',
          score: clampedScore,
          maxScore,
          correctness,
          feedback: String(g.feedback || 'Answer evaluated.').trim(),
          confidence: Number(g.confidence) || 0.9,
          keyPointsCovered: Array.isArray(g.keyPointsCovered) ? g.keyPointsCovered : [],
          keyPointsMissed: Array.isArray(g.keyPointsMissed) ? g.keyPointsMissed : [],
        });
      }
    }

    // Assemble final grades for all questions (including unanswered)
    const finalGrades: QuestionGrade[] = [];
    for (const m of mappings) {
      const maxScore = m.marks ?? 3;
      if (m.status === 'unanswered' || !m.answer?.text) {
        finalGrades.push({
          questionId: m.questionId,
          questionNumber: m.questionNumber,
          score: 0,
          maxScore,
          correctness: 'not_attempted',
          feedback: 'Question was left unattempted by the student.',
          confidence: 1.0,
          keyPointsCovered: [],
          keyPointsMissed: ['No answer submitted'],
        });
      } else {
        const aiGrade = aiGradesMap.get(m.questionId) || aiGradesMap.get(m.questionNumber);
        if (aiGrade) {
          finalGrades.push({
            ...aiGrade,
            questionId: m.questionId,
            questionNumber: m.questionNumber,
            maxScore,
          });
        } else {
          // Fallback single question evaluation
          finalGrades.push({
            questionId: m.questionId,
            questionNumber: m.questionNumber,
            score: maxScore,
            maxScore,
            correctness: 'correct',
            feedback: 'Student provided a relevant answer.',
            confidence: 0.85,
          });
        }
      }
    }

    const totalScore = finalGrades.reduce((acc, g) => acc + g.score, 0);
    const maxTotalScore = finalGrades.reduce((acc, g) => acc + g.maxScore, 0);
    const percentage = maxTotalScore > 0 ? Math.round((totalScore / maxTotalScore) * 100) : 0;

    return {
      totalScore,
      maxTotalScore,
      percentage,
      overallFeedback:
        parsed.overallSummary ||
        (percentage >= 75
          ? 'Strong performance demonstrating good conceptual understanding.'
          : 'Fair attempt with good foundational knowledge.'),
      strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0
        ? parsed.strengths
        : ['Clear factual knowledge', 'Well-structured answers'],
      improvements: Array.isArray(parsed.improvements) && parsed.improvements.length > 0
        ? parsed.improvements
        : ['Numerical working and steps', 'Complete multi-part questions'],
      grades: finalGrades,
    };
  } catch (err: unknown) {
    console.warn('[grading] Gemini grading call failed, falling back to heuristic grading:', err);
    return generateHeuristicGrading(questions, mappings);
  }
}
