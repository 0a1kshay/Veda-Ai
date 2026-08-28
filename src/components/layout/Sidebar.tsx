'use client';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

export default function Sidebar({ collapsed, onToggle }: SidebarProps) {
  return (
    <aside
      className="h-full bg-white flex flex-col z-20 flex-shrink-0 transition-all duration-300 rounded-[28px] border border-[#E5E7EB]/80 shadow-xs overflow-hidden"
      style={{ width: collapsed ? '72px' : '240px' }}
    >
      {/* Logo Area */}
      <div className="flex items-center justify-between px-6 py-5">
        <div className="flex items-center gap-2">
          {/* VedaAI Logo Icon (from Figma screenshot) */}
          <div className="w-8 h-8 rounded-xl bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H10C11.1046 4 12 4.89543 12 6V18C12 19.1046 11.1046 20 10 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4Z" fill="white" opacity="0.15"/>
              <path d="M12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M5 8L10 16L15 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          {!collapsed && (
            <span className="font-extrabold text-lg text-[#1C1C1E] tracking-tight">VedaAI</span>
          )}
        </div>

        {/* Sidebar Collapse/Toggle Icon */}
        {!collapsed && (
          <button 
            onClick={onToggle}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-lg transition-colors cursor-pointer"
            aria-label="Collapse sidebar"
          >
            {/* Split Screen Collapse Icon from screenshot */}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" />
              <line x1="9" y1="3" x2="9" y2="21" />
            </svg>
          </button>
        )}
      </div>

      {/* AI Teacher's Toolkit Capsule (with orange stroke border) */}
      {!collapsed && (
        <div className="px-4 mt-2 mb-6">
          <div 
            className="flex items-center justify-center gap-2 py-2.5 px-4 rounded-full text-xs font-bold transition-all border-2 border-[#F97316] cursor-pointer hover:bg-black/95 shadow-sm"
            style={{ background: '#2E2D2C', color: 'white' }}
          >
            {/* Sparkle Icon */}
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707m0-12.728l.707.707m11.314 11.314l.707-.707" />
            </svg>
            <span>AI Teacher&apos;s Toolkit</span>
          </div>
        </div>
      )}

      {/* Navigation List */}
      <nav className="flex-1 px-4 space-y-1.5 overflow-y-auto">
        {/* Home */}
        <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer">
          {/* Grid/Dashboard Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="3" width="7" height="7" rx="1" />
            <rect x="14" y="14" width="7" height="7" rx="1" />
            <rect x="3" y="14" width="7" height="7" rx="1" />
          </svg>
          {!collapsed && <span>Home</span>}
        </button>

        {/* My Classroom */}
        <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer">
          {/* Screen presentation icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="3" width="18" height="12" rx="2" />
            <path d="M9 15v3M15 15v3M4 18h16" />
          </svg>
          {!collapsed && <span>My Classroom</span>}
        </button>

        {/* Assignments */}
        <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer">
          {/* Page doc icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          {!collapsed && <span>Assignments</span>}
        </button>

        {/* Exams (Selected Capsule) */}
        <button 
          className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-[#1C1C1E] cursor-pointer"
          style={{ background: '#F2F2F2' }}
        >
          {/* Clipboard checklist icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
            <rect x="8" y="2" width="8" height="4" rx="1" fill="white" stroke="currentColor" strokeWidth="2"/>
            <line x1="9" y1="10" x2="15" y2="10" />
            <line x1="9" y1="14" x2="15" y2="14" />
          </svg>
          {!collapsed && <span>Exams</span>}
        </button>

        {/* My Library */}
        <button className="w-full flex items-center gap-3.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer">
          {/* History / Clock Icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" />
            <polyline points="12 6 12 12 16 14" />
          </svg>
          {!collapsed && <span>My Library</span>}
        </button>
      </nav>

      {/* Bottom Area: Settings & JSS Public School Card */}
      <div className="p-4 space-y-3.5">
        {/* Settings */}
        <button
          className={`w-full flex items-center gap-3.5 px-4 py-2 rounded-xl text-sm font-semibold transition-all text-[#8E8E93] hover:text-[#1C1C1E] cursor-pointer ${
            collapsed ? 'justify-center' : ''
          }`}
        >
          {/* Gear icon */}
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="3" />
            <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
          </svg>
          {!collapsed && <span>Settings</span>}
        </button>

        {/* JSS Public School Card  */}
        {!collapsed && (
          <div 
            className="p-3 rounded-2xl bg-[#F2F2F2] flex items-center gap-3 border-0"
          >
            {/* School Crest / Shield (Green Shield Icon in white outline circle) */}
            <div className="w-9 h-9 rounded-full bg-white flex items-center justify-center flex-shrink-0 shadow-xs border border-gray-100">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="12" cy="12" r="10" stroke="#2E7D32" strokeWidth="1.2" fill="#E8F5E9" />
                <path d="M12 6L7 9V13C7 16.5 9.5 19 12 20C14.5 19 17 16.5 17 13V9L12 6Z" fill="white" stroke="#2E7D32" strokeWidth="1.2" />
                <path d="M12 9V17M9 12H15" stroke="#2E7D32" strokeWidth="1.2" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-[#1C1C1E] truncate leading-tight">JSS Public School</p>
              <p className="text-[10px] text-[#8E8E93] truncate mt-0.5 font-semibold">Commerical Street </p>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
