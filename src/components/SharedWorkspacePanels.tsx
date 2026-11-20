import React, { useState } from 'react';
import { Bell, CheckCheck, MessageSquare, Save, User } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { apiRequest } from '../lib/api';
import type { ComplaintRecord } from '../types';
import { StatusIndicator } from './GlassUI';

export function NotificationsView({ onOpenComplaint }: { onOpenComplaint: (id: number) => void }) {
  const { notifications, unreadCount, markNotificationRead, markAllNotificationsRead } = useAuth();

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-[#20242D]/10">
        <div>
          <h2 className="font-display font-bold text-2xl text-[#20242D] flex items-center gap-2.5">
            <Bell className="h-5 w-5 text-[#5268A8]" />
            <span>Notification Centre</span>
          </h2>
          <p className="text-xs text-[#4A4E59] mt-1">
            Real-time updates for complaint reviews, faculty responses, assignments, and resolutions.
          </p>
        </div>

        <button
          type="button"
          onClick={() => markAllNotificationsRead()}
          disabled={unreadCount === 0}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/70 hover:bg-white text-xs font-semibold text-[#5268A8] border border-white/80 disabled:opacity-50"
        >
          <CheckCheck className="h-4 w-4" />
          <span>Mark All Read ({unreadCount})</span>
        </button>
      </div>

      {notifications.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#5A5E69]">You are all caught up.</p>
      ) : (
        <div className="divide-y divide-[#20242D]/10">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`py-4 px-3 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                n.is_read ? 'opacity-75' : 'bg-white/45'
              }`}
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-[#20242D]">{n.title}</span>
                  {!n.is_read && (
                    <span className="text-[11px] font-semibold text-[#5268A8]">Unread</span>
                  )}
                </div>
                <p className="text-xs text-[#4A4E59] mt-1">{n.message}</p>
                <p className="text-[11px] font-mono text-[#5A5E69] mt-1 tabular-nums">{n.created_at}</p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                {n.complaint_id && (
                  <button
                    type="button"
                    onClick={() => {
                      if (!n.is_read) markNotificationRead(n.id);
                      onOpenComplaint(n.complaint_id!);
                    }}
                    className="px-3.5 py-2 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
                  >
                    Open Case
                  </button>
                )}
                {!n.is_read && (
                  <button
                    type="button"
                    onClick={() => markNotificationRead(n.id)}
                    className="px-3 py-2 rounded-xl bg-white/70 text-xs font-semibold text-[#292B32]"
                  >
                    Mark Read
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function MessagesView({
  complaints,
  onOpenComplaint,
}: {
  complaints: ComplaintRecord[];
  onOpenComplaint: (id: number) => void;
}) {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
      <div className="pb-4 border-b border-[#20242D]/10">
        <h2 className="font-display font-bold text-2xl text-[#20242D] flex items-center gap-2.5">
          <MessageSquare className="h-5 w-5 text-[#5268A8]" />
          <span>Complaint Discussions & Threads</span>
        </h2>
        <p className="text-xs text-[#4A4E59] mt-1">
          Select any complaint below to view responses, share documents, and communicate with management.
        </p>
      </div>

      {complaints.length === 0 ? (
        <p className="py-12 text-center text-sm text-[#5A5E69]">No active complaint threads.</p>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {complaints.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => onOpenComplaint(c.id)}
              className="text-left rounded-2xl bg-white/50 hover:bg-white/80 border border-white/75 p-4 transition-all"
            >
              <div className="flex items-center justify-between gap-2 text-xs">
                <span className="font-mono font-bold text-[#5268A8]">{c.complaint_id}</span>
                <StatusIndicator status={c.status} />
              </div>
              <h3 className="font-display font-bold text-sm text-[#20242D] mt-2 line-clamp-1">
                {c.title}
              </h3>
              <p className="text-xs text-[#4A4E59] mt-1 line-clamp-2">{c.description}</p>
              <p className="text-[11px] text-[#5A5E69] mt-2.5">
                Last updated {c.updated_at} · Click to open discussion
              </p>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProfileSettingsView({ title = 'Profile & Account Settings' }: { title?: string }) {
  const { user, refreshUser, pushToast } = useAuth();
  const [fullName, setFullName] = useState(user?.full_name || '');
  const [department, setDepartment] = useState(user?.department || '');
  const [semester, setSemester] = useState(user?.semester || '');
  const [section, setSection] = useState(user?.section || '');
  const [specialty, setSpecialty] = useState(user?.specialty || '');
  const [saving, setSaving] = useState(false);

  if (!user) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await apiRequest('/api/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          full_name: fullName,
          department,
          semester: semester || null,
          section: section || null,
          specialty: specialty || null,
        }),
      });
      await refreshUser();
      pushToast({ type: 'success', title: 'Profile Updated' });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Update Failed', description: err.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3 pb-4 border-b border-[#20242D]/10">
        <div className="h-11 w-11 rounded-2xl bg-[#5268A8] text-white flex items-center justify-center">
          <User className="h-5 w-5" />
        </div>
        <div>
          <h2 className="font-display font-bold text-xl text-[#20242D]">{title}</h2>
          <p className="text-xs text-[#5A5E69]">
            {user.university_id} · {user.role} · {user.email}
          </p>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-4">
        <div>
          <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Full Name</label>
          <input
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
            className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-[#20242D]"
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Department</label>
          <input
            type="text"
            value={department}
            onChange={(e) => setDepartment(e.target.value)}
            required
            className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-[#20242D]"
          />
        </div>

        {user.role === 'STUDENT' && (
          <div className="grid sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Semester</label>
              <input
                type="text"
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-[#20242D]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#292B32] mb-1.5">Section</label>
              <input
                type="text"
                value={section}
                onChange={(e) => setSection(e.target.value)}
                className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-[#20242D]"
              />
            </div>
          </div>
        )}

        {user.role !== 'STUDENT' && (
          <div>
            <label className="block text-xs font-semibold text-[#292B32] mb-1.5">
              Role Specialty / Office Designation
            </label>
            <input
              type="text"
              value={specialty}
              onChange={(e) => setSpecialty(e.target.value)}
              className="w-full glass-input rounded-xl px-4 py-2.5 text-sm text-[#20242D]"
            />
          </div>
        )}

        <button
          type="submit"
          disabled={saving}
          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </button>
      </form>
    </div>
  );
}
