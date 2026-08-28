import { NextResponse } from 'next/server';
import { mapQuestionsToAnswers } from '@/lib/mapping';
import type { ExtractedQuestion, StudentAnswer } from '@/types';

export const maxDuration = 60; // Up to 60s for semantic matching if needed

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const body = await request.json();

    const questions = body?.questions as ExtractedQuestion[] | undefined;
    const answers = body?.answers as StudentAnswer[] | undefined;
    const enableSemantic = typeof body?.enableSemantic === 'boolean' ? body.enableSemantic : true;

    if (!Array.isArray(questions)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "questions" array.' },
        { status: 400 }
      );
    }

    if (!Array.isArray(answers)) {
      return NextResponse.json(
        { success: false, error: 'Missing or invalid "answers" array.' },
        { status: 400 }
      );
    }

    console.log(
      `[POST /api/map-answers] Starting mapping for ${questions.length} questions and ${answers.length} answers...`
    );

    const result = await mapQuestionsToAnswers(questions, answers, { enableSemantic });

    return NextResponse.json(
      {
        success: true,
        data: result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Question-answer mapping failed.';
    console.error('[Map Answers API Error]:', message);

    return NextResponse.json(
      { success: false, error: message },
      { status: 500 }
    );
  }
}
