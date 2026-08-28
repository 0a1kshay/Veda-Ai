'use client';

import { QuestionStatus } from '@/types';
import { CheckCircle2, AlertCircle, XCircle, MinusCircle, AlertTriangle } from 'lucide-react';

interface StatusBadgeProps {
  status: QuestionStatus;
  obtained: number;
  total: number;
  compact?: boolean;
}

const statusConfig = {
  correct: {
    label: 'Correct',
    bg: '#F0FDF4',
    text: '#15803D',
    border: '#BBF7D0',
    Icon: CheckCircle2,
  },
  partial: {
    label: 'Partial',
    bg: '#FFFBEB',
    text: '#B45309',
    border: '#FDE68A',
    Icon: AlertCircle,
  },
  incorrect: {
    label: 'Incorrect',
    bg: '#FEF2F2',
    text: '#B91C1C',
    border: '#FECACA',
    Icon: XCircle,
  },
  unanswered: {
    label: 'Not answered',
    bg: '#F9FAFB',
    text: '#6B7280',
    border: '#E5E7EB',
    Icon: MinusCircle,
  },
  unmapped: {
    label: 'Unmapped',
    bg: '#F5F3FF',
    text: '#7C3AED',
    border: '#DDD6FE',
    Icon: AlertTriangle,
  },
} as const;

export default function StatusBadge({ status, obtained, total, compact = false }: StatusBadgeProps) {
  const cfg = statusConfig[status];
  const Icon = cfg.Icon;

  const label =
    status === 'unanswered'
      ? 'Not answered'
      : status === 'unmapped'
      ? 'Unmapped'
      : `${obtained}/${total}`;

  return (
    <span
      className={`inline-flex items-center gap-1 font-semibold rounded-full border ${compact ? 'px-2 py-0.5 text-xs' : 'px-2.5 py-1 text-xs'}`}
      style={{ background: cfg.bg, color: cfg.text, borderColor: cfg.border }}
      role="status"
      aria-label={`${cfg.label}: ${label}`}
    >
      <Icon style={{ width: compact ? 11 : 12, height: compact ? 11 : 12 }} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
