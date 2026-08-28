import { useState } from 'react';
import { Question, UnmappedAnswer } from '@/types';
import { convertGeminiBboxToPageRegion } from '@/lib/mapping';
import ScoreSummary from './ScoreSummary';
import QuestionCard from './QuestionCard';
import { FileText, AlertTriangle, MapPin } from 'lucide-react';

interface QuestionListProps {
  questions?: Question[];
  unmappedAnswers?: UnmappedAnswer[];
  selectedId: string | null;
  onSelectQuestion: (q: Question) => void;
}

export default function QuestionList({
  questions = [],
  unmappedAnswers = [],
  selectedId,
  onSelectQuestion,
}: QuestionListProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const toggleExpand = (id: string) => {
    setExpandedId((prev) => (prev === id ? null : id));
  };

  const handleSelectUnmapped = (ua: UnmappedAnswer) => {
    const pages = ua.regions.map((r) => convertGeminiBboxToPageRegion(r.page, r.bbox));
    const pseudoQuestion: Question = {
      id: `unmapped-${ua.answerId}`,
      number: ua.questionNumber || 'Unlabeled',
      text: ua.text || 'Extra student answer not matching question paper.',
      marks: 0,
      obtainedMarks: 0,
      status: 'unmapped',
      feedback: ua.reason || 'Answer detected on answer sheet but no matching question on question paper.',
      answer: pages.length > 0 ? { pages } : null,
    };
    onSelectQuestion(pseudoQuestion);
  };

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div
        className="px-5 pt-4 pb-3 flex-shrink-0 bg-white border-b border-gray-100"
        style={{ borderBottom: '1px solid #F3F4F6' }}
      >
        <div className="flex items-center gap-2 mb-0.5">
          <FileText style={{ width: 15, height: 15, color: '#F97316' }} />
          <h2 className="font-bold text-sm" style={{ color: '#1C1C1E' }}>
            Extracted Questions
          </h2>
        </div>
        <p className="text-xs" style={{ color: '#9CA3AF' }}>
          From question paper · {questions.length} questions
        </p>
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-5 py-4 flex flex-col gap-3.5">
        <ScoreSummary questions={questions} />

        <div className="flex flex-col gap-2">
          {questions.map((q) => (
            <QuestionCard
              key={q.id}
              question={q}
              isSelected={selectedId === q.id}
              isExpanded={expandedId === q.id}
              onSelect={() => onSelectQuestion(q)}
              onToggleExpand={() => toggleExpand(q.id)}
            />
          ))}
        </div>

        {/* Unmapped Extra Answers Section */}
        {unmappedAnswers.length > 0 && (
          <div className="mt-4 pt-3 border-t border-gray-200">
            <div className="flex items-center gap-1.5 mb-2 px-1">
              <AlertTriangle className="w-3.5 h-3.5 text-purple-600" />
              <span className="text-xs font-bold text-purple-900 uppercase tracking-wider">
                Unmapped Student Answers ({unmappedAnswers.length})
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {unmappedAnswers.map((ua) => {
                const isSelected = selectedId === `unmapped-${ua.answerId}`;
                const firstPage = ua.regions[0]?.page ?? 1;
                return (
                  <div
                    key={ua.answerId}
                    onClick={() => handleSelectUnmapped(ua)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer ${
                      isSelected
                        ? 'border-purple-500 bg-purple-50 shadow-xs'
                        : 'border-purple-200 bg-white hover:border-purple-300'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-purple-100 text-purple-800">
                          {ua.questionNumber ? `Q${ua.questionNumber}` : 'Unlabeled'}
                        </span>
                        <span className="text-xs font-semibold text-gray-800">
                          {ua.section || 'Extraneous Answer'}
                        </span>
                      </div>
                      <span className="flex items-center gap-1 text-[11px] text-gray-500">
                        <MapPin className="w-3 h-3" />
                        Page {firstPage}
                      </span>
                    </div>
                    <p className="text-xs text-gray-600 line-clamp-2 mt-1.5 font-sans">
                      {ua.text}
                    </p>
                    <p className="text-[10px] text-purple-700 font-medium mt-1">
                      ⚠️ {ua.reason || 'Not found on question paper. Click to inspect region.'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Bottom padding */}
        <div className="h-4" />
      </div>
    </div>
  );
}
