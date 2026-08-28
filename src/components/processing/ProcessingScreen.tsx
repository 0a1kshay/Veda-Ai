import { useEffect, useState, useRef } from 'react';
import ProcessingSteps, { STEPS } from './ProcessingSteps';
import { Question, StudentAnswer, ExtractedQuestion, MappingResult } from '@/types';
import { mappingResultToUIQuestions } from '@/lib/mapping';
import { AlertCircle, RefreshCw } from 'lucide-react';

interface ProcessingScreenProps {
  questionPaper?: File | null;
  answerSheet?: File | null;
  onComplete: (questions?: Question[], answers?: StudentAnswer[], mappingResult?: MappingResult) => void;
}

// Sparkle AI animation
function AISparkle() {
  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      {/* SVG Canvas for the Sparkles */}
      <svg 
        width="110" 
        height="110" 
        viewBox="0 0 110 110" 
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
        className="select-none"
      >
        <defs>
          <linearGradient id="sparkle-grad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF4E17" />
            <stop offset="100%" stopColor="#FFA685" />
          </linearGradient>
          <linearGradient id="sparkle-grad-soft" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FF6B3F" />
            <stop offset="100%" stopColor="#FFCBB7" />
          </linearGradient>
        </defs>

        {/* Large Sparkle (Top Center/Right) */}
        <path 
          d="M 58 6 Q 58 28 80 28 Q 58 28 58 50 Q 58 28 36 28 Q 58 28 58 6" 
          fill="url(#sparkle-grad)"
          className="animate-pulse"
          style={{ animationDuration: '2s' }}
        />

        {/* Medium Sparkle (Bottom Left) */}
        <path 
          d="M 38 44 Q 38 62 56 62 Q 38 62 38 80 Q 38 62 20 62 Q 38 62 38 44" 
          fill="url(#sparkle-grad)"
          className="animate-pulse"
          style={{ animationDuration: '2.5s', animationDelay: '0.4s' }}
        />

        {/* Small Sparkle (Bottom Right) */}
        <path 
          d="M 76 50 Q 76 60 86 60 Q 76 60 76 70 Q 76 60 66 60 Q 76 60 76 50" 
          fill="url(#sparkle-grad-soft)"
          className="animate-pulse"
          style={{ animationDuration: '1.8s', animationDelay: '0.8s' }}
        />

        {/* Small circular dot on the left */}
        <circle 
          cx="24" 
          cy="32" 
          r="4.5" 
          fill="url(#sparkle-grad-soft)"
          className="animate-pulse"
          style={{ animationDuration: '3s', animationDelay: '0.2s' }}
        />
      </svg>
    </div>
  );
}

