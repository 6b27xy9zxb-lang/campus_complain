import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  ClipboardCheck,
  FileSearch,
  Lock,
  Search,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import {
  CAMPUS_HERO_IMAGE,
  LifecycleTimeline,
  PriorityIndicator,
  StatusIndicator,
} from '../components/GlassUI';
import { COMPLAINT_CATEGORIES } from '../types';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface LandingPageProps {
  onNavigate: (path: string) => void;
  initialSection?: 'about' | 'track';
}

export function LandingPage({ onNavigate, initialSection }: LandingPageProps) {
  const { user } = useAuth();
  const [trackCode, setTrackCode] = useState('CMP20261114001');
  const [trackLoading, setTrackLoading] = useState(false);
  const [trackError, setTrackError] = useState('');
  const [trackResult, setTrackResult] = useState<{ complaint: any; history: any[] } | null>(null);

  const handleTrackSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trackCode.trim()) return;
    setTrackLoading(true);
    setTrackError('');
    try {
      const data = await apiRequest(`/api/complaints/track/${encodeURIComponent(trackCode.trim())}`);
      setTrackResult(data);
    } catch (err: any) {
      setTrackResult(null);
      setTrackError(err.message || 'Complaint not found.');
    } finally {
      setTrackLoading(false);
    }
  };

  const handleSubmitComplaintClick = () => {
    if (user?.role === 'STUDENT') {
      onNavigate('/dashboard/student?tab=submit');
    } else {
      onNavigate('/student-login');
    }
  };

  return (
    <div className="px-4 sm:px-6 pb-10 space-y-16">
      {/* HERO SECTION */}
      <section className="max-w-7xl mx-auto pt-4 sm:pt-8">
        <div className="glass-panel rounded-[32px] p-6 sm:p-10 lg:p-12">
          <div className="grid lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35 }}
              className="lg:col-span-7 flex flex-col justify-center"
            >
              <p className="text-xs font-semibold tracking-wide text-[#5268A8] mb-3">
                Centralized University Grievance & Operations Platform
              </p>
              <h1
                className="font-display font-bold text-[#20242D] tracking-tight leading-[1.08] text-balance"
                style={{ fontSize: 'clamp(2.25rem, 4vw, 3.6rem)' }}
              >
                Your Campus. Your Voice. Our Responsibility.
              </h1>
              <p className="mt-5 text-base sm:text-lg text-[#4A4E59] leading-relaxed max-w-2xl">
                A transparent and centralized platform to report campus issues, connect with
                university management and track every complaint until resolution.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <button
                  type="button"
                  onClick={handleSubmitComplaintClick}
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold shadow-sm transition-all active:scale-[0.99] whitespace-nowrap"
                >
                  <span>Submit a Complaint</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
                <a
                  href="#track-section"
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/65 hover:bg-white/85 text-[#20242D] border border-white/80 text-sm font-semibold transition-all whitespace-nowrap"
                >
                  <FileSearch className="h-4 w-4 text-[#5268A8]" />
                  <span>Track Complaint</span>
                </a>
                <button
                  type="button"
                  onClick={() => onNavigate('/login')}
                  className="inline-flex items-center gap-2 px-5 py-3.5 rounded-2xl bg-white/35 hover:bg-white/60 text-[#292B32] border border-white/60 text-sm font-semibold transition-all whitespace-nowrap"
                >
                  <span>Login to Portal</span>
                </button>
              </div>

              <div className="mt-9 pt-6 border-t border-[#20242D]/10 grid grid-cols-3 gap-4 max-w-lg">
                <div>
                  <p className="font-display font-bold text-xl sm:text-2xl text-[#20242D] tabular-nums">14</p>
                  <p className="text-xs text-[#5A5E69] mt-0.5">Issue Categories</p>
                </div>
                <div>
                  <p className="font-display font-bold text-xl sm:text-2xl text-[#20242D] tabular-nums">7 Stages</p>
                  <p className="text-xs text-[#5A5E69] mt-0.5">Audited Lifecycle</p>
                </div>
                <div>
                  <p className="font-display font-bold text-xl sm:text-2xl text-[#20242D] tabular-nums">100%</p>
                  <p className="text-xs text-[#5A5E69] mt-0.5">Anonymous Option</p>
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4, delay: 0.08 }}
              className="lg:col-span-5 flex"
            >
              <div className="relative w-full min-h-[280px] lg:h-full rounded-3xl overflow-hidden border border-white/60 shadow-lg bg-[#D8D3CA]">
                <img
                  src={CAMPUS_HERO_IMAGE}
                  alt="Modern sunlit university campus commons and student pavilion"
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
                <div
                  className="absolute inset-0 flex flex-col justify-end p-6"
                  style={{
                    background:
                      'linear-gradient(to top, rgba(32,36,45,0.78) 0%, rgba(32,36,45,0.22) 55%, transparent 100%)',
                  }}
                >
                  <p className="text-xs font-medium text-white/85">Verified Resolution Chain</p>
                  <p className="font-display font-semibold text-white text-lg mt-1 leading-snug">
                    Every submission generates a permanent reference ID and audit trail.
                  </p>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* LIVE TRACKING WIDGET */}
      <section id="track-section" className="max-w-7xl mx-auto scroll-mt-24">
        <div className="glass-panel rounded-3xl p-6 sm:p-9">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="max-w-xl">
              <p className="text-xs font-semibold text-[#5268A8]">Transparent Tracking</p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D] mt-1 text-balance">
                Track Any Complaint in Real Time
              </h2>
              <p className="text-sm text-[#4A4E59] mt-2 leading-relaxed">
                Enter your reference code (for example <span className="font-mono font-semibold">CMP20261114001</span>) to inspect its current stage and verification remarks.
              </p>
            </div>

            <form onSubmit={handleTrackSubmit} className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto lg:min-w-[440px]">
              <div className="relative flex-1">
                <Search className="h-4 w-4 text-[#5A5E69] absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  value={trackCode}
                  onChange={(e) => setTrackCode(e.target.value)}
                  placeholder="Enter Complaint ID (e.g. CMP20261114001)"
                  className="w-full glass-input rounded-xl pl-10 pr-4 py-3 text-sm font-mono text-[#20242D]"
                />
              </div>
              <button
                type="submit"
                disabled={trackLoading}
                className="px-6 py-3 rounded-xl bg-[#20242D] hover:bg-[#323744] text-white text-sm font-semibold transition-colors whitespace-nowrap disabled:opacity-60"
              >
                {trackLoading ? 'Checking...' : 'Check Status'}
              </button>
            </form>
          </div>

          {trackError && (
            <p className="mt-4 text-sm font-medium text-[#A63A3A]">{trackError}</p>
          )}

          {trackResult && (
            <div className="mt-7 pt-7 border-t border-[#20242D]/10 space-y-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-[#5A5E69]">
                    <span className="font-mono font-semibold text-[#5268A8]">{trackResult.complaint.complaint_id}</span>
                    <span>·</span>
                    <span>{trackResult.complaint.category}</span>
                    <span>·</span>
                    <span>{trackResult.complaint.department}</span>
                  </div>
                  <h3 className="font-display font-bold text-lg text-[#20242D] mt-1">
                    {trackResult.complaint.title}
                  </h3>
                </div>
                <div className="flex items-center gap-4">
                  <PriorityIndicator priority={trackResult.complaint.priority} />
                  <StatusIndicator status={trackResult.complaint.status} />
                </div>
              </div>

              <LifecycleTimeline currentStatus={trackResult.complaint.status} />

              {trackResult.history.length > 0 && (
                <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-2">
                  {trackResult.history.map((h) => (
                    <div key={h.id} className="rounded-2xl bg-white/45 border border-white/60 p-3.5">
                      <p className="text-[11px] font-mono text-[#5A5E69] tabular-nums">{h.timestamp}</p>
                      <p className="text-xs font-bold text-[#20242D] mt-1">{h.new_status.replace(/_/g, ' ')}</p>
                      <p className="text-xs text-[#4A4E59] mt-1 leading-relaxed">{h.remarks}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section className="max-w-7xl mx-auto">
        <div className="mb-7 max-w-2xl">
          <p className="text-xs font-semibold text-[#5268A8]">Structured Accountability</p>
          <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D] mt-1 text-balance">
            How the Resolution Workflow Operates
          </h2>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            {
              step: '01. Submit & Tag Faculty',
              desc: 'Report academic, administrative, or infrastructure issues with evidence and tag concerned faculty members directly.',
              icon: ClipboardCheck,
            },
            {
              step: '02. Management Review',
              desc: 'University administration reviews every submission, sets resolution deadlines, and assigns the appropriate investigator or staff.',
              icon: ShieldCheck,
            },
            {
              step: '03. Coordinated Action',
              desc: 'Tagged faculty provide formal explanations while maintenance personnel upload before-and-after repair evidence.',
              icon: UserCheck,
            },
            {
              step: '04. Verified Closure',
              desc: 'Only management verifies completed work and marks a complaint resolved, followed by student confirmation feedback.',
              icon: CheckCircle2,
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.step} className="glass-panel rounded-3xl p-6 flex flex-col justify-between">
                <div>
                  <div className="h-10 w-10 rounded-xl bg-white/70 border border-white/80 flex items-center justify-center text-[#5268A8] mb-4">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="font-display font-bold text-base text-[#20242D]">{item.step}</h3>
                  <p className="text-sm text-[#4A4E59] mt-2 leading-relaxed">{item.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* COMPLAINT CATEGORIES */}
      <section className="max-w-7xl mx-auto">
        <div className="glass-panel rounded-3xl p-6 sm:p-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-7">
            <div>
              <p className="text-xs font-semibold text-[#5268A8]">Complete Campus Coverage</p>
              <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D] mt-1">
                14 Dedicated Complaint Categories
              </h2>
            </div>
            <button
              type="button"
              onClick={handleSubmitComplaintClick}
              className="text-sm font-semibold text-[#5268A8] hover:underline inline-flex items-center gap-1.5 whitespace-nowrap"
            >
              <span>Raise a concern now</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-3">
            {COMPLAINT_CATEGORIES.map((cat, idx) => (
              <div
                key={cat}
                className="rounded-2xl bg-white/45 border border-white/65 px-3.5 py-3 flex flex-col justify-between min-h-[76px]"
              >
                <span className="text-[11px] font-mono text-[#5268A8] tabular-nums">
                  {String(idx + 1).padStart(2, '0')}
                </span>
                <span className="text-xs font-semibold text-[#20242D] leading-snug mt-1">
                  {cat}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ABOUT / DEDICATED MANAGEMENT & WHY USE THIS PORTAL */}
      <section id="about-section" className={`max-w-7xl mx-auto scroll-mt-24 ${initialSection === 'about' ? 'pt-2' : ''}`}>
        <div className="grid lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 glass-panel rounded-3xl p-7 sm:p-9">
            <p className="text-xs font-semibold text-[#5268A8]">About the Portal</p>
            <h2 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D] mt-1 text-balance">
              Built for Institutional Transparency & Student Trust
            </h2>
            <p className="text-sm sm:text-base text-[#4A4E59] mt-4 leading-relaxed">
              The Campus Complaint Management Portal replaces fragmented email chains and paper
              suggestion boxes with a single audited system uniting students, faculty advisors,
              campus maintenance teams, and university administration.
            </p>
            <div className="mt-6 grid sm:grid-cols-2 gap-4">
              <div className="rounded-2xl bg-white/45 border border-white/65 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#20242D]">
                  <Lock className="h-4 w-4 text-[#5268A8]" />
                  <span>Protected Anonymity</span>
                </div>
                <p className="text-xs text-[#4A4E59] mt-1.5 leading-relaxed">
                  Students can submit sensitive concerns anonymously. Faculty and staff never see student identities on protected cases.
                </p>
              </div>
              <div className="rounded-2xl bg-white/45 border border-white/65 p-4">
                <div className="flex items-center gap-2 text-sm font-bold text-[#20242D]">
                  <Building2 className="h-4 w-4 text-[#5268A8]" />
                  <span>Independent Oversight</span>
                </div>
                <p className="text-xs text-[#4A4E59] mt-1.5 leading-relaxed">
                  Faculty cannot unilaterally dismiss or close complaints tagged against them; final resolution rests with University Management.
                </p>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 glass-panel rounded-3xl p-7 sm:p-9 flex flex-col justify-between">
            <div>
              <p className="text-xs font-semibold text-[#5268A8]">Need Assistance?</p>
              <h3 className="font-display font-bold text-2xl text-[#20242D] mt-1">
                Dedicated Support & University Contact
              </h3>
              <p className="text-sm text-[#4A4E59] mt-3 leading-relaxed">
                Have questions about grievance escalation, faculty verification, or campus operations? Reach our team directly.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-[#20242D]/10 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('/contact')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold transition-colors"
              >
                <span>Contact University Team</span>
                <ArrowRight className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => onNavigate('/login')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-white/60 hover:bg-white/80 text-[#20242D] border border-white/70 text-sm font-semibold transition-colors"
              >
                <span>Role Portals</span>
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
