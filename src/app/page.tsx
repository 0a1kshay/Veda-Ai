'use client';

import { useEffect, useState } from 'react';
import { AppState, Question, StudentAnswer, MappingResult } from '@/types';
import Sidebar from '@/components/layout/Sidebar';
import TopBar from '@/components/layout/TopBar';
import UploadScreen from '@/components/upload/UploadScreen';
import ProcessingScreen from '@/components/processing/ProcessingScreen';
import MappingWorkspace from '@/components/mapping/MappingWorkspace';

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);
  return isMobile;
}

const STATE_META: Record<AppState, { title: string; subtitle?: string }> = {
  upload: { title: 'Upload Files' },
  processing: { title: 'Processing', subtitle: 'Extracting answers...' },
  mapping: { title: 'Unit Test — Science', subtitle: 'Arjun Mehta' },
};

export default function Home() {
  const isMobile = useIsMobile();
  const [appState, setAppState] = useState<AppState>('upload');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [uploadedFiles, setUploadedFiles] = useState<{ questionPaper: File; answerSheet: File } | null>(null);
  const [extractedQuestions, setExtractedQuestions] = useState<Question[] | null>(null);
  const [, setExtractedAnswers] = useState<StudentAnswer[] | null>(null);
  const [mappingResult, setMappingResult] = useState<MappingResult | null>(null);

  const effectiveSidebarCollapsed = isMobile ? true : sidebarCollapsed;


  const meta = STATE_META[appState];

  return (
    <div 
      className={`w-full h-screen flex overflow-hidden select-none ${isMobile ? 'p-2.5 gap-2.5' : 'p-3.5 gap-3.5'}`}
      style={{
        background: 'radial-gradient(circle at 50% 30%, #FFFFFF 0%, #D8D8DE 50%, #A8A8B2 100%)',
        fontFamily: 'var(--font-inter), sans-serif',
      }}
    >
      {/* Desktop Sidebar */}
      {!isMobile && (
        <Sidebar
          collapsed={effectiveSidebarCollapsed}
          onToggle={() => setSidebarCollapsed((c) => !c)}
        />
      )}

      {/* Mobile Drawer Sidebar */}
      {isMobile && mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop overlay */}
          <div 
            className="fixed inset-0 bg-black/40 transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />
          {/* Drawer Content container */}
          <div className="relative flex-1 flex flex-col max-w-[250px] w-full bg-white shadow-2xl h-full animate-in slide-in-from-left duration-200">
            <Sidebar
              collapsed={false}
              onToggle={() => setMobileMenuOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Main Area */}
      <div className="flex flex-col flex-1 overflow-hidden">
        {/* TopBar (Dynamic Navbar containing Back Arrow, Exams badge, Actions, Profile) */}
        <TopBar 
          title={meta.title} 
          subtitle={meta.subtitle} 
          onMenuToggle={() => setMobileMenuOpen((o) => !o)}
          onBack={() => {
            if (appState !== 'upload') {
              setAppState('upload');
            }
          }}
        />

        {/* Content Viewport */}
        <main
          className="flex-1 overflow-hidden flex flex-col"
          style={{
            background: appState === 'mapping' ? 'white' : 'transparent',
          }}
        >
          {appState === 'upload' && (
            <UploadScreen
              onStartMapping={(qp, as) => {
                setUploadedFiles({ questionPaper: qp, answerSheet: as });
                setAppState('processing');
              }}
            />
          )}

          {appState === 'processing' && (
            <ProcessingScreen
              questionPaper={uploadedFiles?.questionPaper}
              answerSheet={uploadedFiles?.answerSheet}
              onComplete={(questions, answers, mapRes) => {
                if (questions && questions.length > 0) {
                  setExtractedQuestions(questions);
                }
                if (answers && answers.length > 0) {
                  setExtractedAnswers(answers);
                }
                if (mapRes) {
                  setMappingResult(mapRes);
                }
                setAppState('mapping');
              }}
            />
          )}

          {appState === 'mapping' && (
            <MappingWorkspace
              isMobile={isMobile}
              questions={extractedQuestions || undefined}
              unmappedAnswers={mappingResult?.unmappedAnswers}
              answerSheetFile={uploadedFiles?.answerSheet}
            />
          )}
        </main>
      </div>
    </div>
  );
}
