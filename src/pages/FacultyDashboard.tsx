import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  CheckCircle2,
  ClipboardList,
  Clock,
  FileCheck2,
  Hourglass,
  ShieldAlert,
} from 'lucide-react';
import { apiRequest } from '../lib/api';
import { DashboardShell } from '../components/DashboardShell';
import { AnimatedNumber, PriorityIndicator, StatusIndicator } from '../components/GlassUI';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import {
  MessagesView,
  NotificationsView,
  ProfileSettingsView,
} from '../components/SharedWorkspacePanels';
import type { ComplaintRecord } from '../types';

interface FacultyDashboardProps {
  onNavigatePublic: (path: string) => void;
}

export function FacultyDashboard({ onNavigatePublic }: FacultyDashboardProps) {
  const [section, setSection] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [stats, setStats] = useState({
    total: 0,
    newCount: 0,
    awaitingResponse: 0,
    inProgress: 0,
    resolved: 0,
  });
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);

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
      // handled
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const displayedComplaints = useMemo(() => {
    return complaints.filter((c) => {
      if (section === 'in-progress') {
        if (!['IN_PROGRESS', 'ACTION_TAKEN', 'MANAGEMENT_VERIFICATION'].includes(c.status)) return false;
      } else if (section === 'resolved') {
        if (!['RESOLVED', 'CLOSED'].includes(c.status)) return false;
      }
      const q = globalSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        c.complaint_id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q)
      );
    });
  }, [complaints, section, globalSearch]);

  return (
    <DashboardShell
      activeSection={section}
      onSelectSection={setSection}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      onNavigatePublic={onNavigatePublic}
    >
      {(section === 'dashboard' || section === 'assigned' || section === 'in-progress' || section === 'resolved') && (
        <div className="space-y-6">
          <div className="glass-panel rounded-[28px] p-7 sm:p-8 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold text-[#5268A8]">Faculty Grievance Portal</p>
              <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D] mt-1">
                {section === 'in-progress'
                  ? 'Complaints In Progress'
                  : section === 'resolved'
                  ? 'Resolved Complaints'
                  : 'Tagged & Assigned Complaints'}
              </h1>
              <p className="text-sm text-[#4A4E59] mt-1.5 max-w-2xl">
                Review student concerns tagged to you, submit official explanations, and upload supporting documentation for University Management verification.
              </p>
            </div>
            <div className="rounded-2xl bg-white/55 border border-white/75 px-4 py-3 text-xs text-[#4A4E59] flex items-center gap-2.5 max-w-xs">
              <ShieldAlert className="h-4 w-4 text-[#5268A8] shrink-0" />
              <span>Final complaint closure & resolution authority rests with University Management.</span>
            </div>
          </div>

          {section === 'dashboard' && (
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
              {[
                { label: 'Total Assigned', value: stats.total, icon: ClipboardList },
                { label: 'New Complaints', value: stats.newCount, icon: FileCheck2 },
                { label: 'Awaiting Response', value: stats.awaitingResponse, icon: Hourglass },
                { label: 'In Progress', value: stats.inProgress, icon: Clock },
                { label: 'Resolved', value: stats.resolved, icon: CheckCircle2 },
              ].map((card) => {
                const Icon = card.icon;
                return (
                  <motion.div key={card.label} whileHover={{ y: -2 }} className="glass-panel rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#4A4E59]">{card.label}</span>
                      <Icon className="h-4 w-4 text-[#5268A8]" />
                    </div>
                    <p className="text-3xl font-bold text-[#20242D]">
                      <AnimatedNumber value={card.value} />
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}

          <div className="glass-panel rounded-3xl p-6 space-y-4">
            <h2 className="font-display font-bold text-xl text-[#20242D]">
              Complaint Queue ({displayedComplaints.length})
            </h2>

            {loading ? (
              <div className="py-10 text-center text-sm text-[#5A5E69]">Loading tagged complaints...</div>
            ) : displayedComplaints.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#5A5E69]">
                No complaints in this view.
              </p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {displayedComplaints.map((c) => (
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
                        {c.category} · {c.location}
                      </p>
                      <p className="text-xs text-[#5A5E69] mt-1.5">
                        Student: <span className="font-semibold text-[#20242D]">{c.student_name}</span>
                      </p>
                      <p className="text-xs text-[#4A4E59] mt-2 line-clamp-2">{c.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#20242D]/8 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <PriorityIndicator priority={c.priority} />
                        <StatusIndicator status={c.status} />
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedComplaintId(c.id)}
                        className="px-4 py-2 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors"
                      >
                        Respond & Review
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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

      {section === 'profile' && <ProfileSettingsView title="Faculty Profile" />}

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
