'use client';

import { useCallback, useRef, useState } from 'react';
import { AlertCircle } from 'lucide-react';

interface UploadCardProps {
  label: 'Question Paper' | 'Answer Sheet';
  onFileSelect: (file: File) => void;
}

const ACCEPTED_TYPES = ['application/pdf', 'image/png', 'image/jpeg', 'image/jpg'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024;

export default function UploadCard({ label, onFileSelect }: UploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validate = (file: File): string | null => {
    if (!ACCEPTED_TYPES.includes(file.type)) return 'Only PDF, PNG, or JPG files are accepted.';
    if (file.size > MAX_SIZE_BYTES) return 'File must be under 10 MB.';
    return null;
  };

  const handleFile = useCallback(
    (file: File) => {
      const err = validate(file);
      if (err) { setError(err); return; }
      setError(null);
      onFileSelect(file);
    },
    [onFileSelect]
  );

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  return (
    <button
      type="button"
      className="w-full h-full min-h-[160px] flex flex-col items-center justify-center gap-3 p-5 rounded-[24px] bg-white cursor-pointer select-none transition-all duration-200 group border-0 outline-none shadow-sm hover:shadow-md"
      style={{
        backgroundImage: isDragging
          ? `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='24' ry='24' stroke='%23F97316' stroke-width='2' stroke-dasharray='8%2c 6' stroke-dashoffset='0' stroke-linecap='round'/%3e%3c/svg%3e")`
          : `url("data:image/svg+xml,%3csvg width='100%25' height='100%25' xmlns='http://www.w3.org/2000/svg'%3e%3crect width='100%25' height='100%25' fill='none' rx='24' ry='24' stroke='%23E5E7EB' stroke-width='2' stroke-dasharray='8%2c 6' stroke-dashoffset='0' stroke-linecap='round'/%3e%3c/svg%3e")`,
        backgroundColor: isDragging ? '#FFEFEB' : '#FFFFFF',
        transform: isDragging ? 'scale(1.02)' : 'scale(1)',
      }}
      onDrop={onDrop}
      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
      onDragLeave={() => setIsDragging(false)}
      onClick={() => inputRef.current?.click()}
      aria-label={`Upload ${label}`}
    >
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,.png,.jpg,.jpeg"
        className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
        aria-label={`File input for ${label}`}
      />

      {/* Upload bracket-arrow icon inside solid peach rounded container (matches crop perfectly) */}
      <div
        className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all duration-200"
        style={{
          background: '#FFEFEB',
          border: '1.5px solid #FFDDD2',
        }}
      >
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#F97316" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      {/* Label Text */}
      <div className="text-center">
        <p className="font-bold text-sm tracking-tight" style={{ color: '#1C1C1E' }}>
          {isDragging ? (
            <span className="text-[#F97316]">Drop to upload</span>
          ) : (
            <>
              Upload <span className="text-[#F97316]">{label}</span>
            </>
          )}
        </p>
        <p className="text-[11px] mt-1.5 font-semibold text-[#8E8E93] tracking-wide">
          Max 10MB
        </p>
      </div>

      {/* Error */}
      {error && (
        <div
          className="flex items-center gap-1.5 text-xs rounded-lg px-3 py-2 mt-2"
          style={{ color: '#B91C1C', background: '#FEF2F2', border: '1px solid #FECACA' }}
        >
          <AlertCircle style={{ width: 13, height: 13, flexShrink: 0 }} />
          <span>{error}</span>
        </div>
      )}
    </button>
  );
}
