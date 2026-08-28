'use client';

import { X, FileText, Image } from 'lucide-react';
import { UploadedFile } from '@/types';

interface FileCardProps {
  file: UploadedFile;
  label: string;
  onRemove: () => void;
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function FileCard({ file, label, onRemove }: FileCardProps) {
  const isPdf = file.type === 'application/pdf';
  const Icon = isPdf ? FileText : Image;

  return (
    <div
      className="w-full bg-white rounded-2xl p-5 flex flex-col gap-4"
      style={{
        border: '1px solid #E5E7EB',
        boxShadow: '0 1px 3px 0 rgba(0,0,0,0.06)',
        animation: 'fadeSlideUp 0.3s ease-out',
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: '#6B7280' }}>
          {label}
        </span>
        <button
          onClick={onRemove}
          className="w-6 h-6 flex items-center justify-center rounded-full transition-colors hover:bg-red-50"
          style={{ color: '#9CA3AF' }}
          aria-label={`Remove ${label}`}
          onMouseEnter={(e) => (e.currentTarget.style.color = '#EF4444')}
          onMouseLeave={(e) => (e.currentTarget.style.color = '#9CA3AF')}
        >
          <X style={{ width: 13, height: 13 }} />
        </button>
      </div>

      {/* File row */}
      <div className="flex items-center gap-3.5">
        <div
          className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ background: '#FEF3EC' }}
        >
          <Icon style={{ width: 20, height: 20, color: '#F97316' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-sm truncate" style={{ color: '#1C1C1E' }}>{file.name}</p>
          <p className="text-xs mt-0.5" style={{ color: '#6B7280' }}>
            {formatBytes(file.size)} · {file.pages} {file.pages === 1 ? 'Page' : 'Pages'}
          </p>
        </div>
      </div>

      {/* Ready indicator */}
      <div
        className="flex items-center gap-2 rounded-lg px-3 py-2"
        style={{ background: '#F0FDF4', border: '1px solid #DCFCE7' }}
      >
        <div className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#22C55E' }} />
        <span className="text-xs font-medium" style={{ color: '#15803D' }}>Ready to process</span>
      </div>
    </div>
  );
}
