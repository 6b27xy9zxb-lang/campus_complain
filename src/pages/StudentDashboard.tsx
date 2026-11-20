import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  Clock,
  FileText,
  Hourglass,
  PlusCircle,
  Search,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { DashboardShell } from '../components/DashboardShell';
import {
  AnimatedNumber,
  LifecycleTimeline,
  PriorityIndicator,
  StatusIndicator,
} from '../components/GlassUI';
import { ComplaintSubmissionWizard } from '../components/ComplaintSubmissionWizard';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import {
  MessagesView,
  NotificationsView,
  ProfileSettingsView,
} from '../components/SharedWorkspacePanels';
import type { ComplaintRecord } from '../types';

interface StudentDashboardProps {
  onNavigatePublic: (path: string) => void;
  initialTab?: string;
}

export function StudentDashboard({ onNavigatePublic, initialTab }: StudentDashboardProps) {
  const [section, setSection] = useState(initialTab || 'home');
  const [globalSearch, setGlobalSearch] = useState('');
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState('ALL');

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiRequest<{ complaints: ComplaintRecord[] }>('/api/complaints'),
        apiRequest<{ stats: any }>('/api/dashboard/stats'),
      ]);
      setComplaints(listRes.complaints);
      setStats(statsRes.stats);
    } catch {
      // handled gracefully
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredComplaints = useMemo(() => {
    return complaints.filter((c) => {
      const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
      const q = globalSearch.trim().toLowerCase();
      const matchesSearch =
        !q ||
        c.complaint_id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q);
      return matchesStatus && matchesSearch;
    });
  }, [complaints, statusFilter, globalSearch]);

  const latestTracked = complaints[0] || null;

  return (
    <DashboardShell
      activeSection={section}
      onSelectSection={setSection}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      onNavigatePublic={onNavigatePublic}
    >
      {section === 'home' && (
        <div className="space-y-6">
          {/* HERO SECTION */}
          <motion.section
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-panel rounded-[28px] p-7 sm:p-9 flex flex-col lg:flex-row lg:items-center justify-between gap-6"
          >
            <div>
              <p className="text-xs font-semibold text-[#5268A8]">Student Grievance Workspace</p>
              <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#20242D] mt-1">
                Your Voice Matters.
              </h1>
              <p className="text-sm sm:text-base text-[#4A4E59] mt-2 max-w-xl">
                Report issues, track progress, and help make your campus better.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => setSection('submit')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-sm font-semibold shadow-sm transition-colors"
              >
                <PlusCircle className="h-4 w-4" />
                <span>Submit a Complaint</span>
              </button>
              <button
                type="button"
                onClick={() => setSection('track')}
                className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-white/65 hover:bg-white/90 text-[#20242D] border border-white/80 text-sm font-semibold transition-colors"
              >
                <Search className="h-4 w-4 text-[#5268A8]" />
                <span>Track My Complaints</span>
              </button>
            </div>
          </motion.section>

          {/* 4 STATISTICS CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              {
                label: 'Total Complaints',
                value: stats.total,
                desc: 'All grievances filed by you',
                icon: FileText,
              },
              {
                label: 'Pending Complaints',
                value: stats.pending,
                desc: 'Submitted or awaiting assignment',
                icon: Hourglass,
              },
              {
                label: 'In Progress',
                value: stats.inProgress,
                desc: 'Actively under investigation',
                icon: Clock,
              },
              {
                label: 'Resolved Complaints',
                value: stats.resolved,
                desc: 'Verified & completed cases',
                icon: CheckCircle2,
              },
            ].map((card) => {
              const Icon = card.icon;
              return (
                <motion.div
                  key={card.label}
                  whileHover={{ y: -2 }}
                  className="glass-panel rounded-2xl p-5"
                >
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-semibold text-[#4A4E59]">{card.label}</span>
                    <Icon className="h-4 w-4 text-[#5268A8]" />
                  </div>
                  <p className="text-3xl font-bold text-[#20242D]">
                    <AnimatedNumber value={card.value} />
                  </p>
                  <p className="text-[11px] text-[#5A5E69] mt-1">{card.desc}</p>
                </motion.div>
              );
            })}
          </div>

          {/* LIVE TIMELINE PREVIEW */}
          {latestTracked && (
            <div className="glass-panel rounded-3xl p-6 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-[#5268A8]">Latest Complaint Progress</p>
                  <h2 className="font-display font-bold text-lg text-[#20242D] mt-0.5">
                    {latestTracked.complaint_id} — {latestTracked.title}
                  </h2>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedComplaintId(latestTracked.id)}
                  className="px-4 py-2 rounded-xl bg-white/70 hover:bg-white text-xs font-semibold text-[#5268A8] border border-white/80"
                >
                  View Details
                </button>
              </div>
              <LifecycleTimeline currentStatus={latestTracked.status} />
            </div>
          )}

          {/* RECENT COMPLAINTS */}
          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-xl text-[#20242D]">Recent Complaints</h2>
              <button
                type="button"
                onClick={() => setSection('my-complaints')}
                className="text-xs font-semibold text-[#5268A8] hover:underline"
              >
                View All ({complaints.length})
              </button>
            </div>

            {loading ? (
              <div className="py-10 text-center text-sm text-[#5A5E69]">Loading your complaints...</div>
            ) : filteredComplaints.length === 0 ? (
              <div className="py-10 text-center space-y-3">
                <p className="text-sm text-[#5A5E69]">No complaints match your filter yet.</p>
                <button
                  type="button"
                  onClick={() => setSection('submit')}
                  className="px-4 py-2 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
                >
                  Submit Your First Complaint
                </button>
              </div>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredComplaints.slice(0, 4).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-2xl bg-white/50 border border-white/75 p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between gap-2 text-xs text-[#5A5E69]">
                        <span className="font-mono font-bold text-[#5268A8]">{c.complaint_id}</span>
                        <span className="font-mono tabular-nums">{c.created_at.slice(0, 10)}</span>
                      </div>
                      <h3 className="font-display font-bold text-base text-[#20242D] mt-1.5">
                        {c.title}
                      </h3>
                      <p className="text-xs text-[#4A4E59] mt-1">
                        {c.category} · {c.department}
                      </p>
                      {c.tagged_faculty_names && c.tagged_faculty_names.length > 0 && (
                        <p className="text-xs text-[#5268A8] font-medium mt-1.5">
                          Tagged Faculty: {c.tagged_faculty_names.join(', ')}
                        </p>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#20242D]/8 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PriorityIndicator priority={c.priority} />
                        <StatusIndicator status={c.status} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedComplaintId(c.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-white/75 hover:bg-white text-xs font-semibold text-[#20242D] border border-white"
                      >
                        View Details
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'submit' && (
        <ComplaintSubmissionWizard
          onSubmitted={() => {
            fetchData();
          }}
          onTrackComplaint={(c) => {
            setSelectedComplaintId(c.id);
            setSection('track');
          }}
          onCancel={() => setSection('home')}
        />
      )}

      {(section === 'my-complaints' || section === 'track') && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-2xl text-[#20242D]">
                {section === 'track' ? 'Track Complaint Status' : 'My Complaints'}
              </h2>
              <p className="text-xs text-[#4A4E59] mt-1">
                Inspect timelines, faculty responses, and management updates across all your cases.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="glass-input rounded-xl px-3.5 py-2 text-xs text-[#20242D]"
              >
                <option value="ALL">All Statuses</option>
                <option value="SUBMITTED">Submitted</option>
                <option value="UNDER_REVIEW">Under Review</option>
                <option value="ASSIGNED">Assigned</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="ACTION_TAKEN">Action Taken</option>
                <option value="RESOLVED">Resolved</option>
                <option value="CLOSED">Closed</option>
              </select>
              <button
                type="button"
                onClick={() => setSection('submit')}
                className="px-4 py-2 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
              >
                New Complaint
              </button>
            </div>
          </div>

          <div className="space-y-4">
            {filteredComplaints.map((c) => (
              <div
                key={c.id}
                className="rounded-2xl bg-white/50 border border-white/75 p-5 space-y-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#5A5E69]">
                      <span className="font-mono font-bold text-[#5268A8]">{c.complaint_id}</span>
                      <span>·</span>
                      <span>{c.category}</span>
                      <span>·</span>
                      <span>{c.department}</span>
                      <span>·</span>
                      <span className="font-mono tabular-nums">{c.created_at.slice(0, 10)}</span>
                    </div>
                    <h3 className="font-display font-bold text-lg text-[#20242D] mt-1">{c.title}</h3>
                  </div>
                  <div className="flex items-center gap-3">
                    <PriorityIndicator priority={c.priority} />
                    <StatusIndicator status={c.status} />
                    <button
                      type="button"
                      onClick={() => setSelectedComplaintId(c.id)}
                      className="px-3.5 py-2 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                </div>
                {section === 'track' && <LifecycleTimeline currentStatus={c.status} />}
              </div>
            ))}
            {filteredComplaints.length === 0 && (
              <p className="py-10 text-center text-sm text-[#5A5E69]">No complaints found.</p>
            )}
          </div>
        </div>
      )}

      {section === 'messages' && (
        <MessagesView complaints={complaints} onOpenComplaint={setSelectedComplaintId} />
      )}

      {section === 'notifications' && (
        <NotificationsView onOpenComplaint={setSelectedComplaintId} />
      )}

      {(section === 'profile' || section === 'settings') && (
        <ProfileSettingsView title={section === 'settings' ? 'Account Settings' : 'Student Profile'} />
      )}

      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onUpdated={fetchData}
        />
      )}
    </DashboardShell>
  );
}
