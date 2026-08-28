import { NextResponse } from 'next/server';
import { extractQuestionsFromFile, isGeminiRateLimitError, toQuestions } from '@/lib/gemini';

export const maxDuration = 60; // Allow up to 60s for PDF/Vision processing

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const entry = formData.get('questionPaper');

    if (!entry) {
      return NextResponse.json(
        { success: false, error: 'No question paper file uploaded.' },
        { status: 400 }
      );
    }

    let buffer: Buffer;
    let mimeType = 'application/pdf';

    if (typeof entry === 'string') {
      buffer = Buffer.from(entry, 'utf-8');
    } else if (entry instanceof Blob) {
      if (typeof entry.arrayBuffer === 'function') {
        const ab = await entry.arrayBuffer();
        buffer = Buffer.from(ab);
      } else {
        const ab = await new Response(entry).arrayBuffer();
        buffer = Buffer.from(ab);
      }
      if (entry.type) {
        mimeType = entry.type;
      }
    } else if (typeof entry === 'object' && entry !== null) {
      const obj = entry as Record<string, unknown>;
      if (typeof obj.arrayBuffer === 'function') {
        const ab = await (obj.arrayBuffer as () => Promise<ArrayBuffer>)();
        buffer = Buffer.from(ab);
      } else if (typeof obj.bytes === 'function') {
        const b = await (obj.bytes as () => Promise<Uint8Array>)();
        buffer = Buffer.from(b);
      } else {
        const ab = await new Response(entry as unknown as BodyInit).arrayBuffer();
        buffer = Buffer.from(ab);
      }
      if (typeof obj.type === 'string' && obj.type) {
        mimeType = obj.type;
      }
    } else {
      return NextResponse.json(
        { success: false, error: 'Invalid file format received.' },
        { status: 400 }
      );
    }

    // Call Gemini Vision via server utility
    const extracted = await extractQuestionsFromFile(buffer, mimeType);
    const questions = toQuestions(extracted);

    return NextResponse.json(
      {
        success: true,
        count: questions.length,
        extracted,
        questions,
      },
      { status: 200 }
    );
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Question extraction failed.';
    console.error('[Extract Questions API Error]:', message);

    if (isGeminiRateLimitError(error)) {
      const retryMatch = message.match(/retry in ([\d.]+)s/i);
      const retryAfter = retryMatch ? Math.max(1, Math.ceil(Number(retryMatch[1]))) : 60;
      return NextResponse.json(
        { success: false, error: message },
        { status: 429, headers: { 'Retry-After': String(retryAfter) } }
      );
    }

    return NextResponse.json(
      {
        success: false,
        error: message,
      },
      { status: 500 }
    );
  }
}
