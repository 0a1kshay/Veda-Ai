'use client';

import { useState } from 'react';
import { Question, UnmappedAnswer } from '@/types';
import QuestionList from './QuestionList';
import AnswerViewer from './AnswerViewer';
import { FileText, FileImage } from 'lucide-react';

interface MappingWorkspaceProps {
  isMobile: boolean;
  questions?: Question[];
  unmappedAnswers?: UnmappedAnswer[];
  answerSheetFile?: File;
}

export default function MappingWorkspace({
  isMobile,
  questions,
  unmappedAnswers,
  answerSheetFile,
}: MappingWorkspaceProps) {
  const [selectedQuestion, setSelectedQuestion] = useState<Question | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [mobileTab, setMobileTab] = useState<'questions' | 'answer'>('questions');

  const handleSelectQuestion = (q: Question) => {
    setSelectedQuestion(q);
    if (q.answer?.pages?.[0]) {
      setCurrentPage(q.answer.pages[0].page);
    }
    if (isMobile) {
      setMobileTab('answer');
    }
  };

  if (isMobile) {
    return (
      <div className="flex flex-col h-full overflow-hidden">
        {/* Floating Capsule Segment Switcher (Target Image 2 Design) */}
        <div className="flex items-center p-1.5 rounded-full bg-white border border-gray-200/80 shadow-xs mb-2.5 flex-shrink-0">
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              mobileTab === 'questions'
                ? 'bg-[#2E2D2C] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 font-semibold'
            }`}
            onClick={() => setMobileTab('questions')}
          >
            <FileText style={{ width: 14, height: 14 }} />
            Questions
          </button>
          <button
            className={`flex-1 flex items-center justify-center gap-2 py-2 px-4 rounded-full text-xs font-extrabold transition-all cursor-pointer ${
              mobileTab === 'answer'
                ? 'bg-[#2E2D2C] text-white shadow-xs'
                : 'text-gray-600 hover:text-gray-900 font-semibold'
            }`}
            onClick={() => setMobileTab('answer')}
          >
            <FileImage style={{ width: 14, height: 14 }} />
            Answer Sheet
          </button>
        </div>

        {/* Content Panel */}
        <div className="flex-1 overflow-hidden">
          {mobileTab === 'questions' ? (
            <div className="h-full bg-white rounded-[28px] border border-gray-200/80 shadow-sm overflow-hidden mb-1">
              <QuestionList
                questions={questions}
                unmappedAnswers={unmappedAnswers}
                selectedId={selectedQuestion?.id ?? null}
                onSelectQuestion={handleSelectQuestion}
              />
            </div>
          ) : (
            <div className="h-full bg-white rounded-[28px] border border-gray-200/80 shadow-sm overflow-hidden mb-1">
              <AnswerViewer
                selectedQuestion={selectedQuestion}
                currentPage={currentPage}
                onPageChange={setCurrentPage}
                answerSheetFile={answerSheetFile}
              />
            </div>
          )}
        </div>
      </div>
    );
  }

  // Desktop: two floating card panels side-by-side with smooth spacing
  return (
    <div className="flex h-full overflow-hidden gap-3 pb-1">
      {/* Left panel — Questions (Floating Card) */}
      <div
        className="flex flex-col overflow-hidden bg-white rounded-[24px] border border-[#E5E7EB]/80 shadow-xs"
        style={{
          width: 380,
          minWidth: 320,
          maxWidth: 420,
          flexShrink: 0,
        }}
      >
        <QuestionList
          questions={questions}
          unmappedAnswers={unmappedAnswers}
          selectedId={selectedQuestion?.id ?? null}
          onSelectQuestion={handleSelectQuestion}
        />
      </div>

      {/* Right panel — Answer Viewer (Floating Card) */}
      <div className="flex-1 flex flex-col overflow-hidden bg-white rounded-[24px] border border-[#E5E7EB]/80 shadow-xs">
        <AnswerViewer
          selectedQuestion={selectedQuestion}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          answerSheetFile={answerSheetFile}
        />
      </div>
    </div>
  );
}
