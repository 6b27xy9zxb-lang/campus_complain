import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { CheckCircle2, Clock, Wrench, Zap } from 'lucide-react';
import { apiRequest } from '../lib/api';
import { DashboardShell } from '../components/DashboardShell';
import { AnimatedNumber, PriorityIndicator, StatusIndicator } from '../components/GlassUI';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import { NotificationsView, ProfileSettingsView } from '../components/SharedWorkspacePanels';
import { MAINTENANCE_CATEGORIES, type ComplaintRecord } from '../types';

interface MaintenanceDashboardProps {
  onNavigatePublic: (path: string) => void;
}

export function MaintenanceDashboard({ onNavigatePublic }: MaintenanceDashboardProps) {
  const [section, setSection] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');
  const [tasks, setTasks] = useState<ComplaintRecord[]>([]);
  const [stats, setStats] = useState({ total: 0, assigned: 0, inProgress: 0, resolved: 0 });
  const [loading, setLoading] = useState(true);
  const [selectedTaskId, setSelectedTaskId] = useState<number | null>(null);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [listRes, statsRes] = await Promise.all([
        apiRequest<{ complaints: ComplaintRecord[] }>('/api/complaints'),
        apiRequest<{ stats: any }>('/api/dashboard/stats'),
      ]);
      setTasks(listRes.complaints);
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

  const filteredTasks = useMemo(() => {
    return tasks.filter((t) => {
      if (section === 'assigned' && t.status !== 'ASSIGNED') return false;
      if (section === 'in-progress' && !['IN_PROGRESS', 'ACTION_TAKEN'].includes(t.status)) return false;
      if (section === 'completed' && !['RESOLVED', 'CLOSED'].includes(t.status)) return false;

      const q = globalSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        t.complaint_id.toLowerCase().includes(q) ||
        t.title.toLowerCase().includes(q) ||
        t.location.toLowerCase().includes(q)
      );
    });
  }, [tasks, section, globalSearch]);

  const handleQuickAccept = async (task: ComplaintRecord) => {
    await apiRequest(`/api/complaints/${task.id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({
        status: 'IN_PROGRESS',
        remarks: 'Maintenance team accepted task and initiated on-site inspection.',
      }),
    });
    fetchData();
  };

  return (
    <DashboardShell
      activeSection={section}
      onSelectSection={setSection}
      globalSearch={globalSearch}
      onGlobalSearchChange={setGlobalSearch}
      onNavigatePublic={onNavigatePublic}
    >
      {(section === 'dashboard' || section === 'assigned' || section === 'in-progress' || section === 'completed') && (
        <div className="space-y-6">
          <div className="glass-panel rounded-[28px] p-7 sm:p-8">
            <p className="text-xs font-semibold text-[#5268A8]">Campus Engineering & Maintenance</p>
            <h1 className="font-display font-bold text-2xl sm:text-3xl text-[#20242D] mt-1">
              Infrastructure Maintenance Desk
            </h1>
            <p className="text-sm text-[#4A4E59] mt-1.5 max-w-2xl">
              Accept assigned work orders, upload before-and-after repair photographs, and submit completion reports for University Management verification.
            </p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-[#4A4E59]">
              {MAINTENANCE_CATEGORIES.map((cat) => (
                <span key={cat} className="px-2.5 py-1 rounded-lg bg-white/45 border border-white/65">
                  {cat}
                </span>
              ))}
            </div>
          </div>

          {section === 'dashboard' && (
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { label: 'Assigned Tasks', value: stats.total, icon: Wrench },
                { label: 'New Requests', value: stats.assigned, icon: Zap },
                { label: 'In Progress', value: stats.inProgress, icon: Clock },
                { label: 'Completed Tasks', value: stats.resolved, icon: CheckCircle2 },
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
              Work Orders ({filteredTasks.length})
            </h2>

            {loading ? (
              <div className="py-10 text-center text-sm text-[#5A5E69]">Loading assigned tasks...</div>
            ) : filteredTasks.length === 0 ? (
              <p className="py-10 text-center text-sm text-[#5A5E69]">No maintenance tasks in this queue.</p>
            ) : (
              <div className="grid md:grid-cols-2 gap-4">
                {filteredTasks.map((task) => (
                  <div
                    key={task.id}
                    className="rounded-2xl bg-white/50 border border-white/75 p-5 flex flex-col justify-between gap-4"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#5A5E69]">
                        <span className="font-mono font-bold text-[#5268A8]">{task.complaint_id}</span>
                        <span className="font-mono tabular-nums">
                          Due: {task.deadline_at ? task.deadline_at.slice(0, 10) : 'TBD'}
                        </span>
                      </div>
                      <h3 className="font-display font-bold text-base text-[#20242D] mt-1.5">
                        {task.title}
                      </h3>
                      <p className="text-xs text-[#4A4E59] mt-1">
                        {task.category} · <span className="font-semibold">{task.location}</span>
                      </p>
                      <p className="text-xs text-[#4A4E59] mt-2 line-clamp-2">{task.description}</p>
                    </div>

                    <div className="pt-3 border-t border-[#20242D]/8 flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <PriorityIndicator priority={task.priority} />
                        <StatusIndicator status={task.status} />
                      </div>
                      <div className="flex items-center gap-2">
                        {task.status === 'ASSIGNED' && (
                          <button
                            type="button"
                            onClick={() => handleQuickAccept(task)}
                            className="px-3 py-1.5 rounded-xl bg-white/80 hover:bg-white text-xs font-semibold text-[#20242D] border border-white"
                          >
                            Accept Task
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setSelectedTaskId(task.id)}
                          className="px-3.5 py-1.5 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold"
                        >
                          Update & Evidence
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {section === 'notifications' && (
        <NotificationsView onOpenComplaint={setSelectedTaskId} />
      )}

      {section === 'profile' && <ProfileSettingsView title="Maintenance Personnel Profile" />}

      {selectedTaskId && (
        <ComplaintDetailModal
          complaintId={selectedTaskId}
          onClose={() => setSelectedTaskId(null)}
          onUpdated={fetchData}
        />
      )}
    </DashboardShell>
  );
}
