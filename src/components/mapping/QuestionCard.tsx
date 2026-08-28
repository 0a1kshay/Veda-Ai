'use client';

import { ChevronDown, ChevronUp, Sparkles, MapPin, AlertTriangle } from 'lucide-react';
import { Question } from '@/types';
import StatusBadge from '@/components/shared/StatusBadge';

interface QuestionCardProps {
  question: Question;
  isSelected: boolean;
  isExpanded: boolean;
  onSelect: () => void;
  onToggleExpand: () => void;
}

export default function QuestionCard({
  question,
  isSelected,
  isExpanded,
  onSelect,
  onToggleExpand,
}: QuestionCardProps) {
  const hasAnswer = question.answer !== null;
  const isUnanswered = question.status === 'unanswered';
  const isUnmapped = question.status === 'unmapped';

  return (
    <div
      className="rounded-2xl overflow-hidden transition-all duration-200 cursor-pointer"
      style={{
        background: isSelected ? '#FFFBF7' : 'white',
        border: isSelected
          ? '2px solid #F97316'
          : '1px solid #E5E7EB',
        boxShadow: isSelected
          ? '0 2px 10px rgba(249,115,22,0.12)'
          : '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* Main row — click to select */}
      <div
        className="p-4"
        onClick={onSelect}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onSelect(); }}
      >
        {/* Top bar: Question number circle on left, Marks & Chevron on right (Matching Image 2 Target) */}
        <div className="flex items-center justify-between">
          <div
            className="w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-extrabold shadow-xs"
            style={{
              background: isSelected ? '#F97316' : '#374151',
              color: 'white',
            }}
          >
            {question.number.length <= 2 ? question.number : question.number.replace(/[()]/g, '')}
          </div>

          <div className="flex items-center gap-2">
            <StatusBadge
              status={question.status}
              obtained={question.obtainedMarks}
              total={question.marks}
              compact
            />
            {isUnmapped && (
              <span
                className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border border-orange-200"
                style={{ background: '#FFF7ED', color: '#C2540A' }}
              >
                <AlertTriangle style={{ width: 9, height: 9 }} />
                Review needed
              </span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
              className="w-7 h-7 flex items-center justify-center rounded-full flex-shrink-0 transition-colors hover:bg-gray-100 cursor-pointer"
              style={{ color: '#8E8E93' }}
              aria-label={isExpanded ? 'Collapse feedback' : 'Show AI feedback'}
              aria-expanded={isExpanded}
            >
              {isExpanded
                ? <ChevronUp style={{ width: 14, height: 14 }} />
                : <ChevronDown style={{ width: 14, height: 14 }} />
              }
            </button>
          </div>
        </div>

        {/* Question Text */}
        <p
          className="text-xs leading-snug line-clamp-2 mt-2.5"
          style={{ color: '#1C1C1E', fontWeight: 600 }}
        >
          {question.text}
        </p>

        {/* Sub-question label & page info */}
        <div className="flex items-center justify-between mt-2 flex-wrap text-[10px] text-[#8E8E93]">
          {question.number.includes('(') ? (
            <span>Sub-question {question.number}</span>
          ) : <span />}

          {hasAnswer && !isUnanswered && (
            <span className="inline-flex items-center gap-1 font-medium">
              <MapPin style={{ width: 10, height: 10 }} />
              {question.answer!.pages.length > 1
                ? `Pages ${question.answer!.pages.map((p) => p.page).join(', ')}`
                : `Page ${question.answer!.pages[0].page}`}
            </span>
          )}
        </div>
      </div>

      {/* Expanded feedback */}
      {isExpanded && (
        <div
          className="px-4 pb-4 pt-0"
          style={{ borderTop: '1px solid #F3F4F6' }}
        >
          <div
            className="rounded-xl p-3.5 mt-3 border border-[#F3EFEA]"
            style={{ background: '#FAF8F5' }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles style={{ width: 13, height: 13, color: '#F97316' }} />
              <span className="text-xs font-extrabold text-[#F97316]">
                AI Feedback
              </span>
            </div>
            <p className="text-xs leading-relaxed font-medium text-[#374151]">
              {question.feedback}
            </p>
          </div>

          {/* Marks detail */}
          {question.status !== 'unanswered' && (
            <div className="flex items-center justify-between mt-3 px-1">
              <span className="text-xs font-semibold text-[#8E8E93]">Marks awarded</span>
              <span className="text-xs font-extrabold text-[#1C1C1E]">
                {question.obtainedMarks} / {question.marks}
              </span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
