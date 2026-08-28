import { NextRequest, NextResponse } from 'next/server';
import { gradeAssessment } from '@/lib/grading';
import type { ExtractedQuestion, StudentAnswer, QuestionMapping } from '@/types';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { questions, answers, mappings } = body as {
      questions: ExtractedQuestion[];
      answers: StudentAnswer[];
      mappings: QuestionMapping[];
    };

    if (!Array.isArray(questions) || !Array.isArray(mappings)) {
      return NextResponse.json(
        {
          success: false,
          error: 'Invalid request body. Expected questions and mappings arrays.',
        },
        { status: 400 }
      );
    }

    const gradingSummary = await gradeAssessment(questions, answers || [], mappings);

    return NextResponse.json({
      success: true,
      grading: gradingSummary,
    });
  } catch (err: unknown) {
    console.error('[Grade API Error]:', err);
    const errorMessage = err instanceof Error ? err.message : 'Internal grading error.';
    return NextResponse.json(
      {
        success: false,
        error: errorMessage,
      },
      { status: 500 }
    );
  }
}
