'use client';

import { useCallback, useState } from 'react';
import { UploadedFile } from '@/types';
import UploadCard from './UploadCard';
import FileCard from './FileCard';

interface UploadScreenProps {
  onStartMapping: (questionPaper: File, answerSheet: File) => void;
}

function mockFile(file: File): UploadedFile {
  const sizeInKB = file.size / 1024;
  const pages = file.type === 'application/pdf'
    ? Math.max(1, Math.round(sizeInKB / 100))
    : 1;
  return { name: file.name, size: file.size, pages, type: file.type, file };
}

function Illustration() {
  return (
    <div
      className="relative flex items-center justify-center select-none"
      style={{ width: 256, height: 256 }}
    >
      {/* Layer 0: Large soft peach outer fill */}
      <div
        className="absolute rounded-full"
        style={{ width: 240, height: 240, background: '#FBEBE5', zIndex: 0 }}
      />

      {/* Layer 1: Coral/salmon ring */}
      <div
        className="absolute rounded-full"
        style={{ width: 216, height: 216, border: '6px solid #F5B4A1', background: 'transparent', zIndex: 1 }}
      />

      {/* Layer 2: White inner circle — MUST be clearly visible */}
      <div
        className="absolute rounded-full bg-white"
        style={{ width: 172, height: 172, zIndex: 2, boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}
      />

      {/* Layer 5: Teacher — fits inside the white circle, shows head+upper body */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/teacher_avatar_hd.jpg"
        alt="3D Teacher Avatar"
        style={{
          position: 'absolute',
          zIndex: 5,
          width: 150,
          height: 172,
          objectFit: 'cover',
          objectPosition: 'center 12%',
          borderRadius: '50%',
          clipPath: 'ellipse(50% 50% at 50% 50%)',
        }}
      />

      {/* Layer 20: Orbiting badges — on the coral ring diameter, continuously spinning */}
      <div
        className="absolute rounded-full animate-spin-slow pointer-events-none"
        style={{ width: 216, height: 216, zIndex: 20 }}
      >
        {/* Top (12 o'clock) — Clock */}
        <div
          className="absolute w-9 h-9 rounded-full bg-[#F97316] border-2 border-white shadow-lg flex items-center justify-center"
          style={{ top: '-18px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="animate-spin-slow-reverse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
            </svg>
          </div>
        </div>

        {/* Left (9 o'clock) — Checklist */}
        <div
          className="absolute w-9 h-9 rounded-full bg-[#F97316] border-2 border-white shadow-lg flex items-center justify-center"
          style={{ left: '-18px', top: '50%', transform: 'translateY(-50%)' }}
        >
          <div className="animate-spin-slow-reverse">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round">
              <line x1="9" y1="9" x2="15" y2="9" /><line x1="9" y1="13" x2="15" y2="13" /><rect x="5" y="5" width="14" height="14" rx="1.5" />
            </svg>
          </div>
        </div>

        {/* Right (3 o'clock) — Cloud */}
        <div
          className="absolute w-9 h-9 rounded-full bg-[#F97316] border-2 border-white shadow-lg flex items-center justify-center"
          style={{ right: '-18px', top: '50%', transform: 'translateY(-50%)' }}
        >
          <div className="animate-spin-slow-reverse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <path d="M17.5 19A3.5 3.5 0 0 0 21 15.5c0-2.79-2.54-4.5-5-4.5-.42 0-.83.05-1.23.14A6 6 0 0 0 3 13.5a3.5 3.5 0 0 0 3.5 3.5h11z" />
              <polyline points="12 10 12 16 12 10" /><polyline points="9 13 12 10 15 13" />
            </svg>
          </div>
        </div>

        {/* Bottom (6 o'clock) — Gear */}
        <div
          className="absolute w-9 h-9 rounded-full bg-[#F97316] border-2 border-white shadow-lg flex items-center justify-center"
          style={{ bottom: '-18px', left: '50%', transform: 'translateX(-50%)' }}
        >
          <div className="animate-spin-slow-reverse">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </div>
        </div>
      </div>
    </div>
  );
}



export default function UploadScreen({ onStartMapping }: UploadScreenProps) {
  const [questionPaper, setQuestionPaper] = useState<UploadedFile | null>(null);
  const [answerSheet, setAnswerSheet] = useState<UploadedFile | null>(null);

  const handleQP = useCallback((f: File) => setQuestionPaper(mockFile(f)), []);
  const handleAS = useCallback((f: File) => setAnswerSheet(mockFile(f)), []);

  const bothReady = !!(questionPaper && answerSheet);

  return (
    <div
      className="flex-1 flex flex-col items-center overflow-y-auto px-6 page-enter"
      style={{ background: 'transparent' }}
    >
      {/* Inner wrapper — auto top/bottom margin centers when content is shorter than viewport */}
      <div className="w-full flex flex-col items-center my-auto py-6 gap-5">

        {/* Heading */}
        <div className="text-center max-w-4xl flex flex-col items-center gap-1">
          <h1 className="text-2xl md:text-[32px] font-extrabold leading-tight tracking-tight text-[#1C1C1E] flex items-center justify-center gap-2 flex-wrap">
            <span>Upload</span>
            <span
              className="px-4 py-1.5 rounded-3xl inline-block shadow-sm"
              style={{ background: '#FFEFEB', color: '#F97316', border: '1px solid #FFDDD2' }}
            >
              Question Paper &amp; Answer Sheets
            </span>
          </h1>
          <p className="text-sm mt-1 text-[#8E8E93] font-semibold tracking-wide">
            Upload both files to get started
          </p>
        </div>

        {/* Illustration */}
        <Illustration />

        {/* Upload Cards Container (outer background card wrapping both upload cards) */}
        <div className="w-full max-w-2xl p-4 sm:p-5 rounded-[32px] bg-white/40 border border-white/60 shadow-xs backdrop-blur-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center justify-center">
            {questionPaper ? (
              <FileCard file={questionPaper} label="Question Paper" onRemove={() => setQuestionPaper(null)} />
            ) : (
              <UploadCard label="Question Paper" onFileSelect={handleQP} />
            )}
            {answerSheet ? (
              <FileCard file={answerSheet} label="Answer Sheet" onRemove={() => setAnswerSheet(null)} />
            ) : (
              <UploadCard label="Answer Sheet" onFileSelect={handleAS} />
            )}
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col items-center gap-2 w-full">
          <button
            onClick={bothReady ? () => onStartMapping(questionPaper.file, answerSheet.file) : undefined}
            disabled={!bothReady}
            className="flex items-center justify-center gap-1.5 px-9 py-3 rounded-full font-bold text-sm transition-all duration-300"
            style={{
              background: bothReady ? '#F97316' : '#C5C5C7',
              color: 'white',
              cursor: bothReady ? 'pointer' : 'not-allowed',
              minWidth: '220px',
              boxShadow: bothReady ? '0 4px 14px rgba(249,115,22,0.3)' : 'none',
            }}
            aria-disabled={!bothReady}
          >
            <span>Start Mapping</span>
            <span className="ml-1 text-base leading-none">→</span>
          </button>
          <p className="text-xs text-center text-[#8E8E93] max-w-lg leading-normal font-semibold">
            Once both files are uploaded, you&apos;ll be able to map answers with questions
          </p>
        </div>

      </div>{/* end inner wrapper */}
    </div>
  );
}
