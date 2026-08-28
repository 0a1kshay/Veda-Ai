'use client';

import { Minus, Plus, Maximize2, Minimize2 } from 'lucide-react';

interface AnswerToolbarProps {
  currentPage: number;
  totalPages: number;
  zoom: number;
  onPageChange: (page: number) => void;
  onZoomChange: (zoom: number) => void;
  onFitToScreen: () => void;
  isFullscreen?: boolean;
  onToggleFullscreen?: () => void;
}

const ZOOM_STEPS = [50, 75, 100, 125, 150, 175, 200];

export default function AnswerToolbar({
  currentPage,
  totalPages,
  zoom,
  onPageChange,
  onZoomChange,
  onFitToScreen,
  isFullscreen = false,
  onToggleFullscreen,
}: AnswerToolbarProps) {
  const zoomIn = () => {
    const next = ZOOM_STEPS.find((z) => z > zoom);
    if (next) onZoomChange(next);
  };
  const zoomOut = () => {
    const prev = [...ZOOM_STEPS].reverse().find((z) => z < zoom);
    if (prev) onZoomChange(prev);
  };

  return (
    <div
      className="flex items-center justify-between px-4 py-2.5 flex-shrink-0"
      style={{ borderBottom: '1px solid #F3F4F6', background: 'white' }}
    >
      {/* Page navigation */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(Math.max(1, currentPage - 1))}
          disabled={currentPage <= 1}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: currentPage <= 1 ? '#F9FAFB' : '#F3F4F6',
            color: currentPage <= 1 ? '#D1D5DB' : '#374151',
            cursor: currentPage <= 1 ? 'not-allowed' : 'pointer',
          }}
          aria-label="Previous page"
        >
          ‹
        </button>
        <span className="text-xs font-medium px-2" style={{ color: '#374151' }}>
          Page <span style={{ color: '#F97316' }}>{currentPage}</span> of {totalPages}
        </span>
        <button
          onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage >= totalPages}
          className="w-7 h-7 flex items-center justify-center rounded-lg text-xs font-semibold transition-colors"
          style={{
            background: currentPage >= totalPages ? '#F9FAFB' : '#F3F4F6',
            color: currentPage >= totalPages ? '#D1D5DB' : '#374151',
            cursor: currentPage >= totalPages ? 'not-allowed' : 'pointer',
          }}
          aria-label="Next page"
        >
          ›
        </button>
      </div>

      {/* Zoom controls */}
      <div className="flex items-center gap-1">
        <button
          onClick={zoomOut}
          disabled={zoom <= ZOOM_STEPS[0]}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 cursor-pointer"
          style={{ color: zoom <= ZOOM_STEPS[0] ? '#D1D5DB' : '#374151' }}
          aria-label="Zoom out"
        >
          <Minus style={{ width: 13, height: 13 }} />
        </button>
        <span
          className="text-xs font-semibold px-2 py-1 rounded-lg min-w-[52px] text-center select-none"
          style={{ background: '#F3F4F6', color: '#374151' }}
        >
          {zoom}%
        </span>
        <button
          onClick={zoomIn}
          disabled={zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1]}
          className="w-7 h-7 flex items-center justify-center rounded-lg transition-colors hover:bg-gray-100 cursor-pointer"
          style={{ color: zoom >= ZOOM_STEPS[ZOOM_STEPS.length - 1] ? '#D1D5DB' : '#374151' }}
          aria-label="Zoom in"
        >
          <Plus style={{ width: 13, height: 13 }} />
        </button>
        <button
          onClick={onToggleFullscreen ?? onFitToScreen}
          className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ml-1 cursor-pointer ${
            isFullscreen ? 'bg-[#F97316] text-white shadow-xs' : 'hover:bg-gray-100 text-[#374151]'
          }`}
          aria-label={isFullscreen ? 'Exit full screen' : 'Full screen view'}
          title={isFullscreen ? 'Exit full screen (Esc)' : 'Full screen view'}
        >
          {isFullscreen ? (
            <Minimize2 style={{ width: 13, height: 13 }} />
          ) : (
            <Maximize2 style={{ width: 12, height: 12 }} />
          )}
        </button>
      </div>
    </div>
  );
}
