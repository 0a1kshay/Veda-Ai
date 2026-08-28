'use client';

import { Bell, HelpCircle, ChevronDown, ClipboardList, Sparkle, Menu } from 'lucide-react';

interface TopBarProps {
  title?: string;
  subtitle?: string;
  onMenuToggle?: () => void;
  onBack?: () => void;
}

export default function TopBar({ onMenuToggle, onBack }: TopBarProps) {
  return (
    <header
      className="h-14 bg-white/95 backdrop-blur-md rounded-2xl border border-gray-200/60 shadow-xs flex items-center justify-between px-4 lg:px-6 z-10 transition-all mb-2.5"
    >
      {/* Left side: Back Arrow & Exams Pill / Mobile Logo */}
      <div className="flex items-center gap-2 lg:gap-3">
        {/* Back Arrow */}
        <button 
          onClick={onBack}
          className="text-[#8E8E93] hover:text-[#1C1C1E] transition-colors p-1 rounded-lg cursor-pointer"
          aria-label="Go back"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <line x1="19" y1="12" x2="5" y2="12" />
            <polyline points="12 19 5 12 12 5" />
          </svg>
        </button>

        {/* Desktop: Path Text */}
        <div 
          className="hidden lg:flex items-center gap-1.5 text-xs font-semibold text-[#8E8E93]"
        >
          <ClipboardList className="w-4 h-4 text-[#8E8E93]" />
          <span>Exams</span>
        </div>

        {/* Mobile: Logo Icon + Text (Image 2 Target) */}
        <div className="lg:hidden flex items-center gap-2 ml-0.5">
          <div className="w-7 h-7 rounded-xl bg-[#1C1C1E] flex items-center justify-center flex-shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M4 4H10C11.1046 4 12 4.89543 12 6V18C12 19.1046 11.1046 20 10 20H4C2.89543 20 2 19.1046 2 18V6C2 4.89543 2.89543 4 4 4Z" fill="white" opacity="0.15"/>
              <path d="M12 4H18C19.1046 4 20 4.89543 20 6V18C20 19.1046 19.1046 20 18 20H12" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
              <path d="M5 8L10 16L15 8" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
          <span className="font-extrabold text-base text-[#1C1C1E] tracking-tight">
            VedaAI
          </span>
        </div>
      </div>

      {/* Right side: Actions & Profile */}
      <div className="flex items-center gap-2 lg:gap-4.5">
        {/* Help (Desktop only) */}
        <button
          className="hidden lg:block text-[#8E8E93] hover:text-[#1C1C1E] transition-colors p-0.5 cursor-pointer"
          aria-label="Help"
        >
          <HelpCircle style={{ width: 19, height: 19 }} />
        </button>

        {/* Notifications (Always visible) */}
        <button
          className="text-[#1C1C1E] lg:text-[#8E8E93] hover:text-[#1C1C1E] transition-colors relative p-1.5 rounded-full hover:bg-black/5 cursor-pointer"
          aria-label="Notifications"
        >
          <Bell style={{ width: 19, height: 19 }} />
          <span
            className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full"
            style={{ background: '#F97316' }}
          />
        </button>

        {/* Four-Point Sparkle Icon (Desktop only) */}
        <button
          className="hidden lg:block text-[#8E8E93] hover:text-[#F97316] transition-colors p-0.5 cursor-pointer"
          aria-label="AI Features"
        >
          <Sparkle style={{ width: 19, height: 19 }} />
        </button>

        {/* Profile Card (Simplified on mobile) */}
        <div className="flex items-center gap-2 lg:pl-2 cursor-pointer group">
          {/* Avatar (Mocked with photo styling) */}
          <div className="w-8 h-8 rounded-full overflow-hidden bg-[#FEF3EC] flex items-center justify-center border border-[#FED7AA] shadow-xs">
            <svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="16" cy="16" r="16" fill="#FEE5D9"/>
              <circle cx="16" cy="12" r="6" fill="#5C3826"/>
              <path d="M7 26C7 20.48 11.03 17 16 17C20.97 17 25 20.48 25 26" fill="#1C1C1E"/>
              <rect x="13" y="11" width="6" height="4" rx="1" fill="#FFE5D9" opacity="0.3"/>
            </svg>
          </div>
          <span className="hidden lg:inline text-xs font-bold text-[#1C1C1E] group-hover:text-black">
            Akshay P
          </span>
          <ChevronDown className="hidden lg:inline w-3.5 h-3.5 text-gray-400 group-hover:text-gray-600 transition-colors" />
        </div>

        {/* Hamburger Menu (Mobile only) */}
        <button
          onClick={onMenuToggle}
          className="lg:hidden p-1 rounded-lg text-[#1C1C1E] hover:bg-black/5 transition-colors cursor-pointer"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5" />
        </button>
      </div>
    </header>
  );
}
