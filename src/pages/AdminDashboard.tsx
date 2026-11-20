import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import {
  AlertTriangle,
  ArrowUpDown,
  Building2,
  CheckCircle2,
  ClipboardList,
  Clock,
  Download,
  FileBarChart2,
  FileSpreadsheet,
  FileText,
  Flame,
  Hourglass,
  Mail,
  Plus,
  ShieldAlert,
  UserCheck,
  UserPlus,
} from 'lucide-react';
import { jsPDF } from 'jspdf';
import * as XLSX from 'xlsx';
import { apiRequest } from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { DashboardShell } from '../components/DashboardShell';
import { AnimatedNumber, PriorityIndicator, StatusIndicator } from '../components/GlassUI';
import { ComplaintDetailModal } from '../components/ComplaintDetailModal';
import { NotificationsView, ProfileSettingsView } from '../components/SharedWorkspacePanels';
import {
  COMPLAINT_CATEGORIES,
  STATUS_LABELS,
  type AnalyticsSummary,
  type ComplaintRecord,
  type Department,
  type UserProfile,
} from '../types';

interface AdminDashboardProps {
  onNavigatePublic: (path: string) => void;
}

export function AdminDashboard({ onNavigatePublic }: AdminDashboardProps) {
  const { pushToast } = useAuth();
  const [section, setSection] = useState('dashboard');
  const [globalSearch, setGlobalSearch] = useState('');

  const [complaints, setComplaints] = useState<ComplaintRecord[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [departments, setDepartments] = useState<Department[]>([]);
  const [contactMessages, setContactMessages] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedComplaintId, setSelectedComplaintId] = useState<number | null>(null);

  // Table Filters & Pagination
  const [filterStatus, setFilterStatus] = useState('ALL');
  const [filterCategory, setFilterCategory] = useState('ALL');
  const [filterPriority, setFilterPriority] = useState('ALL');
  const [filterDept, setFilterDept] = useState('ALL');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [sortField, setSortField] = useState<'created_at' | 'priority'>('created_at');
  const [sortDir, setSortDir] = useState<'desc' | 'asc'>('desc');
  const [page, setPage] = useState(1);
  const pageSize = 8;

  // Add Faculty / Staff Modal
  const [newStaffOpen, setNewStaffOpen] = useState(false);
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffId, setStaffId] = useState('');
  const [staffRole, setStaffRole] = useState<'FACULTY' | 'MAINTENANCE'>('FACULTY');
  const [staffDept, setStaffDept] = useState('Computer Science & Engineering');
  const [staffSpecialty, setStaffSpecialty] = useState('');

  // Add Department Form
  const [deptName, setDeptName] = useState('');
  const [deptCode, setDeptCode] = useState('');
  const [deptHead, setDeptHead] = useState('');

  const fetchAll = useCallback(async () => {
    setLoading(true);
    try {
      const [compRes, analRes, userRes, deptRes, msgRes] = await Promise.all([
        apiRequest<{ complaints: ComplaintRecord[] }>('/api/complaints'),
        apiRequest<{ analytics: AnalyticsSummary }>('/api/analytics'),
        apiRequest<{ users: UserProfile[] }>('/api/directory/users'),
        apiRequest<{ departments: Department[] }>('/api/directory/departments'),
        apiRequest<{ messages: any[] }>('/api/contact'),
      ]);
      setComplaints(compRes.complaints);
      setAnalytics(analRes.analytics);
      setUsers(userRes.users);
      setDepartments(deptRes.departments);
      setContactMessages(msgRes.messages);
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Sync Error', description: err.message });
    } finally {
      setLoading(false);
    }
  }, [pushToast]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filteredComplaints = useMemo(() => {
    const priorityRank: Record<string, number> = { Critical: 4, High: 3, Medium: 2, Low: 1 };
    const list = complaints.filter((c) => {
      if (section === 'assignments' && c.assigned_to !== null && c.status !== 'ACTION_TAKEN') {
        return false;
      }
      if (filterStatus !== 'ALL' && c.status !== filterStatus) return false;
      if (filterCategory !== 'ALL' && c.category !== filterCategory) return false;
      if (filterPriority !== 'ALL' && c.priority !== filterPriority) return false;
      if (filterDept !== 'ALL' && c.department !== filterDept) return false;
      if (dateFrom && c.created_at.slice(0, 10) < dateFrom) return false;
      if (dateTo && c.created_at.slice(0, 10) > dateTo) return false;

      const q = globalSearch.trim().toLowerCase();
      if (!q) return true;
      return (
        c.complaint_id.toLowerCase().includes(q) ||
        c.title.toLowerCase().includes(q) ||
        c.student_name.toLowerCase().includes(q) ||
        c.category.toLowerCase().includes(q) ||
        c.department.toLowerCase().includes(q)
      );
    });

    return list.sort((a, b) => {
      if (sortField === 'priority') {
        const diff = (priorityRank[a.priority] || 0) - (priorityRank[b.priority] || 0);
        return sortDir === 'desc' ? -diff : diff;
      }
      return sortDir === 'desc'
        ? b.created_at.localeCompare(a.created_at)
        : a.created_at.localeCompare(b.created_at);
    });
  }, [
    complaints,
    section,
    filterStatus,
    filterCategory,
    filterPriority,
    filterDept,
    dateFrom,
    dateTo,
    globalSearch,
    sortField,
    sortDir,
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredComplaints.length / pageSize));
  const pagedComplaints = filteredComplaints.slice((page - 1) * pageSize, page * pageSize);

  const exportRows = (rows: ComplaintRecord[]) =>
    rows.map((c) => ({
      'Complaint ID': c.complaint_id,
      Student: c.is_anonymous ? 'Anonymous' : `${c.student_name} (${c.student_usn})`,
      Title: c.title,
      Category: c.category,
      Department: c.department,
      'Tagged Faculty': c.tagged_faculty_names?.join(', ') || '-',
      'Assigned To': c.assigned_to_name || 'Unassigned',
      Priority: c.priority,
      Status: STATUS_LABELS[c.status] || c.status,
      Submitted: c.created_at,
      Resolved: c.resolved_at || '-',
    }));

  const handleExportCSV = (rows = filteredComplaints, filename = 'campus_complaints_report.csv') => {
    const data = exportRows(rows);
    const worksheet = XLSX.utils.json_to_sheet(data);
    const csv = XLSX.utils.sheet_to_csv(worksheet);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    pushToast({ type: 'success', title: 'CSV Exported', description: filename });
  };

  const handleExportExcel = (rows = filteredComplaints, filename = 'campus_complaints_report.xlsx') => {
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(exportRows(rows));
    XLSX.utils.book_append_sheet(wb, ws, 'Complaints');
    if (analytics) {
      const deptWs = XLSX.utils.json_to_sheet(analytics.byDepartment);
      XLSX.utils.book_append_sheet(wb, deptWs, 'Department Summary');
    }
    XLSX.writeFile(wb, filename);
    pushToast({ type: 'success', title: 'Excel Exported', description: filename });
  };

  const handleExportPDF = (rows = filteredComplaints, title = 'Campus Complaint Management Report') => {
    const doc = new jsPDF({ orientation: 'landscape' });
    doc.setFontSize(16);
    doc.text(title, 14, 18);
    doc.setFontSize(10);
    doc.text(
      `Generated: ${new Date().toLocaleString()} | Total Records: ${rows.length} | Resolution Rate: ${analytics?.resolutionRate || 0}%`,
      14,
      26
    );

    let y = 36;
    doc.setFontSize(9);
    doc.text('ID', 14, y);
    doc.text('Title', 50, y);
    doc.text('Category', 132, y);
    doc.text('Department', 178, y);
    doc.text('Priority', 228, y);
    doc.text('Status', 252, y);
    y += 4;
    doc.line(14, y, 282, y);
    y += 6;

    for (const c of rows.slice(0, 28)) {
      if (y > 192) {
        doc.addPage();
        y = 20;
      }
      doc.text(c.complaint_id, 14, y);
      doc.text(c.title.slice(0, 42), 50, y);
      doc.text(c.category.slice(0, 22), 132, y);
      doc.text(c.department.slice(0, 24), 178, y);
      doc.text(c.priority, 228, y);
      doc.text((STATUS_LABELS[c.status] || c.status).slice(0, 18), 252, y);
      y += 7;
    }

    doc.save('campus_complaints_report.pdf');
    pushToast({ type: 'success', title: 'PDF Generated', description: 'campus_complaints_report.pdf' });
  };

  const handleCreateStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/directory/users', {
        method: 'POST',
        body: JSON.stringify({
          full_name: staffName,
          email: staffEmail,
          university_id: staffId,
          role: staffRole,
          department: staffDept,
          specialty: staffSpecialty,
        }),
      });
      setNewStaffOpen(false);
      setStaffName('');
      setStaffEmail('');
      setStaffId('');
      setStaffSpecialty('');
      await fetchAll();
      pushToast({ type: 'success', title: 'Staff Account Provisioned' });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Provision Error', description: err.message });
    }
  };

  const handleToggleApproval = async (u: UserProfile) => {
    await apiRequest(`/api/directory/users/${u.id}/approval`, {
      method: 'PATCH',
      body: JSON.stringify({ is_approved: !u.is_approved }),
    });
    fetchAll();
  };

  const handleCreateDepartment = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/api/directory/departments', {
        method: 'POST',
        body: JSON.stringify({ name: deptName, code: deptCode, head_name: deptHead }),
      });
      setDeptName('');
      setDeptCode('');
      setDeptHead('');
      fetchAll();
      pushToast({ type: 'success', title: 'Department Added' });
    } catch (err: any) {
      pushToast({ type: 'error', title: 'Error', description: err.message });
    }
  };

  const studentsList = users.filter((u) => u.role === 'STUDENT');
  const facultyList = users.filter((u) => u.role === 'FACULTY' || u.role === 'MAINTENANCE');

  return (
    <DashboardShell
      activeSection={section}
      onSelectSection={setSection}
      globalSearch={globalSearch}
      onGlobalSearchChange={(val) => {
        setGlobalSearch(val);
        setPage(1);
      }}
      onNavigatePublic={onNavigatePublic}
    >
      {/* OVERVIEW HERO + 8 METRICS */}
      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-[28px] p-7 sm:p-9 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div>
              <p className="text-xs font-semibold text-[#5268A8]">University Management Command Centre</p>
              <h1 className="font-display font-bold text-3xl sm:text-4xl text-[#20242D] mt-1">
                Campus Overview
              </h1>
              <p className="text-sm sm:text-base text-[#4A4E59] mt-2 max-w-2xl">
                Monitor complaints, manage investigations and ensure timely resolution across the university.
              </p>
            </div>
            <div className="flex flex-wrap gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSection('assignments')}
                className="px-4 py-2.5 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold transition-colors"
              >
                Assignment Queue
              </button>
              <button
                type="button"
                onClick={() => setSection('reports')}
                className="px-4 py-2.5 rounded-xl bg-white/70 hover:bg-white text-[#20242D] border border-white/80 text-xs font-semibold transition-colors"
              >
                Export Reports
              </button>
            </div>
          </div>

          {analytics && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              {[
                { label: 'Total Complaints', value: analytics.total, icon: ClipboardList },
                { label: 'New Complaints', value: analytics.submitted, icon: Plus },
                { label: 'Pending Review', value: analytics.underReview, icon: Hourglass },
                { label: 'Assigned', value: analytics.assigned, icon: UserCheck },
                { label: 'In Progress', value: analytics.inProgress + analytics.actionTaken, icon: Clock },
                { label: 'Resolved', value: analytics.resolved + analytics.closed, icon: CheckCircle2 },
                { label: 'Escalated', value: analytics.escalated, icon: Flame },
                { label: 'Overdue', value: analytics.overdue, icon: AlertTriangle },
              ].map((stat) => {
                const Icon = stat.icon;
                return (
                  <motion.div key={stat.label} whileHover={{ y: -2 }} className="glass-panel rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-[#4A4E59]">{stat.label}</span>
                      <Icon className="h-4 w-4 text-[#5268A8]" />
                    </div>
                    <p className="text-3xl font-bold text-[#20242D]">
                      <AnimatedNumber value={stat.value} />
                    </p>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ANALYTICS CHARTS SECTION */}
      {(section === 'dashboard' || section === 'analytics') && analytics && (
        <div className="space-y-6">
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#5A5E69]">Average Resolution Time</p>
              <p className="text-2xl font-bold text-[#20242D] mt-1 tabular-nums">
                {analytics.avgResolutionHours} hrs
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#5A5E69]">Resolution Percentage</p>
              <p className="text-2xl font-bold text-[#256D4F] mt-1 tabular-nums">
                {analytics.resolutionRate}%
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#5A5E69]">Pending Active Cases</p>
              <p className="text-2xl font-bold text-[#9C631E] mt-1 tabular-nums">
                {analytics.total - analytics.resolved - analytics.closed - analytics.rejected}
              </p>
            </div>
            <div className="glass-panel rounded-2xl p-5">
              <p className="text-xs font-semibold text-[#5A5E69]">Faculty-Tagged / Related</p>
              <p className="text-2xl font-bold text-[#5268A8] mt-1 tabular-nums">
                {analytics.facultyRelatedCount}
              </p>
            </div>
          </div>

          <div className="grid lg:grid-cols-12 gap-6">
            {/* Complaints by Category */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-4">
              <h3 className="font-display font-bold text-lg text-[#20242D]">
                Complaints by Category
              </h3>
              <div className="space-y-3">
                {analytics.byCategory.map((item) => {
                  const pct = analytics.total ? Math.round((item.count / analytics.total) * 100) : 0;
                  return (
                    <div key={item.category} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-semibold text-[#292B32]">{item.category}</span>
                        <span className="font-mono text-[#5A5E69] tabular-nums">
                          {item.count} ({pct}%)
                        </span>
                      </div>
                      <div className="h-2 rounded-full bg-white/50 overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[#5268A8]"
                          style={{ width: `${Math.max(6, pct)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Department-wise Complaints & Performance */}
            <div className="lg:col-span-6 glass-panel rounded-3xl p-6 space-y-4">
              <h3 className="font-display font-bold text-lg text-[#20242D]">
                Department-Wise Complaints & Resolution
              </h3>
              <div className="space-y-3">
                {analytics.byDepartment.map((dept) => {
                  const resRate = dept.total ? Math.round((dept.resolved / dept.total) * 100) : 0;
                  return (
                    <div key={dept.department} className="rounded-2xl bg-white/45 border border-white/65 p-3.5">
                      <div className="flex items-center justify-between gap-2 text-xs">
                        <span className="font-bold text-[#20242D]">{dept.department}</span>
                        <span className="font-mono text-[#5268A8] tabular-nums">
                          {dept.resolved}/{dept.total} resolved ({resRate}%)
                        </span>
                      </div>
                      <div className="mt-2 h-2 rounded-full bg-white/60 overflow-hidden flex">
                        <div
                          className="h-full bg-[#256D4F]"
                          style={{ width: `${resRate}%` }}
                        />
                        <div
                          className="h-full bg-[#B97729]/60"
                          style={{ width: `${100 - resRate}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Monthly Trends + Priority Distribution */}
            <div className="lg:col-span-7 glass-panel rounded-3xl p-6 space-y-4">
              <h3 className="font-display font-bold text-lg text-[#20242D]">
                Monthly Complaint Trends
              </h3>
              <div className="grid sm:grid-cols-3 gap-3">
                {analytics.monthlyTrends.map((m) => (
                  <div key={m.month} className="rounded-2xl bg-white/45 border border-white/65 p-4">
                    <p className="font-mono text-xs font-bold text-[#5268A8]">{m.month}</p>
                    <p className="text-lg font-bold text-[#20242D] mt-1 tabular-nums">
                      {m.submitted} Filed
                    </p>
                    <p className="text-xs text-[#256D4F] font-semibold tabular-nums">
                      {m.resolved} Resolved
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 glass-panel rounded-3xl p-6 space-y-4">
              <h3 className="font-display font-bold text-lg text-[#20242D]">
                Priority Distribution
              </h3>
              <div className="grid grid-cols-2 gap-3">
                {analytics.byPriority.map((p) => (
                  <div key={p.priority} className="rounded-2xl bg-white/45 border border-white/65 p-4">
                    <PriorityIndicator priority={p.priority} />
                    <p className="text-2xl font-bold text-[#20242D] mt-2 tabular-nums">{p.count}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* COMPLAINT MANAGEMENT TABLE */}
      {(section === 'dashboard' || section === 'all-complaints' || section === 'assignments') && (
        <div className="glass-panel rounded-3xl p-6 space-y-5">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-xl text-[#20242D]">
                {section === 'assignments'
                  ? 'Pending Assignments & Verification Queue'
                  : 'Complaint Management Registry'}
              </h2>
              <p className="text-xs text-[#4A4E59] mt-0.5">
                Showing {filteredComplaints.length} record(s) from live database
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => handleExportCSV()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 hover:bg-white text-xs font-semibold text-[#20242D] border border-white"
              >
                <Download className="h-3.5 w-3.5 text-[#5268A8]" />
                <span>CSV</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportExcel()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/70 hover:bg-white text-xs font-semibold text-[#20242D] border border-white"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-[#256D4F]" />
                <span>Excel</span>
              </button>
              <button
                type="button"
                onClick={() => handleExportPDF()}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#5268A8] hover:bg-[#3F5289] text-white text-xs font-semibold"
              >
                <FileText className="h-3.5 w-3.5" />
                <span>PDF</span>
              </button>
            </div>
          </div>

          {/* Advanced Filters */}
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-2.5">
            <select
              value={filterStatus}
              onChange={(e) => {
                setFilterStatus(e.target.value);
                setPage(1);
              }}
              className="glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
            >
              <option value="ALL">All Statuses</option>
              {(Object.keys(STATUS_LABELS) as (keyof typeof STATUS_LABELS)[]).map((st) => (
                <option key={st} value={st}>
                  {STATUS_LABELS[st]}
                </option>
              ))}
            </select>

            <select
              value={filterCategory}
              onChange={(e) => {
                setFilterCategory(e.target.value);
                setPage(1);
              }}
              className="glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
            >
              <option value="ALL">All Categories</option>
              {COMPLAINT_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <select
              value={filterPriority}
              onChange={(e) => {
                setFilterPriority(e.target.value);
                setPage(1);
              }}
              className="glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
            >
              <option value="ALL">All Priorities</option>
              {['Critical', 'High', 'Medium', 'Low'].map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>

            <select
              value={filterDept}
              onChange={(e) => {
                setFilterDept(e.target.value);
                setPage(1);
              }}
              className="glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
            >
              <option value="ALL">All Departments</option>
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title="From date"
              className="glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title="To date"
              className="glass-input rounded-xl px-3 py-2 text-xs text-[#20242D]"
            />
          </div>

          {/* Sort Controls */}
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#5A5E69]">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => {
                  setSortField('created_at');
                  setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
                }}
                className="inline-flex items-center gap-1 font-semibold text-[#292B32] hover:text-[#5268A8]"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Sort Date ({sortDir})</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setSortField('priority');
                  setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
                }}
                className="inline-flex items-center gap-1 font-semibold text-[#292B32] hover:text-[#5268A8]"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
                <span>Sort Priority</span>
              </button>
            </div>

            {(filterStatus !== 'ALL' || filterCategory !== 'ALL' || filterPriority !== 'ALL' || filterDept !== 'ALL' || dateFrom || dateTo || globalSearch) && (
              <button
                type="button"
                onClick={() => {
                  setFilterStatus('ALL');
                  setFilterCategory('ALL');
                  setFilterPriority('ALL');
                  setFilterDept('ALL');
                  setDateFrom('');
                  setDateTo('');
                  setGlobalSearch('');
                }}
                className="font-semibold text-[#5268A8] hover:underline"
              >
                Reset Filters
              </button>
            )}
          </div>

          {loading ? (
            <div className="py-10 text-center text-sm text-[#5A5E69]">Loading complaints...</div>
          ) : (
            <>
              {/* Desktop Table */}
              <div className="hidden lg:block overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#20242D]/12 text-[11px] font-semibold text-[#5A5E69]">
                      <th className="py-3 pr-3">Complaint ID</th>
                      <th className="py-3 pr-3">Student</th>
                      <th className="py-3 pr-3">Complaint Title</th>
                      <th className="py-3 pr-3">Department</th>
                      <th className="py-3 pr-3">Category</th>
                      <th className="py-3 pr-3">Tagged Faculty</th>
                      <th className="py-3 pr-3">Assigned To</th>
                      <th className="py-3 pr-3">Priority</th>
                      <th className="py-3 pr-3">Date</th>
                      <th className="py-3 pr-3">Status</th>
                      <th className="py-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#20242D]/8 text-xs">
                    {pagedComplaints.map((c) => (
                      <tr key={c.id} className="hover:bg-white/40 transition-colors">
                        <td className="py-3 pr-3 font-mono font-bold text-[#5268A8] whitespace-nowrap">
                          {c.complaint_id}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <span className="font-semibold text-[#20242D]">
                            {c.is_anonymous ? `${c.student_name} (Anon)` : c.student_name}
                          </span>
                        </td>
                        <td className="py-3 pr-3 max-w-[210px]">
                          <p className="font-semibold text-[#20242D] truncate">{c.title}</p>
                        </td>
                        <td className="py-3 pr-3 text-[#4A4E59] max-w-[140px] truncate">
                          {c.department}
                        </td>
                        <td className="py-3 pr-3 text-[#4A4E59] whitespace-nowrap">{c.category}</td>
                        <td className="py-3 pr-3 text-[#5268A8] max-w-[140px] truncate">
                          {c.tagged_faculty_names?.join(', ') || '—'}
                        </td>
                        <td className="py-3 pr-3 text-[#292B32] whitespace-nowrap">
                          {c.assigned_to_name || 'Unassigned'}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <PriorityIndicator priority={c.priority} />
                        </td>
                        <td className="py-3 pr-3 font-mono text-[#5A5E69] tabular-nums whitespace-nowrap">
                          {c.created_at.slice(0, 10)}
                        </td>
                        <td className="py-3 pr-3 whitespace-nowrap">
                          <StatusIndicator status={c.status} />
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedComplaintId(c.id)}
                            className="px-3 py-1.5 rounded-lg bg-[#5268A8] hover:bg-[#3F5289] text-white text-[11px] font-semibold"
                          >
                            Manage
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card Layout */}
              <div className="lg:hidden space-y-3">
                {pagedComplaints.map((c) => (
                  <div key={c.id} className="rounded-2xl bg-white/55 border border-white/75 p-4 space-y-2.5">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono font-bold text-[#5268A8]">{c.complaint_id}</span>
                      <StatusIndicator status={c.status} />
                    </div>
                    <p className="font-display font-bold text-sm text-[#20242D]">{c.title}</p>
                    <p className="text-xs text-[#4A4E59]">
                      {c.student_name} · {c.category} · {c.department}
                    </p>
                    <div className="flex items-center justify-between pt-2 border-t border-[#20242D]/8">
                      <PriorityIndicator priority={c.priority} />
                      <button
                        type="button"
                        onClick={() => setSelectedComplaintId(c.id)}
                        className="px-3.5 py-1.5 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
                      >
                        Inspect & Assign
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between pt-3 border-t border-[#20242D]/10 text-xs">
                  <span className="text-[#5A5E69] tabular-nums">
                    Page {page} of {totalPages}
                  </span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => p - 1)}
                      className="px-3 py-1.5 rounded-lg bg-white/65 disabled:opacity-40 font-semibold"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                      className="px-3 py-1.5 rounded-lg bg-white/65 disabled:opacity-40 font-semibold"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* STUDENTS DIRECTORY */}
      {section === 'students' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
          <div>
            <h2 className="font-display font-bold text-2xl text-[#20242D]">Registered Students ({studentsList.length})</h2>
            <p className="text-xs text-[#4A4E59] mt-1">Verified student accounts active in the portal.</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {studentsList.map((s) => (
              <div key={s.id} className="rounded-2xl bg-white/55 border border-white/75 p-4">
                <p className="font-mono text-xs font-bold text-[#5268A8]">{s.university_id}</p>
                <h3 className="font-display font-bold text-base text-[#20242D] mt-1">{s.full_name}</h3>
                <p className="text-xs text-[#4A4E59] mt-0.5">{s.email}</p>
                <p className="text-xs text-[#5A5E69] mt-2">
                  {s.department} · {s.semester} · {s.section}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* FACULTY & MAINTENANCE DIRECTORY */}
      {section === 'faculty' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="font-display font-bold text-2xl text-[#20242D]">
                Faculty & Maintenance Personnel ({facultyList.length})
              </h2>
              <p className="text-xs text-[#4A4E59] mt-1">
                Provision and approve faculty or maintenance accounts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setNewStaffOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
            >
              <UserPlus className="h-4 w-4" />
              <span>Add Faculty / Staff</span>
            </button>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {facultyList.map((f) => (
              <div key={f.id} className="rounded-2xl bg-white/55 border border-white/75 p-4 flex flex-col justify-between gap-3">
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono font-bold text-[#5268A8]">{f.university_id}</span>
                    <span className="font-semibold text-[#20242D]">{f.role}</span>
                  </div>
                  <h3 className="font-display font-bold text-base text-[#20242D] mt-1">{f.full_name}</h3>
                  <p className="text-xs text-[#4A4E59]">{f.email}</p>
                  <p className="text-xs text-[#5A5E69] mt-1.5">{f.department}</p>
                  {f.specialty && <p className="text-[11px] text-[#5268A8] mt-1">{f.specialty}</p>}
                </div>
                <div className="pt-2 border-t border-[#20242D]/8 flex items-center justify-between text-xs">
                  <span className={f.is_approved ? 'text-[#256D4F] font-semibold' : 'text-[#A63A3A] font-semibold'}>
                    {f.is_approved ? 'Approved' : 'Suspended'}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleToggleApproval(f)}
                    className="px-3 py-1 rounded-lg bg-white/80 hover:bg-white text-[#20242D] font-semibold"
                  >
                    {f.is_approved ? 'Suspend' : 'Approve'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DEPARTMENTS */}
      {section === 'departments' && (
        <div className="space-y-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-5">
            <h2 className="font-display font-bold text-2xl text-[#20242D] flex items-center gap-2.5">
              <Building2 className="h-5 w-5 text-[#5268A8]" />
              <span>Academic & Operational Departments</span>
            </h2>
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {departments.map((d) => (
                <div key={d.id} className="rounded-2xl bg-white/55 border border-white/75 p-5">
                  <span className="font-mono text-xs font-bold text-[#5268A8]">{d.code}</span>
                  <h3 className="font-display font-bold text-base text-[#20242D] mt-1">{d.name}</h3>
                  <p className="text-xs text-[#4A4E59] mt-1">Head: {d.head_name}</p>
                </div>
              ))}
            </div>
          </div>

          <form onSubmit={handleCreateDepartment} className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4 max-w-2xl">
            <h3 className="font-display font-bold text-lg text-[#20242D]">Register New Department</h3>
            <div className="grid sm:grid-cols-3 gap-3">
              <input
                type="text"
                value={deptName}
                onChange={(e) => setDeptName(e.target.value)}
                placeholder="Department Name"
                required
                className="sm:col-span-2 glass-input rounded-xl px-3.5 py-2.5 text-xs"
              />
              <input
                type="text"
                value={deptCode}
                onChange={(e) => setDeptCode(e.target.value)}
                placeholder="Code (e.g. AI)"
                required
                className="glass-input rounded-xl px-3.5 py-2.5 text-xs font-mono"
              />
            </div>
            <input
              type="text"
              value={deptHead}
              onChange={(e) => setDeptHead(e.target.value)}
              placeholder="Department Head Name"
              required
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-xs"
            />
            <button type="submit" className="px-5 py-2.5 rounded-xl bg-[#5268A8] text-white text-xs font-semibold">
              Add Department
            </button>
          </form>
        </div>
      )}

      {/* DEDICATED REPORTS & EXPORTS PAGE */}
      {section === 'reports' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div>
            <h2 className="font-display font-bold text-2xl text-[#20242D] flex items-center gap-2.5">
              <FileBarChart2 className="h-5 w-5 text-[#5268A8]" />
              <span>Management Reports & Exports</span>
            </h2>
            <p className="text-xs text-[#4A4E59] mt-1">
              Download live database reports in PDF, Excel (.xlsx), or CSV format.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              {
                title: 'Complete Complaint Audit',
                desc: 'All complaints with status, deadlines, and assignees.',
                subset: complaints,
                file: 'all_complaints',
              },
              {
                title: 'Pending & Unresolved Cases',
                desc: 'Active complaints awaiting review, action, or verification.',
                subset: complaints.filter((c) => !['RESOLVED', 'CLOSED', 'REJECTED'].includes(c.status)),
                file: 'pending_complaints',
              },
              {
                title: 'Faculty-Related & Tagged Cases',
                desc: 'Complaints where faculty members were tagged or involved.',
                subset: complaints.filter((c) => c.category === 'Faculty-Related Issues' || c.faculty_id !== null),
                file: 'faculty_complaints',
              },
              {
                title: 'Escalated & Critical Cases',
                desc: 'High-severity and escalated grievances needing urgent review.',
                subset: complaints.filter((c) => c.status === 'ESCALATED' || c.priority === 'Critical'),
                file: 'escalated_critical',
              },
              {
                title: 'Resolved Cases Summary',
                desc: 'Completed complaints with resolution timestamps.',
                subset: complaints.filter((c) => ['RESOLVED', 'CLOSED'].includes(c.status)),
                file: 'resolved_complaints',
              },
            ].map((rep) => (
              <div key={rep.title} className="rounded-2xl bg-white/55 border border-white/75 p-5 flex flex-col justify-between gap-4">
                <div>
                  <p className="font-mono text-xs font-bold text-[#5268A8] tabular-nums">
                    {rep.subset.length} Records
                  </p>
                  <h3 className="font-display font-bold text-base text-[#20242D] mt-1">{rep.title}</h3>
                  <p className="text-xs text-[#4A4E59] mt-1.5">{rep.desc}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => handleExportPDF(rep.subset, rep.title)}
                    className="px-3 py-1.5 rounded-lg bg-[#5268A8] text-white text-xs font-semibold"
                  >
                    PDF
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportExcel(rep.subset, `${rep.file}.xlsx`)}
                    className="px-3 py-1.5 rounded-lg bg-white/80 text-[#20242D] text-xs font-semibold"
                  >
                    Excel
                  </button>
                  <button
                    type="button"
                    onClick={() => handleExportCSV(rep.subset, `${rep.file}.csv`)}
                    className="px-3 py-1.5 rounded-lg bg-white/80 text-[#20242D] text-xs font-semibold"
                  >
                    CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {section === 'notifications' && (
        <NotificationsView onOpenComplaint={setSelectedComplaintId} />
      )}

      {section === 'settings' && (
        <div className="space-y-6">
          <ProfileSettingsView title="Administration Settings" />
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display font-bold text-lg text-[#20242D] flex items-center gap-2">
              <Mail className="h-4 w-4 text-[#5268A8]" />
              <span>Contact Us Inquiries ({contactMessages.length})</span>
            </h3>
            {contactMessages.length === 0 ? (
              <p className="text-xs text-[#5A5E69]">No inquiries submitted from Contact Us yet.</p>
            ) : (
              <div className="space-y-3">
                {contactMessages.map((m) => (
                  <div key={m.id} className="rounded-2xl bg-white/55 border border-white/75 p-4 text-xs">
                    <div className="flex justify-between gap-2">
                      <span className="font-bold text-[#20242D]">
                        {m.subject} — {m.full_name} ({m.email})
                      </span>
                      <span className="font-mono text-[#5A5E69] tabular-nums">{m.created_at}</span>
                    </div>
                    <p className="text-[#4A4E59] mt-1.5">{m.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Add Staff Modal */}
      {newStaffOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#20242D]/40 backdrop-blur-sm">
          <form
            onSubmit={handleCreateStaff}
            className="glass-panel-strong rounded-3xl p-6 max-w-md w-full space-y-4"
          >
            <h3 className="font-display font-bold text-lg text-[#20242D]">
              Provision Faculty / Maintenance Account
            </h3>
            <input
              type="text"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              placeholder="Full Name"
              required
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
            />
            <input
              type="email"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              placeholder="University Email"
              required
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="text"
                value={staffId}
                onChange={(e) => setStaffId(e.target.value)}
                placeholder="Employee ID"
                required
                className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm font-mono"
              />
              <select
                value={staffRole}
                onChange={(e) => setStaffRole(e.target.value as any)}
                className="w-full glass-input rounded-xl px-3 py-2.5 text-sm"
              >
                <option value="FACULTY">FACULTY</option>
                <option value="MAINTENANCE">MAINTENANCE</option>
              </select>
            </div>
            <select
              value={staffDept}
              onChange={(e) => setStaffDept(e.target.value)}
              className="w-full glass-input rounded-xl px-3 py-2.5 text-sm"
            >
              {departments.map((d) => (
                <option key={d.id} value={d.name}>
                  {d.name}
                </option>
              ))}
            </select>
            <input
              type="text"
              value={staffSpecialty}
              onChange={(e) => setStaffSpecialty(e.target.value)}
              placeholder="Specialty / Designation"
              className="w-full glass-input rounded-xl px-3.5 py-2.5 text-sm"
            />
            <p className="text-[11px] text-[#5A5E69]">
              Default initial password will be <span className="font-mono font-semibold">Password@123</span>.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setNewStaffOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold text-[#4A4E59]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 rounded-xl bg-[#5268A8] text-white text-xs font-semibold"
              >
                Create Account
              </button>
            </div>
          </form>
        </div>
      )}

      {selectedComplaintId && (
        <ComplaintDetailModal
          complaintId={selectedComplaintId}
          onClose={() => setSelectedComplaintId(null)}
          onUpdated={fetchAll}
        />
      )}
    </DashboardShell>
  );
}
