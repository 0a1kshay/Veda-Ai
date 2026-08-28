'use client';

import { useEffect, useRef, useState } from 'react';
import { Question, AnswerRegion } from '@/types';
import AnswerToolbar from './AnswerToolbar';
import AnswerPage from './AnswerPage';
import { FileImage, X } from 'lucide-react';

interface AnswerViewerProps {
  selectedQuestion: Question | null;
  currentPage: number;
  onPageChange: (page: number) => void;
  answerSheetFile?: File;
}

export default function AnswerViewer({
  selectedQuestion,
  currentPage,
  onPageChange,
  answerSheetFile,
}: AnswerViewerProps) {
  const [zoom, setZoom] = useState(100);
  const [totalPages, setTotalPages] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // When a new question is selected, navigate to its first page
  const firstPage = selectedQuestion?.answer?.pages?.[0]?.page;
  useEffect(() => {
    if (firstPage) {
      onPageChange(firstPage);
    }
  }, [selectedQuestion?.id, firstPage, onPageChange]);

  // Handle ESC key to exit fullscreen mode cleanly
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
        setZoom(100);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isFullscreen]);

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      setZoom(next ? 125 : 100);
      return next;
    });
  };

  const handleFitToScreen = () => setZoom(100);

  // Regions for the selected question on the current page
  const allQuestionPages = selectedQuestion?.answer?.pages ?? [];
  const isMultiPage = allQuestionPages.length > 1;
  const activeRegions: AnswerRegion[] = allQuestionPages.filter((p) => p.page === currentPage);

  // Determine part index for multi-page answers
  const currentPartIndex = allQuestionPages.findIndex((p) => p.page === currentPage);
  const regionLabel =
    isMultiPage && currentPartIndex !== -1
      ? `Q${selectedQuestion?.number} (Part ${currentPartIndex + 1}/${allQuestionPages.length})`
      : selectedQuestion?.number
      ? `Q${selectedQuestion.number}`
      : null;

  return (
    <div
      className={
        isFullscreen
          ? 'fixed inset-0 z-50 bg-[#1C1C1E] flex flex-col overflow-hidden animate-in fade-in duration-200'
          : 'flex flex-col h-full overflow-hidden'
      }
    >
      {/* Header */}
      <div
        className={`px-5 py-3.5 flex-shrink-0 border-b ${
          isFullscreen
            ? 'bg-[#2E2D2C] border-gray-800 text-white'
            : 'bg-white border-gray-100 text-[#1C1C1E]'
        }`}
      >
        <div className="flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2 mb-0.5">
              <FileImage style={{ width: 16, height: 16, color: '#F97316' }} />
              <h2 className="font-extrabold text-sm">
                Answer Sheet Viewer {isFullscreen ? '(Full Screen View)' : ''}
              </h2>
            </div>
            <p className={`text-xs font-medium ${isFullscreen ? 'text-gray-400' : 'text-[#8E8E93]'}`}>
              {selectedQuestion
                ? `Viewing answer for Q${selectedQuestion.number}`
                : "Select a question from the left panel to locate and highlight the student's answer"}
            </p>
          </div>

          <div className="flex items-center gap-3">
            {/* Multi-page answer navigation pills */}
            {isMultiPage && (
              <div className="flex items-center gap-1.5 bg-orange-50 border border-orange-200 px-2.5 py-1 rounded-xl">
                <span className="text-[11px] font-bold text-orange-800">
                  Multi-Page Answer (${allQuestionPages.length} pages):
                </span>
                {allQuestionPages.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => onPageChange(p.page)}
                    className={`text-[11px] px-2.5 py-0.5 rounded-lg font-bold transition-all cursor-pointer ${
                      currentPage === p.page
                        ? 'bg-orange-600 text-white shadow-xs'
                        : 'bg-white text-orange-700 hover:bg-orange-100 border border-orange-300'
                    }`}
                  >
                    Page {p.page} (Part {idx + 1})
                  </button>
                ))}
              </div>
            )}

            {/* Exit Fullscreen Button */}
            {isFullscreen && (
              <button
                onClick={toggleFullscreen}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-orange-600 text-white text-xs font-extrabold hover:bg-orange-700 transition-colors cursor-pointer shadow-sm"
              >
                <X className="w-3.5 h-3.5" />
                <span>Exit Full Screen</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Toolbar */}
      <AnswerToolbar
        currentPage={currentPage}
        totalPages={totalPages}
        zoom={zoom}
        onPageChange={onPageChange}
        onZoomChange={setZoom}
        onFitToScreen={handleFitToScreen}
        isFullscreen={isFullscreen}
        onToggleFullscreen={toggleFullscreen}
      />

      {/* Page viewer canvas */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto flex flex-col items-center p-6"
        style={{
          background: isFullscreen
            ? '#2A2A2E'
            : 'radial-gradient(circle at center, #FAFAFB 0%, #E5E5E9 100%)',
        }}
      >
        {/* Unanswered hint */}
        {selectedQuestion?.status === 'unanswered' && (
          <div
            className="mb-4 w-full max-w-[700px] flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold shadow-xs"
            style={{
              background: '#FEF2F2',
              border: '1px solid #FECACA',
              color: '#B91C1C',
            }}
          >
            <span className="text-base">⚠️</span>
            <span>
              Question {selectedQuestion.number} was not attempted by the student — no answer region to
              highlight.
            </span>
          </div>
        )}

        {/* Unmapped hint */}
        {selectedQuestion?.status === 'unmapped' && (
          <div
            className="mb-4 w-full max-w-[700px] flex items-center gap-2.5 px-4 py-3 rounded-2xl text-xs font-semibold shadow-xs"
            style={{
              background: '#F5F3FF',
              border: '1px solid #DDD6FE',
              color: '#6D28D9',
            }}
          >
            <span className="text-base">⚠️</span>
            <span>Answer detected with ambiguous mapping. Review the highlighted region below.</span>
          </div>
        )}

        <AnswerPage
          pageNumber={currentPage}
          zoom={zoom}
          activeRegions={activeRegions}
          selectedQuestionNumber={regionLabel}
          answerSheetFile={answerSheetFile}
          onTotalPagesDetected={setTotalPages}
        />
      </div>
    </div>
  );
}
