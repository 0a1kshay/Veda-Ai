import { Question } from '@/types';

interface ScoreSummaryProps {
  questions?: Question[];
}

export default function ScoreSummary({ questions = [] }: ScoreSummaryProps) {
  const answered = questions.filter((q) => q.status !== 'unanswered' && q.status !== 'unmapped').length;
  const unanswered = questions.filter((q) => q.status === 'unanswered').length;
  const unmapped = questions.filter((q) => q.status === 'unmapped').length;

  const totalMarks = questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  const obtainedMarks = questions.reduce((sum, q) => sum + (q.obtainedMarks || 0), 0);
  const pct = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0;

  return (
    <div
      className="rounded-[20px] p-4 mb-3 transition-all"
      style={{
        background: 'linear-gradient(135deg, #FFF7ED 0%, #FFEEDD 100%)',
        border: '1px solid #FFDDD2',
        boxShadow: '0 2px 10px rgba(249,115,22,0.06)',
      }}
    >
      {/* Score row */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-[11px] font-extrabold uppercase tracking-wider text-[#C2540A]">
            Overall Score
          </p>
          <p className="text-2xl font-black mt-0.5 text-[#1C1C1E] tracking-tight">
            {obtainedMarks}
            <span className="text-sm font-semibold text-[#8E8E93] ml-1">
              / {totalMarks}
            </span>
          </p>
        </div>
        <div
          className="w-13 h-13 rounded-full flex items-center justify-center flex-shrink-0 shadow-md"
          style={{ background: '#F97316' }}
        >
          <span className="text-sm font-extrabold text-white">{pct}%</span>
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 rounded-full overflow-hidden mb-3 bg-[#FFDDD2]">
        <div
          className="h-full rounded-full transition-all duration-1000 ease-out"
          style={{ width: `${pct}%`, background: '#F97316' }}
        />
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-2 text-center bg-white/60 backdrop-blur-xs py-2 px-1 rounded-xl border border-white/80">
        <div>
          <p className="text-xs font-extrabold text-[#1C1C1E]">{answered}</p>
          <p className="text-[10px] font-semibold text-[#8E8E93]">Answered</p>
        </div>
        <div>
          <p className="text-xs font-extrabold text-[#B91C1C]">{unanswered}</p>
          <p className="text-[10px] font-semibold text-[#8E8E93]">Unanswered</p>
        </div>
        <div>
          <p className="text-xs font-extrabold text-[#7C3AED]">{unmapped}</p>
          <p className="text-[10px] font-semibold text-[#8E8E93]">Unmapped</p>
        </div>
      </div>
    </div>
  );
}
