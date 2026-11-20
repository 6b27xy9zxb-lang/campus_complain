import React, { useState } from 'react';
import { Menu, X } from 'lucide-react';
import { BrandMark } from './GlassUI';
import { useAuth } from '../context/AuthContext';

interface PublicLayoutProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  children: React.ReactNode;
}

const PUBLIC_LINKS = [
  { label: 'Home', path: '/' },
  { label: 'About', path: '/about' },
  { label: 'Student Login', path: '/student-login' },
  { label: 'Faculty Login', path: '/faculty-login' },
  { label: 'Contact Us', path: '/contact' },
];

export function PublicLayout({ currentPath, onNavigate, children }: PublicLayoutProps) {
  const { user } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLink = (path: string) => {
    setMobileOpen(false);
    onNavigate(path);
  };

  const dashboardPath =
    user?.role === 'ADMIN'
      ? '/dashboard/admin'
      : user?.role === 'FACULTY'
      ? '/dashboard/faculty'
      : user?.role === 'MAINTENANCE'
      ? '/dashboard/maintenance'
      : '/dashboard/student';

  return (
    <div className="min-h-screen flex flex-col">
      {/* Floating Liquid Glass Top Navigation */}
      <header className="sticky top-0 z-40 px-4 sm:px-6 pt-3 pb-2">
        <div className="max-w-7xl mx-auto glass-panel rounded-2xl px-5 py-3 flex items-center justify-between gap-8">
          {/* Zone 1: Brand wordmark */}
          <button
            type="button"
            onClick={() => handleLink('/')}
            className="flex items-center gap-3 text-left whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#5268A8] rounded-xl"
          >
            <BrandMark size={34} />
            <span className="font-display font-bold text-base sm:text-lg tracking-tight text-[#20242D]">
              Campus Portal
            </span>
          </button>

          {/* Zone 2: 5 concise single-line text links */}
          <nav className="hidden lg:flex items-center gap-7 text-sm font-medium text-[#3A3E48]">
            {PUBLIC_LINKS.map((link) => {
              const active = currentPath === link.path;
              return (
                <button
                  key={link.path}
                  type="button"
                  onClick={() => handleLink(link.path)}
                  className={`relative py-1 whitespace-nowrap shrink-0 transition-colors hover:text-[#20242D] ${
                    active ? 'text-[#5268A8] font-semibold' : ''
                  }`}
                >
                  {link.label}
                  {active && (
                    <span className="absolute left-0 right-0 -bottom-0.5 h-0.5 rounded-full bg-[#5268A8]" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Zone 3: 1 primary action */}
          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleLink(user ? dashboardPath : '/login')}
              className="hidden sm:inline-flex items-center justify-center px-4 py-2 text-xs font-semibold text-white bg-[#5268A8] hover:bg-[#3F5289] rounded-xl shadow-sm transition-colors whitespace-nowrap shrink-0"
            >
              {user ? 'Open Dashboard' : 'Portal Login'}
            </button>

            <button
              type="button"
              onClick={() => setMobileOpen((prev) => !prev)}
              className="lg:hidden p-2 rounded-xl text-[#20242D] hover:bg-white/50 transition-colors"
              aria-label="Toggle navigation menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Drawer */}
        {mobileOpen && (
          <div className="lg:hidden mt-2 max-w-7xl mx-auto glass-panel-strong rounded-2xl p-4 space-y-1.5">
            {PUBLIC_LINKS.map((link) => (
              <button
                key={link.path}
                type="button"
                onClick={() => handleLink(link.path)}
                className={`w-full text-left px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                  currentPath === link.path
                    ? 'bg-[#5268A8] text-white'
                    : 'text-[#20242D] hover:bg-white/60'
                }`}
              >
                {link.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => handleLink(user ? dashboardPath : '/login')}
              className="w-full text-center mt-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white bg-[#5268A8]"
            >
              {user ? 'Open Dashboard' : 'Portal Login'}
            </button>
          </div>
        )}
      </header>

      <main className="flex-1">{children}</main>

      {/* Quiet Glass Footer */}
      <footer className="mt-16 px-4 sm:px-6 pb-8">
        <div className="max-w-7xl mx-auto glass-panel rounded-3xl px-6 sm:px-10 py-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-6 border-b border-[#20242D]/10">
            <div className="flex items-center gap-3.5">
              <BrandMark size={38} />
              <div>
                <p className="font-display font-bold text-[#20242D] text-base">
                  Campus Complaint Management Portal
                </p>
                <p className="text-xs text-[#4A4E59] mt-0.5">
                  Designed to make every student voice heard.
                </p>
              </div>
            </div>

            <nav className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm font-medium text-[#3A3E48]">
              <button type="button" onClick={() => handleLink('/')} className="hover:text-[#5268A8] transition-colors whitespace-nowrap">
                Home
              </button>
              <button type="button" onClick={() => handleLink('/student-login')} className="hover:text-[#5268A8] transition-colors whitespace-nowrap">
                Student Login
              </button>
              <button type="button" onClick={() => handleLink('/faculty-login')} className="hover:text-[#5268A8] transition-colors whitespace-nowrap">
                Faculty Login
              </button>
              <button type="button" onClick={() => handleLink('/about')} className="hover:text-[#5268A8] transition-colors whitespace-nowrap">
                About
              </button>
              <button type="button" onClick={() => handleLink('/contact')} className="hover:text-[#5268A8] transition-colors whitespace-nowrap">
                Contact Us
              </button>
            </nav>
          </div>

          <div className="pt-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs text-[#5A5E69]">
            <p>© {new Date().getFullYear()} Campus Complaint Management Portal. All rights reserved.</p>
            <button
              type="button"
              onClick={() => handleLink('/staff-login')}
              className="text-left sm:text-right hover:text-[#5268A8] transition-colors"
            >
              Administration & Maintenance Access
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