export default function ProcessingScreen({ questionPaper, answerSheet, onComplete }: ProcessingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const isRunningRef = useRef(false);

  const startProcessing = async (signal: AbortSignal) => {
    if (isRunningRef.current) return;
    isRunningRef.current = true;
    setError(null);
    setCurrentStep(0);

    const safeFetch = (url: string, init: RequestInit) =>
      fetch(url, { ...init, signal });

    const delay = (ms: number) =>
      new Promise<void>((res, rej) => {
        const t = setTimeout(res, ms);
        signal.addEventListener('abort', () => { clearTimeout(t); rej(new DOMException('Aborted', 'AbortError')); }, { once: true });
      });

    try {
      await delay(400);
      setCurrentStep(1);
      await delay(400);
      setCurrentStep(2);

      // Step 3: Extract questions via Gemini (question paper)
      let extractedQuestions: Question[] | null = null;
      let rawExtractedQuestions: ExtractedQuestion[] = [];

      if (questionPaper) {
        const formData = new FormData();
        formData.append('questionPaper', questionPaper);

        const res = await safeFetch('/api/extract-questions', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success && Array.isArray(data.questions) && data.questions.length > 0) {
          extractedQuestions = data.questions;
          rawExtractedQuestions = Array.isArray(data.extracted) ? data.extracted : [];
        } else if (!data.success) {
          const errMsg = data.error || 'Failed to extract questions.';
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
            throw new Error("Gemini API rate limit hit. Please wait ~60s and click 'Retry', or click 'Use Sample Data'.");
          }
          throw new Error(`Question paper extraction failed: ${errMsg}`);
        }
      }

      // Step 4: Extract handwritten answers via Gemini (answer sheet)
      setCurrentStep(3);
      let extractedAnswers: StudentAnswer[] | null = null;
      if (answerSheet) {
        const formData = new FormData();
        formData.append('answerSheet', answerSheet);

        const res = await safeFetch('/api/extract-answers', { method: 'POST', body: formData });
        const data = await res.json();

        if (data.success && data.result?.answers && Array.isArray(data.result.answers)) {
          extractedAnswers = data.result.answers;
          console.log(`[ProcessingScreen] Answer extraction: ${data.count} answers, ${data.multiPage} multi-page, ${data.noQuestionNumber} without Q-number`);
        } else if (!data.success) {
          const errMsg = data.error || 'Failed to extract answers.';
          if (errMsg.includes('429') || errMsg.includes('RESOURCE_EXHAUSTED') || errMsg.includes('quota')) {
            throw new Error("Gemini API rate limit hit. Please wait ~60s and click 'Retry', or click 'Use Sample Data'.");
          }
          console.warn('[Gemini Answer Extraction]:', errMsg);
        }
      }

      // Step 5: Question <-> Answer Mapping
      setCurrentStep(4);
      let mappedQuestions: Question[] | null = null;
      let mappingResult: MappingResult | null = null;

      if (rawExtractedQuestions.length > 0 && extractedAnswers && extractedAnswers.length > 0) {
        try {
          const mapRes = await safeFetch('/api/map-answers', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ questions: rawExtractedQuestions, answers: extractedAnswers }),
          });
          const mapData = await mapRes.json();
          if (mapData.success && mapData.data) {
            mappingResult = mapData.data;
            mappedQuestions = mappingResultToUIQuestions(mapData.data);
            console.log(
              `[ProcessingScreen] Mapping complete: ${mappingResult?.stats.answered} answered, ${mappingResult?.stats.unanswered} unanswered, ${mappingResult?.stats.unmapped} unmapped.`
            );

            // Real AI Grading Evaluation via /api/grade
            try {
              const gradeRes = await safeFetch('/api/grade', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  questions: rawExtractedQuestions,
                  answers: extractedAnswers,
                  mappings: mapData.data.mappings,
                }),
              });
              const gradeData = await gradeRes.json();
              if (gradeData.success && gradeData.grading?.grades && mappedQuestions) {
                type GradeItem = {
                  questionId?: string;
                  questionNumber?: string;
                  score: number;
                  maxScore: number;
                  correctness: 'correct' | 'partially_correct' | 'incorrect' | 'not_attempted';
                  feedback: string;
                };
                const gradesMap = new Map<string, GradeItem>(
                  gradeData.grading.grades.map((g: GradeItem) => [
                    g.questionId || g.questionNumber || '',
                    g,
                  ])
                );
                mappedQuestions = mappedQuestions.map((q) => {
                  const g = gradesMap.get(q.id) || gradesMap.get(q.number);
                  if (g) {
                    let status: 'correct' | 'partial' | 'incorrect' | 'unanswered' | 'unmapped' = 'unanswered';
                    if (g.correctness === 'correct') status = 'correct';
                    else if (g.correctness === 'partially_correct') status = 'partial';
                    else if (g.correctness === 'incorrect') status = 'incorrect';
                    else if (g.correctness === 'not_attempted') status = 'unanswered';

                    return {
                      ...q,
                      marks: g.maxScore ?? q.marks,
                      obtainedMarks: g.score,
                      status,
                      feedback: g.feedback,
                    };
                  }
                  return q;
                });
                console.log(
                  `[ProcessingScreen] Grading complete: ${gradeData.grading.totalScore}/${gradeData.grading.maxTotalScore} (${gradeData.grading.percentage}%)`
                );
              }
            } catch (gradeErr) {
              if (gradeErr instanceof DOMException && gradeErr.name === 'AbortError') throw gradeErr;
              console.warn('[ProcessingScreen] Grade API error:', gradeErr);
            }
          }
        } catch (mapErr) {
          if (mapErr instanceof DOMException && mapErr.name === 'AbortError') throw mapErr;
          console.warn('[ProcessingScreen] Mapping API error:', mapErr);
        }
      } else {
        await delay(600);
      }

      // Step 6: Preparing workspace
      setCurrentStep(5);
      await delay(500);
      setCurrentStep(6);
      await delay(400);

      onComplete(
        mappedQuestions || extractedQuestions || undefined,
        extractedAnswers || undefined,
        mappingResult || undefined
      );
    } catch (err: unknown) {
      if (err instanceof DOMException && err.name === 'AbortError') return;
      console.error('[Processing Error]:', err);
      const msg = err instanceof Error ? err.message : 'Processing failed.';
      setError(msg);
    } finally {
      isRunningRef.current = false;
    }
  };

  const handleRetry = () => {
    isRunningRef.current = false;
    const controller = new AbortController();
    startProcessing(controller.signal);
  };

  useEffect(() => {
    const controller = new AbortController();
    // queueMicrotask defers past the synchronous effect phase, satisfying the
    // react-hooks/set-state-in-effect rule while still starting immediately.
    queueMicrotask(() => {
      if (!controller.signal.aborted) {
        startProcessing(controller.signal);
      }
    });
    return () => {
      controller.abort();
      isRunningRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  const progressPct = Math.round((currentStep / STEPS.length) * 100);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-8 p-8 page-enter">
      {/* Animation */}
      <AISparkle />

      {/* Text */}
      <div className="text-center">
        <h2 className="text-xl font-bold" style={{ color: '#1C1C1E' }}>
          {error ? 'Extraction Paused' : 'Extracting...'}
        </h2>
        <p className="text-sm mt-1.5" style={{ color: '#6B7280' }}>
          {error ? error : 'This may take a while'}
        </p>
      </div>

      {/* Error alert if failed */}
      {error && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl max-w-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0 text-red-500" />
          <div className="flex-1 text-xs">
            <p className="font-semibold">AI Extraction Notice</p>
            <p className="text-red-600 mt-0.5">{error}</p>
          </div>
          <button
            onClick={() => onComplete(undefined)}
            className="text-xs font-bold text-orange-600 underline hover:text-orange-700 ml-2"
          >
            Use Sample Data
          </button>
        </div>
      )}

      {/* Progress bar */}
      <div className="w-full max-w-xs">
        <div
          className="h-1.5 rounded-full overflow-hidden"
          style={{ background: '#F3F4F6' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500 ease-out"
            style={{ width: `${progressPct}%`, background: '#F97316' }}
          />
        </div>
        <div className="flex items-center justify-between text-xs mt-2" style={{ color: '#9CA3AF' }}>
          <span>{progressPct}% complete</span>
          {error && (
            <button
              onClick={handleRetry}
              className="flex items-center gap-1 text-orange-600 font-semibold hover:underline cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" /> Retry
            </button>
          )}
        </div>
      </div>

      {/* Steps */}
      <ProcessingSteps currentStep={currentStep} />
    </div>
  );
}

