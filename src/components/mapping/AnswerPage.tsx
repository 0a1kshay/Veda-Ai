'use client';

import { useEffect, useRef, useState } from 'react';
import { AnswerRegion } from '@/types';

// Virtual coordinate space — bboxes from Gemini are normalized 0-1000,
// then converted to PAGE_W/PAGE_H in mapping.ts before arriving here.
export const PAGE_W = 700;
export const PAGE_H = 990;

interface AnswerPageProps {
  pageNumber: number;
  zoom: number;
  activeRegions: AnswerRegion[];
  selectedQuestionNumber: string | null;
  answerSheetFile?: File;
  onTotalPagesDetected?: (total: number) => void;
}

interface PdfDocument {
  numPages: number;
  getPage: (pageNumber: number) => Promise<{
    getViewport: (params: { scale: number }) => { width: number; height: number };
    render: (params: { canvasContext: CanvasRenderingContext2D; viewport: unknown }) => { promise: Promise<void> };
  }>;
}

// Keep a module-level cache so we don't re-parse the same PDF on every render
const pdfCache = new Map<string, PdfDocument>();

export default function AnswerPage({
  pageNumber,
  zoom,
  activeRegions,
  selectedQuestionNumber,
  answerSheetFile,
  onTotalPagesDetected,
}: AnswerPageProps) {
  const scale = zoom / 100;
  const [pageImageUrl, setPageImageUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let active = true;

    // Defer state updates and asynchronous execution to the next tick
    const timer = setTimeout(() => {
      const load = async () => {
        if (!answerSheetFile) {
          setPageImageUrl(null);
          setIsLoading(false);
          setError(null);
          return;
        }

        setIsLoading(true);
        setError(null);

        // Revoke the previous blob URL to avoid memory leaks
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }

        try {
          const mime = answerSheetFile.type;

          if (mime === 'application/pdf') {
            // PDF rendering via pdfjs-dist
            const pdfModule = await import('pdfjs-dist/legacy/build/pdf.js');
            type PdfLib = {
              GlobalWorkerOptions: { workerSrc: string };
              getDocument: (params: { data: Uint8Array }) => { promise: Promise<PdfDocument> };
            };
            const pdfjsLib = ((pdfModule as unknown as { default?: PdfLib }).default ?? pdfModule) as unknown as PdfLib;

            if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
              pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.js';
            }

            // Use cache to avoid re-parsing the same file
            const cacheKey = `${answerSheetFile.name}-${answerSheetFile.size}-${answerSheetFile.lastModified}`;
            let pdfDoc = pdfCache.get(cacheKey);
            if (!pdfDoc) {
              const arrayBuffer = await answerSheetFile.arrayBuffer();
              pdfDoc = await pdfjsLib.getDocument({ data: new Uint8Array(arrayBuffer) }).promise;
              pdfCache.set(cacheKey, pdfDoc);
            }

            if (active) {
              onTotalPagesDetected?.(pdfDoc.numPages);
              const targetPage = Math.min(Math.max(1, pageNumber), pdfDoc.numPages);
              const pdfPage = await pdfDoc.getPage(targetPage);

              // Render at 2x for crisp text, then CSS downscales it
              const viewport = pdfPage.getViewport({ scale: 2.0 });
              const canvas = document.createElement('canvas');
              canvas.width = viewport.width;
              canvas.height = viewport.height;
              const ctx = canvas.getContext('2d')!;
              await pdfPage.render({ canvasContext: ctx, viewport }).promise;

              if (active) {
                const dataUrl = canvas.toDataURL('image/png');
                setPageImageUrl(dataUrl);
              }
            }
          } else if (mime.startsWith('image/')) {
            // Image files (jpg, png, webp)
            if (active) {
              onTotalPagesDetected?.(1);
              const blobUrl = URL.createObjectURL(answerSheetFile);
              blobUrlRef.current = blobUrl;
              setPageImageUrl(blobUrl);
            }
          } else {
            if (active) {
              setError(`Unsupported file type: ${mime}. Please upload a PDF or image.`);
            }
          }
        } catch (e) {
          console.error('[AnswerPage] render error', e);
          if (active) {
            setError('Could not render the answer sheet. Please try re-uploading.');
          }
        } finally {
          if (active) {
            setIsLoading(false);
          }
        }
      };

      load();
    }, 0);

    return () => {
      active = false;
      clearTimeout(timer);
      if (blobUrlRef.current) {
        URL.revokeObjectURL(blobUrlRef.current);
        blobUrlRef.current = null;
      }
    };
  }, [answerSheetFile, pageNumber, onTotalPagesDetected]);

  return (
    <div
      className="relative mx-auto shadow-lg"
      style={{
        width: PAGE_W * scale,
        minHeight: PAGE_H * scale,
        background: 'white',
        borderRadius: 4,
        overflow: 'visible',
        flexShrink: 0,
        border: '1px solid #E5E7EB',
      }}
    >
      {/* Loading spinner */}
      {isLoading && (
        <div
          className="absolute inset-0 flex items-center justify-center rounded"
          style={{ background: '#F9FAFB', minHeight: PAGE_H * scale }}
        >
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-4 border-orange-200 border-t-orange-500 rounded-full animate-spin" />
            <span className="text-xs text-gray-400 font-medium">Rendering page {pageNumber}...</span>
          </div>
        </div>
      )}

      {/* Error state */}
      {error && !isLoading && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded px-8 text-center"
          style={{ background: '#FEF2F2', minHeight: PAGE_H * scale }}
        >
          <span className="text-2xl">⚠️</span>
          <p className="text-sm text-red-500 font-medium">{error}</p>
        </div>
      )}

      {/* No file uploaded placeholder */}
      {!answerSheetFile && !isLoading && !error && (
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-3 rounded"
          style={{
            background: '#FAFAFA',
            border: '2px dashed #E5E7EB',
            minHeight: PAGE_H * scale,
          }}
        >
          <div className="text-4xl">📄</div>
          <p className="text-sm text-gray-400 font-medium">Upload an answer sheet to view it here</p>
          <p className="text-xs text-gray-300">Supports PDF and image files</p>
        </div>
      )}

      {/* Real document rendered as image */}
      {pageImageUrl && !isLoading && !error && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={pageImageUrl}
          alt={`Answer sheet page ${pageNumber}`}
          draggable={false}
          style={{
            display: 'block',
            width: PAGE_W * scale,
            height: 'auto',
            minHeight: PAGE_H * scale,
            borderRadius: 4,
            userSelect: 'none',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Highlight overlays */}
      {pageImageUrl && !isLoading && !error &&
        activeRegions.map((region, i) => (
          <div
            key={i}
            className="absolute pointer-events-none"
            style={{
              left: region.x * scale,
              top: region.y * scale,
              width: region.width * scale,
              height: region.height * scale,
              border: `${Math.max(2, 2 * scale)}px solid #22C55E`,
              borderRadius: 8 * scale,
              background: 'rgba(34, 197, 94, 0.10)',
              boxShadow: '0 0 0 3px rgba(34,197,94,0.15)',
              zIndex: 20,
              animation: 'highlight_appear 0.3s ease-out forwards',
            }}
          >
            {/* Label pill */}
            {selectedQuestionNumber && (
              <div
                style={{
                  position: 'absolute',
                  top: -24 * Math.max(scale, 0.8),
                  left: 0,
                  background: '#22C55E',
                  color: 'white',
                  fontSize: Math.max(10, 11 * scale),
                  fontWeight: 700,
                  padding: `${2 * scale}px ${7 * scale}px`,
                  borderRadius: 4 * scale,
                  whiteSpace: 'nowrap',
                  fontFamily: 'sans-serif',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              >
                {selectedQuestionNumber.startsWith('Q')
                  ? selectedQuestionNumber
                  : `Q${selectedQuestionNumber}`}
              </div>
            )}
          </div>
        ))}
    </div>
  );
}
