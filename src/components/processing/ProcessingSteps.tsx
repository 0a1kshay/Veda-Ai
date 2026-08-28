'use client';

import { Check, Loader2 } from 'lucide-react';

interface Step {
  id: string;
  label: string;
}

const STEPS: Step[] = [
  { id: 's1', label: 'Question paper uploaded' },
  { id: 's2', label: 'Answer sheet uploaded' },
  { id: 's3', label: 'Extracting questions' },
  { id: 's4', label: 'Reading handwritten answers' },
  { id: 's5', label: 'Mapping answers to questions' },
  { id: 's6', label: 'Preparing review workspace' },
];

interface ProcessingStepsProps {
  currentStep: number; // 0-based index of active step
}

export default function ProcessingSteps({ currentStep }: ProcessingStepsProps) {
  return (
    <div className="flex flex-col gap-2.5 w-full max-w-xs">
      {STEPS.map((step, i) => {
        const isDone = i < currentStep;
        const isActive = i === currentStep;
        const isPending = i > currentStep;

        return (
          <div
            key={step.id}
            className="flex items-center gap-3 transition-all duration-300"
            style={{ opacity: isPending ? 0.4 : 1 }}
          >
            {/* Icon */}
            <div
              className="w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 transition-all duration-300"
              style={{
                background: isDone
                  ? '#22C55E'
                  : isActive
                  ? '#F97316'
                  : '#E5E7EB',
              }}
            >
              {isDone ? (
                <Check style={{ width: 11, height: 11, color: 'white' }} strokeWidth={3} />
              ) : isActive ? (
                <Loader2
                  style={{ width: 11, height: 11, color: 'white' }}
                  className="animate-spin"
                />
              ) : (
                <div className="w-1.5 h-1.5 rounded-full bg-white opacity-60" />
              )}
            </div>

            {/* Label */}
            <span
              className="text-sm transition-all duration-300"
              style={{
                color: isDone ? '#15803D' : isActive ? '#F97316' : '#9CA3AF',
                fontWeight: isActive || isDone ? 500 : 400,
              }}
            >
              {step.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export { STEPS };
