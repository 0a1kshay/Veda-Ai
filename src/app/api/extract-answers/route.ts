import { NextResponse } from 'next/server';
import { extractAnswersFromFile, isGeminiRateLimitError } from '@/lib/gemini';
import type { AnswerExtractionResult } from '@/types';

export const maxDuration = 120; // PDFs with many pages may need more time

/** Safely convert a FormData entry to a Buffer without depending on .arrayBuffer() */
async function entryToBuffer(entry: FormDataEntryValue): Promise<{ buffer: Buffer; mimeType: string }> {
  if (typeof entry === 'string') {
    return { buffer: Buffer.from(entry, 'utf-8'), mimeType: 'text/plain' };
  }

  const blob = entry as Blob;
  const mimeType = blob.type || 'application/octet-stream';

  let arrayBuffer: ArrayBuffer;
  if (typeof blob.arrayBuffer === 'function') {
    arrayBuffer = await blob.arrayBuffer();
  } else {
    arrayBuffer = await new Response(blob).arrayBuffer();
  }

  return { buffer: Buffer.from(arrayBuffer), mimeType };
}

export async function POST(request: Request): Promise<NextResponse> {
  try {
    const formData = await request.formData();
    const entry = formData.get('answerSheet');

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'No answer sheet file uploaded. Send the file as "answerSheet".' },
        { status: 400 }
      );
    }

    const { buffer, mimeType } = await entryToBuffer(entry);

    if (buffer.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Uploaded file is empty.' },
        { status: 400 }
      );
    }

    const supportedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (!supportedTypes.includes(mimeType)) {
      return NextResponse.json(
        {
          success: false,
          error: `Unsupported file type "${mimeType}". Please upload a PDF, PNG, JPG, or WebP file.`,
        },
        { status: 415 }
      );
    }

    console.log(`[extract-answers] Processing: ${mimeType}, ${buffer.length} bytes`);

    const answers = await extractAnswersFromFile(buffer, mimeType);

    const result: AnswerExtractionResult = { answers };

    return NextResponse.json(
      {
        success: true,
        count: answers.length,
        multiPage: answers.filter((a) => a.regions.length > 1).length,
        noQuestionNumber: answers.filter((a) => a.questionNumber === null).length,
        result,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Answer extraction failed.';
    console.error('[Extract Answers API Error]:', message);

    if (isGeminiRateLimitError(error)) {
      const retryMatch = message.match(/retry in ([\d.]+)s/i);
      const retryAfter = retryMatch ? Math.max(1, Math.ceil(Number(retryMatch[1]))) : 60;
      return NextResponse.json(
        { success: false, error: message },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    // Return a 500 but never leak sensitive config
    return NextResponse.json(
      { success: false, error: message.includes('GEMINI_API_KEY') ? 'Server configuration error.' : message },
      { status: 500 }
    );
  }
}
